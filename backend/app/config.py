import os
from dataclasses import dataclass


@dataclass
class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/zkaccess")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "devsecret_change_me")
    VERIFIER_BIN: str = os.getenv("VERIFIER_BIN", os.path.join("..", "zk", "target", "release", "verifier-cli.exe"))
    JWT_COOKIE_NAME: str = "zkaccess_jwt"
    JWT_EXPIRES_MIN: int = 30
