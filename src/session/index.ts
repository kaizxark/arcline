import type { SessionConfig, ProviderConfig, Message, ChatCompletionRequest, StreamChunk, ChatCompletionResponse } from '../core/types.js';
import { providerRegistry } from '../providers/index.js';

export class Session {
  private config: SessionConfig;
  private messages: Message[] = [];
  private aborted = false;

  constructor(config: SessionConfig) {
    this.config = config;
    if (config.systemPrompt) {
      this.messages.push({ role: 'system', content: config.systemPrompt });
    }
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  addMessage(message: Message): void {
    this.messages.push(message);
  }

  async sendMessage(content: string, options: { stream?: boolean } = {}): Promise<string | AsyncIterable<string>> {
    this.aborted = false;
    const userMessage: Message = { role: 'user', content };
    this.messages.push(userMessage);

    const request: ChatCompletionRequest = {
      model: this.config.provider.model,
      messages: this.messages,
      temperature: this.config.temperature ?? 0.7,
      maxTokens: this.config.maxTokens,
      stream: options.stream ?? true,
    };

    const provider = providerRegistry.getDefault();

    if (options.stream) {
      return this.streamResponse(provider, this.config.provider, request);
    } else {
      const response = await provider.chat(this.config.provider, request);
      const assistantMessage = response.choices[0]?.message;
      if (assistantMessage) {
        this.messages.push(assistantMessage);
        return assistantMessage.content || '';
      }
      return '';
    }
  }

  private async *streamResponse(
    provider: ReturnType<typeof providerRegistry.getDefault>,
    config: ProviderConfig,
    request: ChatCompletionRequest
  ): AsyncIterable<string> {
    let fullContent = '';
    let messageId = '';

    try {
      for await (const chunk of provider.stream(config, request)) {
        if (this.aborted) break;

        if (!messageId) messageId = chunk.id;

        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          yield delta.content;
        }

        if (chunk.choices[0]?.finishReason) {
          break;
        }
      }

      if (fullContent && !this.aborted) {
        this.messages.push({ role: 'assistant', content: fullContent });
      }
    } catch (error) {
      if (!this.aborted) {
        throw error;
      }
    }
  }

  abort(): void {
    this.aborted = true;
  }

  clear(): void {
    const systemMessage = this.messages.find(m => m.role === 'system');
    this.messages = systemMessage ? [systemMessage] : [];
  }

  getConfig(): SessionConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<SessionConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

export function createSession(config: SessionConfig): Session {
  return new Session(config);
}