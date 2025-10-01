from pydantic import BaseModel

class SessionCreateRequest(BaseModel):
    host_language: str  # e.g., "en"
    target_language: str  # e.g., "es"
    mode: str = "auto"  # "auto" or "confirm"

class SessionCreateResponse(BaseModel):
    session_id: str
    short_url: str
    qr_base64: str
    expires_at: str

