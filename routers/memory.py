
from typing import Dict, List
from fastapi import APIRouter
from services.redis_service import prepare_memory, save_memory,get_memories
from config import EMBEDDING_MODEL
from services.translation_service import get_contextual_memory

router = APIRouter()

@router.post("/memory/save")
def save_memory_endpoint(payload: dict):
    user_id = payload["user_id"]
    message = payload["message"]
    memory_sentence = get_contextual_memory(message)
    memory_obj = prepare_memory(memory_sentence, user_id)
    save_memory(user_id, memory_obj)
    return {"status": "success", "saved_message": message}

@router.get("/memory/{user_id}")
def fetch_memories(user_id: str):
    print(f"Fetching memories for user : {user_id}")
    """
    Fetch all saved memories for a user based on user id
    """
    memories = get_memories(user_id)
    print(f"Memories : {memories}")
    return {"user_id": user_id, "memories": memories}
