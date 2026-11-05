<div align="center">

# ⚡ ARCline

### *Next-Generation Autonomous Agent Harness & AI Coding Environment*

[![npm version](https://img.shields.io/npm/v/arcline.svg?style=flat-square&color=6366f1&logo=npm)](https://www.npmjs.com/package/arcline)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=flat-square)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/Node.js-%3E%3D24.9.0-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Linux%20%7C%20macOS%20%7C%20Windows-blue?style=flat-square)](https://github.com/kaizxark/arcline)

<p align="center">
  <b>ARCline</b> is a modular, high-performance AI agent harness and developer workspace.<br/>
  Featuring an interactive <b>Web UI</b>, responsive <b>Terminal UI (TUI)</b>, and scriptable <b>Headless Engine</b>,<br/>
  built on an extensible <b>everything-is-a-plugin</b> kernel.
</p>

[Quick Start](#-quick-start) •
[Profiles & Modes](#-execution-profiles) •
[Architecture](#-architecture) •
[Capabilities](#-key-capabilities) •
[Configuration](#-configuration) •
[Extensibility](#-plugins--ecosystem)

</div>

---

## 🌟 Highlights

- 🌐 **Modern Web UI**: Live streaming turn timeline, side-by-side diff previews, interactive terminal, deliverable cards, and session persistence.
- 💻 **Terminal TUI Mode**: High-velocity keyboard-driven terminal agent for focused in-editor development.
- 🤖 **Autonomous Agent Loops**: Multi-turn planning, tool calling, auto-recovery, and subagent delegation.
- 🔌 **Everything-is-a-Plugin**: Built on the [Cordis](https://github.com/cordiverse/cordis) reactive microkernel — every capability, model provider, tool, and UI slot is a hot-pluggable plugin.
- 🛡️ **Defensive & Sandboxed**: Conconfined subprocess management, permission guardrails, secret masking, and deterministic state projection.
- 📡 **ACP Protocol Ready**: Native support for the Agent Client Protocol (ACP) for IDE integration and remote BFF orchestration.

---

## 🚀 Quick Start

### Run Instantly with `npx` (No Installation Required)

Launch the full interactive browser interface with zero setup:

```bash
npx arcline web
```

### Install Globally via npm

```bash
npm install -g arcline
```

Once installed, use `arcline` anywhere in your terminal:

```bash
# Launch the Web GUI (opens in your default browser)
arcline web

# Launch headless in background or without auto-opening a browser
arcline web --no-open --port 3080

# Execute a single-turn autonomous coding task
arcline headless "Analyze src/ and generate a comprehensive architecture document"

# Launch the interactive Terminal User Interface (TUI)
arcline tui
```

> **Requirement**: ARCline requires **Node.js >= 24.9.0**. Switch to Node 24 with `nvm use 24` or `fnm use 24`.

---

## 🖥️ Execution Profiles

ARCline profiles package tailored stacks of plugins for specific workflows:

| Profile | Command | Description | Recommended For |
| :--- | :--- | :--- | :--- |
| **Web UI** | `arcline web` | Full dual-pane web environment with live markdown streaming, session management, and visual diffs. | General coding, interactive chat, visual reviews |
| **Terminal (TUI)** | `arcline tui` | Fast, lightweight in-terminal workspace with hotkeys and live streaming output. | Pure CLI workflows, SSH sessions, tmux |
| **Headless** | `arcline headless "<task>"` | Non-interactive task executor that runs from prompt to output and exits with exit code. | CI/CD pipelines, git hooks, automated scripts |
| **Rescue** | `arcline rescue` | Minimal recovery harness to diagnose corrupted plugin configurations or state. | Troubleshooting & state reset |

---

## 🏛️ Architecture

ARCline is designed from the ground up as a composable microkernel where all functionality lives inside layered, sandboxed plugins:

```mermaid
flowchart TD
    subgraph UI ["Client & Presentation Layer"]
        W[Web GUI (Vite + React)]
        T[Terminal UI (Ink / Raw ANSI)]
        H[Headless Output Streamer]
    end

    subgraph Core ["ARCline Kernel (Cordis Core)"]
        Kernel[Cordis Reactive Microkernel]
        Registry[TypeRT & Service Registry]
        Events[Declaration-Merged Typed Events]
    end

    subgraph Agent ["Agent Execution Engine"]
        Loop[Agent Loop & Reasoning Chain]
        Compaction[Context Compaction & Token Meter]
        Guard[Tool Guards & Approval Policy]
        Subagent[Subagent Spawner & Delegator]
    end

    subgraph Subsystems ["Extensible Plugin Ecosystem"]
        Tools["Tools (Bash, FS, Git, Editor, Web)"]
        LLM["LLM Providers (DeepSeek, OpenAI Compatible)"]
        ACP["Agent Client Protocol (ACP)"]
        Storage["Session Persistence (JSONL / SQLite)"]
    end

    W --> Kernel
    T --> Kernel
    H --> Kernel
    Kernel --> Registry
    Kernel --> Events
    Kernel --> Loop
    Loop --> Compaction
    Loop --> Guard
    Loop --> Subagent
    Loop --> Subsystems
```

---

## ⚡ Key Capabilities

### 🛠️ Autonomous Tool Harness
- **Intelligent File Operations**: Search, edit, format, and multi-file diff inspection.
- **Persistent Shell Execution**: Isolated background bash and powershell sessions with streaming stdout/stderr tracking.
- **Subagent Orchestration**: Delegate sub-tasks to child agents with isolated workspaces and synchronized context.
- **Model Context Protocol (MCP)**: Native integration for external MCP servers and tools.

### 🧠 Model Providers & API Keys
ARCline works out of the box with **DeepSeek** and any **OpenAI-compatible** inference endpoint:

```bash
# Set your API Key
export DEEPSEEK_API_KEY="sk-..."

# Optional custom base URL (e.g. self-hosted / vLLM / OpenRouter)
export DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"
```

Configure your models in **Settings → Models** inside the Web UI or in profile configuration overlays.

---

## 🔧 Profile & Plugin Management

Manage plugin dependencies directly via the CLI:

```bash
# Add a plugin to a profile
arcline plugin --profile web add <plugin-package>

# Inspect compiled configuration tree
arcline --profile web --dump-config

# Validate JSON schema for active profile entries
arcline --profile web --dump-config-schema
```

Custom profiles can overlay configuration patches easily:

```bash
arcline tui --patch ./my-custom-overlay.yml
```

---

## 📦 Building From Source

For developers contributing to or extending ARCline:

```bash
# 1. Clone repository
git clone https://github.com/kaizxark/arcline.git
cd arcline

# 2. Install workspace dependencies
pnpm install

# 3. Build artifacts & client bundles
pnpm run build:artifacts
pnpm run build:web

# 4. Launch development web server
pnpm dsh web
```

---

## 📄 License & Attribution

ARCline is open-source software licensed under the **[MIT License](LICENSE)**.

ARCline is derived and evolved from the [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) open-source project (`Copyright (c) 2026 DeepSeek`). All original copyrights, licenses, and notices are preserved in accordance with the MIT license terms.

---

<div align="center">
  <sub>Engineered by <a href="https://github.com/kaizxark">kaizxark</a> and the open-source community.</sub>
</div>
