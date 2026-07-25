import boto3
import json
import uuid
import structlog
from app.core.config import get_settings

settings = get_settings()
logger = structlog.get_logger()


class MediaConvertService:
    def __init__(self):
        # Get MediaConvert endpoint
        mc = boto3.client("mediaconvert", region_name=settings.AWS_REGION)
        try:
            endpoints = mc.describe_endpoints()
            self.endpoint_url = endpoints["Endpoints"][0]["Url"]
        except Exception:
            self.endpoint_url = settings.MEDIACONVERT_ENDPOINT

        self.client = boto3.client(
            "mediaconvert",
            region_name=settings.AWS_REGION,
            endpoint_url=self.endpoint_url,
        )

    async def submit_transcode_job(
        self,
        content_id: str,
        s3_input_key: str,
        content_type: str = "video",
    ) -> str:
        """Submit a MediaConvert job for a raw upload."""
        input_url = f"s3://{settings.S3_RAW_UPLOADS}/{s3_input_key}"
        output_base = f"s3://{settings.S3_PROCESSED_VIDEOS}/{content_id}/"

        job_settings = {
            "Inputs": [{
                "FileInput": input_url,
                "AudioSelectors": {"Audio Selector 1": {"DefaultSelection": "DEFAULT"}},
                "VideoSelector": {},
                "TimecodeSource": "ZEROBASED",
            }],
            "OutputGroups": [
                # HLS adaptive bitrate
                {
                    "Name": "HLS Group",
                    "OutputGroupSettings": {
                        "Type": "HLS_GROUP_SETTINGS",
                        "HlsGroupSettings": {
                            "Destination": f"{output_base}hls/",
                            "SegmentLength": 6,
                            "MinSegmentLength": 0,
                        },
                    },
                    "Outputs": [
                        self._hls_output("360p",  640,  360,  800000,  96000),
                        self._hls_output("720p",  1280, 720,  2500000, 128000),
                        self._hls_output("1080p", 1920, 1080, 5000000, 192000),
                    ],
                },
                # Thumbnail
                {
                    "Name": "Thumbnails",
                    "OutputGroupSettings": {
                        "Type": "FILE_GROUP_SETTINGS",
                        "FileGroupSettings": {
                            "Destination": f"{output_base}thumbnails/",
                        },
                    },
                    "Outputs": [{
                        "ContainerSettings": {"Container": "RAW"},
                        "VideoDescription": {
                            "Width": 1280,
                            "Height": 720,
                            "CodecSettings": {
                                "Codec": "FRAME_CAPTURE",
                                "FrameCaptureSettings": {
                                    "FramerateNumerator": 1,
                                    "FramerateDenominator": 10,
                                    "MaxCaptures": 3,
                                    "Quality": 80,
                                },
                            },
                        },
                    }],
                },
            ],
            "TimecodeConfig": {"Source": "ZEROBASED"},
        }

        try:
            response = self.client.create_job(
                Role=settings.MEDIACONVERT_ROLE_ARN,
                Settings=job_settings,
                UserMetadata={
                    "content_id": content_id,
                    "environment": settings.ENVIRONMENT,
                },
            )
            job_id = response["Job"]["Id"]
            logger.info("mediaconvert.job.created", content_id=content_id, job_id=job_id)
            return job_id
        except Exception as e:
            logger.error("mediaconvert.job.error", content_id=content_id, error=str(e))
            raise

    def _hls_output(self, name: str, width: int, height: int, bitrate: int, audio_bitrate: int) -> dict:
        return {
            "NameModifier": f"_{name}",
            "ContainerSettings": {"Container": "M3U8", "M3u8Settings": {}},
            "VideoDescription": {
                "Width": width,
                "Height": height,
                "CodecSettings": {
                    "Codec": "H_264",
                    "H264Settings": {
                        "Bitrate": bitrate,
                        "RateControlMode": "CBR",
                        "CodecProfile": "HIGH",
                        "CodecLevel": "AUTO",
                        "FramerateControl": "INITIALIZE_FROM_SOURCE",
                        "GopSize": 90,
                        "GopSizeUnits": "FRAMES",
                        "InterlaceMode": "PROGRESSIVE",
                        "SceneChangeDetect": "ENABLED",
                        "QualityTuningLevel": "SINGLE_PASS",
                    },
                },
            },
            "AudioDescriptions": [{
                "CodecSettings": {
                    "Codec": "AAC",
                    "AacSettings": {
                        "Bitrate": audio_bitrate,
                        "CodingMode": "CODING_MODE_2_0",
                        "SampleRate": 48000,
                    },
                },
            }],
        }

    async def get_job_status(self, job_id: str) -> dict:
        response = self.client.get_job(Id=job_id)
        job = response["Job"]
        return {
            "status": job["Status"],
            "progress": job.get("JobPercentComplete", 0),
            "error": job.get("ErrorMessage"),
        }

    def get_output_urls(self, content_id: str) -> dict:
        """Return CloudFront URLs for processed content."""
        base = f"{settings.CLOUDFRONT_DOMAIN}/videos/{content_id}"
        return {
            "hls_manifest_url": f"{base}/hls/master.m3u8",
            "quality_360p_url": f"{base}/hls/_360p.m3u8",
            "quality_720p_url": f"{base}/hls/_720p.m3u8",
            "quality_1080p_url": f"{base}/hls/_1080p.m3u8",
            "thumbnail_url": f"{base}/thumbnails/thumb.0000000.jpg",
        }
