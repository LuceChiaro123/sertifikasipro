"""
Initialize the database (create all tables) using SQLAlchemy.
Used instead of Alembic for SQLite / fresh installs.
Run from the backend/ directory:
    python -m scripts.init_db
"""
import asyncio
import sys
from pathlib import Path

# Make sure app is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import engine, Base
from app import models  # noqa — registers all models


async def init():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[OK] Database tables created.")


if __name__ == "__main__":
    asyncio.run(init())
