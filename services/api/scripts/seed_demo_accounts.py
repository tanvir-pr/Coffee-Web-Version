import asyncio

from app.db.session import get_sessionmaker
from app.services.auth import ensure_demo_accounts


async def main() -> None:
    async with get_sessionmaker()() as session:
        await ensure_demo_accounts(session)
    print("demo accounts ready")


if __name__ == "__main__":
    asyncio.run(main())
