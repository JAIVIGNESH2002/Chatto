from cerebras.cloud.sdk import Cerebras
import os
from config import CEREBRAS_API_KEY
from sentence_transformers import SentenceTransformer
from threading import Lock

# Global variables
_model = None
_model_lock = Lock()  # Ensure thread-safe initialization

def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        with _model_lock:  # Prevent race conditions if multiple requests come at once
            if _model is None:
                _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def get_embedding(text: str) -> list[float]:
    """
    Generate a vector embedding for the given text.
    Lazy-loads the model on first call.
    """
    model = _get_model()
    embedding = model.encode(text, convert_to_numpy=True)
    return embedding.tolist()
