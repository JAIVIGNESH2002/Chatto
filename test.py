from cerebras.cloud.sdk import Cerebras
from config import CEREBRAS_API_KEY

client = Cerebras(api_key=CEREBRAS_API_KEY)
print(dir(client))