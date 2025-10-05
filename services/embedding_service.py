from cerebras.cloud.sdk import Cerebras
import os
from config import CEREBRAS_API_KEY
from sentence_transformers import SentenceTransformer

client = Cerebras(api_key=CEREBRAS_API_KEY)

# def get_embedding(text: str,embedding_model: str) -> list:
#     print(f"Trying to get embeddings for : {text}",flush=True)
#     prompt = f"Generate a fixed-size vector embedding for this text: '{text}'. Return as a comma-separated list of numbers."
#     response = client.chat.completions.create(
#         model= embedding_model,
#         messages=[{"role": "system", "content": "You are an embedding generator."},
#                   {"role": "user", "content": prompt}],
#         temperature=0
#     )
#     content = response.choices[0].message.content
#     embedding = [float(x) for x in content.split(",") if x.strip()]
#     return embedding


# Load once at startup
_model = SentenceTransformer("all-MiniLM-L6-v2")

def get_embedding(text: str) -> list[float]:
    """
    Generate a vector embedding for the given text.
    Returns a list of floats.
    """
    embedding = _model.encode(text, convert_to_numpy=True)
    return embedding.tolist()