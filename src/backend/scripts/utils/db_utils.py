from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import db_manager


@asynccontextmanager
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with db_manager.session() as session:
        yield session


async def batch_insert(
    session: AsyncSession,
    model: Any,
    records: list[dict],
    batch_size: int = 100,
) -> int:
    total_inserted = 0
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        session.add_all([model(**record) for record in batch])
        await session.flush()
        total_inserted += len(batch)
    return total_inserted


async def batch_update(
    session: AsyncSession,
    model: Any,
    records: list[dict],
    id_field: str = "code",
    batch_size: int = 100,
) -> int:
    total_updated = 0
    for i in range(0, len(records), batch_size):
        batch = records[i : i + batch_size]
        for record in batch:
            stmt = select(model).where(getattr(model, id_field) == record[id_field])
            result = await session.execute(stmt)
            existing = result.scalar_one_or_none()
            if existing:
                for key, value in record.items():
                    if key != id_field and hasattr(existing, key):
                        setattr(existing, key, value)
        await session.flush()
        total_updated += len(batch)
    return total_updated


async def get_max_updated_at(session: AsyncSession, model: Any) -> Any:
    stmt = select(model.updated_at).order_by(model.updated_at.desc()).limit(1)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_record_count(session: AsyncSession, model: Any) -> int:
    stmt = select(model)
    result = await session.execute(stmt)
    return len(result.scalars().all())
