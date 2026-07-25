from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, field_validator
import re

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.services.wallet_service import WalletService

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    username: str
    phone_primary: str
    password: str

    @field_validator("phone_primary")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        v = v.strip().replace(" ", "")
        if not re.match(r"^\+256\d{9}$", v):
            raise ValueError("Phone must be a valid Uganda number: +256XXXXXXXXX")
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v: str) -> str:
        v = v.strip().lower()
        if not re.match(r"^[a-z0-9_]{3,50}$", v):
            raise ValueError("Username must be 3-50 chars, letters/numbers/underscore only")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class VerifyOTPRequest(BaseModel):
    phone: str
    otp: str


class LoginRequest(BaseModel):
    phone: str
    password: str


class LoginOTPRequest(BaseModel):
    phone: str


class SocialLoginRequest(BaseModel):
    token: str  # id_token from Google/Facebook/Apple


class RefreshRequest(BaseModel):
    refresh_token: str


class ResetPasswordRequest(BaseModel):
    phone: str
    otp: str
    new_password: str


# ── Endpoints ─────────────────────────────────────────────────────────────────
@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(
    body: SignupRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    result = await svc.signup(
        username=body.username,
        phone=body.phone_primary,
        password=body.password,
    )
    return {"success": True, "data": result}


@router.post("/verify-otp")
async def verify_otp(
    body: VerifyOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    result = await svc.verify_otp(phone=body.phone, otp=body.otp)
    return {"success": True, "data": result}


@router.post("/login")
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    result = await svc.login(phone=body.phone, password=body.password)
    return {"success": True, "data": result}


@router.post("/login/otp")
async def login_otp(body: LoginOTPRequest):
    svc = AuthService(None)
    await svc.send_otp(phone=body.phone)
    return {"success": True, "data": {"message": "OTP sent"}}


@router.post("/social/google")
async def social_google(
    body: SocialLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    result = await svc.social_login(provider="google", token=body.token)
    return {"success": True, "data": result}


@router.post("/social/facebook")
async def social_facebook(
    body: SocialLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    result = await svc.social_login(provider="facebook", token=body.token)
    return {"success": True, "data": result}


@router.post("/social/apple")
async def social_apple(
    body: SocialLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    result = await svc.social_login(provider="apple", token=body.token)
    return {"success": True, "data": result}


@router.post("/refresh")
async def refresh(body: RefreshRequest):
    svc = AuthService(None)
    result = await svc.refresh_token(refresh_token=body.refresh_token)
    return {"success": True, "data": result}


@router.post("/logout")
async def logout():
    return {"success": True, "data": {"message": "Logged out"}}


@router.post("/forgot-password")
async def forgot_password(body: LoginOTPRequest):
    svc = AuthService(None)
    await svc.send_otp(phone=body.phone, purpose="password_reset")
    return {"success": True, "data": {"message": "OTP sent"}}


@router.post("/reset-password")
async def reset_password(
    body: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    svc = AuthService(db)
    await svc.reset_password(
        phone=body.phone,
        otp=body.otp,
        new_password=body.new_password,
    )
    return {"success": True, "data": {"message": "Password reset successfully"}}
