import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createSession } from '../src/session/index.js';
import { providerRegistry } from '../src/providers/index.js';
import type { ProviderConfig, SessionConfig } from '../src/core/types.js';

describe('Session', () => {
  const mockConfig: ProviderConfig = {
    baseUrl: 'https://api.example.com/v1',
    apiKey: 'test-key',
    model: 'test-model',
  };

  const sessionConfig: SessionConfig = {
    provider: mockConfig,
    systemPrompt: 'You are a helpful assistant.',
    temperature: 0.7,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createSession', () => {
    it('should create session with system prompt', () => {
      const session = createSession(sessionConfig);
      const messages = session.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe('You are a helpful assistant.');
    });

    it('should create session without system prompt', () => {
      const session = createSession({ provider: mockConfig });
      const messages = session.getMessages();
      expect(messages.length).toBe(0);
    });
  });

  describe('addMessage', () => {
    it('should add user message', () => {
      const session = createSession(sessionConfig);
      session.addMessage({ role: 'user', content: 'Hello' });
      const messages = session.getMessages();
      expect(messages.length).toBe(2);
      expect(messages[1].role).toBe('user');
      expect(messages[1].content).toBe('Hello');
    });

    it('should add assistant message', () => {
      const session = createSession(sessionConfig);
      session.addMessage({ role: 'assistant', content: 'Hi there!' });
      const messages = session.getMessages();
      expect(messages.length).toBe(2);
      expect(messages[1].role).toBe('assistant');
      expect(messages[1].content).toBe('Hi there!');
    });
  });

  describe('clear', () => {
    it('should clear messages but keep system prompt', () => {
      const session = createSession(sessionConfig);
      session.addMessage({ role: 'user', content: 'Hello' });
      session.addMessage({ role: 'assistant', content: 'Hi!' });
      session.clear();
      const messages = session.getMessages();
      expect(messages.length).toBe(1);
      expect(messages[0].role).toBe('system');
    });

    it('should clear all messages when no system prompt', () => {
      const session = createSession({ provider: mockConfig });
      session.addMessage({ role: 'user', content: 'Hello' });
      session.clear();
      const messages = session.getMessages();
      expect(messages.length).toBe(0);
    });
  });

  describe('sendMessage (non-streaming)', () => {
    it('should send message and get response', async () => {
      const mockResponse = {
        id: 'chat-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'test-model',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Hello!' },
          finishReason: 'stop',
        }],
      };

      const mockProvider = {
        chat: vi.fn().mockResolvedValue(mockResponse),
        stream: vi.fn(),
        listModels: vi.fn(),
        name: 'openai-compatible',
      };

      vi.spyOn(providerRegistry, 'getDefault').mockReturnValue(mockProvider as any);

      const session = createSession(sessionConfig);
      const response = await session.sendMessage('Hi', { stream: false });

      expect(response).toBe('Hello!');
      expect(mockProvider.chat).toHaveBeenCalledWith(
        mockConfig,
        expect.objectContaining({
          model: 'test-model',
          messages: expect.arrayContaining([
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: 'Hi' },
          ]),
          stream: false,
        })
      );
    });
  });

  describe('sendMessage (streaming)', () => {
    it('should stream response', async () => {
      const chunks = [
        { id: '1', object: 'chat.completion.chunk', created: Date.now(), model: 'test-model', choices: [{ index: 0, delta: { content: 'Hello' }, finishReason: null }] },
        { id: '1', object: 'chat.completion.chunk', created: Date.now(), model: 'test-model', choices: [{ index: 0, delta: { content: ' world' }, finishReason: 'stop' }] },
      ];

      const mockProvider = {
        chat: vi.fn(),
        stream: async function* () {
          for (const chunk of chunks) yield chunk;
        },
        listModels: vi.fn(),
        name: 'openai-compatible',
      };

      vi.spyOn(providerRegistry, 'getDefault').mockReturnValue(mockProvider as any);

      const session = createSession(sessionConfig);
      const streamResult = await session.sendMessage('Hi', { stream: true });
      
      const results: string[] = [];
      for await (const chunk of streamResult as AsyncIterable<string>) {
        results.push(chunk);
      }

      expect(results).toEqual(['Hello', ' world']);
      
      const messages = session.getMessages();
      expect(messages.length).toBe(3);
      expect(messages[2].role).toBe('assistant');
      expect(messages[2].content).toBe('Hello world');
    });
  });

  describe('abort', () => {
    it('should abort streaming', async () => {
      let resolveStream: (value: any) => void;
      const streamPromise = new Promise(resolve => { resolveStream = resolve; });

      const mockProvider = {
        chat: vi.fn(),
        stream: async function* () {
          yield await streamPromise;
        },
        listModels: vi.fn(),
        name: 'openai-compatible',
      };

      vi.spyOn(providerRegistry, 'getDefault').mockReturnValue(mockProvider as any);

      const session = createSession(sessionConfig);
      const streamPromise2 = session.sendMessage('Hi', { stream: true });
      
      session.abort();
      resolveStream!({ done: true });
      
      await expect(streamPromise2).resolves.not.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should update session config', () => {
      const session = createSession(sessionConfig);
      session.updateConfig({ temperature: 0.5 });
      const config = session.getConfig();
      expect(config.temperature).toBe(0.5);
      expect(config.systemPrompt).toBe('You are a helpful assistant.');
    });

    it('should update provider config', () => {
      const session = createSession(sessionConfig);
      session.updateConfig({ provider: { ...mockConfig, model: 'new-model' } });
      const config = session.getConfig();
      expect(config.provider.model).toBe('new-model');
    });
  });
});