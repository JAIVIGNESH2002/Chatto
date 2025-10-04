
from http.client import HTTPException
from typing import Dict, List

from pydantic import BaseModel
from fastapi import APIRouter
from services.redis_service import delete_memory, edit_memory, prepare_memory, save_memory,get_memories
from config import EMBEDDING_MODEL
from services.translation_service import get_contextual_memory

router = APIRouter()

class MemoryEditRequest(BaseModel):
    user_id: str
    memory_id: str
    new_message: str

class MemoryDeleteRequest(BaseModel):
    user_id: str
    memory_id: str

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
    print(f"Memories length: {len(memories)}")
    return {"user_id": user_id, "memories": memories}

@router.put("/memory/edit")
def edit_memory_endpoint(request: MemoryEditRequest):
    success = edit_memory(request.user_id, request.memory_id, request.new_message)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "success", "memory_id": request.memory_id, "new_message": request.new_message}

@router.delete("/memory/delete")
def delete_memory_endpoint(request: MemoryDeleteRequest):
    success = delete_memory(request.user_id, request.memory_id)
    if not success:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"status": "success", "memory_id": request.memory_id}