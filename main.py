from fastapi import FastAPI
from routers import memory, session
from routers import ws_chat
from starlette.middleware.cors import CORSMiddleware

app = FastAPI(title="QR Chat Translator MVP")

# Include routers
app.include_router(session.router, prefix="/api/v1")
app.include_router(ws_chat.router, prefix="/api/v1")
app.include_router(memory.router, prefix="/api/v1")

# Dev-only: allow all origins for WebSocket and HTTP
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)