import json
from pathlib import Path

from app.main import app

ROOT = Path(__file__).resolve().parents[3]
OPENAPI_PATH = ROOT / "packages" / "api-types" / "openapi.json"


def main() -> None:
    payload = json.dumps(app.openapi(), indent=2) + "\n"
    OPENAPI_PATH.parent.mkdir(parents=True, exist_ok=True)
    OPENAPI_PATH.write_text(payload, encoding="utf-8")


if __name__ == "__main__":
    main()
