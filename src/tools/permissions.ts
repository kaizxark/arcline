import type { PermissionState, PermissionDecision, PermissionRequest, ToolContext } from './types.js';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

export class PermissionManager {
  private state: PermissionState;
  private configPath: string;
  private persistentAllowances: Map<string, 'once' | 'session'> = new Map();

  constructor() {
    this.configPath = join(homedir(), '.config', 'arcline', 'permissions.json');
    this.state = {
      mode: 'ask',
      allowedTools: new Set(),
      deniedTools: new Set(),
      sessionAllowances: new Map(),
    };
    this.loadConfig();
  }

  private loadConfig(): void {
    if (existsSync(this.configPath)) {
      try {
        const data = JSON.parse(readFileSync(this.configPath, 'utf-8'));
        this.state.mode = data.mode || 'ask';
        this.state.allowedTools = new Set(data.allowedTools || []);
        this.state.deniedTools = new Set(data.deniedTools || []);
        this.persistentAllowances = new Map(Object.entries(data.persistentAllowances || {}));
      } catch {
      }
    }
  }

  private saveConfig(): void {
    try {
      const dir = join(homedir(), '.config', 'arcline');
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      const data = {
        mode: this.state.mode,
        allowedTools: Array.from(this.state.allowedTools),
        deniedTools: Array.from(this.state.deniedTools),
        persistentAllowances: Object.fromEntries(this.persistentAllowances),
      };
      writeFileSync(this.configPath, JSON.stringify(data, null, 2));
    } catch {
    }
  }

  checkPermission(toolName: string, category: string): 'allowed' | 'denied' | 'ask' {
    if (this.state.deniedTools.has(toolName)) return 'denied';
    if (this.state.allowedTools.has(toolName)) return 'allowed';
    
    const sessionAllowance = this.state.sessionAllowances.get(toolName);
    if (sessionAllowance === 'session') return 'allowed';
    
    const persistentAllowance = this.persistentAllowances.get(toolName);
    if (persistentAllowance === 'session') return 'allowed';
    if (persistentAllowance === 'once') {
      this.persistentAllowances.delete(toolName);
      this.saveConfig();
      return 'allowed';
    }
    
    if (this.state.mode === 'allow') return 'allowed';
    if (this.state.mode === 'deny') return 'denied';
    return 'ask';
  }

  async requestPermission(request: PermissionRequest, onPrompt: (request: PermissionRequest) => Promise<PermissionDecision>): Promise<PermissionDecision> {
    const permission = this.checkPermission(request.toolName, request.category);
    
    if (permission === 'allowed') return 'allow_session';
    if (permission === 'denied') return 'deny';
    
    const decision = await onPrompt(request);
    
    switch (decision) {
      case 'allow_once':
        this.state.sessionAllowances.set(request.toolName, 'once');
        break;
      case 'allow_session':
        this.state.sessionAllowances.set(request.toolName, 'session');
        break;
      case 'deny':
        this.state.deniedTools.add(request.toolName);
        break;
    }
    
    return decision;
  }

  allowTool(toolName: string, scope: 'once' | 'session' | 'persistent' = 'session'): void {
    if (scope === 'once') {
      this.state.sessionAllowances.set(toolName, 'once');
    } else if (scope === 'session') {
      this.state.sessionAllowances.set(toolName, 'session');
    } else {
      this.state.allowedTools.add(toolName);
      this.persistentAllowances.set(toolName, 'session');
      this.saveConfig();
    }
  }

  denyTool(toolName: string, persistent = false): void {
    this.state.deniedTools.add(toolName);
    this.state.sessionAllowances.delete(toolName);
    this.persistentAllowances.delete(toolName);
    if (persistent) {
      this.saveConfig();
    }
  }

  setMode(mode: 'ask' | 'allow' | 'deny'): void {
    this.state.mode = mode;
    this.saveConfig();
  }

  getMode(): 'ask' | 'allow' | 'deny' {
    return this.state.mode;
  }

  getState(): PermissionState {
    return { ...this.state };
  }

  clearSessionAllowances(): void {
    this.state.sessionAllowances.clear();
  }

  getAllowedTools(): string[] {
    return Array.from(this.state.allowedTools);
  }

  getDeniedTools(): string[] {
    return Array.from(this.state.deniedTools);
  }
}

export const permissionManager = new PermissionManager();