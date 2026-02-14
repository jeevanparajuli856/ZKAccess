import os
from dataclasses import dataclass


@dataclass
class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/zkaccess")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "devsecret_change_me")
    VERIFIER_BIN: str = os.getenv("VERIFIER_BIN", os.path.join("..", "zk", "target", "release", "verifier-cli.exe"))
    PROVER_BIN: str = os.getenv("PROVER_BIN", os.path.join("..", "zk", "target", "release", "prover-cli.exe"))
    JWT_COOKIE_NAME: str = "zkaccess_jwt"
    JWT_EXPIRES_MIN: int = 30
    JWT_COOKIE_SECURE: bool = os.getenv("JWT_COOKIE_SECURE", "0").lower() in {"1", "true", "yes"}
    ALLOW_INSECURE_PROVER: bool = os.getenv("ALLOW_INSECURE_PROVER", "0").lower() in {"1", "true", "yes"}
