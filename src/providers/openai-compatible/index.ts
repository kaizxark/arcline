import type { ProviderConfig, Model, ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '../../core/types.js';
import { BaseProvider, ProviderError } from '../provider.js';

export class OpenAICompatibleProvider extends BaseProvider {
  readonly name = 'openai-compatible';

  async listModels(config: ProviderConfig): Promise<Model[]> {
    const url = this.buildUrl(config, '/models');
    const headers = this.buildHeaders(config);

    try {
      const response = await fetch(url, { headers });
      const data = await this.handleResponse<{ data: Model[] }>(response);
      return data.data || [];
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        `Failed to list models: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'LIST_MODELS_FAILED',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  private toOpenAIRequest(request: ChatCompletionRequest): Record<string, unknown> {
    const { maxTokens, toolChoice, ...rest } = request;
    const body: Record<string, unknown> = { ...rest, stream: false };
    if (maxTokens !== undefined) body['max_tokens'] = maxTokens;
    if (toolChoice !== undefined) body['tool_choice'] = toolChoice;
    return body;
  }

  private toOpenAIStreamRequest(request: ChatCompletionRequest): Record<string, unknown> {
    const { maxTokens, toolChoice, ...rest } = request;
    const body: Record<string, unknown> = { ...rest, stream: true };
    if (maxTokens !== undefined) body['max_tokens'] = maxTokens;
    if (toolChoice !== undefined) body['tool_choice'] = toolChoice;
    return body;
  }

  async chat(config: ProviderConfig, request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const url = this.buildUrl(config, '/chat/completions');
    const headers = this.buildHeaders(config);

    const body = this.toOpenAIRequest(request);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
      return this.handleResponse<ChatCompletionResponse>(response);
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        `Chat completion failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'CHAT_FAILED',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }

  async *stream(config: ProviderConfig, request: ChatCompletionRequest): AsyncIterable<StreamChunk> {
    const url = this.buildUrl(config, '/chat/completions');
    const headers = this.buildHeaders(config);

    const body = this.toOpenAIStreamRequest(request);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      yield* this.handleStream(response);
    } catch (error) {
      if (error instanceof ProviderError) throw error;
      throw new ProviderError(
        `Stream failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'STREAM_FAILED',
        undefined,
        error instanceof Error ? error : undefined
      );
    }
  }
}

export const openaiCompatibleProvider = new OpenAICompatibleProvider();