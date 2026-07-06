import uuid
from datetime import UTC, datetime, timedelta
from decimal import ROUND_DOWN, Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import Problem
from app.db.models import Category, LoyaltyLedger, Order, OrderItem, Product, Reward
from app.services.catalog import PLAIN_GOODS

STAMP_GOAL = 10
BEAN_WINDOW = timedelta(days=365)


def line_points(unit_price: Decimal, quantity: int) -> int:
    total = (unit_price * quantity).to_integral_value(ROUND_DOWN)
    return int(total)


def tier_for(points: int) -> tuple[str, str]:
    if points >= 2500:
        return "berry", "Berry Reserve"
    if points >= 1000:
        return "gold", "Gold Crema"
    if points >= 300:
        return "caramel", "Caramel"
    return "oat", "Oat"


def reward_steps(balance: int) -> int:
    steps = 0
    remaining = balance
    while remaining >= STAMP_GOAL:
        remaining -= STAMP_GOAL
        steps += 1
    return steps


async def _stamp_balance(session: AsyncSession, user_id: uuid.UUID) -> int:
    total = await session.scalar(
        select(func.coalesce(func.sum(LoyaltyLedger.stamps_delta), 0)).where(
            LoyaltyLedger.user_id == user_id
        )
    )
    return int(total or 0)


async def _bean_balance(session: AsyncSession, user_id: uuid.UUID, now: datetime) -> int:
    total = await session.scalar(
        select(func.coalesce(func.sum(LoyaltyLedger.points_delta), 0)).where(
            LoyaltyLedger.user_id == user_id,
            LoyaltyLedger.points_delta > 0,
            LoyaltyLedger.created_at >= now - BEAN_WINDOW,
        )
    )
    return int(total or 0)


async def grant_collected(session: AsyncSession, order: Order) -> None:
    if order.user_id is None:
        return
    items = list(await session.scalars(select(OrderItem).where(OrderItem.order_id == order.id)))
    inserted = False
    for item in items:
        category = await session.scalar(
            select(Category.slug)
            .join(Product, Product.category_id == Category.id)
            .where(Product.slug == item.product_slug)
        )
        if category is None or category in PLAIN_GOODS:
            continue
        existing = await session.scalar(
            select(LoyaltyLedger.id).where(LoyaltyLedger.order_item_id == item.id)
        )
        if existing is not None:
            continue
        session.add(
            LoyaltyLedger(
                id=uuid.uuid4(),
                user_id=order.user_id,
                order_id=order.id,
                order_item_id=item.id,
                stamps_delta=1,
                points_delta=line_points(item.unit_price, item.quantity),
                reason="collected",
            )
        )
        inserted = True
    if not inserted:
        return
    await session.flush()
    balance = await _stamp_balance(session, order.user_id)
    for _ in range(reward_steps(balance)):
        session.add(
            LoyaltyLedger(
                id=uuid.uuid4(),
                user_id=order.user_id,
                order_id=order.id,
                order_item_id=None,
                stamps_delta=-STAMP_GOAL,
                points_delta=0,
                reason="reward",
            )
        )
        session.add(Reward(id=uuid.uuid4(), user_id=order.user_id, status="issued"))
        balance -= STAMP_GOAL


async def loyalty_snapshot(session: AsyncSession, user_id: uuid.UUID) -> dict[str, object]:
    now = datetime.now(UTC)
    stamps = await _stamp_balance(session, user_id)
    beans = await _bean_balance(session, user_id, now)
    tier, label = tier_for(beans)
    issued = await session.scalar(
        select(func.count())
        .select_from(Reward)
        .where(Reward.user_id == user_id, Reward.status == "issued")
    )
    return {
        "stamps": stamps,
        "stamps_goal": STAMP_GOAL,
        "beans": beans,
        "tier": tier,
        "tier_label": label,
        "rewards": int(issued or 0),
        "stamps_until_reward": STAMP_GOAL - stamps,
    }


async def oldest_issued_reward(session: AsyncSession, user_id: uuid.UUID) -> Reward | None:
    return await session.scalar(
        select(Reward)
        .where(Reward.user_id == user_id, Reward.status == "issued")
        .order_by(Reward.created_at)
    )


async def consume_issued_reward(session: AsyncSession, user_id: uuid.UUID) -> Reward:
    reward = await oldest_issued_reward(session, user_id)
    if reward is None:
        raise Problem(409, "REWARD_NONE", "No reward", "There is no free drink waiting.")
    reward.status = "redeemed"
    return reward


async def redeem_reward(session: AsyncSession, user_id: uuid.UUID) -> dict[str, str]:
    reward = await consume_issued_reward(session, user_id)
    await session.commit()
    return {"id": str(reward.id), "status": reward.status}
