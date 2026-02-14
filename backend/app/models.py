import uuid
from datetime import datetime, timedelta, timezone
from sqlalchemy import Column, String, DateTime, Boolean, LargeBinary, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .db import Base


def utc_now():
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True, nullable=False)
    salt: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    commitment: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now)


class LoginChallenge(Base):
    __tablename__ = "login_challenges"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    nonce: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    consumed: Mapped[bool] = mapped_column(Boolean, default=False)

    user = relationship(User)

    @staticmethod
    def new(user_id: uuid.UUID, ttl_seconds: int = 120) -> "LoginChallenge":
        from .security import random_nonce
        return LoginChallenge(
            user_id=user_id,
            nonce=random_nonce(),
            expires_at=datetime.now(timezone.utc) + timedelta(seconds=ttl_seconds),
            consumed=False,
        )
