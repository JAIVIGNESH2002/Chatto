from fastapi import APIRouter
from pydantic import BaseModel
from services.embedding_service import get_embedding
from services.redis_service import get_relevant_memories
from services.translation_service import slate_translate
from typing import List, Optional
from pydantic import BaseModel


router = APIRouter()

class SlateTranslateRequest(BaseModel):
    text: str
    source_lang: str
    target_lang: str
    enrich: bool = True
    presets: Optional[List[str]] = []

# class SlateTranslateRequest(BaseModel):
#     text: str
#     source_lang: str
#     target_lang: str
#     enrich: bool = True
#     presets: Optional[List[str]] = []
#     memories: Optional[List[str]] = []


@router.post("/slate/translate")
def translate_slate(request: SlateTranslateRequest):
    """
    Endpoint to translate (and optionally enrich) text for Slate mode.
    """
    try:
        result = slate_translate(
            user_id="123",
            text=request.text,
            source_lang=request.source_lang,
            target_lang=request.target_lang,
            presets=request.presets,
            enrich=request.enrich,
        )
        return result
    except Exception as e:
        return {"error": str(e)}