import os
from cerebras.cloud.sdk import Cerebras
from cerebras.cloud.sdk.types import completion
from config import CEREBRAS_API_KEY
from config import REDIS_HOST
from models.translation import TranslationResponse
from services import redis_service
import json

from services.embedding_service import get_embedding

client = Cerebras(api_key=CEREBRAS_API_KEY)

def get_contextual_memory(text: str):
    response = client.chat.completions.create(
        model="llama3.1-8b",
        messages=[
            {
                "role": "system",
                "content": (
                   "Summarize the user message into a short, context-rich memory capturing their intent or preference. Keep it concise and natural, and include the category (food, sports, books, hobbies, etc.) if obvious ( insert it in the memory sentence , don't use parenthesis ). Output only the memory without extra details."
                )
            },
            {"role": "user", "content": text}
        ]
    )
    memory_sentence = response.choices[0].message.content
    return memory_sentence

def translate(text: str, source_lang: str, target_lang: str) -> TranslationResponse:
    response = client.chat.completions.create(
        model="llama-3.3-70b",
        messages=[
            {
                "role": "system",
                "content": (
                    f"You are a translation assistant (conversational)."
                    f"Just translate from {source_lang} to {target_lang}, the translated sentence should be in {target_lang}, don't add any extra words"
                )
            },
            {"role": "user", "content": f"Translate this sentence : {text}"}
        ]
    )
    translated_text = response.choices[0].message.content
    return TranslationResponse(translated_text=translated_text)

def slate_translate(
    user_id:str,
    text: str,
    source_lang: str,
    target_lang: str,
    enrich: bool = True,
    presets: list[str] | None = None
):
    """
    Translate text with optional enrichment, presets, and memories.
    Returns host_language, guest_language, and memory_backed flag.
    """
    embed_message = get_embedding(text)
    relevant_memories = redis_service.get_relevant_memories(user_id,embed_message,3)
    print(f"Relevant memories : {relevant_memories}",flush=True)
    input_memories = []
    memories_for_ui = []
    for memory in relevant_memories:
        input_memories.append(memory["message"])
        memories_for_ui.append({
            "id": memory["id"],
            "message": memory["message"]
        })
    # Ensure safe defaults
    presets = presets or []
    memories = input_memories

    # JSON schema for structured output
    slate_translate_schema = {
        "type": "object",
        "properties": {
            "host_language": {
                "type": "string",
                "description": f"Sentence in host language ({source_lang}). Enriched if enrich=True."
            },
            "guest_language": {
                "type": "string",
                "description": f"Sentence in guest language ({target_lang})."
            },
            "memory_backed": {
                "type": "boolean",
                "description": "True if relevant memories influenced translation, else False."
            }
        },
        "required": ["host_language", "guest_language", "memory_backed"],
        "additionalProperties": False
    }

    # Build system prompt dynamically
    base_instruction = (
        f"You are a translation assistant. "
        f"Translate text from host language : {source_lang} to target language : {target_lang}. "
    )

    if enrich:
        base_instruction += (
            "Enrich the input sentence slightly in the host language (make it clearer, more natural) and then translate the same,"
            "If you sense any intent in the input sentence, use the provided memories and enrich the sentence, don't add the intent in response."
        )
    else:
        base_instruction += (
            "Do NOT enrich the host sentence, only return it exactly as provided. "
        )

    if presets:
        base_instruction += f"\nUser wants the translation to be : {', '.join(presets)}."
    if memories:
        base_instruction += (
            f"\nHere are some relevant past memories: {', '.join(memories)}. "
            "If you use them to enrich the translation, set memory_backed=True, else False."
        )
    else:
        base_instruction += "\nIf no memories are provided, always return memory_backed=False."

    # Call model
    print(f"Base : {base_instruction}",flush=True)
    print(f"Base : {base_instruction}")
    response = client.chat.completions.create(
        model="llama-3.3-70b",
        messages=[
            {"role": "system", "content": base_instruction},
            {"role": "user", "content": f"Translate this sentence: {text}"}
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "slate_translate_schema",
                "strict": True,
                "schema": slate_translate_schema
            }
        }
    )

    # Parse response safely
    try:
        content = response.choices[0].message.content
        if isinstance(content, str):
            import json
            content = json.loads(content)

        # Ensure memory_backed is always present
        if "memory_backed" not in content:
            content["memory_backed"] = False
        else:
            if content["memory_backed"] is True:
                content["memories"] = memories_for_ui

        return content

    except Exception as e:
        print(f"Slate translate error: {e}")
        return {
            "host_language": text if not enrich else f"(enriched) {text}",
            "guest_language": text,
            "memory_backed": False
        }


# def auto_reply(agent_memories,chat_history):
#        response = client.chat.completions.create(
#         model="llama-3.3-70b",
#         messages=[
#             {
#                 "role": "system",
#                 "content": (
#                     f"You are automatic conversation agent, You'll be given a history of chat between host and guest, Based on the given chat and the host memories"
#                     f",give an appopriate reply to guest, it can be a follow up question, a greeting or complement. If you think the conversation is concluded, return end_chat:true."
#                     f"Host memories:{agent_memories}"
#                 )
#             },
#             {"role": "user", "content": f"{chat_history}"}
#         ]
#     )

def auto_reply(agent_memories, chat_history):
    auto_reply_schema = {
        "type": "object",
        "properties": {
            "reply": {
                "type": "string",
                "description": "The agent’s reply to the guest (a follow-up, greeting, or appropriate message)."
            },
            "end_chat": {
                "type": "boolean",
                "description": "True if the conversation seems concluded, otherwise false."
            }
        },
        "required": ["reply", "end_chat"],
        "additionalProperties": False
    }

    response = client.chat.completions.create(
        model="llama-3.3-70b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are an automatic conversation agent. You'll be given chat history and host memories. "
                    "Reply appropriately on behalf of host, and indicate whether the conversation has ended."
                    f"\nHost memories: {agent_memories}"
                )
            },
            {"role": "user", "content": f"Chat history:\n{chat_history}"}
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "auto_reply_schema",
                "strict": True,
                "schema": auto_reply_schema
            }
        }
    )
    return response.choices[0].message.content


def generate_suggestions(session_id: str,role:str,target_lang:str,agent_memories) -> list[str]:
    history = redis_service.get_recent_messages(session_id, n=4)
    if not history:
        return []

    # Flatten chat history
    history_text = "\n".join([
        f"{msg['role']}: {msg['original']}" for msg in history
    ])

    suggestion_schema = {
        "type": "object",
        "properties": {
            "chat_suggestions": {
                "type": "array",
                "items": {"type": "string"}
            }
        },
        "required": ["chat_suggestions"],
        "additionalProperties": False
    }
    print(f"Generating suggestions for {role}",flush=True)
    if role == 'host':
        suggestion_prompt = f"You are a helpful assistant generating chatting suggestions.Between host and guest. Generate 3 very short, helpful, polite, suitable chat suggesions for the next message from {role} in {target_lang} based on the last message from the guest. Don't add any extra words or explanations, and consider the following information provided by the user to generate suggestion : {agent_memories}"
    else:
        suggestion_prompt = f"You are a helpful assistant generating chatting suggestions.Between host and guest. Generate 3 very short, helpful, polite, suitable chat suggesions for the next message from {role} in {target_lang} based on the last message from the host. Don't add any extra words or explanations"
    response = client.chat.completions.create(
        model="llama-3.3-70b",
        messages=[
            {"role": "system", "content": suggestion_prompt},
            {"role": "user", "content": f"Based on this recent chat:\n{history_text}\n\n , provide chat suggestions for {role}."}
        ],
        response_format={
            "type": "json_schema", 
            "json_schema": {
                "name": "chat_suggestions_schema",
                "strict": True,
                "schema": suggestion_schema
            }
        }
    )
    print(suggestion_prompt)
    suggestions = json.loads(response.choices[0].message.content)
    print(suggestions.get("chat_suggestions"),flush=True)
    return suggestions.get("chat_suggestions")
