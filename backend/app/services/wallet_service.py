import uuid
import boto3
import httpx
import structlog
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.config import get_settings
from app.models.wallet import UserWallet, WalletTransaction, PaymentTopup

settings = get_settings()
logger = structlog.get_logger()

# Coin packages available for purchase
COIN_PACKAGES = {
    "coins_100":  {"coins": 100,  "price_ugx": 1000},
    "coins_500":  {"coins": 500,  "price_ugx": 4500},
    "coins_1000": {"coins": 1000, "price_ugx": 8000},
    "coins_5000": {"coins": 5000, "price_ugx": 35000},
}


class WalletService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_wallet(self, user_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(UserWallet).where(UserWallet.user_id == user_id)
        )
        wallet = result.scalar_one_or_none()
        if not wallet:
            raise ValueError("Wallet not found")
        return {
            "balance_ugx": wallet.balance_ugx,
            "bonus_balance_ugx": wallet.bonus_balance_ugx,
            "lifetime_topup": wallet.lifetime_topup,
            "lifetime_spent": wallet.lifetime_spent,
            "is_frozen": wallet.is_frozen,
        }

    async def get_balance(self, user_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(UserWallet.balance_ugx, UserWallet.bonus_balance_ugx)
            .where(UserWallet.user_id == user_id)
        )
        row = result.first()
        return {"balance_ugx": row[0] if row else 0, "bonus_balance_ugx": row[1] if row else 0}

    async def initiate_topup(
        self,
        user_id: uuid.UUID,
        amount_ugx: int,
        gateway: str,
        phone_number: str | None,
    ) -> dict:
        # Check wallet not frozen
        wallet = await self._get_wallet(user_id)
        if wallet.is_frozen:
            raise ValueError("Wallet is frozen. Contact support.")

        # Create pending topup record
        topup = PaymentTopup(
            user_id=user_id,
            amount_ugx=amount_ugx,
            gateway=gateway,
            phone_number=phone_number,
            status="pending",
        )
        self.db.add(topup)
        await self.db.flush()

        # Call payment gateway
        if gateway == "mtn":
            result = await self._initiate_mtn_collection(
                topup_id=str(topup.id),
                amount_ugx=amount_ugx,
                phone=phone_number,
            )
        elif gateway == "airtel":
            result = await self._initiate_airtel_collection(
                topup_id=str(topup.id),
                amount_ugx=amount_ugx,
                phone=phone_number,
            )
        elif gateway == "crypto":
            result = await self._initiate_coinbase_charge(
                topup_id=str(topup.id),
                amount_ugx=amount_ugx,
            )
        else:
            result = {"status": "pending", "message": "Card payment initiated"}

        # Update topup with gateway reference
        if result.get("gateway_reference"):
            topup.gateway_reference = result["gateway_reference"]
        await self.db.commit()

        return {
            "topup_id": str(topup.id),
            "status": "pending",
            "gateway": gateway,
            "amount_ugx": amount_ugx,
            "message": result.get("message", "Confirm payment on your phone"),
            "ussd_prompt": result.get("ussd_prompt"),
            "payment_url": result.get("payment_url"),
        }

    async def complete_topup(self, topup_id: str, gateway_reference: str) -> None:
        """Called by webhook handler when payment is confirmed."""
        result = await self.db.execute(
            select(PaymentTopup).where(
                PaymentTopup.id == uuid.UUID(topup_id),
                PaymentTopup.status == "pending",
            )
        )
        topup = result.scalar_one_or_none()
        if not topup:
            logger.warning("wallet.topup.not_found", topup_id=topup_id)
            return

        # Mark topup complete
        topup.status = "completed"
        topup.gateway_reference = gateway_reference
        topup.completed_at = datetime.now(timezone.utc)

        # Credit wallet
        wallet = await self._get_wallet(topup.user_id)
        balance_before = wallet.balance_ugx
        wallet.balance_ugx += topup.amount_ugx
        wallet.lifetime_topup += topup.amount_ugx

        # First top-up bonus (10%)
        bonus = 0
        if wallet.lifetime_topup == topup.amount_ugx:
            bonus = int(topup.amount_ugx * 0.10)
            wallet.bonus_balance_ugx += bonus

        # Log transaction
        tx = WalletTransaction(
            user_id=topup.user_id,
            type="topup",
            amount_ugx=topup.amount_ugx,
            balance_before=balance_before,
            balance_after=wallet.balance_ugx,
            description=f"Wallet top-up via {topup.gateway.upper()}",
            reference_id=gateway_reference,
            payment_method=topup.gateway,
            status="completed",
        )
        self.db.add(tx)

        if bonus > 0:
            bonus_tx = WalletTransaction(
                user_id=topup.user_id,
                type="bonus",
                amount_ugx=bonus,
                balance_before=wallet.balance_ugx,
                balance_after=wallet.balance_ugx + bonus,
                description="First top-up bonus (10%)",
                status="completed",
            )
            self.db.add(bonus_tx)

        await self.db.commit()
        logger.info("wallet.topup.completed", user_id=str(topup.user_id), amount=topup.amount_ugx)

    async def deduct(
        self,
        user_id: uuid.UUID,
        amount_ugx: int,
        description: str,
        reference_id: str | None = None,
        tx_type: str = "spend",
    ) -> None:
        """Deduct from wallet. Raises ValueError if insufficient balance."""
        wallet = await self._get_wallet(user_id)

        if wallet.is_frozen:
            raise ValueError("Wallet is frozen")

        # Use bonus balance first
        available = wallet.balance_ugx + wallet.bonus_balance_ugx
        if available < amount_ugx:
            raise ValueError(f"Insufficient balance. Available: UGX {available:,}, Required: UGX {amount_ugx:,}")

        balance_before = wallet.balance_ugx
        bonus_before = wallet.bonus_balance_ugx

        # Deduct from bonus first, then real balance
        if wallet.bonus_balance_ugx >= amount_ugx:
            wallet.bonus_balance_ugx -= amount_ugx
        else:
            remainder = amount_ugx - wallet.bonus_balance_ugx
            wallet.bonus_balance_ugx = 0
            wallet.balance_ugx -= remainder

        wallet.lifetime_spent += amount_ugx

        tx = WalletTransaction(
            user_id=user_id,
            type=tx_type,
            amount_ugx=-amount_ugx,
            balance_before=balance_before,
            balance_after=wallet.balance_ugx,
            description=description,
            reference_id=reference_id,
            payment_method="wallet",
            status="completed",
        )
        self.db.add(tx)
        await self.db.flush()

    async def transfer(
        self,
        sender_id: uuid.UUID,
        recipient_username: str,
        amount_ugx: int,
        message: str | None,
    ) -> dict:
        from app.models.user import User
        result = await self.db.execute(
            select(User).where(User.username == recipient_username)
        )
        recipient = result.scalar_one_or_none()
        if not recipient:
            raise ValueError("Recipient not found")
        if recipient.id == sender_id:
            raise ValueError("Cannot transfer to yourself")

        await self.deduct(
            user_id=sender_id,
            amount_ugx=amount_ugx,
            description=f"Transfer to @{recipient_username}: {message or ''}",
            tx_type="transfer_sent",
        )

        # Credit recipient
        recipient_wallet = await self._get_wallet(recipient.id)
        balance_before = recipient_wallet.balance_ugx
        recipient_wallet.balance_ugx += amount_ugx

        rx_tx = WalletTransaction(
            user_id=recipient.id,
            type="transfer_received",
            amount_ugx=amount_ugx,
            balance_before=balance_before,
            balance_after=recipient_wallet.balance_ugx,
            description=f"Transfer from @{sender_id}",
            status="completed",
        )
        self.db.add(rx_tx)
        await self.db.commit()

        return {"transferred": True, "amount_ugx": amount_ugx, "recipient": recipient_username}

    async def get_transactions(
        self,
        user_id: uuid.UUID,
        page: int,
        limit: int,
        tx_type: str | None,
    ) -> dict:
        query = select(WalletTransaction).where(WalletTransaction.user_id == user_id)
        if tx_type:
            query = query.where(WalletTransaction.type == tx_type)
        query = query.order_by(WalletTransaction.created_at.desc())
        query = query.offset((page - 1) * limit).limit(limit)

        result = await self.db.execute(query)
        txns = result.scalars().all()

        return {
            "transactions": [
                {
                    "id": str(t.id),
                    "type": t.type,
                    "amount_ugx": t.amount_ugx,
                    "balance_after": t.balance_after,
                    "description": t.description,
                    "status": t.status,
                    "created_at": t.created_at.isoformat(),
                }
                for t in txns
            ],
            "page": page,
            "limit": limit,
        }

    async def get_topup_status(self, topup_id: str, user_id: uuid.UUID) -> dict:
        result = await self.db.execute(
            select(PaymentTopup).where(
                PaymentTopup.id == uuid.UUID(topup_id),
                PaymentTopup.user_id == user_id,
            )
        )
        topup = result.scalar_one_or_none()
        if not topup:
            raise ValueError("Topup not found")
        return {
            "topup_id": str(topup.id),
            "status": topup.status,
            "amount_ugx": topup.amount_ugx,
            "gateway": topup.gateway,
            "completed_at": topup.completed_at.isoformat() if topup.completed_at else None,
        }

    async def get_coins(self, user_id: uuid.UUID) -> dict:
        return {
            "balance": 0,
            "packages": [
                {"id": k, **v} for k, v in COIN_PACKAGES.items()
            ],
        }

    async def purchase_coins(self, user_id: uuid.UUID, package_id: str) -> dict:
        package = COIN_PACKAGES.get(package_id)
        if not package:
            raise ValueError("Invalid coin package")

        await self.deduct(
            user_id=user_id,
            amount_ugx=package["price_ugx"],
            description=f"Purchased {package['coins']} Voltrix Coins",
            tx_type="spend",
        )
        await self.db.commit()
        return {"coins_added": package["coins"], "price_ugx": package["price_ugx"]}

    # ── Private helpers ───────────────────────────────────────────────────────
    async def _get_wallet(self, user_id: uuid.UUID) -> UserWallet:
        result = await self.db.execute(
            select(UserWallet).where(UserWallet.user_id == user_id)
        )
        wallet = result.scalar_one_or_none()
        if not wallet:
            raise ValueError("Wallet not found")
        return wallet

    async def _initiate_mtn_collection(
        self, topup_id: str, amount_ugx: int, phone: str | None
    ) -> dict:
        """Initiate MTN MoMo collection request."""
        import uuid as _uuid
        reference_id = str(_uuid.uuid4())
        try:
            async with httpx.AsyncClient() as client:
                # Get access token
                token_resp = await client.post(
                    f"{settings.MTN_MOMO_BASE_URL}/collection/token/",
                    headers={
                        "Authorization": f"Basic {settings.MTN_MOMO_COLLECTION_SECRET}",
                        "Ocp-Apim-Subscription-Key": settings.MTN_MOMO_COLLECTION_PRIMARY_KEY,
                    },
                )
                access_token = token_resp.json().get("access_token")

                # Request to pay
                await client.post(
                    f"{settings.MTN_MOMO_BASE_URL}/collection/v1_0/requesttopay",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "X-Reference-Id": reference_id,
                        "X-Target-Environment": settings.MTN_MOMO_ENVIRONMENT,
                        "Ocp-Apim-Subscription-Key": settings.MTN_MOMO_COLLECTION_PRIMARY_KEY,
                        "Content-Type": "application/json",
                    },
                    json={
                        "amount": str(amount_ugx),
                        "currency": "UGX",
                        "externalId": topup_id,
                        "payer": {"partyIdType": "MSISDN", "partyId": phone.replace("+", "")},
                        "payerMessage": "Voltrix wallet top-up",
                        "payeeNote": f"Topup {topup_id}",
                    },
                )
            return {
                "gateway_reference": reference_id,
                "message": "Confirm payment on your phone. Dial *165# if no prompt appears.",
                "ussd_prompt": "*165#",
            }
        except Exception as e:
            logger.error("mtn.collection.error", error=str(e))
            return {"message": "Payment initiated", "gateway_reference": reference_id}

    async def _initiate_airtel_collection(
        self, topup_id: str, amount_ugx: int, phone: str | None
    ) -> dict:
        """Initiate Airtel Money collection request."""
        import uuid as _uuid
        reference_id = str(_uuid.uuid4())
        try:
            async with httpx.AsyncClient() as client:
                # Get token
                token_resp = await client.post(
                    f"{settings.AIRTEL_BASE_URL}/auth/oauth2/token",
                    json={
                        "client_id": settings.AIRTEL_CLIENT_ID,
                        "client_secret": settings.AIRTEL_CLIENT_SECRET,
                        "grant_type": "client_credentials",
                    },
                )
                access_token = token_resp.json().get("access_token")

                # Request payment
                await client.post(
                    f"{settings.AIRTEL_BASE_URL}/merchant/v2/payments/",
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "reference": reference_id,
                        "subscriber": {
                            "country": "UG",
                            "currency": "UGX",
                            "msisdn": phone.replace("+256", "").replace("+", ""),
                        },
                        "transaction": {
                            "amount": amount_ugx,
                            "country": "UG",
                            "currency": "UGX",
                            "id": topup_id,
                        },
                    },
                )
            return {
                "gateway_reference": reference_id,
                "message": "Confirm payment on your phone. Dial *185# if no prompt appears.",
                "ussd_prompt": "*185#",
            }
        except Exception as e:
            logger.error("airtel.collection.error", error=str(e))
            return {"message": "Payment initiated", "gateway_reference": reference_id}

    async def _initiate_coinbase_charge(self, topup_id: str, amount_ugx: int) -> dict:
        """Create a Coinbase Commerce charge."""
        # Convert UGX to USD (approximate)
        amount_usd = round(amount_ugx / 3800, 2)
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    "https://api.commerce.coinbase.com/charges",
                    headers={
                        "X-CC-Api-Key": settings.COINBASE_API_KEY,
                        "X-CC-Version": "2018-03-22",
                        "Content-Type": "application/json",
                    },
                    json={
                        "name": "Voltrix Wallet Top-Up",
                        "description": f"Top-up UGX {amount_ugx:,}",
                        "pricing_type": "fixed_price",
                        "local_price": {"amount": str(amount_usd), "currency": "USD"},
                        "metadata": {"topup_id": topup_id},
                    },
                )
                data = resp.json()["data"]
                return {
                    "gateway_reference": data["code"],
                    "payment_url": data["hosted_url"],
                    "message": "Complete payment at the link provided",
                }
        except Exception as e:
            logger.error("coinbase.charge.error", error=str(e))
            return {"message": "Crypto payment initiated"}
