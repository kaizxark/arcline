import type { Provider, ProviderConfig, Model, ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '../core/types.js';

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export abstract class BaseProvider implements Provider {
  abstract readonly name: string;

  abstract listModels(config: ProviderConfig): Promise<Model[]>;
  abstract chat(config: ProviderConfig, request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  abstract stream(config: ProviderConfig, request: ChatCompletionRequest): AsyncIterable<StreamChunk>;

  protected buildHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
  }

  protected buildUrl(config: ProviderConfig, endpoint: string): string {
    const base = config.baseUrl.replace(/\/+$/, '');
    return `${base}${endpoint}`;
  }

  protected async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json() as Record<string, unknown>;
        const errorObj = errorData['error'] as Record<string, unknown> | undefined;
        if (errorObj && typeof errorObj['message'] === 'string') {
          errorMessage = errorObj['message'] as string;
        } else if (typeof errorData['message'] === 'string') {
          errorMessage = errorData['message'] as string;
        }
      } catch {
      }
      throw new ProviderError(
        errorMessage,
        'PROVIDER_ERROR',
        response.status
      );
    }
    return response.json() as Promise<T>;
  }

  protected async *handleStream(response: Response): AsyncIterable<StreamChunk> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json() as Record<string, unknown>;
        const errorObj = errorData['error'] as Record<string, unknown> | undefined;
        if (errorObj && typeof errorObj['message'] === 'string') {
          errorMessage = errorObj['message'] as string;
        }
      } catch {
      }
      throw new ProviderError(
        errorMessage,
        'PROVIDER_STREAM_ERROR',
        response.status
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new ProviderError('No response body', 'NO_RESPONSE_BODY');
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            try {
              const chunk = JSON.parse(data) as StreamChunk;
              yield chunk;
            } catch {
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}