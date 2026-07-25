from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, field_validator
from typing import Optional
import re

from app.db.session import get_db
from app.services.wallet_service import WalletService
from app.core.security import get_current_user

router = APIRouter()


class TopupRequest(BaseModel):
    amount_ugx: int
    gateway: str  # mtn / airtel / card / crypto
    phone_number: Optional[str] = None

    @field_validator("amount_ugx")
    @classmethod
    def validate_amount(cls, v: int) -> int:
        if v < 1000:
            raise ValueError("Minimum top-up is UGX 1,000")
        if v > 5000000:
            raise ValueError("Maximum top-up is UGX 5,000,000")
        return v

    @field_validator("gateway")
    @classmethod
    def validate_gateway(cls, v: str) -> str:
        allowed = ["mtn", "airtel", "card", "crypto"]
        if v not in allowed:
            raise ValueError(f"Gateway must be one of: {allowed}")
        return v


class TransferRequest(BaseModel):
    recipient_username: str
    amount_ugx: int
    message: Optional[str] = None

    @field_validator("amount_ugx")
    @classmethod
    def validate_amount(cls, v: int) -> int:
        if v < 500:
            raise ValueError("Minimum transfer is UGX 500")
        return v


class CoinPurchaseRequest(BaseModel):
    coin_package_id: str


@router.get("")
async def get_wallet(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = WalletService(db)
    wallet = await svc.get_wallet(user_id=user.id)
    return {"success": True, "data": wallet}


@router.get("/balance")
async def get_balance(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = WalletService(db)
    balance = await svc.get_balance(user_id=user.id)
    return {"success": True, "data": balance}


@router.post("/topup")
async def topup_wallet(
    body: TopupRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = WalletService(db)
    result = await svc.initiate_topup(
        user_id=user.id,
        amount_ugx=body.amount_ugx,
        gateway=body.gateway,
        phone_number=body.phone_number,
    )
    return {"success": True, "data": result}


@router.get("/topup/{topup_id}")
async def get_topup_status(
    topup_id: str,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = WalletService(db)
    result = await svc.get_topup_status(topup_id=topup_id, user_id=user.id)
    return {"success": True, "data": result}


@router.get("/transactions")
async def get_transactions(
    page: int = 1,
    limit: int = 20,
    tx_type: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = WalletService(db)
    result = await svc.get_transactions(
        user_id=user.id,
        page=page,
        limit=limit,
        tx_type=tx_type,
    )
    return {"success": True, "data": result}


@router.post("/transfer")
async def transfer_wallet(
    body: TransferRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = WalletService(db)
    result = await svc.transfer(
        sender_id=user.id,
        recipient_username=body.recipient_username,
        amount_ugx=body.amount_ugx,
        message=body.message,
    )
    return {"success": True, "data": result}


@router.get("/coins")
async def get_coins(
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = WalletService(db)
    result = await svc.get_coins(user_id=user.id)
    return {"success": True, "data": result}


@router.post("/coins/purchase")
async def purchase_coins(
    body: CoinPurchaseRequest,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    svc = WalletService(db)
    result = await svc.purchase_coins(
        user_id=user.id,
        package_id=body.coin_package_id,
    )
    return {"success": True, "data": result}
