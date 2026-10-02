import type { Tool, ToolDefinition, ToolRegistry, ToolExecutor, ToolExecutionOptions, ToolResult, ToolProgress } from './types.js';

export class ToolRegistryImpl implements ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  getDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map(t => t.definition);
  }
}

export const toolRegistry = new ToolRegistryImpl();

export function createTool(definition: ToolDefinition, executor: ToolExecutor): Tool {
  return { definition, execute: executor };
}

export function createToolExecutor(
  execute: (input: Record<string, unknown>, context: ToolExecutionOptions['context'], onProgress?: ToolExecutionOptions['onProgress']) => Promise<ToolResult>
): ToolExecutor {
  return async (options) => {
    const { tool, input, context, onProgress } = options;
    
    onProgress?.({ stage: 'starting', message: `Starting ${tool.name}...` });
    
    try {
      onProgress?.({ stage: 'running', message: `Running ${tool.name}...` });
      const result = await execute(input, context, onProgress);
      onProgress?.({ stage: 'completed', message: `${tool.name} completed` });
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      onProgress?.({ stage: 'failed', message: `${tool.name} failed: ${message}` });
      return {
        callId: '',
        output: null,
        error: message,
        isError: true,
      };
    }
  };
}

export function createTimeoutExecutor(
  executor: ToolExecutor,
  timeoutMs: number
): ToolExecutor {
  return async (options) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const result = await executor({
        ...options,
        context: { ...options.context, abortSignal: controller.signal },
      });
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  };
}

export function validateToolInput(input: Record<string, unknown>, schema: ToolDefinition['inputSchema']): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const required = schema.required || [];
  
  for (const field of required) {
    if (!(field in input)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  for (const [key, value] of Object.entries(input)) {
    const propSchema = schema.properties[key];
    if (!propSchema) {
      if (!schema.additionalProperties) {
        errors.push(`Unexpected field: ${key}`);
      }
      continue;
    }
    
    const typeErrors = validateType(value, propSchema, key);
    errors.push(...typeErrors);
  }
  
  return { valid: errors.length === 0, errors };
}

function validateType(value: unknown, schema: ToolDefinition['inputSchema']['properties'][string], path: string): string[] {
  const errors: string[] = [];
  
  if (value === null || value === undefined) {
    return errors;
  }
  
  switch (schema.type) {
    case 'string':
      if (typeof value !== 'string') {
        errors.push(`${path}: expected string, got ${typeof value}`);
      } else if (schema.enum && !schema.enum.includes(value)) {
        errors.push(`${path}: value must be one of ${schema.enum.join(', ')}`);
      }
      break;
    case 'number':
      if (typeof value !== 'number' || Number.isNaN(value)) {
        errors.push(`${path}: expected number, got ${typeof value}`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        errors.push(`${path}: expected boolean, got ${typeof value}`);
      }
      break;
    case 'array':
      if (!Array.isArray(value)) {
        errors.push(`${path}: expected array, got ${typeof value}`);
      } else if (schema.items) {
        value.forEach((item, i) => {
          const itemErrors = validateType(item, schema.items!, `${path}[${i}]`);
          errors.push(...itemErrors);
        });
      }
      break;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) {
        errors.push(`${path}: expected object, got ${typeof value}`);
      } else if (schema.properties) {
        for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
          const propSchema = schema.properties[k];
          if (propSchema) {
            const propErrors = validateType(v, propSchema, `${path}.${k}`);
            errors.push(...propErrors);
          }
        }
      }
      break;
  }
  
  return errors;
}