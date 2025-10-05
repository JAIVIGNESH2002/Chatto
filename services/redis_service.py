from typing import Dict, List
import uuid
import redis
from config import REDIS_HOST, REDIS_PORT, SESSION_TTL_SECONDS,SESSION_TTL_SECONDS
import json
import datetime
from services import embedding_service

r = redis.Redis(host=REDIS_HOST, port=REDIS_PORT, db=0, decode_responses=True)

MEMORY_KEY_PREFIX = "user_memories:"


def get_recent_messages(session_id: str, n: int = 5):
    key = f"session:{session_id}:messages"
    items = r.lrange(key, -n, -1)
    return [json.loads(i) for i in items]


def prepare_memory(message: str, user_id: str) -> dict:
    """
    Prepares a memory object to store in Redis.
    Generates embedding, optional summary, and a unique ID.
    """
    embedding = embedding_service.get_embedding(message)
    summary = message
    timestamp = datetime.datetime.utcnow().isoformat() + "Z"
    memory_id = str(uuid.uuid4())  # unique memory ID

    memory = {
        "id": memory_id,
        "user_id": user_id,
        "message": message,
        "summary": summary,
        "embedding": embedding,
        "timestamp": timestamp,
    }

    return memory


def save_session(session_id: str, metadata: dict):
    key = f"session:{session_id}"
    r.hset(key, mapping=metadata)
    r.expire(key, SESSION_TTL_SECONDS)

def get_session(session_id: str):
    key = f"session:{session_id}"
    return r.hgetall(key)

def save_message(session_id: str, role: str, original: str, translated: str, autoMode: bool, autoKey: str):
    # Always save in main session history
    key = f"session:{session_id}:messages"
    entry = {
        "role": role,
        "original": original,
        "translated": translated,
    }
    if autoMode:
        entry["autoKey"] = autoKey

    # Push to main session list
    r.rpush(key, json.dumps(entry))
    r.expire(key, SESSION_TTL_SECONDS)

    # If autoMode, also save to a dedicated autokey list
    if autoMode:
        auto_key = f"session:{session_id}:auto:{autoKey}"
        r.rpush(auto_key, json.dumps(entry))
        r.expire(auto_key, SESSION_TTL_SECONDS)


def get_messages_by_autoKey(session_id: str, autoKey: str) -> List[Dict]:
    """
    Retrieve all messages for a given autoKey in a session
    """
    key = f"session:{session_id}:auto:{autoKey}"
    raw_messages = r.lrange(key, 0, -1)
    return [json.loads(m) for m in raw_messages]


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
    Get all memories for a user with their unique IDs.
    """
    key = f"{MEMORY_KEY_PREFIX}{user_id}"
    raw_memories = r.lrange(key, 0, -1)
    mems_data = []
    for mem in raw_memories:
        mem_dict = json.loads(mem)
        mems_data.append({
            "id": mem_dict.get("id"),  # unique id of the memory
            "message": mem_dict.get("message"),  # the text content'
            "embedding": mem_dict.get("embedding")
        })
    return mems_data

def delete_memories(user_id: str):
    key = f"{MEMORY_KEY_PREFIX}{user_id}"
    r.delete(key)


def edit_memory(user_id: str, memory_id: str, new_message: str) -> bool:
    """Edit a memory by ID."""
    key = f"{MEMORY_KEY_PREFIX}{user_id}"
    raw_memories = r.lrange(key, 0, -1)
    for idx, mem in enumerate(raw_memories):
        mem_dict = json.loads(mem)
        if mem_dict["id"] == memory_id:
            mem_dict["message"] = new_message
            r.lset(key, idx, json.dumps(mem_dict))
            return True
    return False

def delete_memory(user_id: str, memory_id: str) -> bool:
    """Delete a memory by ID."""
    key = f"{MEMORY_KEY_PREFIX}{user_id}"
    raw_memories = r.lrange(key, 0, -1)
    for mem in raw_memories:
        mem_dict = json.loads(mem)
        if mem_dict["id"] == memory_id:
            r.lrem(key, 1, json.dumps(mem_dict))
            return True
    return False


def get_relevant_memories(user_id: str, query_embedding: List[float], top_n: int = 5) -> List[Dict]:
    """
    Return top N memories most relevant to the query embedding
    """
    all_memories = get_memories(user_id)
    if not all_memories:
        print(f"[DEBUG] No memories found for user {user_id}")
        return []

    def cosine(a, b):
        return sum(x*y for x, y in zip(a, b)) / (
            (sum(x*x for x in a)**0.5) * (sum(y*y for y in b)**0.5) + 1e-8
        )

    scored = []
    for idx, mem in enumerate(all_memories):
        try:
            if "embedding" not in mem:
                print(f"[DEBUG] Memory at index {idx} has no 'embedding' key: {mem}")
                continue
            embedding = mem["embedding"]

            if not isinstance(embedding, (list, tuple)):
                print(f"[DEBUG] Memory at index {idx} has invalid embedding type: {type(embedding)} | Value: {embedding}")
                continue
            if not embedding:
                print(f"[DEBUG] Memory at index {idx} has empty embedding: {mem}")
                continue

            score = cosine(query_embedding, embedding)
            scored.append((mem, score))
        except Exception as e:
            print(f"[ERROR] Failed processing memory at index {idx}: {mem} | Error: {e}")

    if not scored:
        print(f"[DEBUG] No valid memories scored for user {user_id}")
        return []

    scored.sort(key=lambda x: x[1], reverse=True)
    return [mem for mem, score in scored[:top_n]]