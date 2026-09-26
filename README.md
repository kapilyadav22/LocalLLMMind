# LocalLLMMind

<div align="center">

**A production-grade, privacy-first desktop AI workstation for local LLMs.**  
*Engineered by **Kapil Kumar Yadav***

[![React 19](https://img.shields.io/badge/React-19.3.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Material UI](https://img.shields.io/badge/Material--UI-9.2-007FFF?logo=mui&logoColor=white)](https://mui.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Native_API-000000?logo=ollama&logoColor=white)](https://ollama.com/)
[![Docker Hub](https://img.shields.io/badge/Docker_Hub-kapilyadav22%2Flocalllmmind-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/kapilyadav22/localllmmind)
[![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?logo=pwa&logoColor=white)](#-progressive-web-app)
[![Sponsor](https://img.shields.io/badge/Sponsor-GitHub%20Sponsors-EA4AAA?logo=github-sponsors&logoColor=white)](https://github.com/sponsors/kapilyadav22)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

---

## 🌟 Overview

**LocalLLMMind** is a full-featured desktop AI workstation that interfaces directly with **Ollama** to run LLMs 100% locally. Zero data leaves your machine. It combines the polish of modern AI products with hardware-optimized streaming, live benchmarking, reasoning model introspection, multimodal vision, RAG document chat, and a complete model management toolkit.

---

## ✨ Features

### 👁️ Multimodal Vision Support
- **Paste, drag-and-drop, or browse** images directly into the chat composer.
- Automatic Base64 conversion to Ollama's `/api/chat` `images` array.
- Click-to-zoom lightbox for high-resolution image inspection.
- Supports `llama3.2-vision`, `llava`, `moondream`, and all Ollama vision models.

### ⚡ Hardware-Optimized Streaming (30–80+ tok/s)
- Tokens are buffered on a 35ms micro-interval (~30fps), reducing React re-renders by ~75%.
- Jitter-free auto-scroll during active generation.
- Live generation metrics badge: speed (`⚡ 54.2 tok/s`), token count, duration, and active model.

### 🧠 DeepSeek-R1 & Reasoning Model Support
- Built-in `<think>...</think>` tag parser for DeepSeek-R1, Qwen 2.5, and reasoning models.
- Interactive collapsible thought accordion with live pulsing indicator during chain-of-thought.

### 📄 RAG / Document Chat ("Chat with Docs")
- Drag-and-drop or browse **40+ file formats**: source code (`.py`, `.js`, `.ts`, `.rs`, `.go`, `.java`, `.cpp`), configs (`.json`, `.yaml`, `.toml`, `.env`), data (`.csv`, `.sql`), and docs (`.md`, `.txt`).
- Client-side text extraction — nothing leaves your machine.
- 500KB safety guard to prevent context window overflows.

### 📥 In-App Model Manager
- View installed models with disk size, parameter count, quantization format, and model family.
- Pull new models with real-time progress bars and cancel support.
- 1-click quick-pull chips for popular models (`llama3.2`, `deepseek-r1:8b`, `phi4`, `gemma3`).

### ✏️ Message Edit & Regenerate
- **Edit any user message** — truncates the conversation and streams a fresh response from that point.
- **Regenerate assistant responses** with full version history.
- **Version navigation** — browse between regenerated responses with `◀ 2/3 ▶` arrows.

### 🎭 AI Personas
- 6 built-in system personas: General Assistant, Software Architect, Bug Hunter, Concise & Direct, Academic Researcher, Creative Writer.
- Switch personas per-conversation from the chat header.

### ⚔️ Arena Mode (Side-by-Side Comparison)
- Run two models simultaneously on the same prompt.
- Compare responses side-by-side and vote for the better output.

### 📝 Prompt Library & Slash Commands
- Built-in prompt template library with CRUD, categories, and import/export.
- Type `/` in the composer for instant slash-command autocomplete.

### 🔍 Global Conversation Search (<kbd>Cmd+Shift+F</kbd>)
- Full-text search across all conversations with highlighted match snippets.
- Results grouped by conversation with 1-click jump to the exact message.

### 🧠 Smart Auto-Title Generation
- After the first exchange, the LLM automatically generates a descriptive 3–5 word title for the conversation.

### 📁 Project Folders
- Create color-coded project folders to organize conversations.
- Collapsible sidebar tree with chat count badges.
- Move conversations between projects.

### 🎙️ Voice Input & Text-to-Speech
- Speak prompts using Web Speech Recognition with live interim feedback.
- Listen to assistant responses with markdown-sanitized TTS output.

### 📊 Context Window Meter
- Live header chip showing estimated tokens vs. context limit (e.g. `~1.2k / 4k tok`).
- Color-coded thresholds: blue → amber (65%+) → red (85%+).

### 💾 Local Storage & Disk Sync
- Choose between browser memory or a local directory on your hard drive.
- Auto-sync conversations to disk as JSON + readable Markdown files (Obsidian-compatible).
- Full JSON backup import/export with data portability.

### 📤 Share & Export
- Export as **PNG image**, **Markdown**, **plain text**, or **PDF** (print-optimized A4).
- Native OS Web Share API integration.

### 🌐 Web Search Grounding
- Ground LLM responses with real-time web search context.
- Source citations displayed as clickable chips on messages.

### 🧪 Artifact Sandbox
- Interactive sandbox drawer for rendering HTML/CSS/JS artifacts generated by the LLM.

### ⌨️ Custom Keyboard Shortcuts
- Full shortcuts manager with conflict detection and custom keybinding creation.
- Bind custom key combos to prompt templates and quick actions.

| Shortcut | Action |
| :--- | :--- |
| <kbd>Cmd+K</kbd> | New Conversation |
| <kbd>Cmd+B</kbd> | Toggle Sidebar |
| <kbd>Cmd+F</kbd> | Find in Chat |
| <kbd>Cmd+Shift+F</kbd> | Global Search |
| <kbd>Cmd+Shift+M</kbd> | Model Manager |
| <kbd>Cmd+,</kbd> | Settings |
| <kbd>Cmd+/</kbd> | Shortcuts Manager |
| <kbd>Escape</kbd> | Stop Generation / Dismiss |

### 📱 Progressive Web App
- Installable as a standalone desktop app via Chrome/Edge.
- Offline caching service worker for app shell and static assets.

### 🌓 Dark & Light Theme
- Curated glassmorphism design with fluid gradients and subtle micro-animations.
- Fully responsive — works on desktop, tablet, and mobile.

---

## 🚀 Quickstart

### Prerequisites
1. Install [Node.js](https://nodejs.org/) (v18+).
2. Install and run [Ollama](https://ollama.com/):
   ```bash
   ollama serve
   ```
3. Pull a model:
   ```bash
   ollama pull llama3.2
   # For vision:
   ollama pull llama3.2-vision:11b
   ```

### Installation

```bash
git clone https://github.com/kapilyadav22/local_llm_ui.git
cd local_llm_ui
npm install
npm run dev
```

Open [http://localhost:2210/](http://localhost:2210/) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🐳 Docker Deployment

### ⚡ Quick Start via Docker Hub (No build required)

Pull and run the pre-built, lightweight Alpine image directly from Docker Hub:

```bash
docker run -d \
  --name localllmmind \
  -p 3000:80 \
  --add-host=host.docker.internal:host-gateway \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  --restart unless-stopped \
  kapilyadav22/localllmmind:latest
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

> 📦 **Docker Hub Repositories:**  
> - [`kapilyadav22/localllmmind`](https://hub.docker.com/r/kapilyadav22/localllmmind) *(Official)*  
> - [`kapilyadav22/runlocalllm`](https://hub.docker.com/r/kapilyadav22/runlocalllm) *(Mirror)*

---

### Docker Compose (Recommended)

```bash
# Start LocalLLMMind → http://localhost:3000
docker compose up -d
```

> Automatically connects to host Ollama at `http://host.docker.internal:11434`.

#### All-in-One (LocalLLMMind + Ollama containerized):

```bash
docker compose --profile with-ollama up -d
```

---

### Build from Source

```bash
docker build -t localllmmind .
docker run -d \
  -p 3000:80 \
  --add-host=host.docker.internal:host-gateway \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  --name localllmmind \
  localllmmind
```

| Variable | Default | Description |
|---|---|---|
| `PORT` | `80` | Nginx listening port inside container |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama API endpoint on host gateway |

---

## 🏗️ Project Structure

```text
localllmmind/
├── src/
│   ├── components/
│   │   ├── Chat/           # ChatView, MessageBubble, MessageInput, WelcomeScreen,
│   │   │                   # ArenaMessageBubble, ContextMeter, PersonaDialog,
│   │   │                   # PromptLibraryDialog, ShareChatDialog, ArtifactSandboxDrawer
│   │   ├── Layout/         # AppLayout, Sidebar, GlobalSearchDialog, ProjectDialog
│   │   ├── Settings/       # SettingsDialog, ModelManagerDialog
│   │   └── common/         # MarkdownRenderer, ShortcutsManager, AppLogo, ModelSelector
│   ├── constants/          # App branding, models, personas, shortcuts
│   ├── hooks/              # useAudio (Speech-to-Text & TTS)
│   ├── services/           # ollamaService, webSearchService
│   ├── store/              # React Context + useReducer state management
│   ├── utils/              # Storage, documentUtils, pdfExport, dialogService
│   ├── theme.js            # MUI Dark & Light theme tokens
│   └── main.jsx            # Entrypoint with PWA service worker registration
├── public/                 # PWA manifest, service worker, icons
├── Dockerfile              # Multi-stage Node + Nginx Alpine build
├── docker-compose.yml      # Production orchestration with Ollama profiles
├── nginx.conf.template     # Streaming reverse proxy for LLM tokens
└── vite.config.js          # Vite config with Ollama API proxy
```

---

## 👨‍💻 Author

**Kapil Kumar Yadav** — *Lead Engineer & Designer*

- [![GitHub](https://img.shields.io/badge/GitHub-kapilyadav22-181717?logo=github)](https://github.com/kapilyadav22)
- [![LinkedIn](https://img.shields.io/badge/LinkedIn-kapilyadav22-0A66C2?logo=linkedin)](https://www.linkedin.com/in/kapilyadav22/)
- [![X](https://img.shields.io/badge/X-kapilyadav2210-000000?logo=x)](https://x.com/kapilyadav2210)
- [![Email](https://img.shields.io/badge/Email-singhkapil347%40gmail.com-EA4335?logo=gmail)](mailto:singhkapil347@gmail.com)

---

## 💖 Sponsor & Support

If you find **LocalLLMMind** valuable for your workflow, consider sponsoring or supporting this project:

- [💖 Sponsor on GitHub Sponsors](https://github.com/sponsors/kapilyadav22)
- ⭐ **Star this repository** to help others discover it
- 🐛 **Report bugs or submit features** to help improve the project

---

## 📄 License

Licensed under the [Apache License 2.0](LICENSE).

Copyright © 2026 Kapil Kumar Yadav. All rights reserved.


### Code workspace: opening projects and adding context

- Use **Code → Open folder** to import a local source folder, or **Import** for a ZIP or exported project JSON. GitHub-style ZIPs are unwrapped automatically. Relative paths, source text, and exported review comments are preserved.
- The workspace keeps an editable copy in this browser. It does not overwrite the folder you selected. Use **ZIP**, **Save to disk**, or **Open in IDE** to take the edited files back to disk.
- Imports support up to 2,000 UTF-8 source files / 20 MB total (2 MB per file, 30 MB compressed ZIP). Dependency folders, build output, editor metadata, binary assets, and local credential files are skipped, with a visible import report. This is a source editor, not a binary-asset manager.
- In **AI Assistant**, use **Attach files**, **Attach folder**, or drag text/source files onto the prompt area. Remove individual attachments or clear them all. Attachments are read-only model context, not project files, and are cleared when switching projects. Up to 20 attachments of 512 KB each are supported. Context is sent to the selected provider; choose Ollama to keep generation local.
- For larger projects, use **Project context → Open tabs only**. File paths remain available to the assistant, while file contents are limited to the selected scope. Combined context is limited to 120,000 characters; individual AI proposals remain limited to 80 files / 2 MB and always require review before applying.
- **Run** executes supported source files in a local project copy. **Terminal** preserves files and installed dependencies between commands during the same server session. Each command starts at the project root. Program output, nonzero exit codes, and timeouts are shown explicitly. The run copy is separate from the editable browser copy; reimport generated files to edit them. Use your IDE for interactive processes or long-running servers.
- **Format** uses Prettier for JavaScript, TypeScript, JSON, HTML, CSS, Markdown, Vue, and YAML. Python / Python stubs use Black through the local server. Run `npm run setup:formatters` once (Python 3.10+ required) to install the pinned Black runtime into `.formatter-venv`; no global packages are modified. Python formatting follows Black's four-space indentation and preserves comments. Syntax errors leave source unchanged and appear above the workspace. Other languages show guidance to use their IDE formatter.
- **Workspace layout:** project import/export, snapshots, and rename live in the project actions menu (`…`). Run and Format remain visible beside the editor. The editor actions menu contains appearance, outline, download, and file operations. Stack/language options can be expanded in the assistant.
- The **Git** panel tracks browser-workspace checkpoints, not your original Git repository. Commits include only staged paths; unstaged changes remain visible. Deleted tracked files can be restored from their baseline.

Desktop actions require `npm run dev` or `npm run preview` on localhost. A static/Docker-hosted browser app cannot start programs on your computer. Tests: `npm test`; production build: `npm run build`.
