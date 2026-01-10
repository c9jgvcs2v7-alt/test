from __future__ import annotations

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


class EmojiCreate(BaseModel):
    userId: str = Field(..., min_length=1)
    templateId: Optional[str] = None
    status: Optional[str] = "draft"
    lottieJson: Dict[str, Any]


class EmojiUpdate(BaseModel):
    status: Optional[str] = None


app = FastAPI(title="Emoji Store")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _user_dir(user_id: str) -> Path:
    return DATA_DIR / user_id


def _index_path(user_id: str) -> Path:
    return _user_dir(user_id) / "index.json"


def _read_index(user_id: str) -> List[Dict[str, Any]]:
    path = _index_path(user_id)
    if not path.exists():
        return []
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return []


def _write_index(user_id: str, items: List[Dict[str, Any]]) -> None:
    path = _index_path(user_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")


@app.get("/health")
def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.post("/emojis")
def create_emoji(payload: EmojiCreate) -> Dict[str, Any]:
    user_id = payload.userId.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="userId required")

    emoji_id = f"e_{user_id}_{uuid.uuid4().hex[:8]}"
    created_at = int(datetime.utcnow().timestamp() * 1000)

    user_dir = _user_dir(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)

    json_path = user_dir / f"{emoji_id}.json"
    json_path.write_text(json.dumps(payload.lottieJson, ensure_ascii=False), encoding="utf-8")

    items = _read_index(user_id)
    record = {
        "id": emoji_id,
        "userId": user_id,
        "templateId": payload.templateId,
        "status": payload.status or "draft",
        "createdAt": created_at,
        "file": json_path.name,
    }
    items.insert(0, record)
    _write_index(user_id, items)

    return {"ok": True, "item": record}


@app.get("/emojis")
def list_emojis(userId: str = Query(...)) -> Dict[str, Any]:
    user_id = userId.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="userId required")

    items = _read_index(user_id)
    enriched = []
    for item in items:
        file_name = item.get("file")
        if not file_name:
            continue
        json_path = _user_dir(user_id) / file_name
        if not json_path.exists():
            continue
        try:
            lottie_json = json.loads(json_path.read_text(encoding="utf-8"))
        except Exception:
            lottie_json = None
        enriched.append({**item, "lottieJson": lottie_json})

    return {"items": enriched}


@app.patch("/emojis/{emoji_id}")
def update_emoji(emoji_id: str, payload: EmojiUpdate, userId: str = Query(...)) -> Dict[str, Any]:
    user_id = userId.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="userId required")

    items = _read_index(user_id)
    idx = next((i for i, x in enumerate(items) if x.get("id") == emoji_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="not found")

    if payload.status:
        items[idx]["status"] = payload.status
    _write_index(user_id, items)
    return {"ok": True, "item": items[idx]}


@app.delete("/emojis/{emoji_id}")
def delete_emoji(emoji_id: str, userId: str = Query(...)) -> Dict[str, Any]:
    user_id = userId.strip()
    if not user_id:
        raise HTTPException(status_code=400, detail="userId required")

    items = _read_index(user_id)
    item = next((x for x in items if x.get("id") == emoji_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="not found")

    file_name = item.get("file")
    if file_name:
        json_path = _user_dir(user_id) / file_name
        if json_path.exists():
            json_path.unlink()

    items = [x for x in items if x.get("id") != emoji_id]
    _write_index(user_id, items)
    return {"ok": True}
