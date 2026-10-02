#!/usr/bin/env node
import { program } from 'commander';
import { configManager } from '../config/index.js';
import { providerRegistry } from '../providers/index.js';
import { createSession } from '../session/index.js';
import { tui, TUI } from '../ui/tui.js';
import type { ProviderConfig, Message, ToolResult } from '../core/types.js';
import type { ToolDefinition } from '../tools/types.js';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync, readFileSync as fsReadFileSync } from 'node:fs';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createAgent, AgentOrchestrator } from '../agent/index.js';
import { toolRegistry } from '../tools/registry.js';
import { permissionManager } from '../tools/permissions.js';
import { contextManager } from '../agent/context.js';
import type { ToolDefinition as ToolDefType } from '../tools/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  try {
    const pkgPath = join(__dirname, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    return pkg.version || '0.1.0';
  } catch {
    return '0.1.0';
  }
}

async function loadProviderConfig(): Promise<ProviderConfig | null> {
  const config = configManager.getActiveProvider();
  if (config) return config;

  const envBaseUrl = process.env['ARCLINE_BASE_URL'];
  const envApiKey = process.env['ARCLINE_API_KEY'];
  const envModel = process.env['ARCLINE_MODEL'];

  if (envBaseUrl && envApiKey && envModel) {
    return {
      baseUrl: envBaseUrl,
      apiKey: envApiKey,
      model: envModel,
    };
  }

  return null;
}

async function selectModel(config: ProviderConfig): Promise<string> {
  process.stdout.write('\x1b[?25l');
  try {
    const models = await providerRegistry.listModels(config);
    
    if (models.length === 0) {
      const { modelId } = await inquirer.prompt([{
        type: 'input',
        name: 'modelId',
        message: 'Model ID:',
        default: config.model,
        validate: (input) => input.trim() ? true : 'Model ID is required',
      }]);
      return modelId.trim();
    }

    const choices = models.map(m => ({
      name: `${m.id}${m.name ? `  ${chalk.dim(`(${m.name})`)}` : ''}${m.id === config.model ? `  ${chalk.green('← current')}` : ''}`,
      value: m.id,
      short: m.id,
    }));

    choices.unshift({
      name: chalk.italic('Enter custom model ID...'),
      value: '__custom__',
      short: 'Custom',
    });

    console.log(chalk.bold('\n  Select a model:'));
    console.log();

    const { modelId } = await inquirer.prompt([{
      type: 'list',
      name: 'modelId',
      message: '',
      choices,
      pageSize: 15,
      loop: false,
    }]);

    if (modelId === '__custom__') {
      const { customModel } = await inquirer.prompt([{
        type: 'input',
        name: 'customModel',
        message: 'Model ID:',
        default: config.model,
        validate: (input) => input.trim() ? true : 'Model ID is required',
      }]);
      return customModel.trim();
    }

    return modelId;
  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red('\n✖ ') + error.message);
    }
    const { modelId } = await inquirer.prompt([{
      type: 'input',
      name: 'modelId',
      message: 'Model ID:',
      default: config.model,
      validate: (input) => input.trim() ? true : 'Model ID is required',
    }]);
    return modelId.trim();
  } finally {
    process.stdout.write('\x1b[?25h');
  }
}

function handleKeypress(key: Buffer | string, tuiInstance: TUI, session: ReturnType<typeof createSession>, config: ProviderConfig): Promise<{ shouldExit: boolean; shouldContinue: boolean }> {
  const keyStr = key.toString();
  
  if (keyStr === '\u0003') {
    return Promise.resolve({ shouldExit: true, shouldContinue: false });
  }
  
  if (keyStr === '\r' || keyStr === '\n') {
    const input = tuiInstance.getInputBuffer().trim();
    tuiInstance.clearInputBuffer();
    
    if (!input) {
      return Promise.resolve({ shouldExit: false, shouldContinue: true });
    }
    
    if (input === '/exit' || input === '/quit') {
      return Promise.resolve({ shouldExit: true, shouldContinue: false });
    }
    
    if (input === '/clear') {
      session.clear();
      tuiInstance.clearMessages();
      tuiInstance.printSuccess('Conversation cleared');
      return Promise.resolve({ shouldExit: false, shouldContinue: true });
    }
    
    if (input === '/help') {
      tuiInstance.printSessionHelp();
      return Promise.resolve({ shouldExit: false, shouldContinue: true });
    }
    
    if (input === '/model') {
      return handleModelSwitch(tuiInstance, session, config);
    }
    
    if (input === '/config') {
      return handleConfig(tuiInstance, session, config);
    }
    
    return handleUserMessage(input, tuiInstance, session);
  }
  
  if (keyStr === '\u007f' || keyStr === '\b') {
    tuiInstance.deleteChar();
    return Promise.resolve({ shouldExit: false, shouldContinue: true });
  }
  
  if (keyStr === '\u001b[D' || keyStr === '\u001bOD') {
    tuiInstance.moveCursorLeft();
    return Promise.resolve({ shouldExit: false, shouldContinue: true });
  }
  
  if (keyStr === '\u001b[C' || keyStr === '\u001bOC') {
    tuiInstance.moveCursorRight();
    return Promise.resolve({ shouldExit: false, shouldContinue: true });
  }
  
  if (keyStr === '\u001b[H' || keyStr === '\u001bOH') {
    tuiInstance.moveCursorHome();
    return Promise.resolve({ shouldExit: false, shouldContinue: true });
  }
  
  if (keyStr === '\u001b[F' || keyStr === '\u001bOF') {
    tuiInstance.moveCursorEnd();
    return Promise.resolve({ shouldExit: false, shouldContinue: true });
  }
  
  if (keyStr === '\u001b[3~') {
    tuiInstance.deleteCharForward();
    return Promise.resolve({ shouldExit: false, shouldContinue: true });
  }
  
  if (keyStr === '\u001b[A' || keyStr === '\u001bOA') {
    tuiInstance.scrollUp();
    return Promise.resolve({ shouldExit: false, shouldContinue: true });
  }
  
  if (keyStr === '\u001b[B' || keyStr === '\u001bOB') {
    tuiInstance.scrollDown();
    return Promise.resolve({ shouldExit: false, shouldContinue: true });
  }
  
  if (keyStr.length === 1 && keyStr >= ' ' && keyStr <= '~') {
    tuiInstance.insertChar(keyStr);
    return Promise.resolve({ shouldExit: false, shouldContinue: true });
  }
  
  return Promise.resolve({ shouldExit: false, shouldContinue: true });
}

async function handleModelSwitch(tuiInstance: TUI, session: ReturnType<typeof createSession>, config: ProviderConfig): Promise<{ shouldExit: boolean; shouldContinue: boolean }> {
  tuiInstance.disableRawMode();
  try {
    const newModel = await selectModel(config);
    config.model = newModel;
    configManager.setProvider(configManager.getConfig().activeProvider || 'default', config);
    session.updateConfig({ provider: config });
    tuiInstance.printSuccess(`Switched to model: ${newModel}`);
    tuiInstance.setProviderInfo('OpenAI Compatible', newModel, config.baseUrl);
  } catch (error) {
    if (error instanceof Error) {
      tuiInstance.printError(error.message);
    }
  }
  tuiInstance.enableRawMode();
  tuiInstance.render();
  return { shouldExit: false, shouldContinue: true };
}

async function handleConfig(tuiInstance: TUI, session: ReturnType<typeof createSession>, config: ProviderConfig): Promise<{ shouldExit: boolean; shouldContinue: boolean }> {
  tuiInstance.disableRawMode();
  try {
    await configureProvider();
    const newConfig = await loadProviderConfig();
    if (newConfig) {
      config.baseUrl = newConfig.baseUrl;
      config.apiKey = newConfig.apiKey;
      config.model = newConfig.model;
      session.updateConfig({ provider: config });
      tuiInstance.setProviderInfo('OpenAI Compatible', config.model, config.baseUrl);
      tuiInstance.clearMessages();
      tuiInstance.printIntro();
    }
  } catch (error) {
    if (error instanceof Error) {
      tuiInstance.printError(error.message);
    }
  }
  tuiInstance.enableRawMode();
  tuiInstance.render();
  return { shouldExit: false, shouldContinue: true };
}

async function handleUserMessage(input: string, tuiInstance: TUI, session: ReturnType<typeof createSession>): Promise<{ shouldExit: boolean; shouldContinue: boolean }> {
  tuiInstance.addMessage({ role: 'user', content: input });
  
  try {
    tuiInstance.addMessage({ role: 'assistant', content: '', isStreaming: true });
    
    let fullContent = '';
    for await (const chunk of await session.sendMessage(input, { stream: true })) {
      fullContent += chunk;
      tuiInstance.updateLastMessage(fullContent, true);
    }
    
    tuiInstance.updateLastMessage(fullContent, false);
  } catch (error) {
    tuiInstance.updateLastMessage('', false);
    if (error instanceof Error) {
      tuiInstance.printError(error.message);
    }
  }
  
  return { shouldExit: false, shouldContinue: true };
}

function findProjectRoot(startPath: string): string {
  let current = resolve(startPath);
  while (current !== dirname(current)) {
    if (existsSync(join(current, 'package.json')) || existsSync(join(current, '.git')) || existsSync(join(current, 'ARCLINE.md'))) {
      return current;
    }
    current = dirname(current);
  }
  return resolve(startPath);
}

function findFiles(dir: string): string[] {
  const files: string[] = [];
  function walk(currentDir: string, prefix = '') {
    try {
      const entries = readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
        const fullPath = join(currentDir, entry.name);
        const relPath = join(prefix, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath, relPath);
        } else if (entry.isFile()) {
          files.push(relPath);
        }
      }
    } catch {}
  }
  walk(dir);
  return files;
}

function extractFileReferences(input: string): string[] {
  const refs = input.match(/@(\S+)/g);
  if (!refs) return [];
  return refs.map(r => r.slice(1));
}

function resolveFileReferences(refs: string[], projectRoot: string): Map<string, string> {
  const files = findFiles(projectRoot);
  const resolved = new Map<string, string>();
  
  for (const ref of refs) {
    const matches = files.filter(f => f.includes(ref) || f.endsWith(ref));
    if (matches.length === 1 && matches[0]) {
      try {
        const content = fsReadFileSync(join(projectRoot, matches[0]), 'utf-8');
        resolved.set(ref, content);
      } catch {}
    }
  }
  return resolved;
}

async function handleSlashCommand(input: string, agent: AgentOrchestrator, config: ProviderConfig): Promise<{ handled: boolean; shouldExit: boolean }> {
  const parts = input.slice(1).split(' ');
  const cmd = parts[0];
  const args = parts.slice(1).join(' ');

  switch (cmd) {
    case 'exit':
    case 'quit':
      return { handled: true, shouldExit: true };
    
    case 'clear':
      agent.clearMessages();
      tui.clearMessages();
      tui.printSuccess('Conversation cleared');
      return { handled: true, shouldExit: false };
    
    case 'help':
      tui.printSessionHelp();
      return { handled: true, shouldExit: false };
    
    case 'model':
      tui.disableRawMode();
      try {
        const newModel = await selectModel(config);
        config.model = newModel;
        configManager.setProvider(configManager.getConfig().activeProvider || 'default', config);
        tui.printSuccess(`Switched to model: ${newModel}`);
        tui.setProviderInfo('OpenAI Compatible', newModel, config.baseUrl);
      } catch (error) {
        if (error instanceof Error) tui.printError(error.message);
      }
      tui.enableRawMode();
      tui.render();
      return { handled: true, shouldExit: false };
    
    case 'config':
      tui.disableRawMode();
      try {
        await configureProvider();
        const newConfig = await loadProviderConfig();
        if (newConfig) {
          config.baseUrl = newConfig.baseUrl;
          config.apiKey = newConfig.apiKey;
          config.model = newConfig.model;
          tui.setProviderInfo('OpenAI Compatible', config.model, config.baseUrl);
          tui.clearMessages();
          tui.printIntro();
        }
      } catch (error) {
        if (error instanceof Error) tui.printError(error.message);
      }
      tui.enableRawMode();
      tui.render();
      return { handled: true, shouldExit: false };
    
    case 'plan':
      if (!args) {
        tui.printError('Usage: /plan <task description>');
      } else {
        const plan = agent.createPlan(args, []);
        tui.printSuccess(`Created plan: ${plan.title}`);
        for (const step of plan.steps) {
          tui.printInfo(`  ${step.id}: ${step.description}`);
        }
      }
      return { handled: true, shouldExit: false };
    
    case 'permissions':
      tui.disableRawMode();
      try {
        const mode = permissionManager.getMode();
        const { newMode } = await inquirer.prompt([{
          type: 'list',
          name: 'newMode',
          message: `Current mode: ${mode}. Select new mode:`,
          choices: ['ask', 'allow', 'deny'],
        }]);
        permissionManager.setMode(newMode as 'ask' | 'allow' | 'deny');
        tui.printSuccess(`Permission mode set to: ${newMode}`);
      } catch (error) {
        if (error instanceof Error) tui.printError(error.message);
      }
      tui.enableRawMode();
      tui.render();
      return { handled: true, shouldExit: false };
    
    case 'cost':
      const usage = agent.getState().contextUsage;
      tui.printInfo(`Session tokens: ${usage.totalTokens} / ${usage.maxTokens} (${Math.round(usage.percentage * 100)}%)`);
      return { handled: true, shouldExit: false };
    
    case 'compact':
      tui.printInfo('Compacting conversation...');
      return { handled: true, shouldExit: false };
    
    case 'resume':
      tui.disableRawMode();
      try {
        const sessions = contextManager.listSessions();
        if (sessions.length === 0) {
          tui.printInfo('No previous sessions found');
        } else {
          const { sessionId } = await inquirer.prompt([{
            type: 'list',
            name: 'sessionId',
            message: 'Select session to resume:',
            choices: sessions.map(s => ({
              name: `${s.id} (${s.messageCount} messages, ${new Date(s.updatedAt).toLocaleString()})`,
              value: s.id,
            })),
          }]);
          const session = contextManager.loadSession(sessionId);
          if (session) {
            contextManager.setCurrentSession(session);
            tui.printSuccess(`Resumed session: ${sessionId}`);
          }
        }
      } catch (error) {
        if (error instanceof Error) tui.printError(error.message);
      }
      tui.enableRawMode();
      tui.render();
      return { handled: true, shouldExit: false };
    
    case 'init':
      tui.disableRawMode();
      try {
        const projectRoot = findProjectRoot(process.cwd());
        const arclineMd = join(projectRoot, 'ARCLINE.md');
        if (existsSync(arclineMd)) {
          tui.printInfo('ARCLINE.md already exists');
        } else {
          const template = `# Project Instructions

## Overview
Describe your project here.

## Coding Standards
- Language: TypeScript
- Style: ESLint + Prettier
- Testing: Vitest

## Commands
- Build: npm run build
- Test: npm run test
- Lint: npm run lint

## Notes
Add any project-specific instructions here.`;
          fsWriteFileSync(arclineMd, template);
          tui.printSuccess('Created ARCLINE.md');
        }
      } catch (error) {
        if (error instanceof Error) tui.printError(error.message);
      }
      tui.enableRawMode();
      tui.render();
      return { handled: true, shouldExit: false };
    
    default:
      return { handled: false, shouldExit: false };
  }
}

import { readdirSync, writeFileSync as fsWriteFileSync } from 'node:fs';

async function runInteractiveSession(config: ProviderConfig): Promise<void> {
  const model = await selectModel(config);
  config.model = model;
  configManager.setProvider(configManager.getConfig().activeProvider || 'default', config);

  tui.setProviderInfo('OpenAI Compatible', model, config.baseUrl);
  tui.printIntro();

  const projectRoot = findProjectRoot(process.cwd());
  contextManager.loadProjectInstructions();

  const toolDefs = toolRegistry.getDefinitions();
  
  const agent = createAgent({
    config: {
      providerConfig: config,
      systemPrompt: 'You are a helpful AI coding assistant. Use tools to read, write, and edit files. Execute commands to test your changes.',
      model: config.model,
      temperature: 0.2,
      maxTokens: 8000,
      maxToolCalls: 20,
      maxIterations: 10,
      enablePlanMode: true,
      autoApproveTools: [],
    },
    callbacks: {
      message: (msg) => {
        if (msg.role === 'user') {
          tui.addMessage(msg);
        } else if (msg.role === 'assistant') {
          tui.addMessage({ ...msg, isStreaming: true });
        } else if (msg.role === 'tool') {
        }
      },
      tool_call: (tc) => tui.addMessage({ role: 'system', content: chalk.cyan(`▸ ${tc.function.name}`), isStreaming: true }),
      tool_result: (result) => {
        tui.addMessage({ role: 'tool', content: JSON.stringify(result.output), toolCallId: result.callId });
      },
      tool_progress: (name, progress) => {
        if (progress.stage === 'starting') {
          tui.addMessage({ role: 'system', content: chalk.dim(`  ${name}: ${progress.message}`) });
        } else if (progress.stage === 'completed') {
          tui.printSuccess(`${name} completed`);
        } else if (progress.stage === 'failed') {
          tui.printError(`${name} failed: ${progress.message}`);
        }
      },
      plan_update: (plan) => {
        tui.printInfo(`Plan updated: ${plan.title}`);
      },
      context_update: (usage) => {
        if (usage.percentage > 0.8) {
          tui.printInfo(`Context usage: ${Math.round(usage.percentage * 100)}%`);
        }
      },
      error: (err) => tui.printError(err.message),
      complete: (final) => tui.addMessage({ role: 'assistant', content: final, isStreaming: false }),
      permission_request: async (req) => {
        tui.disableRawMode();
        const { decision } = await inquirer.prompt([{
          type: 'list',
          name: 'decision',
          message: `Allow ${req.toolName}? ${req.description}`,
          choices: ['allow_once', 'allow_session', 'deny'],
        }]);
        tui.enableRawMode();
        tui.render();
        return decision as 'allow_once' | 'allow_session' | 'deny' | 'cancel';
      },
    },
    tools: toolDefs,
    toolContext: {
      workingDirectory: projectRoot,
      sessionId: `session-${Date.now()}`,
      permissions: permissionManager.getState(),
    },
  });

  tui.enableRawMode();
  tui.render();

  let shouldExit = false;
  
  process.stdin.on('data', async (key) => {
    if (shouldExit) return;
    const keyStr = key.toString();
    
    if (keyStr === '\u0003') {
      shouldExit = true;
      tui.cleanup();
      process.exit(0);
      return;
    }
    
    if (keyStr === '\r' || keyStr === '\n') {
      const input = tui.getInputBuffer().trim();
      tui.clearInputBuffer();
      
      if (!input) return;
      
      if (input.startsWith('/')) {
        const result = await handleSlashCommand(input, agent, config);
        if (result.shouldExit) {
          shouldExit = true;
          tui.cleanup();
          process.exit(0);
        }
        return;
      }
      
      tui.addToHistory(input);
      
      const fileRefs = extractFileReferences(input);
      if (fileRefs.length > 0) {
        const refContent = resolveFileReferences(fileRefs, projectRoot);
        for (const [ref, content] of refContent) {
          tui.addMessage({ role: 'system', content: chalk.dim(`[@${ref}] ${content.slice(0, 200)}...`) });
        }
      }
      
      tui.addMessage({ role: 'user', content: input });
      agent.addMessage({ role: 'user', content: input });
      
      try {
        await agent.run(input);
      } catch (error) {
        if (error instanceof Error) tui.printError(error.message);
      }
      
      return;
    }
    
    if (keyStr === '\u007f' || keyStr === '\b') {
      tui.deleteChar();
      return;
    }
    
    if (keyStr === '\u001b[D' || keyStr === '\u001bOD') {
      tui.moveCursorLeft();
      return;
    }
    
    if (keyStr === '\u001b[C' || keyStr === '\u001bOC') {
      tui.moveCursorRight();
      return;
    }
    
    if (keyStr === '\u001b[H' || keyStr === '\u001bOH') {
      tui.moveCursorHome();
      return;
    }
    
    if (keyStr === '\u001b[F' || keyStr === '\u001bOF') {
      tui.moveCursorEnd();
      return;
    }
    
    if (keyStr === '\u001b[3~') {
      tui.deleteCharForward();
      return;
    }
    
    if (keyStr === '\u001b[A' || keyStr === '\u001bOA') {
      tui.scrollUp();
      return;
    }
    
    if (keyStr === '\u001b[B' || keyStr === '\u001bOB') {
      tui.scrollDown();
      return;
    }
    
    if (keyStr.length === 1 && keyStr >= ' ' && keyStr <= '~') {
      tui.insertChar(keyStr);
      
      const buffer = tui.getInputBuffer();
      const lastSpace = Math.max(buffer.lastIndexOf(' '), buffer.lastIndexOf('\n'));
      const currentWord = buffer.slice(lastSpace + 1);
      
      if (currentWord.startsWith('/') && currentWord.length > 1) {
        const commands = ['/exit', '/quit', '/clear', '/help', '/model', '/config', '/plan', '/permissions', '/cost', '/compact', '/resume', '/init'];
        const matches = commands.filter(c => c.startsWith(currentWord));
        if (matches.length > 0) {
          tui.showAutocomplete(matches.map(c => ({ label: c, value: c, type: 'command' })), currentWord);
        }
      } else if (currentWord.startsWith('@') && currentWord.length > 1) {
        const files = findFiles(projectRoot);
        const matches = files.filter(f => f.toLowerCase().includes(currentWord.slice(1).toLowerCase())).slice(0, 10);
        if (matches.length > 0) {
          tui.showAutocomplete(matches.map(f => ({ label: f, value: `@${f}`, type: 'file' })), currentWord);
        }
      } else {
        tui.hideAutocomplete();
      }
      return;
    }
    
    tui.hideAutocomplete();
  });

  process.on('SIGINT', () => {
    tui.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    tui.cleanup();
    process.exit(0);
  });

  await new Promise<void>(() => {});
}

async function configureProvider(): Promise<void> {
  console.log();
  console.log(chalk.bold('  Configure Provider'));
  console.log();

  const existingConfig = configManager.getActiveProvider();
  
  const { baseUrl } = await inquirer.prompt([{
    type: 'input',
    name: 'baseUrl',
    message: 'Base URL:',
    default: existingConfig?.baseUrl || 'https://api.openai.com/v1',
    validate: (input) => {
      try {
        new URL(input);
        return true;
      } catch {
        return 'Please enter a valid URL';
      }
    },
  }]);

  const { apiKey } = await inquirer.prompt([{
    type: 'password',
    name: 'apiKey',
    message: 'API Key:',
    default: existingConfig?.apiKey ? '********' : undefined,
    validate: (input) => input.trim() ? true : 'API key is required',
  }]);

  let finalApiKey = apiKey;
  if (apiKey === '********' && existingConfig?.apiKey) {
    finalApiKey = existingConfig.apiKey;
  }

  const tempConfig: ProviderConfig = { baseUrl, apiKey: finalApiKey, model: '' };
  const model = await selectModel(tempConfig);

  configManager.setProvider('default', {
    baseUrl,
    apiKey: finalApiKey,
    model,
  });

  console.log();
  console.log(chalk.green('✔ ') + chalk.green('Provider configured successfully'));
}

async function listModels(): Promise<void> {
  const config = await loadProviderConfig();
  if (!config) {
    console.log(chalk.red('✖ ') + 'No provider configured. Run "arcline config" first.');
    process.exit(1);
  }

  try {
    const models = await providerRegistry.listModels(config);
    
    if (models.length === 0) {
      console.log(chalk.cyan('ℹ ') + 'No models found. The provider may not support model discovery.');
      return;
    }

    console.log(chalk.bold('\n  Available models:'));
    console.log();
    models.forEach((model) => {
      const isSelected = model.id === config.model;
      const prefix = isSelected ? chalk.green('▸ ') : '  ';
      const name = model.name ? chalk.dim(` (${model.name})`) : '';
      console.log(`${prefix}${chalk.white(model.id)}${name}`);
    });
    console.log();
  } catch (error) {
    if (error instanceof Error) {
      console.log(chalk.red('✖ ') + error.message);
    }
  }
}

program
  .name('arcline')
  .description('A high-performance terminal AI agent')
  .version(getVersion())
  .option('-d, --debug', 'Enable debug mode')
  .option('-p, --prompt <prompt>', 'Run a single prompt in non-interactive mode')
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts['debug']) {
      configManager.setDebugMode(true);
      tui.setDebugMode(true);
    }
  })
  .action(async (options: { prompt?: string }) => {
    const config = await loadProviderConfig();
    if (!config) {
      console.log(chalk.red('✖ ') + 'No provider configured. Run "arcline config" first.');
      process.exit(1);
    }
    
    if (options.prompt) {
      await runNonInteractiveSession(config, options.prompt);
    } else {
      await runInteractiveSession(config);
    }
  });

program
  .command('config')
  .description('Configure AI provider')
  .action(configureProvider);

program
  .command('models')
  .description('List available models')
  .action(listModels);

async function runNonInteractiveSession(config: ProviderConfig, prompt: string): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());
  
  const toolDefs = toolRegistry.getDefinitions();
  
  const agent = createAgent({
    config: {
      providerConfig: config,
      systemPrompt: 'You are a helpful AI coding assistant. Use tools to read, write, and edit files. Execute commands to test your changes.',
      model: config.model,
      temperature: 0.2,
      maxTokens: 8000,
      maxToolCalls: 20,
      maxIterations: 10,
      enablePlanMode: true,
      autoApproveTools: [],
    },
    callbacks: {
      message: (msg) => {
        if (msg.role === 'assistant' && msg.content) {
          console.log(msg.content);
        }
      },
      tool_call: (tc) => console.log(chalk.cyan(`▸ ${tc.function.name}`)),
      tool_result: (result) => {
        if (result.isError) {
          console.log(chalk.red(`Error: ${result.error}`));
        } else if (result.output) {
          console.log(chalk.dim(JSON.stringify(result.output, null, 2)));
        }
      },
      tool_progress: (name, progress) => {
        if (progress.stage === 'completed') {
          console.log(chalk.green(`✔ ${name} completed`));
        } else if (progress.stage === 'failed') {
          console.log(chalk.red(`✖ ${name} failed: ${progress.message}`));
        }
      },
      plan_update: (plan) => console.log(chalk.blue(`Plan: ${plan.title}`)),
      context_update: () => {},
      error: (err) => console.log(chalk.red(`Error: ${err.message}`)),
      complete: (final) => console.log(final),
      permission_request: async (req) => 'allow_session',
    },
    tools: toolDefs,
    toolContext: {
      workingDirectory: projectRoot,
      sessionId: `session-${Date.now()}`,
      permissions: permissionManager.getState(),
    },
  });

  await agent.run(prompt);
  process.exit(0);
}

program.parseAsync(process.argv).catch((error) => {
  if (error instanceof Error) {
    console.log(chalk.red('✖ ') + error.message);
  }
  process.exit(1);
});