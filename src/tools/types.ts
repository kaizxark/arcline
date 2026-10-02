export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolPropertySchema>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolPropertySchema {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ToolPropertySchema;
  properties?: Record<string, ToolPropertySchema>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: ToolInputSchema;
  requiresPermission?: boolean;
  permissionCategory?: string;
  timeout?: number;
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  callId: string;
  output: unknown;
  error?: string;
  isError: boolean;
  truncated?: boolean;
}

export interface ToolContext {
  workingDirectory: string;
  sessionId: string;
  permissions: PermissionState;
  abortSignal?: AbortSignal;
}

export interface PermissionState {
  mode: 'ask' | 'allow' | 'deny';
  allowedTools: Set<string>;
  deniedTools: Set<string>;
  sessionAllowances: Map<string, 'once' | 'session'>;
}

export interface ToolExecutionOptions {
  tool: ToolDefinition;
  input: Record<string, unknown>;
  context: ToolContext;
  onProgress?: (progress: ToolProgress) => void;
}

export interface ToolProgress {
  stage: 'starting' | 'running' | 'completed' | 'failed';
  message?: string;
  details?: Record<string, unknown>;
}

export type ToolExecutor = (options: ToolExecutionOptions) => Promise<ToolResult>;

export interface Tool {
  definition: ToolDefinition;
  execute: ToolExecutor;
}

export interface ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
  getDefinitions(): ToolDefinition[];
}

export type PermissionDecision = 'allow_once' | 'allow_session' | 'deny' | 'cancel';

export interface PermissionRequest {
  toolName: string;
  input: Record<string, unknown>;
  description: string;
  category: string;
}