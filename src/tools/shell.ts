import type { Tool, ToolResult, ToolContext } from './types.js';
import { toolRegistry, createTool, createToolExecutor, createTimeoutExecutor, validateToolInput } from './registry.js';
import { permissionManager } from './permissions.js';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const WORKING_DIR = process.cwd();

export const bashTool = createTool(
  {
    name: 'bash',
    description: 'Execute a shell command',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Shell command to execute' },
        cwd: { type: 'string', description: 'Working directory for the command' },
        timeout: { type: 'number', description: 'Timeout in milliseconds' },
        env: { type: 'object', description: 'Additional environment variables' },
        shell: { type: 'string', description: 'Shell to use (default: /bin/bash)' },
      },
      required: ['command'],
    },
    requiresPermission: true,
    permissionCategory: 'shell',
    timeout: 120000,
  },
  createTimeoutExecutor(
    createToolExecutor(async (input, context, onProgress) => {
      const validation = validateToolInput(input, bashTool.definition.inputSchema);
      if (!validation.valid) {
        return { callId: '', output: null, error: validation.errors.join(', '), isError: true };
      }

      const { 
        command, 
        cwd = WORKING_DIR, 
        timeout = 120000, 
        env = {},
        shell = '/bin/bash'
      } = input as { 
        command: string; 
        cwd?: string; 
        timeout?: number; 
        env?: Record<string, string>;
        shell?: string;
      };

      const fullCwd = join(WORKING_DIR, cwd);
      
      if (!fullCwd.startsWith(WORKING_DIR)) {
        return { callId: '', output: null, error: 'Working directory must be within project root', isError: true };
      }

      onProgress?.({ stage: 'running', message: `Running: ${command}` });

      return new Promise<ToolResult>((resolve) => {
        const child = spawn(shell, ['-c', command], {
          cwd: fullCwd,
          env: { ...process.env, ...env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';
        let timedOut = false;

        const timeoutId = setTimeout(() => {
          timedOut = true;
          child.kill('SIGTERM');
        }, timeout);

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          clearTimeout(timeoutId);
          
          if (timedOut) {
            resolve({
              callId: '',
              output: { stdout, stderr, exitCode: -1, timedOut: true },
              error: `Command timed out after ${timeout}ms`,
              isError: true,
            });
            return;
          }

          const result = {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code ?? -1,
            timedOut: false,
          };

          onProgress?.({ 
            stage: code === 0 ? 'completed' : 'failed', 
            message: `Command exited with code ${code ?? -1}` 
          });

          resolve({
            callId: '',
            output: result,
            isError: code !== 0,
            error: code !== 0 ? stderr.trim() : undefined,
          });
        });

        child.on('error', (err) => {
          clearTimeout(timeoutId);
          resolve({
            callId: '',
            output: null,
            error: `Failed to execute command: ${err.message}`,
            isError: true,
          });
        });
      });
    }),
    120000
  )
);

toolRegistry.register(bashTool);