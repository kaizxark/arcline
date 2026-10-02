export interface ProviderConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  name?: string;
}

export interface Model {
  id: string;
  name?: string;
  ownedBy?: string;
  contextWindow?: number;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface ChatCompletionRequest {
  model: string;
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: Tool[];
  toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ChatCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: ChatChoice[];
  usage?: Usage;
}

export interface ChatChoice {
  index: number;
  message: Message;
  finishReason: string | null;
  delta?: Message;
}

export interface Usage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface StreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamChoice[];
}

export interface StreamChoice {
  index: number;
  delta: Partial<Message>;
  finishReason: string | null;
}

export interface Provider {
  name: string;
  listModels(config: ProviderConfig): Promise<Model[]>;
  chat(config: ProviderConfig, request: ChatCompletionRequest): Promise<ChatCompletionResponse>;
  stream(config: ProviderConfig, request: ChatCompletionRequest): AsyncIterable<StreamChunk>;
}

export interface SessionConfig {
  provider: ProviderConfig;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AppConfig {
  providers: Record<string, ProviderConfig>;
  activeProvider?: string;
  preferences: {
    theme?: 'dark' | 'light' | 'auto';
    debug?: boolean;
    autoSelectModel?: boolean;
  };
}