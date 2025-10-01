# # routers/ws_chat.py
# from fastapi import APIRouter, WebSocket, WebSocketDisconnect
# from services.translation_service import translate

# router = APIRouter()

# # Store active connections per session
# active_connections: dict[str, list[WebSocket]] = {}

# @router.websocket("/ws/{session_id}")
# async def websocket_endpoint(websocket: WebSocket, session_id: str):
#     await websocket.accept()
    
#     if session_id not in active_connections:
#         active_connections[session_id] = []
#     active_connections[session_id].append(websocket)

#     try:
#         while True:
#             data = await websocket.receive_text()
#             await websocket.send_text(f"[You]: {data}")
#             # Translate the message using the translation service
#             translated_text = translate(session_id, data)
            
#             # Broadcast to all other users in the session
#             for conn in active_connections[session_id]:
#                 if conn != websocket:
#                     await conn.send_text(translated_text)
                    
#     except WebSocketDisconnect:
#         active_connections[session_id].remove(websocket)
