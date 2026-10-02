# Arcline

A high-performance terminal AI agent. Built for developers who want a fast, clean, and extensible AI interface in their terminal.

## Installation

```bash
npm install -g arcline
```

Then simply run:

```bash
arcline
```

## Usage

### Start a Session

```bash
arcline
```

### Configure Provider

```bash
arcline config
```

### List Available Models

```bash
arcline models
```

### Help & Version

```bash
arcline --help
arcline --version
```

### Debug Mode

```bash
arcline --debug
```

## Configuration

Arcline stores configuration in your platform's standard config directory:

- **Linux/macOS**: `~/.config/arcline/config.json`
- **Windows**: `%APPDATA%\arcline\config.json`

### Provider Setup

Run `arcline config` and enter:

1. **Base URL** - Your OpenAI-compatible API endpoint
   - Examples: `https://api.openai.com/v1`, `https://api.deepseek.com/v1`, `https://openrouter.ai/api/v1`
2. **API Key** - Your provider API key
3. **Model** - Select from discovered models or enter manually

### Environment Variables

For CI/headless environments:

```bash
export ARCLINE_BASE_URL=https://api.example.com/v1
export ARCLINE_API_KEY=your-api-key
export ARCLINE_MODEL=your-model
export ARCLINE_DEBUG=1  # Enable debug mode
```

Environment variables take precedence over stored configuration.

## Supported APIs

v0.1 targets **OpenAI-compatible APIs**. This includes:

- OpenAI
- DeepSeek
- OpenRouter
- Any API implementing the OpenAI `/v1/chat/completions` and `/v1/models` endpoints

## Session Commands

During an interactive session:

| Command | Description |
|---------|-------------|
| `/exit`, `/quit` | Exit the session |
| `/clear` | Clear conversation history |
| `/model <name>` | Switch to a different model |
| `/help` | Show session help |

## Development

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/yourusername/arcline.git
cd arcline
npm install
```

### Commands

```bash
npm run dev      # Run in development mode
npm run build    # Build for production
npm run test     # Run tests
npm run lint     # Run linter
```

### Project Structure

```
arcline/
├── src/
│   ├── cli/           # CLI entry point & commands
│   ├── config/        # Configuration management
│   ├── core/          # Core types & interfaces
│   ├── providers/     # Provider abstraction layer
│   │   ├── openai-compatible/
│   │   └── provider.ts
│   ├── session/       # Conversation session management
│   ├── ui/            # Terminal UI components
│   └── index.ts       # Main exports
├── tests/             # Test suite
├── package.json
├── tsconfig.json
└── README.md
```

## Architecture

### Provider Abstraction

Arcline uses a provider abstraction that isolates API communication:

```typescript
interface Provider {
  name: string;
  listModels(config: ProviderConfig): Promise<Model[]>;
  chat(config: ProviderConfig, request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  stream(config: ProviderConfig, request: ChatCompletionRequest): AsyncIterable<StreamChunk>;
}
```

This allows adding new providers (Anthropic, Gemini, Ollama, etc.) without rewriting the CLI.

### Core Components

- **CLI** - Command parsing, argument handling
- **Config** - Cross-platform configuration storage (using `conf`)
- **Provider Registry** - Manages provider implementations
- **Session** - Conversation state & message history
- **UI** - Terminal rendering, streaming output, prompts

## Roadmap

Arcline will evolve into a full terminal coding agent with:

- Repository reading & context management
- File modification & code execution
- Tool system & agent loops
- Model routing & VRAM-aware selection
- Local model support (Ollama, LM Studio)
- MCP/tool integrations
- Autonomous coding workflows

## License

MIT License - see [LICENSE](LICENSE) for details.