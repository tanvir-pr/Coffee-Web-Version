import asyncio

from sqlalchemy import select

from app.db.models import User
from app.db.session import get_sessionmaker


async def main() -> None:
    async with get_sessionmaker()() as session:
        users = list(await session.scalars(select(User)))
        for user in users:
            print(f"{user.email}\t{user.role}\t{user.name}")


if __name__ == "__main__":
    asyncio.run(main())
