import os
import argparse
from sqlalchemy import select
from app.config import Settings
from app.db import init_db, get_session
from app.models import User
from app.security import random_salt, sha256_commitment, b2hex


def main(count: int):
    settings = Settings()
    init_db(settings.DATABASE_URL)
    with get_session() as s:
        for i in range(count):
            email = f"user{i+1}@example.com"
            password = f"Passw0rd{i+1}!"
            salt = random_salt()
            commitment = sha256_commitment(salt, password)
            existing = s.scalar(select(User).where(User.email == email))
            if existing is None:
                s.add(User(email=email, salt=salt, commitment=commitment))
        s.commit()
    print(f"Seeded {count} users")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=25)
    args = parser.parse_args()
    main(args.count)
