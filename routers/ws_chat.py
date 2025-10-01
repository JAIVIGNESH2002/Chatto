import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services import redis_service, translation_service
from services.embedding_service import get_embedding
router = APIRouter()
connections = {}

@router.websocket("/ws/{session_id}/{role}/{userId}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, role: str,userId: str):
    await websocket.accept()

    if session_id not in connections:
        connections[session_id] = []
    connections[session_id].append((websocket, role))

    try:
        while True:
            text = await websocket.receive_text()
            data = json.loads(text)
            # Lookup session details from Redis
            session = redis_service.get_session(session_id)
            if not session:
                await websocket.send_text("Invalid or expired session.")
                break
            # Determine translation direction
            if role == "host":
                source = session["host_language"]
                target = session["target_language"]
            else:
                source = session["target_language"]
                target = session["host_language"]

            # Translate & save
            translated = translation_service.translate(data["message"], source, target)
            redis_service.save_message(session_id, role, data["message"], translated.translated_text)
            message = {
                "from": role,
                "original": data["message"],
                "translated": translated.translated_text
            }
            agent_memories = []
            mode_info = data["autoModeEnabled"]
            print(f"Auto mode info from backend {mode_info}",flush=True)
            if role != "host":
                print(f"Retrieving memories...")
                query_embedding = get_embedding(data["message"])
                print(f"QE: {query_embedding}",flush=True)
                relevant_memories = redis_service.get_relevant_memories(userId, query_embedding, top_n=3)
                for memory in relevant_memories:
                    mem_msg = memory["message"]
                    agent_memories.append(mem_msg)
            print(f"Agent memories : {agent_memories}")
            # Broadcast to all clients in the same session
            for conn, conn_role in connections[session_id]:
                await conn.send_json(message)
                print(f"Sending message {message}")
                # ✅ Only generate/send suggestions to *receiving* user
                if conn_role != role:  
                    suggestions = translation_service.generate_suggestions(session_id,conn_role,target,agent_memories)
                    if suggestions:
                        await conn.send_json({
                            "type": "suggestions",
                            "suggestions": suggestions
                        })

    except WebSocketDisconnect:
        connections[session_id].remove((websocket, role))
        if not connections[session_id]:
            del connections[session_id]
