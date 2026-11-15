# ARCline

ARCline is a terminal AI agent exploring a practical question: how can an LLM work with more information than fits comfortably in its context window?

The project treats local storage as an external context layer. Instead of keeping every session detail in the model prompt, ARCline can preserve session state on the local machine, compact older conversation history, and keep the most relevant recent context available to the agent.

ARCline is an early stage, work in progress. The long term goal is a fast, local first context system that can decide what to retain, how to organize it, and what to retrieve for a given task.

## Why ARCline?

LLM context windows are useful, but they are not the same as durable memory. Long running projects create more information than can be sent with every request, including:

- Previous conversations and decisions
- Project instructions and conventions
- Files that have already been inspected
- Tool results and command output
- Repeated background information that does not belong in every prompt

ARCline explores separating durable local context from the smaller working context sent to a model.

## Current capabilities

The current release provides the foundation for this direction:

- Interactive terminal sessions with streaming model responses
- OpenAI compatible provider support
- Local session persistence under `~/.config/arcline/sessions`
- Context usage estimation and configurable compaction thresholds
- Conversation compaction that preserves system instructions and recent messages
- Project instruction discovery through `ARCLINE.md`, `CLAUDE.md`, or `.arcline/instructions.md`
- Filesystem, shell, and Git tools with permission checks
- Configurable model, provider, working directory, and iteration limits

The retrieval and memory layer is still evolving. At this stage, ARCline should be understood as an experimental foundation rather than a finished long term memory system.

## Installation

```bash
npm install -g arcline
```

Then start an interactive session:

```bash
arcline
```

## Usage

### Start a session

```bash
arcline
```

### Configure a provider

```bash
arcline config
```

ARCline currently targets OpenAI compatible APIs. During configuration, provide:

1. A base URL, such as `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, or `https://openrouter.ai/api/v1`
2. An API key
3. A model ID, selected from discovered models or entered manually

### List available models

```bash
arcline models
```

### Help and version

```bash
arcline --help
arcline --version
```

### Debug mode

```bash
arcline --debug
```

## Project instructions

ARCline checks the working directory for project specific instructions in this order:

1. `ARCLINE.md`
2. `CLAUDE.md`
3. `.arcline/instructions.md`

These files provide durable project context without requiring the same instructions to be pasted into every conversation.

## Configuration

ARCline stores configuration in the platform standard config directory:

- Linux and macOS: `~/.config/arcline-nodejs/config.json`
- Windows: `%APPDATA%\\arcline-nodejs\\config.json`

For CI or headless environments, configure the provider with environment variables:

```bash
export ARCLINE_BASE_URL=https://api.example.com/v1
export ARCLINE_API_KEY=your-api-key
export ARCLINE_MODEL=your-model
export ARCLINE_DEBUG=1
```

Environment variables take precedence over stored configuration.

## Session commands

During an interactive session:

| Command | Description |
| --- | --- |
| `/exit`, `/quit` | Exit the session |
| `/clear` | Clear conversation history |
| `/model` | Switch models |
| `/config` | Reconfigure the provider |
| `/help` | Show session help |

## Architecture

ARCline is organized around a few small layers:

- **CLI**: command parsing and terminal entry points
- **Agent**: orchestration, tool calls, permissions, and run state
- **Context**: token estimation, session persistence, project instructions, and compaction
- **Providers**: OpenAI compatible model discovery, requests, and streaming
- **Tools**: filesystem, shell, and Git capabilities
- **UI**: terminal rendering and interactive prompts

The context layer is the main area of exploration. Future work will focus on durable artifacts, better retrieval, relevance ranking, summaries, and explicit controls for what is stored locally.

## Roadmap

- Improve context compaction and summarization
- Add searchable local memory and relevance based retrieval
- Persist durable project facts separately from transient conversation history
- Track references between sessions, files, decisions, and tool results
- Add stronger privacy controls and storage inspection commands
- Support more providers, local models, and MCP integrations
- Continue improving the terminal agent experience

## Development

### Prerequisites

- Node.js 20 or newer
- npm

### Setup

```bash
git clone https://github.com/kaizxark/arcline.git
cd arcline
npm install
```

### Commands

```bash
npm run dev
npm run build
npm run test
npm run lint
```

## License

MIT
