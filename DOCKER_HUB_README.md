# LocalLLMMind 🧠

<div align="center">

### Modern, Privacy-First Desktop AI Workstation for Local LLMs
*100% Local • Zero Telemetry • Real-Time Streaming • Multi-Model Arena*

[![Docker Pulls](https://img.shields.io/docker/pulls/kapilyadav22/localllmmind?style=flat-square&logo=docker&logoColor=white)](https://hub.docker.com/r/kapilyadav22/localllmmind)
[![Docker Image Size](https://img.shields.io/docker/image-size/kapilyadav22/localllmmind/latest?style=flat-square&logo=docker&logoColor=white)](https://hub.docker.com/r/kapilyadav22/localllmmind)
[![Ollama](https://img.shields.io/badge/Ollama-Native_API-black?style=flat-square&logo=ollama&logoColor=white)](https://ollama.com/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue?style=flat-square)](https://github.com/kapilyadav22/localllmmind)

</div>

---

## ⚡ 10-Second Quick Start

Run **LocalLLMMind** and connect instantly to [Ollama](https://ollama.com) running on your machine:

```bash
docker run -d \
  --name localllmmind \
  -p 3000:80 \
  --add-host=host.docker.internal:host-gateway \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  --restart unless-stopped \
  kapilyadav22/localllmmind:latest
```

👉 Open **[http://localhost:3000](http://localhost:3000)** in your browser.

*(Make sure Ollama allows local cross-origin connections: `OLLAMA_ORIGINS="*" ollama serve`)*

---

## 🐳 Docker Compose

Prefer Compose? Add this to your `docker-compose.yml`:

```yaml
services:
  localllmmind:
    image: kapilyadav22/localllmmind:latest
    container_name: localllmmind-app
    ports:
      - "3000:80"
    environment:
      - PORT=80
      - OLLAMA_URL=http://host.docker.internal:11434
    extra_hosts:
      - "host.docker.internal:host-gateway"
    restart: unless-stopped
```

```bash
docker compose up -d
```

---

## 🚀 Why Choose LocalLLMMind?

| Feature | What It Gives You |
|---|---|
| 🔒 **100% Offline & Private** | Zero telemetry, no cloud accounts, no API fees. All chats and embeddings stay on your hardware. |
| ⚔️ **Model Arena Mode** | Prompt two local models side-by-side with synchronized input and live speed/token benchmarking. |
| ⚡ **Hardware Acceleration** | Micro-batched token rendering delivers buttery-smooth **30–80+ tok/s** streaming. |
| 🧠 **Reasoning Model Support** | Native chain-of-thought parsing with interactive `<think>` collapse for **DeepSeek-R1** and Qwen. |
| 👁️ **Vision & Multimodal** | Drag-and-drop image analysis with `llama3.2-vision`, `llava`, and `moondream`. |
| 📄 **Chat with Documents (RAG)** | Ingest 40+ code, data, and document formats completely client-side. |
| ✏️ **Edit & Branch Chats** | ChatGPT-style message editing and multi-version response branching (`◀ 1/3 ▶`). |
| 📥 **Built-in Model Manager** | Search, pull, inspect, and delete Ollama models directly from the UI without terminal commands. |
| 🧪 **Live Artifact Sandbox** | Render interactive HTML, React, SVG, and Mermaid diagrams directly in your chat stream. |
| 🪶 **Featherweight Image** | Multi-stage Alpine Linux + Nginx image under **72 MB** with instant startup. |

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `PORT` | `80` | Internal container port served by Nginx |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | URL of your Ollama instance |

---

## 👨‍💻 Links & Author

- **Docker Hub Repository:** [hub.docker.com/r/kapilyadav22/localllmmind](https://hub.docker.com/r/kapilyadav22/localllmmind)
- **GitHub Repository:** [github.com/kapilyadav22/localllmmind](https://github.com/kapilyadav22/localllmmind)
- **Author:** [Kapil Kumar Yadav](https://github.com/kapilyadav22)
- **LinkedIn:** [linkedin.com/in/kapilyadav22](https://www.linkedin.com/in/kapilyadav22/)
- **X (Twitter):** [@kapilyadav2210](https://x.com/kapilyadav2210)
- **Email:** `singhkapil347@gmail.com`
