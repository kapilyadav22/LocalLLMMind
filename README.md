# LocalMind

<div align="center">

**A production-grade, privacy-first desktop AI workstation for local models.**  
*Engineered by **Kapil Kumar Yadav***

[![React 19](https://img.shields.io/badge/React-19.3.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.1-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Material UI](https://img.shields.io/badge/Material--UI-9.2-007FFF?logo=mui&logoColor=white)](https://mui.com/)
[![Ollama](https://img.shields.io/badge/Ollama-Native_API-000000?logo=ollama&logoColor=white)](https://ollama.com/)
[![Vision Ready](https://img.shields.io/badge/Vision-Multimodal_Ready-06b6d4?logo=eye&logoColor=white)](#-multimodal-vision-support)
[![DeepSeek-R1](https://img.shields.io/badge/DeepSeek--R1-Reasoning_Ready-8b5cf6)](#-deepseek-r1--reasoning-model-support)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](#-docker-deployment)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)

</div>

---

## 🌟 Overview

**LocalMind** is a state-of-the-art desktop AI workstation designed to interface directly with local LLMs via **Ollama**. Running 100% locally on your machine with zero data leaving your network, it combines the aesthetic finesse of modern AI products with hardware-optimized streaming performance, live token throughput benchmarking, reasoning model introspection, and seamless multimodal vision capabilities.

---

## ✨ Key Features

### 👁️ Multimodal Vision Support (Llama 3.2 Vision, LLaVA, Moondream)
- **Multi-Source Image Ingestion**:
  - **Clipboard Paste**: Paste screenshots directly with <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>V</kbd> anywhere in the input box.
  - **Drag & Drop**: Drag images from your desktop or browser into the interactive composer dropzone.
  - **File Attachment Picker**: Browse and attach photos using the integrated image picker button.
- **Visual Thumbnail Strip**: Inspect attached images, view formatted file sizes, and remove individual attachments before sending.
- **Click-to-Zoom Lightbox**: Click any message image to inspect high-resolution details in an interactive zoom modal.
- **Native Ollama Vision Pipeline**: Automatic conversion to raw Base64 formatted to Ollama's `/api/chat` `images` array specification.
- **Popular Vision Models Supported**:
  - `llama3.2-vision:11b` (Meta's flagship local vision model)
  - `llava:7b` / `llava:13b` (Fast visual instruction tuning)
  - `moondream:1.8b` (Ultra-lightweight edge vision model)

### ⚡ Hardware-Optimized Token Batching (30–80+ tok/s)
- **Zero UI Freezes**: Streaming tokens are buffered on a 35ms micro-interval (~30fps), reducing React re-renders by ~75% during rapid GPU/NPU token generation.
- **Jitter-Free Auto-Scroll**: Instant viewport positioning during active generation prevents browser smooth-scroll animation collisions.
- **Scroll-To-Bottom Fab**: Automatic detection reveals a floating navigation button whenever you scroll up during an active response.

### 📊 Live Generation Metrics (Tokens/Sec)
- Real-time performance badge under assistant messages displaying:
  - **Generation speed**: `⚡ 54.2 tok/s`
  - **Token count & generation time**: `340 tokens (6.2s)`
  - **Active model identifier**: `llama3.2`, `deepseek-r1:8b`, etc.

### 🧠 DeepSeek-R1 & Reasoning Model Support
- Built-in parser for `<think>...</think>` tags used by DeepSeek-R1, Qwen 2.5, and reasoning models.
- Interactive **collapsible thought accordion** with a live pulsing indicator during the chain-of-thought phase that auto-folds once the final answer begins streaming.
- Enhanced Prism syntax highlighting for 15+ developer languages (`TypeScript`, `Rust`, `Go`, `Python`, `C++`, `SQL`, `YAML`, `Docker`, etc.).

### 📥 In-App Ollama Model Manager
- **Visual Model Catalog**: View installed models with disk footprints, parameter sizes (e.g. `8B`), and quantization formats (e.g. `Q4_K_M`).
- **Live Stream Pulls**: Pull any model directly from the UI with real-time percentage progress bars via Ollama's `/api/pull`.
- **Quick Recommendations**: 1-click pull chips for `llama3.2`, `deepseek-r1:8b`, `qwen2.5-coder:7b`, `mistral`, and `gemma2`.
- **Model Deletion**: Safely prune unused models to reclaim disk storage.

### 📁 Project Folders & Chat Hierarchy
- **Custom Project Folders**: Create, color-code, and organize conversations into structured project folders (e.g., *Frontend Architecture*, *AI Research*, *Marketing*).
- **Collapsible Sidebar Tree**: Interactive folder accordion with chat count badges, fold/unfold toggles, and direct "+ New Chat in Project" actions.
- **Move Between Projects**: Move chats between folders or back to General with the 1-click "Move to Project..." dialog.
- **Header Project Badge**: Interactive project tag in active chat header allows instant project reassignment.
- **Project-Aware Search**: Real-time keyword filtering expands project folders automatically when matching conversations are found inside.
- **Context-Aware Welcome Screen**: Dynamic project badge and tailored messaging displayed when launching a new conversation in a project folder.
- **Safe Folder Deletion**: Choose to keep conversations (returning them to General) or delete chats alongside the folder.
- **Full Backup Integration**: Project hierarchy is fully persisted in local storage and included in JSON backup exports/imports.

### 📌 Pinned Chats & Quick Access
- **Pin to Top**: Star and pin critical conversations to a dedicated `PINNED` section at the top of the sidebar for instant retrieval.
- **Project Indication on Pinned Chats**: Pinned chats display their associated project color accent dot for seamless organization.
- **1-Click Pin/Unpin**: Toggle pin state from the conversation context menu with immediate tactile toast feedback.

### 🛡️ Accidental Deletion Protection & Safe UX
- **Safe Conversation Deletion**: Confirmation dialog prompts before deleting any conversation, displaying the exact conversation title to prevent accidental data loss.
- **Snappy Action Feedback Toasts**: Global toast alerts confirm major operations: pinning/unpinning, moving between projects, folder creation/deletion, renaming, and markdown exports.

### 💾 Custom Memory Path & Local Disk Storage Sync
- **User-Defined Storage Location**: Choose between sandboxed browser memory or a designated folder path on your computer hard drive (e.g., `~/Documents/LocalLLM_Memory`, `/Volumes/Drive/AI_Chats`).
- **Native Directory Picker**: Link directly to any local directory using the modern HTML5 File System Access API (`window.showDirectoryPicker`).
- **Live Background Auto-Sync**: Automatically writes all conversations, projects, and memory metadata directly to disk whenever chats update.
- **Obsidian & VS Code Ready (`chats/*.md`)**: Generates readable Markdown files in a dedicated `chats/` subfolder alongside `conversations.json`, allowing you to browse, search, and edit your AI chats in external markdown tools.
- **One-Click Folder Restore**: Seamlessly reload and restore conversations and project structures from any linked folder.
- **Sidebar Memory Indicator**: Persistent footer pill displaying the active memory folder name with quick navigation to Storage & Memory settings.

### 📄 Document & Code File Ingestion ("Chat with Docs")
- **40+ Formats Supported**: Ingest source code files (`.py`, `.js`, `.ts`, `.jsx`, `.tsx`, `.rs`, `.go`, `.java`, `.c`, `.cpp`), configurations (`.json`, `.yaml`, `.toml`, `.env`, `.xml`), data (`.csv`, `.tsv`, `.sql`), and documentation (`.md`, `.txt`, `.log`).
- **Client-Side Text Extraction**: Ingested entirely in-browser with zero third-party cloud uploads.
- **Safety Size Guard**: Automatic 500KB cap per file protects local LLM context windows from memory blowups.
- **Interactive Document Chip Strip**: Preview attached documents, token estimates, and remove items before submitting.

### 🧠 Context Window Tuning & Live Capacity Meter
- **Ollama `num_ctx` Customization**: Configure context size per model invocation from 2K up to 128K (`2048` to `131072` tokens) with VRAM guidance in Settings.
- **Live Header Capacity Meter**: Dynamic chip displays real-time estimated tokens vs. context window limit (e.g. `~1.2k / 4k tok`).
- **Visual Alert Thresholds**: Color changes smoothly from primary blue to amber (65%+) and red (85%+) to prevent context overflows.

### 🔍 In-Chat Message Search (<kbd>Cmd+F</kbd> / <kbd>Ctrl+F</kbd>)
- **Instant Keyword Navigation**: Press <kbd>Cmd+F</kbd> or click the search icon to activate in-chat search.
- **Match Navigation**: Cycle through matches seamlessly with <kbd>Enter</kbd> (next) and <kbd>Shift+Enter</kbd> (prev) with automatic smooth scrolling to the matching bubble.
- **Visual Highlight**: Active search matches are highlighted with an ambient accent border.

### 🎭 AI Personas & Prompt Presets
- **Preset System Personas**:
  - 🤖 **General Assistant**: Balanced, adaptable, and versatile.
  - 🏗️ **Software Architect**: Senior engineer specializing in patterns, clean code, and type safety.
  - 🔍 **Bug Hunter & Code Reviewer**: Meticulous code inspection for security vulnerabilities and edge cases.
  - ⚡ **Concise & Direct**: High-density answers with zero conversational fluff.
  - 🎓 **Academic Researcher**: Deep analytical rigor with citations and structured methodologies.
  - 🎨 **Creative Writer**: Expressive storytelling, rich metaphors, and evocative prose.
- **Per-Conversation Role**: Switch personas at any time directly from the chat header.

### 💬 Quote-Reply & Conversation Forking
- **Selective Quote-Reply**: Click the reply icon on any message to quote it with an active context chip banner in the composer.
- **Fork / Branch Chat**: Split conversations from any turn into a new chat thread using the fork button (<kbd>CallSplit</kbd>) on message bubbles.

### 📤 Share & Rich Save Modal
- **Save as High-Res PNG Image**: Powered by `html-to-image`, captures full markdown formatting, syntax highlighting, and watermark for social sharing.
- **Save as Plain Text (`.txt`)**: Clean unformatted text for simple note-taking tools.
- **Save as Markdown (`.md`)**: Full markdown export with metadata header and dividers.
- **1-Click Copy Chat**: Instant formatted markdown copy to clipboard with toast confirmation.
- **Native OS Web Share**: Share conversation links and snippets directly via AirDrop, Messages, and Mail on supported devices.

### 🔄 Message Branching & Regeneration
- **Regenerate Responses**: Click the refresh button on any assistant message to trigger a fresh completion from that turn.
- **Edit & Branch**: Edit previous user prompts to explore alternative conversation paths.

### 🎙️ Voice Input & Text-to-Speech
- **Voice Transcription**: Speak prompts naturally using Web Speech Recognition with live interim feedback.
- **Natural Text-to-Speech**: Listen to assistant responses with automatic markdown and `<think>` reasoning tag sanitization.

### 📄 Markdown & Backup Export
- **1-Click Markdown Export**: Download individual conversations as beautifully formatted `.md` files.
- **Full Database Portability**: Export and import complete conversation histories as JSON backups.

### 🌓 Curated Dark & Light Design System
- Tailored glassmorphism palettes with fluid elevation, subtle borders, and harmonious gradients.
- Fully responsive layout with mobile app bar, drawer sheet, and adaptive full-screen dialogs.

---

## ⌨️ Keyboard Shortcuts & Custom Keybindings

LocalMind features a **full-featured Keyboard Shortcuts Manager** where all keybindings can be viewed, searched, customized, and created with conflict detection.

### Accessing Shortcuts
- **Direct Keystroke**: Press <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>/</kbd> anywhere in the application.
- **Sidebar Footer**: Click the keyboard icon (<kbd>⌘/</kbd>) in the sidebar bottom bar.
- **Settings Dialog**: Navigate to the dedicated **Shortcuts** tab inside Settings (<kbd>Cmd+,</kbd>).

### Default Keybindings

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| <kbd>Enter</kbd> | Send Message | Submit the prompt to the active model |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | New Line | Insert a multi-line break in the composer |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>F</kbd> | Find in Chat | Open search bar to navigate messages |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>K</kbd> | New Conversation | Start a clean new chat session |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>B</kbd> | Toggle Sidebar | Collapse or expand navigation drawer |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>,</kbd> | Open Settings | Access parameters, models, data, and dev info |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>/</kbd> | Shortcuts Manager | View, rebind, or create custom shortcuts |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>D</kbd> | Toggle Theme | Quick switch between Dark and Light mode |
| <kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>I</kbd> | Focus Chat Input | Jump cursor immediately into message composer |
| <kbd>Escape</kbd> | Stop / Dismiss | Stop active streaming or dismiss open dialogs |

### Custom Shortcuts & Automation
- **Rebind Keys**: Click the edit pencil icon next to any shortcut and press your preferred key combination on the keyboard.
- **Create Custom Shortcuts**: Click **"+ Create Shortcut"** to bind custom key combinations to:
  - Custom prompt templates (e.g. `/summarize`, `/refactor`, `/explain`, or your own custom prompt instructions)
  - Quick actions (toggle theme, new chat, focus composer, toggle sidebar)
- **Automatic Persistence**: All custom shortcuts and key rebindings are stored in local storage and persist across sessions.
- **Factory Reset**: Restore all standard shortcuts anytime via the **Reset All** button.


## 🚀 Quickstart

### Prerequisites
1. Ensure [Node.js](https://nodejs.org/) (v18+) is installed.
2. Ensure [Ollama](https://ollama.com/) is installed and running:
   ```bash
   ollama serve
   ```
3. Pull a model (e.g. Llama 3.2 or Llama 3.2 Vision):
   ```bash
   ollama pull llama3.2
   # Or for multimodal vision tasks:
   ollama pull llama3.2-vision:11b
   # Or lightweight vision:
   ollama pull moondream
   ```

### Installation

```bash
# Clone the repository
git clone https://github.com/kapilyadav22/local_llm_ui.git
cd local_llm_ui

# Install dependencies
npm install

# Launch development server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🐳 Docker Deployment

LocalMind can be run anywhere via Docker without needing Node.js installed on your host system.

### Option 1: Docker Compose (Recommended)

Run LocalMind connected to Ollama running on your host machine:

```bash
# Start LocalMind on http://localhost:3000
docker compose up -d
```

> **Note**: The container automatically connects to host Ollama at `http://host.docker.internal:11434` via `extra_hosts`.

#### All-in-One Stack (LocalMind + Ollama in Docker):
If you don't have Ollama installed on your host and want Docker to manage both:

```bash
docker compose --profile with-ollama up -d
```

### Option 2: Standalone Docker Run

Build and run the lightweight container directly:

```bash
# 1. Build the production image
docker build -t localmind .

# 2. Run the container (connecting to host Ollama)
docker run -d \
  -p 3000:80 \
  --add-host=host.docker.internal:host-gateway \
  -e OLLAMA_URL=http://host.docker.internal:11434 \
  --name localmind \
  localmind
```

Access the workstation at **[http://localhost:3000](http://localhost:3000)**.

### Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `80` | Internal Nginx listening port |
| `OLLAMA_URL` | `http://host.docker.internal:11434` | Ollama API endpoint to reverse proxy for streaming |

---

## 🏗️ Architecture & Project Structure

```text
localmind/
├── src/
│   ├── assets/             # Brand logos & graphics
│   ├── components/
│   │   ├── Chat/           # ChatView, MessageBubble, MessageInput, WelcomeScreen
│   │   ├── Layout/         # AppLayout, Sidebar, ProjectDialog, MoveToProjectDialog
│   │   ├── Settings/       # SettingsDialog (Model Manager, Parameters, Data, Shortcuts)
│   │   └── common/         # AppLogo, DeveloperBadge, MarkdownRenderer, ModelSelector
│   ├── constants/          # appConstants.js (Branding, Developer, Config, Models)
│   ├── hooks/              # useAudio.js (Speech-to-Text & Text-to-Speech)
│   ├── services/           # ollamaService.js (Stream chat, Pull, Delete, Show)
│   ├── store/              # chatStore.jsx & chatContext.js (State management & projects)
│   ├── utils/              # storage.js (persistence), imageUtils.js (vision ingestion & Base64 encoder)
│   ├── theme.js            # Curated Dark and Light MUI theme tokens
│   ├── App.jsx             # Top-level application shell
│   └── main.jsx            # Entrypoint
├── public/                 # Favicon & static vector assets
├── package.json
└── vite.config.js          # Vite configuration with Ollama API proxy
```

---

## 👨‍💻 Developer & Author

**LocalMind** was architected, designed, and developed by:

- **Kapil Kumar Yadav** — *Lead Engineer & Designer*
- **GitHub**: [@kapilyadav22](https://github.com/kapilyadav22)

---

## 📄 License & Attribution

This project is licensed under the Apache License 2.0.

You are free to use, modify, and distribute this project in accordance with the license.

If you use this project or create a derivative work, please retain the original copyright and license notices and provide appropriate attribution to the original author.

Copyright © 2026 Kapil Kumar Yadav.

See the [LICENSE](LICENSE) file for the complete license terms.

