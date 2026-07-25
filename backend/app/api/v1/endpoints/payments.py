from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
import hashlib, hmac, json
import structlog

from app.db.session import get_db
from app.services.wallet_service import WalletService
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()
logger = structlog.get_logger()


@router.post("/mtn-momo")
async def mtn_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """MTN MoMo payment callback."""
    body = await request.json()
    logger.info("webhook.mtn", body=body)

    status = body.get("status", "").upper()
    external_id = body.get("externalId")
    financial_txn = body.get("financialTransactionId", "")

    if status == "SUCCESSFUL" and external_id:
        svc = WalletService(db)
        try:
            await svc.complete_topup(
                topup_id=external_id,
                gateway_reference=financial_txn,
            )
        except Exception as e:
            logger.error("webhook.mtn.error", error=str(e))

    return {"status": "received"}


@router.post("/airtel-money")
async def airtel_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Airtel Money payment callback."""
    body = await request.json()
    logger.info("webhook.airtel", body=body)

    transaction = body.get("transaction", {})
    status = transaction.get("status", "").upper()
    external_id = transaction.get("id")
    airtel_txn_id = transaction.get("airtel_money_id", "")

    if status == "TS" and external_id:  # TS = Transaction Successful
        svc = WalletService(db)
        try:
            await svc.complete_topup(
                topup_id=external_id,
                gateway_reference=airtel_txn_id,
            )
        except Exception as e:
            logger.error("webhook.airtel.error", error=str(e))

    return {"status": "received"}


@router.post("/coinbase")
async def coinbase_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Coinbase Commerce webhook."""
    raw_body = await request.body()
    signature = request.headers.get("X-CC-Webhook-Signature", "")

    # Verify signature
    expected = hmac.new(
        settings.COINBASE_WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=400, detail="Invalid signature")

    body = json.loads(raw_body)
    event_type = body.get("event", {}).get("type")
    charge = body.get("event", {}).get("data", {})

    if event_type == "charge:confirmed":
        topup_id = charge.get("metadata", {}).get("topup_id")
        if topup_id:
            svc = WalletService(db)
            try:
                await svc.complete_topup(
                    topup_id=topup_id,
                    gateway_reference=charge.get("code", ""),
                )
            except Exception as e:
                logger.error("webhook.coinbase.error", error=str(e))

    return {"status": "received"}


@router.post("/flutterwave")
async def flutterwave_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """Flutterwave webhook — activated when approved."""
    raw_body = await request.body()
    signature = request.headers.get("verif-hash", "")

    if signature != settings.COINBASE_WEBHOOK_SECRET:  # reuse field for now
        raise HTTPException(status_code=400, detail="Invalid signature")

    body = json.loads(raw_body)
    event = body.get("event")
    data = body.get("data", {})

    if event == "charge.completed" and data.get("status") == "successful":
        meta = data.get("meta", {})
        topup_id = meta.get("topup_id")
        if topup_id:
            svc = WalletService(db)
            try:
                await svc.complete_topup(
                    topup_id=topup_id,
                    gateway_reference=str(data.get("id", "")),
                )
            except Exception as e:
                logger.error("webhook.flutterwave.error", error=str(e))

    return {"status": "received"}
