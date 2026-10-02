import type { Tool, ToolDefinition, ToolResult, ToolContext } from './types.js';
import { toolRegistry, createTool, createToolExecutor, createTimeoutExecutor, validateToolInput } from './registry.js';
import { permissionManager } from './permissions.js';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve, relative, dirname, basename, extname } from 'node:path';
import { glob } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';

const WORKING_DIR = process.cwd();

function normalizePath(path: string): string {
  const resolved = resolve(WORKING_DIR, path);
  if (!resolved.startsWith(WORKING_DIR)) {
    throw new Error('Path traversal not allowed');
  }
  return resolved;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export const readTool = createTool(
  {
    name: 'read',
    description: 'Read a file from the filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file relative to working directory' },
        offset: { type: 'number', description: 'Line number to start reading from (0-indexed)' },
        limit: { type: 'number', description: 'Maximum number of lines to read' },
      },
      required: ['path'],
    },
    requiresPermission: true,
    permissionCategory: 'filesystem_read',
    timeout: 30000,
  },
  createTimeoutExecutor(
    createToolExecutor(async (input, context, onProgress) => {
      const validation = validateToolInput(input, readTool.definition.inputSchema);
      if (!validation.valid) {
        return { callId: '', output: null, error: validation.errors.join(', '), isError: true };
      }

      const { path, offset = 0, limit } = input as { path: string; offset?: number; limit?: number };
      const fullPath = normalizePath(path);
      
      if (!existsSync(fullPath)) {
        return { callId: '', output: null, error: `File not found: ${path}`, isError: true };
      }

      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        return { callId: '', output: null, error: `Path is a directory: ${path}`, isError: true };
      }

      onProgress?.({ stage: 'running', message: `Reading ${path}...` });

      const content = readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const start = Math.max(0, offset);
      const end = limit ? Math.min(lines.length, start + limit) : lines.length;
      const selectedLines = lines.slice(start, end);

      const result = {
        path,
        content: selectedLines.join('\n'),
        totalLines: lines.length,
        startLine: start,
        endLine: end,
        size: formatFileSize(stat.size),
      };

      onProgress?.({ stage: 'completed', message: `Read ${path} (${result.size}, ${selectedLines.length} lines)` });
      
      return { callId: '', output: result, isError: false };
    }),
    30000
  )
);

export const writeTool = createTool(
  {
    name: 'write',
    description: 'Write a file to the filesystem',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file relative to working directory' },
        content: { type: 'string', description: 'Content to write' },
        createDirs: { type: 'boolean', description: 'Create parent directories if they do not exist' },
      },
      required: ['path', 'content'],
    },
    requiresPermission: true,
    permissionCategory: 'filesystem_write',
    timeout: 30000,
  },
  createTimeoutExecutor(
    createToolExecutor(async (input, context, onProgress) => {
      const validation = validateToolInput(input, writeTool.definition.inputSchema);
      if (!validation.valid) {
        return { callId: '', output: null, error: validation.errors.join(', '), isError: true };
      }

      const { path, content, createDirs = true } = input as { path: string; content: string; createDirs?: boolean };
      const fullPath = normalizePath(path);

      onProgress?.({ stage: 'running', message: `Writing ${path}...` });

      if (createDirs) {
        const dir = dirname(fullPath);
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      }

      writeFileSync(fullPath, content, 'utf-8');
      const stat = statSync(fullPath);
      const lines = content.split('\n').length;

      const result = {
        path,
        size: formatFileSize(stat.size),
        lines,
        created: !existsSync(fullPath) || stat.size === content.length,
      };

      onProgress?.({ stage: 'completed', message: `Wrote ${path} (${result.size}, ${lines} lines)` });
      
      return { callId: '', output: result, isError: false };
    }),
    30000
  )
);

export const editTool = createTool(
  {
    name: 'edit',
    description: 'Edit a file by replacing text',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the file relative to working directory' },
        oldText: { type: 'string', description: 'Text to replace' },
        newText: { type: 'string', description: 'Replacement text' },
        replaceAll: { type: 'boolean', description: 'Replace all occurrences' },
      },
      required: ['path', 'oldText', 'newText'],
    },
    requiresPermission: true,
    permissionCategory: 'filesystem_write',
    timeout: 30000,
  },
  createTimeoutExecutor(
    createToolExecutor(async (input, context, onProgress) => {
      const validation = validateToolInput(input, editTool.definition.inputSchema);
      if (!validation.valid) {
        return { callId: '', output: null, error: validation.errors.join(', '), isError: true };
      }

      const { path, oldText, newText, replaceAll = false } = input as { path: string; oldText: string; newText: string; replaceAll?: boolean };
      const fullPath = normalizePath(path);

      if (!existsSync(fullPath)) {
        return { callId: '', output: null, error: `File not found: ${path}`, isError: true };
      }

      onProgress?.({ stage: 'running', message: `Editing ${path}...` });

      const content = readFileSync(fullPath, 'utf-8');
      
      if (!content.includes(oldText)) {
        return { callId: '', output: null, error: `Text not found in file: ${path}`, isError: true };
      }

      const occurrences = (content.match(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      
      if (occurrences > 1 && !replaceAll) {
        return { callId: '', output: null, error: `Multiple occurrences (${occurrences}) found. Use replaceAll: true to replace all.`, isError: true };
      }

      const newContent = replaceAll ? content.replaceAll(oldText, newText) : content.replace(oldText, newText);
      
      writeFileSync(fullPath, newContent, 'utf-8');
      const stat = statSync(fullPath);
      const newLines = newContent.split('\n').length;
      const oldLines = content.split('\n').length;

      const diff = generateDiff(content, newContent, path);

      const result = {
        path,
        size: formatFileSize(stat.size),
        lines: newLines,
        lineDelta: newLines - oldLines,
        occurrences: replaceAll ? occurrences : 1,
        diff,
      };

      onProgress?.({ stage: 'completed', message: `Edited ${path} (${occurrences} replacement${occurrences > 1 ? 's' : ''})` });
      
      return { callId: '', output: result, isError: false };
    }),
    30000
  )
);

export const listTool = createTool(
  {
    name: 'list',
    description: 'List files in a directory',
    inputSchema: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Path to the directory relative to working directory' },
        recursive: { type: 'boolean', description: 'List recursively' },
        includeHidden: { type: 'boolean', description: 'Include hidden files' },
      },
      required: ['path'],
    },
    requiresPermission: true,
    permissionCategory: 'filesystem_read',
    timeout: 30000,
  },
  createTimeoutExecutor(
    createToolExecutor(async (input, context, onProgress) => {
      const validation = validateToolInput(input, listTool.definition.inputSchema);
      if (!validation.valid) {
        return { callId: '', output: null, error: validation.errors.join(', '), isError: true };
      }

      const { path, recursive = false, includeHidden = false } = input as { path: string; recursive?: boolean; includeHidden?: boolean };
      const fullPath = normalizePath(path);

      if (!existsSync(fullPath)) {
        return { callId: '', output: null, error: `Directory not found: ${path}`, isError: true };
      }

      const stat = statSync(fullPath);
      if (!stat.isDirectory()) {
        return { callId: '', output: null, error: `Path is not a directory: ${path}`, isError: true };
      }

      onProgress?.({ stage: 'running', message: `Listing ${path}...` });

      function listDir(dirPath: string, depth = 0): Array<{ name: string; path: string; type: 'file' | 'dir'; size?: string }> {
        const entries: Array<{ name: string; path: string; type: 'file' | 'dir'; size?: string }> = [];
        
        try {
          const items = readdirSync(dirPath, { withFileTypes: true });
          
          for (const item of items) {
            if (!includeHidden && item.name.startsWith('.')) continue;
            
            const itemPath = join(dirPath, item.name);
            const relPath = relative(WORKING_DIR, itemPath);
            
            if (item.isDirectory()) {
              entries.push({ name: item.name, path: relPath, type: 'dir' });
              if (recursive) {
                entries.push(...listDir(itemPath, depth + 1));
              }
            } else if (item.isFile()) {
              const stat = statSync(itemPath);
              entries.push({ name: item.name, path: relPath, type: 'file', size: formatFileSize(stat.size) });
            }
          }
        } catch (e) {
          entries.push({ name: basename(dirPath), path: relative(WORKING_DIR, dirPath), type: 'dir' });
        }
        
        return entries;
      }

      const entries = listDir(fullPath);
      
      const result = {
        path,
        entries,
        count: entries.length,
      };

      onProgress?.({ stage: 'completed', message: `Listed ${path} (${entries.length} entries)` });
      
      return { callId: '', output: result, isError: false };
    }),
    30000
  )
);

export const globTool = createTool(
  {
    name: 'glob',
    description: 'Find files matching a glob pattern',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Glob pattern (e.g., **/*.ts)' },
        path: { type: 'string', description: 'Base directory for the search' },
      },
      required: ['pattern'],
    },
    requiresPermission: true,
    permissionCategory: 'filesystem_read',
    timeout: 30000,
  },
  createTimeoutExecutor(
    createToolExecutor(async (input, context, onProgress) => {
      const validation = validateToolInput(input, globTool.definition.inputSchema);
      if (!validation.valid) {
        return { callId: '', output: null, error: validation.errors.join(', '), isError: true };
      }

      const { pattern, path = '.' } = input as { pattern: string; path?: string };
      const fullPath = normalizePath(path);

      onProgress?.({ stage: 'running', message: `Globbing ${pattern} in ${path}...` });

      const matches = await glob(pattern, { cwd: fullPath });
      
      const matchArray: string[] = [];
      for await (const match of matches) {
        matchArray.push(match);
      }
      
      const result = {
        pattern,
        path,
        matches: matchArray.map(m => ({ path: m, absolute: join(fullPath, m) })),
        count: matchArray.length,
      };

      onProgress?.({ stage: 'completed', message: `Found ${matchArray.length} matches for ${pattern}` });
      
      return { callId: '', output: result, isError: false };
    }),
    30000
  )
);

export const grepTool = createTool(
  {
    name: 'grep',
    description: 'Search for text in files',
    inputSchema: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Regular expression pattern to search for' },
        path: { type: 'string', description: 'Directory to search in' },
        include: { type: 'string', description: 'File pattern to include (e.g., *.ts)' },
        exclude: { type: 'string', description: 'File pattern to exclude' },
        caseSensitive: { type: 'boolean', description: 'Case sensitive search' },
        maxResults: { type: 'number', description: 'Maximum number of results' },
      },
      required: ['pattern'],
    },
    requiresPermission: true,
    permissionCategory: 'filesystem_read',
    timeout: 60000,
  },
  createTimeoutExecutor(
    createToolExecutor(async (input, context, onProgress) => {
      const validation = validateToolInput(input, grepTool.definition.inputSchema);
      if (!validation.valid) {
        return { callId: '', output: null, error: validation.errors.join(', '), isError: true };
      }

      const { 
        pattern, 
        path = '.', 
        include, 
        exclude,
        caseSensitive = false,
        maxResults = 100
      } = input as { 
        pattern: string; 
        path?: string; 
        include?: string;
        exclude?: string;
        caseSensitive?: boolean;
        maxResults?: number;
      };
      
      const fullPath = normalizePath(path);

      onProgress?.({ stage: 'running', message: `Searching for ${pattern} in ${path}...` });

      const regex = new RegExp(pattern, caseSensitive ? 'g' : 'gi');
      const results: Array<{ file: string; line: number; column: number; match: string; context: string }> = [];
      
      const fileIter = await glob(include || '**/*', { cwd: fullPath });
      const fileArray: string[] = [];
      for await (const f of fileIter) {
        fileArray.push(join(fullPath, f));
      }
      
      for (const file of fileArray) {
        if (results.length >= maxResults) break;
        if (exclude) {
          const excludeRegex = new RegExp(exclude.replace(/\*/g, '.*'));
          if (excludeRegex.test(file)) continue;
        }
        
        try {
          const content = readFileSync(file, 'utf-8');
          const lines = content.split('\n');
          
          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) break;
            const line = lines[i];
            if (!line) continue;
            const match = line.match(regex);
            if (match) {
              results.push({
                file: relative(WORKING_DIR, file),
                line: i + 1,
                column: match.index || 0,
                match: match[0],
                context: line.trim(),
              });
            }
          }
        } catch {
        }
      }

      const result = {
        pattern,
        path,
        results,
        count: results.length,
        truncated: results.length >= maxResults,
      };

      onProgress?.({ stage: 'completed', message: `Found ${results.length} matches for ${pattern}` });
      
      return { callId: '', output: result, isError: false };
    }),
    60000
  )
);

function generateDiff(oldContent: string, newContent: string, filePath: string): string {
  const oldLines = oldContent.split('\n');
  const newLines = newContent.split('\n');
  
  const diff: string[] = [];
  diff.push(`--- a/${filePath}`);
  diff.push(`+++ b/${filePath}`);
  
  let i = 0, j = 0;
  const context = 3;
  
  while (i < oldLines.length || j < newLines.length) {
    if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
      i++;
      j++;
      continue;
    }
    
    let oldEnd = i;
    let newEnd = j;
    
    while (oldEnd < oldLines.length && newEnd < newLines.length && oldLines[oldEnd] !== newLines[newEnd]) {
      oldEnd++;
      newEnd++;
    }
    
    const startLine = Math.max(1, i - context + 1);
    const endLine = Math.min(oldLines.length, oldEnd + context);
    
    diff.push(`@@ -${startLine},${endLine - startLine + 1} +${startLine},${endLine - startLine + 1} @@`);
    
    for (let k = startLine - 1; k < endLine; k++) {
      if (k < oldLines.length) {
        diff.push(`-${oldLines[k]}`);
      }
    }
    
    for (let k = startLine - 1; k < endLine; k++) {
      if (k < newLines.length) {
        diff.push(`+${newLines[k]}`);
      }
    }
    
    i = oldEnd;
    j = newEnd;
  }
  
  return diff.join('\n');
}

toolRegistry.register(readTool);
toolRegistry.register(writeTool);
toolRegistry.register(editTool);
toolRegistry.register(listTool);
toolRegistry.register(globTool);
toolRegistry.register(grepTool);