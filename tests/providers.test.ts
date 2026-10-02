import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OpenAICompatibleProvider } from '../src/providers/openai-compatible/index.js';
import { ProviderError } from '../src/providers/provider.js';
import type { ProviderConfig, Model, ChatCompletionRequest, ChatCompletionResponse, StreamChunk } from '../src/core/types.js';

describe('OpenAICompatibleProvider', () => {
  let provider: OpenAICompatibleProvider;
  const mockConfig: ProviderConfig = {
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'test-key',
    model: 'test-model',
  };

  beforeEach(() => {
    provider = new OpenAICompatibleProvider();
    vi.restoreAllMocks();
  });

  describe('listModels', () => {
    it('should fetch models successfully', async () => {
      const mockModels: Model[] = [
        { id: 'model-1', name: 'Model One' },
        { id: 'model-2', name: 'Model Two' },
      ];

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: mockModels }),
      });

      const models = await provider.listModels(mockConfig);
      expect(models).toEqual(mockModels);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.example.com/v1/models',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-key',
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('should handle 404 gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({ error: { message: 'Not found' } }),
      });

      await expect(provider.listModels(mockConfig)).rejects.toThrow(ProviderError);
    });

    it('should handle network errors', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      await expect(provider.listModels(mockConfig)).rejects.toThrow(ProviderError);
    });
  });

  describe('chat', () => {
    it('should send chat completion request', async () => {
      const mockResponse: ChatCompletionResponse = {
        id: 'chat-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finishReason: 'stop',
        }],
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      };

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const request: ChatCompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
      };

      const response = await provider.chat(mockConfig, request);
      expect(response).toEqual(mockResponse);
    });

    it('should include all request parameters', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'chat-1',
          object: 'chat.completion',
          created: Date.now(),
          model: 'test-model',
          choices: [{ index: 0, message: { role: 'assistant', content: 'Hi' }, finishReason: 'stop' }],
        }),
      });

      const request: ChatCompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
        temperature: 0.5,
        maxTokens: 100,
        stream: false,
      };

      await provider.chat(mockConfig, request);

      const call = (global.fetch as vi.Mock).mock.calls[0];
      const body = JSON.parse(call[1].body);
      expect(body.temperature).toBe(0.5);
      expect(body.max_tokens).toBe(100);
      expect(body.stream).toBe(false);
    });
  });

  describe('stream', () => {
    it('should stream response chunks', async () => {
      const chunks: StreamChunk[] = [
        { id: '1', object: 'chat.completion.chunk', created: Date.now(), model: 'test-model', choices: [{ index: 0, delta: { content: 'Hello' }, finishReason: null }] },
        { id: '1', object: 'chat.completion.chunk', created: Date.now(), model: 'test-model', choices: [{ index: 0, delta: { content: ' world' }, finishReason: null }] },
        { id: '1', object: 'chat.completion.chunk', created: Date.now(), model: 'test-model', choices: [{ index: 0, delta: {}, finishReason: 'stop' }] },
      ];

      const encoder = new TextEncoder();
      const streamData = chunks.map(c => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(streamData));
            controller.close();
          },
        }),
      });

      const request: ChatCompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      };

      const results: StreamChunk[] = [];
      for await (const chunk of provider.stream(mockConfig, request)) {
        results.push(chunk);
      }

      expect(results.length).toBe(3);
      expect(results[0].choices[0].delta.content).toBe('Hello');
      expect(results[1].choices[0].delta.content).toBe(' world');
      expect(results[2].choices[0].finishReason).toBe('stop');
    });

    it('should handle stream errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: { message: 'Invalid API key' } }),
      });

      const request: ChatCompletionRequest = {
        model: 'test-model',
        messages: [{ role: 'user', content: 'Hi' }],
        stream: true,
      };

      const iterator = provider.stream(mockConfig, request);
      await expect(iterator.next()).rejects.toThrow(ProviderError);
    });
  });

  describe('buildHeaders', () => {
    it('should create correct headers', () => {
      const headers = (provider as any).buildHeaders(mockConfig);
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
      });
    });
  });

  describe('buildUrl', () => {
    it('should build correct URL', () => {
      const url = (provider as any).buildUrl(mockConfig, '/chat/completions');
      expect(url).toBe('https://api.example.com/v1/chat/completions');
    });

    it('should handle trailing slashes', () => {
      const configWithSlash = { ...mockConfig, baseUrl: 'https://api.example.com/v1/' };
      const url = (provider as any).buildUrl(configWithSlash, '/models');
      expect(url).toBe('https://api.example.com/v1/models');
    });
  });
});