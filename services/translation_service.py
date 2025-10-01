import os
from cerebras.cloud.sdk import Cerebras
from cerebras.cloud.sdk.types import completion
from config import CEREBRAS_API_KEY
from config import REDIS_HOST
from models.translation import TranslationResponse
from services import redis_service
import json

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
    print(history_text,flush=True)
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
