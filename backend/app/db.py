from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

_engine = None
SessionLocal = None


class Base(DeclarativeBase):
    pass


def init_db(url: str):
    global _engine, SessionLocal
    if _engine is None:
        _engine = create_engine(url, pool_size=20, max_overflow=20, pool_pre_ping=True)
        SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False)
        from .models import User, LoginChallenge  # noqa
        Base.metadata.create_all(_engine)


def get_session():
    if SessionLocal is None:
        raise RuntimeError("DB not initialized")
    return SessionLocal()
