# OCI Migration Plan
## Move from Railway + Cloudflare Stream → OCI Free VMs + FFmpeg + R2

---

## OCI Free Tier Resources (Always Free, Forever)

- 2x AMD VM.Standard.E2.1.Micro (1 OCPU, 1GB RAM each)
- 4x ARM VM.Standard.A1.Flex (up to 4 OCPU, 24GB RAM total — use all for one big VM)
- 200GB block storage
- 10TB outbound data/month
- 2x Load Balancers
- Autonomous Database (PostgreSQL-compatible)

**Our setup:**
- 1x ARM VM (4 OCPU, 24GB RAM) → FastAPI backend + FFmpeg worker
- 1x AMD VM → PostgreSQL + Redis
- 1x AMD VM → reserved / monitoring
- R2 → video storage (keep Cloudflare R2 forever — best deal)

---

## Migration Steps

### Step 1 — Get OCI Account
- Sign up at cloud.oracle.com
- Use new identity (different machine, different IP — use phone hotspot for first login)
- Choose region: Africa (Johannesburg) — ap-johannesburg-1
  OR Middle East (if Johannesburg quota issues): me-dubai-1

### Step 2 — Provision ARM VM (FFmpeg + Backend)
```bash
# ARM VM — 4 OCPU, 24GB RAM (use all free quota on one VM)
# Image: Ubuntu 22.04 ARM
# Shape: VM.Standard.A1.Flex

# After SSH in:
sudo apt update && sudo apt install -y ffmpeg python3-pip python3-venv git

# Clone repo
git clone https://github.com/megan6million-prog/voltrix-tube.git
cd voltrix-tube/backend

# Setup Python env
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Run with gunicorn
pip install gunicorn
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8080
```

### Step 3 — Provision AMD VM (PostgreSQL + Redis)
```bash
# AMD VM.Standard.E2.1.Micro
sudo apt update
sudo apt install -y postgresql redis-server

# PostgreSQL setup
sudo -u postgres createuser voltrix_admin
sudo -u postgres createdb voltrix
sudo -u postgres psql -c "ALTER USER voltrix_admin WITH PASSWORD 'strong_password';"

# Redis setup (bind to localhost only)
sudo sed -i 's/bind 127.0.0.1/bind 0.0.0.0/' /etc/redis/redis.conf
sudo systemctl restart redis
```

### Step 4 — FFmpeg Worker Service
```bash
# Creates a systemd service that:
# 1. Polls R2 for new uploads (or listens via SQS)
# 2. Downloads raw video
# 3. Transcodes to HLS with FFmpeg
# 4. Uploads HLS segments back to R2
# 5. Calls API to mark content as ready

cat > /etc/systemd/system/voltrix-worker.service << EOF
[Unit]
Description=Voltrix FFmpeg Worker
After=network.target

[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/voltrix-tube/backend
Environment="PATH=/home/ubuntu/voltrix-tube/backend/venv/bin"
ExecStart=/home/ubuntu/voltrix-tube/backend/venv/bin/python worker.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable voltrix-worker
sudo systemctl start voltrix-worker
```

### Step 5 — FFmpeg Transcode Command
```bash
# Input: raw video from R2
# Output: HLS segments to R2

ffmpeg -i input.mp4 \
  -filter_complex \
    "[0:v]split=3[v1][v2][v3]; \
     [v1]scale=1280:720[v1out]; \
     [v2]scale=854:480[v2out]; \
     [v3]scale=640:360[v3out]" \
  -map "[v1out]" -map 0:a -c:v:0 libx264 -b:v:0 2500k -c:a:0 aac -b:a:0 128k \
  -map "[v2out]" -map 0:a -c:v:1 libx264 -b:v:1 1000k -c:a:1 aac -b:a:1 96k \
  -map "[v3out]" -map 0:a -c:v:2 libx264 -b:v:2 500k  -c:a:2 aac -b:a:2 64k \
  -f hls -hls_time 6 -hls_list_size 0 \
  -hls_segment_filename "output_%v/seg_%03d.ts" \
  -master_pl_name master.m3u8 \
  -var_stream_map "v:0,a:0 v:1,a:1 v:2,a:2" \
  output_%v/index.m3u8
```

### Step 6 — Update Railway → OCI
Once OCI is running, update Railway env vars to point to OCI:
```bash
# No more Railway needed — cancel subscription
# Update Neon DB → OCI PostgreSQL
# Update Redis → OCI Redis
```

### Step 7 — Update DNS
- Point API domain to OCI VM public IP
- Keep Cloudflare for DNS + CDN (free)

---

## Cost After Migration

| Service | Cost |
|---|---|
| OCI VMs | $0 (always free) |
| OCI PostgreSQL | $0 (always free) |
| R2 Storage (10GB) | $0 (free tier) |
| R2 Egress | $0 (no egress fees) |
| Cloudflare CDN | $0 |
| Vercel/CF Pages | $0 |
| Neon (keep as backup) | $0 (free tier) |
| **Total** | **$0/month** |

---

## Timeline
- Testing phase: Railway + Cloudflare Stream (now)
- OCI account ready: Migrate backend + FFmpeg worker
- Full production: OCI + R2 + Cloudflare Pages
