from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, field_validator
import re, httpx, uuid

from app.db.session import get_db
from app.services.auth_service import AuthService
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()


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
    token: str


class RefreshRequest(BaseModel):
    refresh_token: str


class ResetPasswordRequest(BaseModel):
    phone: str
    otp: str
    new_password: str


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(body: SignupRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    result = await svc.signup(username=body.username, phone=body.phone_primary, password=body.password)
    return {"success": True, "data": result}


@router.post("/verify-otp")
async def verify_otp(body: VerifyOTPRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    result = await svc.verify_otp(phone=body.phone, otp=body.otp)
    return {"success": True, "data": result}


@router.post("/login")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    result = await svc.login(phone=body.phone, password=body.password)
    return {"success": True, "data": result}


@router.post("/login/otp")
async def login_otp(body: LoginOTPRequest):
    svc = AuthService(None)
    await svc.send_otp(phone=body.phone)
    return {"success": True, "data": {"message": "OTP sent"}}


@router.post("/social/google")
async def social_google(body: SocialLoginRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    result = await svc.social_login(provider="google", token=body.token)
    return {"success": True, "data": result}


@router.post("/social/facebook")
async def social_facebook(body: SocialLoginRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    result = await svc.social_login(provider="facebook", token=body.token)
    return {"success": True, "data": result}


@router.post("/social/apple")
async def social_apple(body: SocialLoginRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    result = await svc.social_login(provider="apple", token=body.token)
    return {"success": True, "data": result}


# ── Google OAuth Flow (redirect-based) ───────────────────────────────────────
@router.get("/social/google/redirect")
async def google_redirect():
    """Redirect user to Google OAuth consent screen."""
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    if not client_id:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")
    redirect_uri = f"{getattr(settings, 'APP_BASE_URL', 'https://voltrix-api-production.up.railway.app')}/v1/auth/social/google/callback"
    scope = "openid email profile"
    url = (
        f"https://accounts.google.com/o/oauth2/v2/auth"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&access_type=offline"
    )
    return RedirectResponse(url)


@router.get("/social/google/callback")
async def google_callback(code: str, db: AsyncSession = Depends(get_db)):
    """Handle Google OAuth callback, create/login user, redirect to frontend."""
    client_id = getattr(settings, "GOOGLE_CLIENT_ID", "")
    client_secret = getattr(settings, "GOOGLE_CLIENT_SECRET", "")
    redirect_uri = f"{getattr(settings, 'APP_BASE_URL', 'https://voltrix-api-production.up.railway.app')}/v1/auth/social/google/callback"
    frontend_url = getattr(settings, "CLOUDFRONT_DOMAIN", "https://voltrix-ug.vercel.app")

    async with httpx.AsyncClient() as client:
        # Exchange code for tokens
        token_resp = await client.post("https://oauth2.googleapis.com/token", data={
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code",
        })
        token_data = token_resp.json()
        id_token = token_data.get("id_token", "")

    # Login via social
    svc = AuthService(db)
    result = await svc.social_login(provider="google", token=id_token)
    data = result

    # Redirect to frontend with tokens in URL fragment
    access_token = data.get("access_token", "")
    return RedirectResponse(
        f"{frontend_url}/auth/callback#access_token={access_token}&refresh_token={data.get('refresh_token','')}"
    )


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
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    await svc.reset_password(phone=body.phone, otp=body.otp, new_password=body.new_password)
    return {"success": True, "data": {"message": "Password reset successfully"}}
