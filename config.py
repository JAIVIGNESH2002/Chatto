import os
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env.local")

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
SESSION_TTL_SECONDS = int(os.getenv("SESSION_TTL_SECONDS", 12 * 60 * 60))

CEREBRAS_API_URL = os.getenv("CEREBRAS_API_URL")
CEREBRAS_API_KEY = os.getenv("CEREBRAS_API_KEY")