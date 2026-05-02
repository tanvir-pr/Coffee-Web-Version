MUST_ANIMATIONS = frozenset({"01", "02", "04", "05", "09"})


def anim_flags() -> dict[str, bool]:
    return {f"{index:02d}": f"{index:02d}" in MUST_ANIMATIONS for index in range(1, 23)}


def season_for_month(month: int) -> str:
    if month in (12, 1, 2):
        return "winter"
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    return "autumn"
