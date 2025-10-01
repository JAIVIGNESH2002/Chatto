from fastapi import APIRouter
from models.session import SessionCreateRequest, SessionCreateResponse
from services import redis_service, qr_generator
import uuid
import datetime

router = APIRouter()

BASE_URL = "http://localhost:3000/s"  # Frontend URL

@router.post("/sessions", response_model=SessionCreateResponse)
def create_session(request: SessionCreateRequest):
    print(request.dict())
    session_id = str(uuid.uuid4())

    # Store in Redis with TTL
    redis_service.save_session(session_id, {
        "host_language": request.host_language,
        "target_language": request.target_language,
        "mode": request.mode
    })

    # Short URL & QR
    short_url = f"{BASE_URL}/{session_id}"
    qr_base64 = qr_generator.generate_qr_base64(short_url)

    # Safe TTL handling
    ttl = redis_service.r.ttl(f"session:{session_id}")
    if ttl is None or ttl < 0:
        ttl = 43200  # fallback 12 hours
    expires_at = (datetime.datetime.utcnow() + datetime.timedelta(seconds=ttl)).isoformat() + "Z"

    return SessionCreateResponse(
        session_id=session_id,
        short_url=short_url,
        qr_base64=qr_base64,
        expires_at=expires_at
    )
