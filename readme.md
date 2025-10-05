Chatto

> **Breaking language barriers, one chat at a time.**

Chatto is a modern, AI-powered communication platform that enables seamless, multilingual conversations between hosts and guests — powered by Cerebras, Redis, and FastAPI.  
It also remembers personal context through the **Memories** feature and offers an AI-driven **Slate** workspace for real-time translation and interaction.

---

## 🚀 Features

### 🗨️ Chat
- Real-time host ↔ guest conversations via WebSocket.  
- Instant message translation between languages.  
- Lightweight and mobile-first UI built with Tailwind.  

### 🧠 Memories
- Save short facts or “memories” about yourself.  
- The AI uses these to personalize translations and responses.  
- Full CRUD support with smooth animations and Sonner toasts.  

### 🧾 Slate
- A dedicated workspace for AI-powered interactions.  
- Supports custom translation or semantic assistance.  

### 🤝 Guest Sessions
- Guests can join via QR or link (`/s/[sessionId]`) — no login required.  
- Secure session management with Redis.  
- Smooth conversation flow with real-time WebSocket messaging.

---

## 🧩 Tech Stack

### 🖥️ Frontend
- **Framework:** Next.js 14 (App Router)  
- **Language:** TypeScript  
- **Styling:** Tailwind CSS + ShadCN UI  
- **Auth:** Clerk  
- **Deployment:** Vercel  

### ⚙️ Backend
- **Framework:** FastAPI (Python 3.11)  
- **Cache / Queue:** Redis  
- **LLM Provider:** Cerebras API  
- **WebSocket:** Native `fastapi.websockets`  
- **Deployment:** Render (Dockerized)  

---

## 🧠 RAG Implementation (Retrieval-Augmented Generation)

Chatto uses **RAG** to make conversations more personalized and contextual:

1. **Memory Storage:**  
   User memories are stored in Redis and the database for fast retrieval.  

2. **Vectorization:**  
   Each memory is embedded into a vector space using a semantic embedding model.  

3. **Retrieval:**  
   When a chat prompt arrives, relevant memories are retrieved by cosine similarity to enrich the AI’s context.  

4. **Generation:**  
   The final response is generated through Cerebras’ LLM API, blending live input + retrieved memories for context-aware translation.

---

## 🛠️ Setup Guide (DIY)

### 🧱 1. Backend (FastAPI + Redis)
#### Navigate to the backend root:
```bash
cd docker
docker-compose up --build
