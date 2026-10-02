import type { Message, ProviderConfig, Model } from '../core/types.js';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';

export interface ProjectInstructions {
  content: string;
  path: string;
  loadedAt: number;
}

export interface SessionData {
  id: string;
  createdAt: number;
  updatedAt: number;
  messages: Message[];
  model: string;
  providerConfig: ProviderConfig;
  workingDirectory: string;
  metadata: Record<string, unknown>;
}

export interface ContextConfig {
  maxTokens: number;
  compactionThreshold: number;
  preserveSystemMessages: boolean;
  preserveRecentMessages: number;
  preserveToolResults: boolean;
  preserveReferencedFiles: boolean;
}

const DEFAULT_CONFIG: ContextConfig = {
  maxTokens: 100000,
  compactionThreshold: 0.8,
  preserveSystemMessages: true,
  preserveRecentMessages: 10,
  preserveToolResults: true,
  preserveReferencedFiles: true,
};

export class ContextManager {
  private config: ContextConfig;
  private projectInstructions: ProjectInstructions | null = null;
  private sessionData: SessionData | null = null;
  private sessionsDir: string;
  private projectRoot: string;
  private tokenEstimator: TokenEstimator;

  constructor(projectRoot?: string) {
    this.projectRoot = projectRoot || process.cwd();
    this.config = { ...DEFAULT_CONFIG };
    this.sessionsDir = join(homedir(), '.config', 'arcline', 'sessions');
    this.tokenEstimator = new TokenEstimator();
    this.ensureSessionsDir();
  }

  private ensureSessionsDir(): void {
    if (!existsSync(this.sessionsDir)) {
      mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  loadProjectInstructions(): ProjectInstructions | null {
    const possiblePaths = [
      join(this.projectRoot, 'ARCLINE.md'),
      join(this.projectRoot, 'CLAUDE.md'),
      join(this.projectRoot, '.arcline', 'instructions.md'),
    ];

    for (const path of possiblePaths) {
      if (existsSync(path)) {
        try {
          const content = readFileSync(path, 'utf-8');
          this.projectInstructions = {
            content,
            path,
            loadedAt: Date.now(),
          };
          return this.projectInstructions;
        } catch {
        }
      }
    }
    return null;
  }

  getProjectInstructions(): ProjectInstructions | null {
    return this.projectInstructions;
  }

  estimateTokens(text: string): number {
    return this.tokenEstimator.estimate(text);
  }

  estimateMessageTokens(message: Message): number {
    let tokens = this.estimateTokens(message.content);
    if (message.toolCalls) {
      for (const tc of message.toolCalls) {
        tokens += this.estimateTokens(tc.function.name);
        tokens += this.estimateTokens(tc.function.arguments);
      }
    }
    return tokens;
  }

  estimateConversationTokens(messages: Message[]): number {
    return messages.reduce((sum, msg) => sum + this.estimateMessageTokens(msg), 0);
  }

  getContextUsage(messages: Message[]): { used: number; max: number; percentage: number } {
    const used = this.estimateConversationTokens(messages);
    return {
      used,
      max: this.config.maxTokens,
      percentage: used / this.config.maxTokens,
    };
  }

  shouldCompact(messages: Message[]): boolean {
    const usage = this.getContextUsage(messages);
    return usage.percentage >= this.config.compactionThreshold;
  }

  compactConversation(messages: Message[], systemPrompt?: string): Message[] {
    if (messages.length <= this.config.preserveRecentMessages) {
      return messages;
    }

    const systemMessages = messages.filter(m => m.role === 'system');
    const recentMessages = messages.slice(-this.config.preserveRecentMessages);
    const olderMessages = messages.slice(0, -this.config.preserveRecentMessages);

    let summary = this.summarizeMessages(olderMessages);
    
    const compacted: Message[] = [];
    
    if (systemPrompt) {
      compacted.push({ role: 'system', content: systemPrompt });
    }
    
    if (summary) {
      compacted.push({
        role: 'system',
        content: `[Previous conversation summary]\n${summary}`,
      });
    }
    
    compacted.push(...recentMessages);
    
    return compacted;
  }

  private summarizeMessages(messages: Message[]): string {
    const userMessages = messages.filter(m => m.role === 'user');
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const toolMessages = messages.filter(m => m.role === 'tool');

    const topics = new Set<string>();
    const files = new Set<string>();
    const tools = new Set<string>();

    for (const msg of userMessages) {
      const words = msg.content.toLowerCase().match(/\b\w{4,}\b/g) || [];
      for (const word of words.slice(0, 5)) topics.add(word);
    }

    for (const msg of assistantMessages) {
      const fileMatches = msg.content.match(/(?:src|lib|app|test)[\/\w.-]+\.(ts|js|tsx|jsx|py|rs|go|java)/g) || [];
      for (const f of fileMatches) files.add(f);
    }

    for (const msg of toolMessages) {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed && typeof parsed === 'object' && 'path' in parsed) {
          files.add(parsed.path as string);
        }
      } catch {
      }
    }

    const parts: string[] = [];
    
    if (topics.size > 0) {
      parts.push(`Topics discussed: ${Array.from(topics).slice(0, 10).join(', ')}`);
    }
    
    if (files.size > 0) {
      parts.push(`Files involved: ${Array.from(files).slice(0, 15).join(', ')}`);
    }
    
    if (tools.size > 0) {
      parts.push(`Tools used: ${Array.from(tools).join(', ')}`);
    }

    parts.push(`Messages: ${userMessages.length} user, ${assistantMessages.length} assistant, ${toolMessages.length} tool results`);

    return parts.join('\n');
  }

  saveSession(session: SessionData): void {
    try {
      const filePath = join(this.sessionsDir, `${session.id}.json`);
      writeFileSync(filePath, JSON.stringify(session, null, 2));
    } catch {
    }
  }

  loadSession(sessionId: string): SessionData | null {
    try {
      const filePath = join(this.sessionsDir, `${sessionId}.json`);
      if (!existsSync(filePath)) return null;
      const data = JSON.parse(readFileSync(filePath, 'utf-8'));
      return data as SessionData;
    } catch {
      return null;
    }
  }

  listSessions(): Array<{ id: string; createdAt: number; updatedAt: number; messageCount: number }> {
    try {
      const files = readdirSync(this.sessionsDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            const data = JSON.parse(readFileSync(join(this.sessionsDir, f), 'utf-8'));
            return {
              id: data.id,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
              messageCount: data.messages?.length || 0,
            };
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Array<{ id: string; createdAt: number; updatedAt: number; messageCount: number }>;
    } catch {
      return [];
    }
  }

  deleteSession(sessionId: string): boolean {
    try {
      const filePath = join(this.sessionsDir, `${sessionId}.json`);
      if (existsSync(filePath)) {
        require('node:fs').unlinkSync(filePath);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  createNewSession(providerConfig: ProviderConfig, model: string, workingDirectory: string): SessionData {
    const session: SessionData = {
      id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messages: [],
      model,
      providerConfig,
      workingDirectory,
      metadata: {},
    };
    this.sessionData = session;
    return session;
  }

  getCurrentSession(): SessionData | null {
    return this.sessionData;
  }

  setCurrentSession(session: SessionData | null): void {
    this.sessionData = session;
  }

  updateConfig(config: Partial<ContextConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): ContextConfig {
    return { ...this.config };
  }
}

class TokenEstimator {
  estimate(text: string): number {
    if (!text) return 0;
    const words = text.split(/\s+/).length;
    const chars = text.length;
    return Math.ceil(Math.max(words * 1.3, chars / 4));
  }
}

export const contextManager = new ContextManager();