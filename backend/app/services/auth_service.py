import boto3
import httpx
import uuid
import hashlib
import secrets
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.core.config import get_settings
from app.models.user import User
from app.models.wallet import UserWallet, CreatorWallet

settings = get_settings()
logger = structlog.get_logger()

DEV_MODE = settings.ENVIRONMENT == "development"


class AuthService:
    def __init__(self, db: AsyncSession | None):
        self.db = db
        if not DEV_MODE:
            self.cognito = boto3.client("cognito-idp", region_name=settings.COGNITO_REGION)
        self.client_id = settings.COGNITO_CLIENT_ID

    # ── Signup ────────────────────────────────────────────────────────────────
    async def signup(self, username: str, phone: str, password: str) -> dict:
        existing = await self.db.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            raise ValueError("Username already taken")

        existing_phone = await self.db.execute(select(User).where(User.phone_primary == phone))
        if existing_phone.scalar_one_or_none():
            raise ValueError("Phone number already registered")

        if DEV_MODE:
            # In dev: create user immediately, no OTP needed
            pwd_hash = hashlib.sha256(password.encode()).hexdigest()
            cognito_sub = f"dev_{secrets.token_hex(16)}"
            user = User(
                cognito_sub=cognito_sub,
                username=username,
                phone_primary=phone,
                bio=f"__pwd:{pwd_hash}",  # store hash temporarily in bio
            )
            self.db.add(user)
            await self.db.flush()
            wallet = UserWallet(user_id=user.id)
            self.db.add(wallet)
            await self.db.commit()

            # Return tokens immediately in dev — skip OTP step
            tokens = self._generate_dev_tokens(user)
            return {
                **tokens,
                "user": {"id": str(user.id), "username": user.username, "role": user.role},
                "skip_otp": True,
                "dev_mode": True,
            }

        # Production: Cognito
        try:
            self.cognito.sign_up(
                ClientId=self.client_id,
                Username=phone,
                Password=password,
                UserAttributes=[
                    {"Name": "phone_number", "Value": phone},
                    {"Name": "preferred_username", "Value": username},
                ],
            )
        except self.cognito.exceptions.UsernameExistsException:
            raise ValueError("Phone number already registered")
        except self.cognito.exceptions.InvalidPasswordException as e:
            raise ValueError(str(e))

        return {"message": "OTP sent to your phone", "phone": phone}

    # ── Verify OTP ────────────────────────────────────────────────────────────
    async def verify_otp(self, phone: str, otp: str) -> dict:
        if DEV_MODE:
            # In dev: any 6-digit code works
            result = await self.db.execute(select(User).where(User.phone_primary == phone))
            user = result.scalar_one_or_none()
            if not user:
                raise ValueError("User not found")
            tokens = self._generate_dev_tokens(user)
            return {**tokens, "user": {"id": str(user.id), "username": user.username, "role": user.role}}

        # Production: Cognito
        try:
            self.cognito.confirm_sign_up(
                ClientId=self.client_id,
                Username=phone,
                ConfirmationCode=otp,
            )
        except self.cognito.exceptions.CodeMismatchException:
            raise ValueError("Invalid OTP code")
        except self.cognito.exceptions.ExpiredCodeException:
            raise ValueError("OTP code has expired")

        user_info = self.cognito.admin_get_user(
            UserPoolId=settings.COGNITO_USER_POOL_ID,
            Username=phone,
        )
        attrs = {a["Name"]: a["Value"] for a in user_info["UserAttributes"]}
        cognito_sub = attrs.get("sub")
        username = attrs.get("preferred_username", phone)

        user = User(cognito_sub=cognito_sub, username=username, phone_primary=phone)
        self.db.add(user)
        await self.db.flush()
        wallet = UserWallet(user_id=user.id)
        self.db.add(wallet)
        await self.db.commit()

        tokens = await self._authenticate(phone=phone)
        return {**tokens, "user": {"id": str(user.id), "username": user.username}}

    # ── Login ─────────────────────────────────────────────────────────────────
    async def login(self, phone: str, password: str) -> dict:
        if DEV_MODE:
            result = await self.db.execute(select(User).where(User.phone_primary == phone))
            user = result.scalar_one_or_none()
            if not user:
                raise ValueError("No account found with this phone number")

            # Check password hash stored in bio
            pwd_hash = hashlib.sha256(password.encode()).hexdigest()
            expected = f"__pwd:{pwd_hash}"
            if user.bio and not user.bio.startswith("__pwd:"):
                # bio is real bio content — allow any password in dev
                pass
            elif user.bio != expected:
                raise ValueError("Incorrect password")

            tokens = self._generate_dev_tokens(user)
            return {
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "user": {"id": str(user.id), "username": user.username, "role": user.role},
            }

        # Production: Cognito
        try:
            response = self.cognito.initiate_auth(
                ClientId=self.client_id,
                AuthFlow="USER_PASSWORD_AUTH",
                AuthParameters={"USERNAME": phone, "PASSWORD": password},
            )
        except self.cognito.exceptions.NotAuthorizedException:
            raise ValueError("Incorrect phone number or password")
        except self.cognito.exceptions.UserNotConfirmedException:
            raise ValueError("Phone number not verified. Please verify first.")

        auth = response["AuthenticationResult"]
        user = await self._get_or_create_user_from_token(auth["IdToken"])
        return {
            "access_token": auth["AccessToken"],
            "refresh_token": auth["RefreshToken"],
            "user": {"id": str(user.id), "username": user.username, "role": user.role},
        }

    # ── OTP send ──────────────────────────────────────────────────────────────
    async def send_otp(self, phone: str, purpose: str = "login") -> None:
        if DEV_MODE:
            logger.info("dev.otp.skipped", phone=phone, purpose=purpose,
                        note="In dev mode any 6-digit code works")
            return
        try:
            if purpose == "password_reset":
                self.cognito.forgot_password(ClientId=self.client_id, Username=phone)
            else:
                self.cognito.resend_confirmation_code(ClientId=self.client_id, Username=phone)
        except Exception as e:
            logger.warning("auth.send_otp.error", phone=phone, error=str(e))

    # ── Reset password ────────────────────────────────────────────────────────
    async def reset_password(self, phone: str, otp: str, new_password: str) -> None:
        if DEV_MODE:
            result = await self.db.execute(select(User).where(User.phone_primary == phone))
            user = result.scalar_one_or_none()
            if user:
                pwd_hash = hashlib.sha256(new_password.encode()).hexdigest()
                user.bio = f"__pwd:{pwd_hash}"
                await self.db.commit()
            return

        try:
            self.cognito.confirm_forgot_password(
                ClientId=self.client_id,
                Username=phone,
                ConfirmationCode=otp,
                Password=new_password,
            )
        except self.cognito.exceptions.CodeMismatchException:
            raise ValueError("Invalid OTP code")

    # ── Refresh token ─────────────────────────────────────────────────────────
    async def refresh_token(self, refresh_token: str) -> dict:
        if DEV_MODE:
            from jose import jwt
            try:
                payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=["HS256"])
                user_id = payload.get("sub")
                result = await self.db.execute(select(User).where(User.id == user_id))
                user = result.scalar_one_or_none()
                if user:
                    tokens = self._generate_dev_tokens(user)
                    return {"access_token": tokens["access_token"]}
            except Exception:
                pass
            raise ValueError("Invalid refresh token")

        try:
            response = self.cognito.initiate_auth(
                ClientId=self.client_id,
                AuthFlow="REFRESH_TOKEN_AUTH",
                AuthParameters={"REFRESH_TOKEN": refresh_token},
            )
            return {"access_token": response["AuthenticationResult"]["AccessToken"]}
        except Exception:
            raise ValueError("Invalid or expired refresh token")

    # ── Social login ──────────────────────────────────────────────────────────
    async def social_login(self, provider: str, token: str) -> dict:
        if DEV_MODE:
            # In dev: create a test social user
            username = f"{provider}_testuser_{secrets.token_hex(4)}"
            phone = f"+25670{secrets.randbelow(9000000) + 1000000}"
            user = User(
                cognito_sub=f"{provider}_{secrets.token_hex(16)}",
                username=username,
                phone_primary=phone,
            )
            self.db.add(user)
            await self.db.flush()
            wallet = UserWallet(user_id=user.id)
            self.db.add(wallet)
            await self.db.commit()
            tokens = self._generate_dev_tokens(user)
            return {**tokens, "user": {"id": str(user.id), "username": user.username}, "is_new_user": True}

        user_info = await self._verify_social_token(provider=provider, token=token)
        username = await self._generate_unique_username(user_info.get("name", "user"))
        user = User(
            cognito_sub=f"{provider}_{user_info['id']}",
            username=username,
            phone_primary=user_info.get("phone", f"+256{uuid.uuid4().hex[:9]}"),
        )
        self.db.add(user)
        await self.db.flush()
        wallet = UserWallet(user_id=user.id)
        self.db.add(wallet)
        await self.db.commit()
        tokens = self._generate_dev_tokens(user)
        return {**tokens, "user": {"id": str(user.id), "username": user.username}, "is_new_user": True}

    # ── Helpers ───────────────────────────────────────────────────────────────
    def _generate_dev_tokens(self, user: User) -> dict:
        from jose import jwt
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        access_payload = {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role,
            "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        }
        refresh_payload = {
            "sub": str(user.id),
            "exp": now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        }
        access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm="HS256")
        refresh_token = jwt.encode(refresh_payload, settings.SECRET_KEY, algorithm="HS256")
        return {"access_token": access_token, "refresh_token": refresh_token}

    async def _verify_social_token(self, provider: str, token: str) -> dict:
        async with httpx.AsyncClient() as client:
            if provider == "google":
                r = await client.get(f"https://oauth2.googleapis.com/tokeninfo?id_token={token}")
                data = r.json()
                return {"id": data["sub"], "name": data.get("name", ""), "email": data.get("email")}
            elif provider == "facebook":
                r = await client.get(f"https://graph.facebook.com/me?access_token={token}&fields=id,name,email")
                data = r.json()
                return {"id": data["id"], "name": data.get("name", ""), "email": data.get("email")}
        return {}

    async def _generate_unique_username(self, base: str) -> str:
        base = re.sub(r"[^a-z0-9_]", "", base.lower().replace(" ", "_"))[:20] or "user"
        candidate = base
        counter = 1
        while True:
            existing = await self.db.execute(select(User).where(User.username == candidate))
            if not existing.scalar_one_or_none():
                return candidate
            candidate = f"{base}{counter}"
            counter += 1

    async def _authenticate(self, phone: str) -> dict:
        return {"access_token": "pending_verification", "refresh_token": "pending_verification"}

    async def _get_or_create_user_from_token(self, id_token: str) -> User:
        import base64, json
        parts = id_token.split(".")
        payload = json.loads(base64.b64decode(parts[1] + "==").decode())
        cognito_sub = payload.get("sub")
        result = await self.db.execute(select(User).where(User.cognito_sub == cognito_sub))
        return result.scalar_one_or_none()
