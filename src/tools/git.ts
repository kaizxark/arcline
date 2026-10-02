import type { Tool, ToolResult } from './types.js';
import { toolRegistry, createTool, createToolExecutor, createTimeoutExecutor, validateToolInput } from './registry.js';
import { spawn } from 'node:child_process';
import { join } from 'node:path';

const WORKING_DIR = process.cwd();

export const gitTool = createTool(
  {
    name: 'git',
    description: 'Execute git commands',
    inputSchema: {
      type: 'object',
      properties: {
        args: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Git command arguments (e.g., ["status"], ["diff", "HEAD~1"])' 
        },
        cwd: { type: 'string', description: 'Working directory for the command' },
      },
      required: ['args'],
    },
    requiresPermission: true,
    permissionCategory: 'git',
    timeout: 60000,
  },
  createTimeoutExecutor(
    createToolExecutor(async (input, context, onProgress) => {
      const validation = validateToolInput(input, gitTool.definition.inputSchema);
      if (!validation.valid) {
        return { callId: '', output: null, error: validation.errors.join(', '), isError: true };
      }

      const { args, cwd = WORKING_DIR } = input as { args: string[]; cwd?: string };
      const fullCwd = join(WORKING_DIR, cwd);

      onProgress?.({ stage: 'running', message: `git ${args.join(' ')}` });

      return new Promise<ToolResult>((resolve) => {
        const child = spawn('git', args, {
          cwd: fullCwd,
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          const result = {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code ?? -1,
          };

          onProgress?.({ 
            stage: code === 0 ? 'completed' : 'failed', 
            message: `git ${args[0]} exited with code ${code ?? -1}` 
          });

          resolve({
            callId: '',
            output: result,
            isError: code !== 0,
            error: code !== 0 ? stderr.trim() : undefined,
          });
        });

        child.on('error', (err) => {
          resolve({
            callId: '',
            output: null,
            error: `Failed to execute git: ${err.message}`,
            isError: true,
          });
        });
      });
    }),
    60000
  )
);

export const gitDiffTool = createTool(
  {
    name: 'git_diff',
    description: 'Show git diff for files or commits',
    inputSchema: {
      type: 'object',
      properties: {
        target: { type: 'string', description: 'Target to diff against (e.g., HEAD, HEAD~1, branch name)' },
        file: { type: 'string', description: 'Specific file to diff' },
        staged: { type: 'boolean', description: 'Show staged changes only' },
      },
      required: [],
    },
    requiresPermission: true,
    permissionCategory: 'git',
    timeout: 60000,
  },
  createTimeoutExecutor(
    createToolExecutor(async (input, context, onProgress) => {
      const validation = validateToolInput(input, gitDiffTool.definition.inputSchema);
      if (!validation.valid) {
        return { callId: '', output: null, error: validation.errors.join(', '), isError: true };
      }

      const { target = 'HEAD', file, staged = false } = input as { target?: string; file?: string; staged?: boolean };
      const args = ['diff'];
      
      if (staged) args.push('--cached');
      args.push(target);
      if (file) args.push('--', file);

      onProgress?.({ stage: 'running', message: `git diff ${args.join(' ')}` });

      return new Promise<ToolResult>((resolve) => {
        const child = spawn('git', args, {
          cwd: WORKING_DIR,
          env: { ...process.env },
          stdio: ['pipe', 'pipe', 'pipe'],
        });

        let stdout = '';
        let stderr = '';

        child.stdout?.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        child.on('close', (code) => {
          const result = {
            diff: stdout.trim(),
            stderr: stderr.trim(),
            exitCode: code ?? -1,
            target,
            file,
            staged,
          };

          onProgress?.({ 
            stage: code === 0 ? 'completed' : 'failed', 
            message: `git diff exited with code ${code ?? -1}` 
          });

          resolve({
            callId: '',
            output: result,
            isError: code !== 0,
            error: code !== 0 ? stderr.trim() : undefined,
          });
        });

        child.on('error', (err) => {
          resolve({
            callId: '',
            output: null,
            error: `Failed to execute git diff: ${err.message}`,
            isError: true,
          });
        });
      });
    }),
    60000
  )
);

toolRegistry.register(gitTool);
toolRegistry.register(gitDiffTool);