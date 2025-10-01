
from typing import Dict, List
import redis
from config import REDIS_HOST, REDIS_PORT, SESSION_TTL_SECONDS,SESSION_TTL_SECONDS
import json
import datetime
from services import embedding_service

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

MEMORY_KEY_PREFIX = "user_memories:"

def prepare_memory(message: str, user_id: str) -> dict:
    """
    Prepares a memory object to store in Redis.
    Generates embedding and optional summary.
    """
    embedding = embedding_service.get_embedding(message)
    summary = message 
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    memory = {
        "user_id": user_id,
        "message": message,
        "summary": summary,
        "embedding": embedding,
        "timestamp": timestamp,
        # optional: tags if needed
    }

    return memory

def save_session(session_id: str, metadata: dict):
    key = f"session:{session_id}"
    r.hset(key, mapping=metadata)
    r.expire(key, SESSION_TTL_SECONDS)

def get_session(session_id: str):
    key = f"session:{session_id}"
    return r.hgetall(key)

def save_message(session_id: str, role: str, original: str, translated: str):
    key = f"session:{session_id}:messages"
    entry = {
        "role": role,
        "original": original,
        "translated": translated
    }
    r.rpush(key, json.dumps(entry))
    r.expire(key, SESSION_TTL_SECONDS)

def get_recent_messages(session_id: str, n: int = 5):
    key = f"session:{session_id}:messages"
    items = r.lrange(key, -n, -1)
    return [json.loads(i) for i in items]

def save_memory(user_id: str, memory: Dict):
    """
    Save a memory for a user.
    Memory should include: message, summary, embedding, tags, timestamp
    """
    key = f"{MEMORY_KEY_PREFIX}{user_id}"
    # Store as JSON string in Redis list
    r.rpush(key, json.dumps(memory))


def get_memories(user_id: str) -> List[Dict]:
    """
    Get all memories for a user
    """
    key = f"{MEMORY_KEY_PREFIX}{user_id}"
    raw_memories = r.lrange(key, 0, -1)
    mems_data = []
    for mem in raw_memories:
        mem_dict = json.loads(mem)
        mems_data.append(mem_dict["message"])
    return mems_data

def delete_memories(user_id: str):
    key = f"{MEMORY_KEY_PREFIX}{user_id}"
    r.delete(key)

def get_relevant_memories(user_id: str, query_embedding: List[float], top_n: int = 5) -> List[Dict]:
    """
    Return top N memories most relevant to the query embedding
    """
    all_memories = get_memories(user_id)
    if not all_memories:
        return []

    def cosine(a, b):
        return sum(x*y for x, y in zip(a, b)) / ((sum(x*x for x in a)**0.5) * (sum(y*y for y in b)**0.5) + 1e-8)

    scored = [(mem, cosine(query_embedding, mem["embedding"])) for mem in all_memories]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [mem for mem, score in scored[:top_n]]