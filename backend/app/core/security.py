from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from jose import jwt, JWTError
import boto3

from app.core.config import get_settings
from app.db.session import get_db
from app.models.user import User

settings = get_settings()
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    token = credentials.credentials
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=["HS256"])
        user_id: str = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    except JWTError:
        # Try Cognito token verification
        try:
            user_id = await _verify_cognito_token(token)
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if user.is_banned:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account suspended")

    return user


async def get_current_admin(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("admin", "moderator"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user


async def get_current_creator(user: User = Depends(get_current_user)) -> User:
    if user.role not in ("creator", "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Creator access required")
    return user


async def _verify_cognito_token(token: str) -> str:
    """Verify Cognito JWT and return user sub."""
    import httpx, json, base64
    from jose import jwk
    from jose.utils import base64url_decode

    # Fetch Cognito public keys
    keys_url = (
        f"https://cognito-idp.{settings.COGNITO_REGION}.amazonaws.com/"
        f"{settings.COGNITO_USER_POOL_ID}/.well-known/jwks.json"
    )
    async with httpx.AsyncClient() as client:
        response = await client.get(keys_url)
        keys = response.json()["keys"]

    # Get header to find key id
    header = json.loads(base64.b64decode(token.split(".")[0] + "==").decode())
    kid = header.get("kid")

    key = next((k for k in keys if k["kid"] == kid), None)
    if not key:
        raise ValueError("Public key not found")

    public_key = jwk.construct(key)
    message, encoded_sig = token.rsplit(".", 1)
    decoded_sig = base64url_decode(encoded_sig.encode("utf-8"))

    if not public_key.verify(message.encode("utf-8"), decoded_sig):
        raise ValueError("Signature verification failed")

    payload = json.loads(base64.b64decode(token.split(".")[1] + "==").decode())
    return payload.get("sub")
