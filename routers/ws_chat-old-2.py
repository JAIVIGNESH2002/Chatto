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
            chat_message = data["message"]
            mode_info = data["autoModeEnabled"]
            auto_reply = None
            # print(f"Auto mode info from backend {mode_info}",flush=True)
            autoKey = None
            if(mode_info):
                print("Extracting key...")
                autoKey = data["autoKey"]
                print(f"AutoKey : {autoKey}",flush=True)
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
            translated = translation_service.translate(chat_message, source, target)
            redis_service.save_message(session_id, role, chat_message, translated.translated_text,mode_info,autoKey)
            message = {
                "from": role,
                "original": chat_message,
                "translated": translated.translated_text,
                "autoModeEnabled":mode_info,
                "autoKey":autoKey
            }
            print(f"Msg:{message}",flush=True)
            agent_memories = []
            if role != "host":
                print(f"Retrieving memories of host...")
                query_embedding = get_embedding(chat_message)
                # print(f"QE: {query_embedding}",flush=True)
                relevant_memories = redis_service.get_relevant_memories(userId, query_embedding, top_n=3)
                for memory in relevant_memories:
                    mem_msg = memory["message"]
                    agent_memories.append(mem_msg)
            print(f"Agent memories : {agent_memories}")


            if role != "host" and mode_info:
                # print("Automatically replying...")
                print(f"Autokey : {autoKey}")
                autoModeMessages = redis_service.get_messages_by_autoKey(session_id, autoKey)
                chat_history = []
                for auto_mode_message in autoModeMessages:
                    role = auto_mode_message["role"]
                    original = auto_mode_message.get("original", "")
                    translated = auto_mode_message.get("translated", "")
                    
                    if role == "host":
                        chat_line = f"host: {original}"
                    else:
                        chat_line = f"guest: {translated}"
                    
                    chat_history.append(chat_line)

                history_text = "\n".join(chat_history)
                auto_reply_msg = translation_service.auto_reply(agent_memories, history_text)
                auto_reply = json.loads(auto_reply_msg)
                reply_guest_lang = translation_service.translate(auto_reply.get("reply", ""), target, source)
                print(f"Guest lang reply {reply_guest_lang}",flush=True)
                host_reply = {
                "from": "host",
                "original": auto_reply.get("reply", ""),
                "translated": reply_guest_lang.translated_text,
                "autoModeEnabled":True,
                "autoKey":autoKey
                }
                print(f"Auto mode message : {auto_reply}",flush=True)

            # Broadcast to all clients in the same session
            for conn, conn_role in connections[session_id]:
                await conn.send_json(message)
                # print(f"Sending message {message}")
                if conn_role != role:  
                    suggestions = translation_service.generate_suggestions(session_id,conn_role,target,agent_memories)
                    if suggestions:
                        await conn.send_json({
                            "type": "suggestions",
                            "suggestions": suggestions
                        })
                if(mode_info) and auto_reply:
                    if not auto_reply.get("end_chat", False):
                        print("Auto mode conversation continues...")
                        await conn.send_json(host_reply)
                    else:
                        print("Auto mode conversation ended by agent.")

    except WebSocketDisconnect:
        connections[session_id].remove((websocket, role))
        if not connections[session_id]:
            del connections[session_id]
