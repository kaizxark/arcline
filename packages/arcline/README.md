# ARCline

**ARCline** is an open-source, extensible AI agent harness and runtime with browser UI, interactive terminal (TUI), and headless automation modes.

Built on an **everything-is-a-plugin** architecture powered by [Cordis](https://github.com/cordiverse/cordis), ARCline provides modular capabilities for agent execution loops, ACP (Agent Client Protocol), autonomous tool use, multi-turn reasoning, and customizable plugin bundles.

---

## Quick Start

### 1. Run via CLI

You can run the `arcline` CLI directly from anywhere on your system:

```bash
# Launch the interactive Web UI
arcline web

# Launch without opening a browser window
arcline web --no-open

# Run a headless task directly
arcline headless "Summarize the repository structure"

# Launch the interactive Terminal UI (TUI)
arcline tui
```

### 2. Available Profiles

ARCline profiles allow you to boot tailored stacks of plugins:

| Profile | Command | Description |
| :--- | :--- | :--- |
| **Web UI** | `arcline web` | Full browser experience with conversation view, tool execution timeline, settings, and file docks. |
| **Headless** | `arcline headless "<task>"` | Runs single-shot tasks from prompt to completion and prints the result. |
| **TUI** | `arcline tui` | Interactive terminal UI for terminal-first agent workflows. |
| **Rescue** | `arcline rescue` | Recovery environment for diagnosing plugin and configuration state. |

---

## Configuration & Environment

ARCline reads configuration from your environment and profile directories:

```bash
# Model Provider Keys
export DEEPSEEK_API_KEY="your-api-key"
# Optional custom base URL:
# export DEEPSEEK_BASE_URL="https://api.deepseek.com/v1"

# Web Port Configuration (default: 3080)
arcline web --port 3080
```

---

## Plugin Management

ARCline plugins are managed per-profile:

```bash
# Install a plugin into a profile
arcline plugin --profile web add <plugin-package>

# Inspect active profile configuration
arcline --profile web --dump-config
```

---

## License & Attribution

ARCline is released under the **MIT License**. It is based on and forked from the open-source DeepSeek Harness project (`Copyright (c) 2026 DeepSeek`).
