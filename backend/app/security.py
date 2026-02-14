import os
import base64
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
import jwt


def random_salt(n: int = 16) -> bytes:
    return os.urandom(n)


def random_nonce(n: int = 16) -> bytes:
    return os.urandom(n)


def sha256_commitment(salt: bytes, password: str) -> bytes:
    h = hashlib.sha256()
    h.update(salt)
    h.update(password.encode("utf-8"))
    return h.digest()


def b2hex(b: bytes) -> str:
    return b.hex()


def hex2b(s: str) -> bytes:
    return bytes.fromhex(s)


def jwt_encode(secret: str, sub: str, minutes: int = 30) -> str:
    now = datetime.now(tz=timezone.utc)
    payload = {
        "sub": sub,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=minutes)).timestamp()),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def jwt_decode(secret: str, token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, secret, algorithms=["HS256"])
    except Exception:
        return None
