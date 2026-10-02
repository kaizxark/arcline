import type { Message, ToolCall, ToolResult, ChatCompletionRequest, ChatCompletionResponse, StreamChunk, ProviderConfig } from '../core/types.js';
import type { ToolDefinition, ToolContext, PermissionDecision } from '../tools/types.js';

export interface AgentState {
  messages: Message[];
  pendingToolCalls: ToolCall[];
  completedToolCalls: Map<string, ToolResult>;
  isRunning: boolean;
  abortController: AbortController | null;
  currentPlan: Plan | null;
  contextUsage: ContextUsage;
  sessionId: string;
  workingDirectory: string;
}

export interface Plan {
  id: string;
  title: string;
  steps: PlanStep[];
  createdAt: number;
  updatedAt: number;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
  toolCalls?: string[];
  result?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ContextUsage {
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  maxTokens: number;
  percentage: number;
}

export interface AgentConfig {
  providerConfig: ProviderConfig;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  maxToolCalls: number;
  maxIterations: number;
  enablePlanMode: boolean;
  autoApproveTools: string[];
}

export interface AgentCallbacks {
  onMessage: (message: Message) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onToolResult: (result: ToolResult) => void;
  onToolProgress: (toolName: string, progress: { stage: string; message?: string }) => void;
  onPlanUpdate: (plan: Plan) => void;
  onContextUpdate: (usage: ContextUsage) => void;
  onError: (error: Error) => void;
  onComplete: (finalMessage: string) => void;
  onPermissionRequest: (request: PermissionRequest) => Promise<PermissionDecision>;
}

export interface PermissionRequest {
  toolName: string;
  input: Record<string, unknown>;
  description: string;
  category: string;
}

export interface AgentOptions {
  config: AgentConfig;
  callbacks: AgentEvents;
  tools: ToolDefinition[];
  toolContext: ToolContext;
}

export interface StreamingCallbacks {
  onToken: (token: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onFinish: (response: ChatCompletionResponse) => void;
  onError: (error: Error) => void;
}

export interface AgentEvents {
  'message': (message: Message) => void;
  'tool_call': (toolCall: ToolCall) => void;
  'tool_result': (result: ToolResult) => void;
  'tool_progress': (toolName: string, progress: { stage: string; message?: string }) => void;
  'plan_update': (plan: Plan) => void;
  'context_update': (usage: ContextUsage) => void;
  'error': (error: Error) => void;
  'complete': (finalMessage: string) => void;
  'permission_request': (request: PermissionRequest) => Promise<PermissionDecision>;
}