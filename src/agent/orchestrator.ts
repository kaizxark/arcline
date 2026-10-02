import type { AgentOptions, AgentState, AgentEvents, StreamingCallbacks, Plan, PlanStep, ContextUsage } from './types.js';
import type { Message, ToolCall, ToolResult, ChatCompletionRequest, ChatCompletionResponse, StreamChunk, ProviderConfig } from '../core/types.js';
import type { ToolDefinition, ToolExecutor, ToolExecutionOptions } from '../tools/types.js';
import { toolRegistry } from '../tools/registry.js';
import { permissionManager } from '../tools/permissions.js';
import { providerRegistry } from '../providers/index.js';

export class AgentOrchestrator {
  private state: AgentState;
  private config: AgentOptions['config'];
  private callbacks: AgentEvents;
  private toolDefinitions: ToolDefinition[];
  private toolContext: AgentOptions['toolContext'];
  private toolExecutors: Map<string, ToolExecutor>;

  constructor(options: AgentOptions) {
    this.config = options.config;
    this.callbacks = options.callbacks;
    this.toolDefinitions = options.tools;
    this.toolContext = options.toolContext;
    this.toolExecutors = new Map();
    
    for (const tool of options.tools) {
      const registered = toolRegistry.get(tool.name);
      if (registered) {
        this.toolExecutors.set(tool.name, registered.execute);
      }
    }

    this.state = {
      messages: [],
      pendingToolCalls: [],
      completedToolCalls: new Map(),
      isRunning: false,
      abortController: null,
      currentPlan: null,
      contextUsage: {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        maxTokens: this.config.maxTokens || 100000,
        percentage: 0,
      },
      sessionId: this.toolContext.sessionId,
      workingDirectory: this.toolContext.workingDirectory,
    };
  }

  getState(): AgentState {
    return { ...this.state };
  }

  async run(userInput: string): Promise<string> {
    this.state.isRunning = true;
    this.state.abortController = new AbortController();
    this.toolContext.abortSignal = this.state.abortController.signal;

    this.state.messages.push({ role: 'user', content: userInput });
    this.callbacks.message({ role: 'user', content: userInput });

    let iteration = 0;
    const maxIterations = this.config.maxIterations || 10;

    while (this.state.isRunning && iteration < maxIterations) {
      if (this.state.abortController?.signal.aborted) {
        break;
      }

      iteration++;
      
      const response = await this.sendModelRequest();
      
      if (!this.state.isRunning) break;

      const toolCalls = this.extractToolCalls(response);
      
      if (toolCalls.length === 0) {
        this.state.messages.push({ role: 'assistant', content: response });
        this.callbacks.message({ role: 'assistant', content: response });
        this.callbacks.complete(response);
        break;
      }

      for (const toolCall of toolCalls) {
        if (!this.state.isRunning) break;
        
        const result = await this.executeToolCall(toolCall);
        this.state.completedToolCalls.set(toolCall.id, result);
        
        if (result.isError) {
          this.state.messages.push({
            role: 'tool',
            content: `Error: ${result.error}`,
            toolCallId: toolCall.id,
          });
        } else {
          this.state.messages.push({
            role: 'tool',
            content: JSON.stringify(result.output),
            toolCallId: toolCall.id,
          });
        }
        
        this.callbacks.tool_result(result);
      }
    }

    this.state.isRunning = false;
    return this.getLastAssistantMessage() || '';
  }

  private async sendModelRequest(): Promise<string> {
    const provider = providerRegistry.getDefault();
    
    const request: ChatCompletionRequest = {
      model: this.config.model,
      messages: this.buildMessagesForModel(),
      temperature: this.config.temperature,
      maxTokens: this.config.maxTokens,
      stream: true,
      tools: this.toolDefinitions.map(t => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema as unknown as Record<string, unknown>,
        },
      })),
      toolChoice: 'auto',
    };

    let fullContent = '';
    let currentToolCalls: ToolCall[] = [];
    let currentToolCall: Partial<ToolCall> | null = null;
    let currentArguments = '';

    for await (const chunk of provider.stream(this.config.providerConfig, request)) {
      if (this.state.abortController?.signal.aborted) {
        throw new Error('Aborted');
      }

      const choice = chunk.choices[0];
      if (!choice) continue;

      const delta = choice.delta;

      if (delta.content) {
        fullContent += delta.content;
        this.callbacks.message({ role: 'assistant', content: delta.content });
      }

      if (delta.toolCalls) {
        for (const tc of delta.toolCalls) {
          if (tc.id) {
            if (currentToolCall) {
              currentToolCalls.push(currentToolCall as ToolCall);
            }
            currentToolCall = {
              id: tc.id,
              type: 'function',
              function: { name: tc.function?.name || '', arguments: '' },
            };
            currentArguments = '';
          }
          if (tc.function?.arguments) {
            currentArguments += tc.function.arguments;
            if (currentToolCall) {
              currentToolCall.function!.arguments = currentArguments;
            }
          }
        }
      }

      if (choice.finishReason === 'tool_calls' && currentToolCall) {
        currentToolCalls.push(currentToolCall as ToolCall);
        currentToolCall = null;
        currentArguments = '';
      }

      if (choice.finishReason === 'stop') {
        break;
      }
    }

    if (currentToolCall) {
      currentToolCalls.push(currentToolCall as ToolCall);
    }

    this.state.pendingToolCalls = currentToolCalls;
    
    for (const tc of currentToolCalls) {
      this.callbacks.tool_call(tc);
    }

    return fullContent;
  }

  private buildMessagesForModel(): Message[] {
    const messages: Message[] = [
      { role: 'system', content: this.config.systemPrompt },
    ];

    for (const msg of this.state.messages) {
      if (msg.role === 'tool') {
        messages.push(msg);
      } else if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push(msg);
      }
    }

    return messages;
  }

  private extractToolCalls(response: string): ToolCall[] {
    return this.state.pendingToolCalls;
  }

  private async executeToolCall(toolCall: ToolCall): Promise<ToolResult> {
    const toolDef = this.toolDefinitions.find(t => t.name === toolCall.function.name);
    if (!toolDef) {
      return {
        callId: toolCall.id,
        output: null,
        error: `Unknown tool: ${toolCall.function.name}`,
        isError: true,
      };
    }

    let input: Record<string, unknown>;
    try {
      input = JSON.parse(toolCall.function.arguments);
    } catch {
      return {
        callId: toolCall.id,
        output: null,
        error: 'Invalid tool arguments',
        isError: true,
      };
    }

    const permission = permissionManager.checkPermission(toolDef.name, toolDef.permissionCategory || 'default');
    
    if (permission === 'denied') {
      return {
        callId: toolCall.id,
        output: null,
        error: `Tool ${toolDef.name} is denied`,
        isError: true,
      };
    }

    if (permission === 'ask') {
      const decision = await this.callbacks.permission_request({
        toolName: toolDef.name,
        input,
        description: toolDef.description,
        category: toolDef.permissionCategory || 'default',
      });

      if (decision === 'deny' || decision === 'cancel') {
        return {
          callId: toolCall.id,
          output: null,
          error: `Tool ${toolDef.name} was denied by user`,
          isError: true,
        };
      }

      if (decision === 'allow_once') {
        permissionManager.allowTool(toolDef.name, 'once');
      } else if (decision === 'allow_session') {
        permissionManager.allowTool(toolDef.name, 'session');
      }
    }

    const executor = this.toolExecutors.get(toolDef.name);
    if (!executor) {
      return {
        callId: toolCall.id,
        output: null,
        error: `No executor for tool: ${toolDef.name}`,
        isError: true,
      };
    }

    this.callbacks.tool_progress(toolDef.name, { stage: 'starting', message: `Starting ${toolDef.name}...` });

    try {
      const result = await executor({
        tool: toolDef,
        input,
        context: this.toolContext,
        onProgress: (progress) => {
          this.callbacks.tool_progress(toolDef.name, progress);
        },
      });
      
      result.callId = toolCall.id;
      return result;
    } catch (error) {
      return {
        callId: toolCall.id,
        output: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        isError: true,
      };
    }
  }

  private getLastAssistantMessage(): string | null {
    for (let i = this.state.messages.length - 1; i >= 0; i--) {
      const msg = this.state.messages[i];
      if (msg && msg.role === 'assistant') {
        return msg.content;
      }
    }
    return null;
  }

  abort(): void {
    this.state.isRunning = false;
    this.state.abortController?.abort();
  }

  createPlan(title: string, steps: string[]): Plan {
    const plan: Plan = {
      id: `plan-${Date.now()}`,
      title,
      steps: steps.map((desc, i) => ({
        id: `step-${i}`,
        description: desc,
        status: 'pending',
      })),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.state.currentPlan = plan;
    this.callbacks.plan_update(plan);
    return plan;
  }

  updatePlanStep(stepId: string, updates: Partial<PlanStep>): void {
    if (!this.state.currentPlan) return;
    const step = this.state.currentPlan.steps.find(s => s.id === stepId);
    if (step) {
      Object.assign(step, updates);
      this.state.currentPlan.updatedAt = Date.now();
      this.callbacks.plan_update(this.state.currentPlan);
    }
  }

  updateContextUsage(usage: Partial<ContextUsage>): void {
    this.state.contextUsage = { ...this.state.contextUsage, ...usage };
    this.callbacks.context_update(this.state.contextUsage);
  }

  updateConfig(config: { providerConfig?: ProviderConfig }): void {
    if (config.providerConfig) {
      this.config.providerConfig = config.providerConfig;
      this.config.model = config.providerConfig.model;
    }
  }

  compact(): void {
    this.state.messages = this.state.messages.filter(m => m.role === 'system');
    this.state.completedToolCalls.clear();
    this.state.pendingToolCalls = [];
  }

  clearMessages(): void {
    this.state.messages = this.state.messages.filter(m => m.role === 'system');
  }

  addMessage(message: Message): void {
    this.state.messages.push(message);
  }
}

export function createAgent(options: AgentOptions): AgentOrchestrator {
  return new AgentOrchestrator(options);
}