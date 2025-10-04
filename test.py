import json
from services.translation_service import slate_translate


text = "You are amazing!"
source_lang = "english"
target_lang = "tamil"

result = slate_translate(text, source_lang, target_lang)
result_json = json.loads(result)
host_lng_version = result_json.get("host_language")
guest_lng_version = result_json.get("guest_language")
print(f"Host lang : {host_lng_version} , Guest lang : {guest_lng_version}")