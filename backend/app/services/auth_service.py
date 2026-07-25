import boto3
import httpx
import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.core.config import get_settings
from app.models.user import User
from app.models.wallet import UserWallet, CreatorWallet

settings = get_settings()
logger = structlog.get_logger()


class AuthService:
    def __init__(self, db: AsyncSession | None):
        self.db = db
        self.cognito = boto3.client("cognito-idp", region_name=settings.COGNITO_REGION)
        self.client_id = settings.COGNITO_CLIENT_ID

    async def signup(self, username: str, phone: str, password: str) -> dict:
        # Check username uniqueness in DB
        existing = await self.db.execute(select(User).where(User.username == username))
        if existing.scalar_one_or_none():
            raise ValueError("Username already taken")

        existing_phone = await self.db.execute(select(User).where(User.phone_primary == phone))
        if existing_phone.scalar_one_or_none():
            raise ValueError("Phone number already registered")

        # In development: skip Cognito, create user directly
        if settings.ENVIRONMENT == "development":
            import hashlib, secrets
            cognito_sub = f"dev_{secrets.token_hex(16)}"
            # Store hashed password in bio field temporarily for dev
            user = User(
                cognito_sub=cognito_sub,
                username=username,
                phone_primary=phone,
                bio=f"__pwd:{hashlib.sha256(password.encode()).hexdigest()}",
            )
            self.db.add(user)
            await self.db.flush()
            wallet = UserWallet(user_id=user.id)
            self.db.add(wallet)
            await self.db.commit()
            return {"message": "Account created. Use /auth/login to sign in.", "phone": phone, "dev_mode": True}

        # Production: register in Cognito
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

    async def verify_otp(self, phone: str, otp: str) -> dict:
        # Development mode — any 6-digit OTP works, user already created
        if settings.ENVIRONMENT == "development":
            result = await self.db.execute(select(User).where(User.phone_primary == phone))
            user = result.scalar_one_or_none()
            if not user:
                raise ValueError("User not found")
            tokens = await self._generate_platform_tokens(user)
            return {**tokens, "user": {"id": str(user.id), "username": user.username}}

        # Production: Cognito OTP
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

        # Get Cognito user details
        user_info = self.cognito.admin_get_user(
            UserPoolId=settings.COGNITO_USER_POOL_ID,
            Username=phone,
        )
        attrs = {a["Name"]: a["Value"] for a in user_info["UserAttributes"]}
        cognito_sub = attrs.get("sub")
        username = attrs.get("preferred_username", phone)

        # Create user in our DB
        user = User(
            cognito_sub=cognito_sub,
            username=username,
            phone_primary=phone,
        )
        self.db.add(user)
        await self.db.flush()

        # Create wallet
        wallet = UserWallet(user_id=user.id)
        self.db.add(wallet)
        await self.db.commit()

        # Authenticate and return tokens
        tokens = await self._authenticate(phone=phone)
        return {**tokens, "user": {"id": str(user.id), "username": user.username}}

    async def login(self, phone: str, password: str) -> dict:
        # Development mode — bypass Cognito
        if settings.ENVIRONMENT == "development":
            import hashlib
            result = await self.db.execute(select(User).where(User.phone_primary == phone))
            user = result.scalar_one_or_none()
            if not user:
                raise ValueError("Phone number not found")
            # Check password hash stored in bio (dev only)
            pwd_hash = hashlib.sha256(password.encode()).hexdigest()
            if user.bio and f"__pwd:{pwd_hash}" not in user.bio:
                raise ValueError("Incorrect password")
            tokens = await self._generate_platform_tokens(user)
            return {**tokens, "user": {"id": str(user.id), "username": user.username, "role": user.role}}

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

    async def send_otp(self, phone: str, purpose: str = "login") -> None:
        try:
            if purpose == "password_reset":
                self.cognito.forgot_password(ClientId=self.client_id, Username=phone)
            else:
                # Resend confirmation OTP
                self.cognito.resend_confirmation_code(ClientId=self.client_id, Username=phone)
        except Exception as e:
            logger.warning("auth.send_otp.error", phone=phone, error=str(e))

    async def reset_password(self, phone: str, otp: str, new_password: str) -> None:
        try:
            self.cognito.confirm_forgot_password(
                ClientId=self.client_id,
                Username=phone,
                ConfirmationCode=otp,
                Password=new_password,
            )
        except self.cognito.exceptions.CodeMismatchException:
            raise ValueError("Invalid OTP code")

    async def refresh_token(self, refresh_token: str) -> dict:
        try:
            response = self.cognito.initiate_auth(
                ClientId=self.client_id,
                AuthFlow="REFRESH_TOKEN_AUTH",
                AuthParameters={"REFRESH_TOKEN": refresh_token},
            )
            return {"access_token": response["AuthenticationResult"]["AccessToken"]}
        except Exception:
            raise ValueError("Invalid or expired refresh token")

    async def social_login(self, provider: str, token: str) -> dict:
        # Verify token with provider and get user info
        user_info = await self._verify_social_token(provider=provider, token=token)

        # Check if user exists by social provider ID
        existing = await self.db.execute(
            select(User).join(
                "social_logins",
            ).where(
                User.cognito_sub.isnot(None)
            )
        )
        # Simplified: check by phone or create new user
        # Full implementation uses UserSocialLogin model
        user = existing.scalar_one_or_none()

        if not user:
            # Create new user from social login
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

        # Generate platform tokens
        tokens = await self._generate_platform_tokens(user)
        return {**tokens, "user": {"id": str(user.id), "username": user.username}, "is_new_user": True}

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
        base = re.sub(r"[^a-z0-9_]", "", base.lower().replace(" ", "_"))[:20]
        if not base:
            base = "user"
        candidate = base
        counter = 1
        while True:
            existing = await self.db.execute(select(User).where(User.username == candidate))
            if not existing.scalar_one_or_none():
                return candidate
            candidate = f"{base}{counter}"
            counter += 1

    async def _authenticate(self, phone: str) -> dict:
        # For testing - returns mock tokens
        # In production this calls Cognito initiate_auth
        return {
            "access_token": "pending_verification",
            "refresh_token": "pending_verification",
        }

    async def _get_or_create_user_from_token(self, id_token: str) -> User:
        import re
        # Decode JWT to get sub (simplified - use python-jose in production)
        import base64, json
        parts = id_token.split(".")
        payload = json.loads(base64.b64decode(parts[1] + "==").decode())
        cognito_sub = payload.get("sub")

        result = await self.db.execute(select(User).where(User.cognito_sub == cognito_sub))
        return result.scalar_one_or_none()

    async def _generate_platform_tokens(self, user: User) -> dict:
        from jose import jwt
        from datetime import timedelta, timezone
        now = __import__("datetime").datetime.now(timezone.utc)
        access_payload = {
            "sub": str(user.id),
            "username": user.username,
            "role": user.role,
            "exp": now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        }
        access_token = jwt.encode(access_payload, settings.SECRET_KEY, algorithm="HS256")
        return {"access_token": access_token, "refresh_token": "cognito_managed"}


import re
