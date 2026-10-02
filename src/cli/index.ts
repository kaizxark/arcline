#!/usr/bin/env node
import { program } from 'commander';
import { configManager } from '../config/index.js';
import { providerRegistry } from '../providers/index.js';
import { tui, TUI } from '../ui/tui.js';
import type { ProviderConfig } from '../core/types.js';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { createAgent, AgentOrchestrator } from '../agent/index.js';
import { toolRegistry } from '../tools/registry.js';
import { permissionManager } from '../tools/permissions.js';
import { contextManager } from '../agent/context.js';
import type { ToolDefinition } from '../tools/types.js';

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
    return { baseUrl: envBaseUrl, apiKey: envApiKey, model: envModel };
  }

  return null;
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
        const content = readFileSync(join(projectRoot, matches[0]), 'utf-8');
        resolved.set(ref, content);
      } catch {}
    }
  }
  return resolved;
}

async function runInteractiveSession(): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());
  contextManager.loadProjectInstructions();

  // Load or create provider config
  let config = await loadProviderConfig();
  if (!config) {
    // No provider configured - show config prompt in TUI
    tui.printIntro();
    tui.addMessage({ role: 'system', content: chalk.yellow('No provider configured. Use /config to set up.') });
    tui.render();
  } else {
    // Check for updates in background
    tui.checkForUpdates(getVersion()).catch(() => {});
  }

  const toolDefs = toolRegistry.getDefinitions();
  
  let agent: AgentOrchestrator | null = null;
  let shouldExit = false;
  
  function createAgentInstance(cfg: ProviderConfig) {
    return createAgent({
      config: {
        providerConfig: cfg,
        systemPrompt: 'You are a helpful AI coding assistant. Use tools to read, write, and edit files. Execute commands to test your changes.',
        model: cfg.model,
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
          }
        },
        tool_call: (tc) => tui.addMessage({ role: 'system', content: chalk.cyan(`▸ ${tc.function.name}`), isStreaming: true }),
        tool_result: (result) => {
          if (result.isError) {
            tui.addMessage({ role: 'system', content: chalk.red(`Error: ${result.error}`) });
          } else if (result.output) {
            tui.addMessage({ role: 'tool', content: JSON.stringify(result.output), toolCallId: result.callId });
          }
        },
        tool_progress: (name, progress) => {
          if (progress.stage === 'completed') {
            tui.printSuccess(`${name} completed`);
          } else if (progress.stage === 'failed') {
            tui.printError(`${name} failed: ${progress.message}`);
          }
        },
        plan_update: (plan) => tui.printInfo(`Plan: ${plan.title}`),
        context_update: (usage) => {
          if (usage.percentage > 0.8) {
            tui.printWarning(`Context: ${Math.round(usage.percentage * 100)}%`);
          }
        },
        error: (err) => tui.printError(err.message),
        complete: (final) => tui.addMessage({ role: 'assistant', content: final, isStreaming: false }),
        permission_request: async (req) => {
          return await tui.requestPermission(req.toolName, req.description, req.category);
        },
      },
      tools: toolDefs,
      toolContext: {
        workingDirectory: projectRoot,
        sessionId: `session-${Date.now()}`,
        permissions: permissionManager.getState(),
      },
    });
  }

  // Initialize agent if config exists
  if (config) {
    agent = createAgentInstance(config);
  }

  tui.enableRawMode();
  tui.render();

  // Initial home screen
  tui.printIntro();

  process.stdin.on('data', async (key) => {
    if (shouldExit) return;
    const keyStr = key.toString();
    
    if (keyStr === '\u0003') { // Ctrl+C
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
        await handleSlashCommand(input, agent, config);
        return;
      }
      
      tui.addToHistory(input);
      
      // Handle @file references
      const fileRefs = extractFileReferences(input);
      if (fileRefs.length > 0) {
        const refContent = resolveFileReferences(fileRefs, projectRoot);
        for (const [ref, content] of refContent) {
          tui.addMessage({ role: 'system', content: chalk.dim(`[@${ref}] ${content.slice(0, 200)}...`) });
        }
      }
      
      tui.addMessage({ role: 'user', content: input });
      
      if (!agent && config) {
        agent = createAgentInstance(config);
      }
      
      if (agent) {
        try {
          await agent.run(input);
        } catch (error) {
          if (error instanceof Error) tui.printError(error.message);
        }
      } else if (!config) {
        tui.printError('No provider configured. Use /config to set up.');
      }
      
      return;
    }
    
    // Handle keyboard input
    if (keyStr === '\u007f' || keyStr === '\b') { tui.deleteChar(); return; }
    if (keyStr === '\u001b[D' || keyStr === '\u001bOD') { tui.moveCursorLeft(); return; }
    if (keyStr === '\u001b[C' || keyStr === '\u001bOC') { tui.moveCursorRight(); return; }
    if (keyStr === '\u001b[H' || keyStr === '\u001bOH') { tui.moveCursorHome(); return; }
    if (keyStr === '\u001b[F' || keyStr === '\u001bOF') { tui.moveCursorEnd(); return; }
    if (keyStr === '\u001b[3~') { tui.deleteCharForward(); return; }
    if (keyStr === '\u001b[A' || keyStr === '\u001bOA') { tui.scrollUp(); return; }
    if (keyStr === '\u001b[B' || keyStr === '\u001bOB') { tui.scrollDown(); return; }
    
    if (keyStr.length === 1 && keyStr >= ' ' && keyStr <= '~') {
      tui.insertChar(keyStr);
      
      const buffer = tui.getInputBuffer();
      const lastSpace = Math.max(buffer.lastIndexOf(' '), buffer.lastIndexOf('\n'));
      const currentWord = buffer.slice(lastSpace + 1);
      
      if (currentWord.startsWith('/') && currentWord.length > 1) {
        const commands = ['/exit', '/quit', '/clear', '/help', '/model', '/config', '/plan', '/permissions', '/cost', '/compact', '/resume', '/init', '/update'];
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

  process.on('SIGINT', () => { tui.cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { tui.cleanup(); process.exit(0); });

  await new Promise<void>(() => {});
}

async function handleSlashCommand(input: string, agent: AgentOrchestrator | null, config: ProviderConfig | null): Promise<void> {
  const parts = input.slice(1).split(' ');
  const cmd = parts[0]?.toLowerCase() ?? '';
  const args = parts.slice(1).join(' ');

  if (!cmd) return;

  if (!config && !['config', 'update', 'help', 'exit', 'quit'].includes(cmd)) {
    tui.printError('No provider configured. Use /config to set up.');
    return;
  }

  switch (cmd) {
    case 'exit':
    case 'quit':
      tui.cleanup();
      process.exit(0);
    
    case 'clear':
      if (agent) agent.clearMessages();
      tui.clearMessages();
      tui.printSuccess('Conversation cleared');
      return;
    
    case 'help':
      tui.printSessionHelp();
      return;
    
    case 'model': {
      if (!config) { tui.printError('No provider configured'); return; }
      tui.disableRawMode();
      try {
        const newModel = await selectModel(config);
        config.model = newModel;
        configManager.setProvider(configManager.getConfig().activeProvider || 'default', config);
        if (agent) agent.updateConfig({ providerConfig: config });
        tui.setProviderInfo('OpenAI Compatible', newModel, config.baseUrl);
        tui.printSuccess(`Model: ${newModel}`);
      } catch (error) {
        if (error instanceof Error) tui.printError(error.message);
      }
      tui.enableRawMode();
      tui.render();
      return;
    }
    
    case 'config': {
      tui.disableRawMode();
      try {
        await configureProviderInteractive();
        const newConfig = await loadProviderConfig();
        if (newConfig) {
          config = newConfig;
          if (agent) agent.updateConfig({ providerConfig: config });
          tui.setProviderInfo('OpenAI Compatible', config.model, config.baseUrl);
          tui.clearMessages();
          tui.printIntro();
          tui.printSuccess('Provider configured');
        }
      } catch (error) {
        if (error instanceof Error) tui.printError(error.message);
      }
      tui.enableRawMode();
      tui.render();
      return;
    }
    
    case 'plan':
      if (!args) { tui.printError('Usage: /plan <task>'); }
      else if (agent) {
        const plan = agent.createPlan(args, []);
        tui.printSuccess(`Plan: ${plan.title}`);
        for (const step of plan.steps) tui.printInfo(`  ${step.id}: ${step.description}`);
      }
      return;
    
    case 'permissions': {
      tui.disableRawMode();
      try {
        const mode = permissionManager.getMode();
        const { newMode } = await inquirer.prompt([{
          type: 'list', name: 'newMode',
          message: `Permission mode (${mode}):`,
          choices: ['ask', 'allow', 'deny'],
        }]);
        permissionManager.setMode(newMode as 'ask' | 'allow' | 'deny');
        tui.printSuccess(`Permission mode: ${newMode}`);
      } catch (error) {
        if (error instanceof Error) tui.printError(error.message);
      }
      tui.enableRawMode();
      tui.render();
      return;
    }
    
    case 'cost':
      if (agent) {
        const usage = agent.getState().contextUsage;
        tui.printInfo(`Tokens: ${usage.totalTokens} / ${usage.maxTokens} (${Math.round(usage.percentage * 100)}%)`);
      }
      return;
    
    case 'compact':
      tui.printInfo('Compacting conversation...');
      if (agent) agent.compact();
      return;
    
    case 'update':
      tui.disableRawMode();
      await checkAndUpdate();
      tui.enableRawMode();
      tui.render();
      return;

    default:
      tui.printError(`Unknown command: /${cmd}. Type /help for commands.`);
  }
}

async function selectModel(config: ProviderConfig): Promise<string> {
  process.stdout.write('\x1b[?25l');
  try {
    const models = await providerRegistry.listModels(config);
    
    if (models.length === 0) {
      tui.printWarning('No models discovered. Enter model ID manually.');
      const { modelId } = await inquirer.prompt([{
        type: 'input', name: 'modelId',
        message: 'Model ID:', default: config.model,
        validate: (input) => input.trim() ? true : 'Required',
      }]);
      return modelId.trim();
    }

    const choices = models.map(m => ({
      name: `${m.id}${m.name ? `  ${chalk.dim(`(${m.name})`)}` : ''}${m.id === config.model ? `  ${chalk.green('← current')}` : ''}`,
      value: m.id, short: m.id,
    }));
    choices.unshift({ name: chalk.italic('Custom model ID...'), value: '__custom__', short: 'Custom' });

    const { modelId } = await inquirer.prompt([{
      type: 'list', name: 'modelId', message: '',
      choices, pageSize: 15, loop: false,
    }]);

    if (modelId === '__custom__') {
      const { customModel } = await inquirer.prompt([{
        type: 'input', name: 'customModel',
        message: 'Model ID:', default: config.model,
        validate: (input) => input.trim() ? true : 'Required',
      }]);
      return customModel.trim();
    }
    return modelId;
  } catch (error) {
    if (error instanceof Error) tui.printError(error.message);
    const { modelId } = await inquirer.prompt([{
      type: 'input', name: 'modelId', message: 'Model ID:', default: config.model,
      validate: (input) => input.trim() ? true : 'Required',
    }]);
    return modelId.trim();
  } finally {
    process.stdout.write('\x1b[?25h');
  }
}

async function configureProviderInteractive(): Promise<void> {
  console.log();
  console.log(chalk.bold('  Configure Provider'));
  console.log();

  const existingConfig = configManager.getActiveProvider();
  
  const { baseUrl } = await inquirer.prompt([{
    type: 'input', name: 'baseUrl',
    message: 'Base URL:', default: existingConfig?.baseUrl || 'https://api.openai.com/v1',
    validate: (input) => { try { new URL(input); return true; } catch { return 'Invalid URL'; }},
  }]);

  const { apiKey } = await inquirer.prompt([{
    type: 'password', name: 'apiKey',
    message: 'API Key:', default: existingConfig?.apiKey ? '********' : undefined,
    validate: (input) => input.trim() ? true : 'API key required',
  }]);

  let finalApiKey = apiKey;
  if (apiKey === '********' && existingConfig?.apiKey) finalApiKey = existingConfig.apiKey;

  const tempConfig: ProviderConfig = { baseUrl, apiKey: finalApiKey, model: '' };
  const model = await selectModel(tempConfig);

  configManager.setProvider('default', { baseUrl, apiKey: finalApiKey, model });
  console.log(chalk.green('\n✔ Provider configured'));
}

async function checkAndUpdate(): Promise<void> {
  const currentVersion = getVersion();
  console.log(chalk.cyan(`Current: ${currentVersion}`));
  console.log(chalk.dim('Checking...'));
  
  try {
    const res = await fetch('https://registry.npmjs.org/arcline/latest', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) throw new Error('Failed');
    const { version: latest } = await res.json() as { version: string };
    
    if (latest === currentVersion) {
      console.log(chalk.green(`✔ Latest (${currentVersion})`));
      return;
    }
    
    console.log(chalk.yellow(`Update: ${currentVersion} → ${latest}`));
    console.log(chalk.dim('Installing...'));
    
    const { spawn } = await import('node:child_process');
    const child = spawn('npm', ['install', '-g', `arcline@${latest}`], { stdio: 'inherit', shell: true });
    
    child.on('close', (code) => {
      if (code === 0) console.log(chalk.green(`\n✔ Updated to ${latest}`));
      else console.log(chalk.red('\n✖ Failed. Try: npm install -g arcline@' + latest));
    });
  } catch (e) {
    console.log(chalk.red(`✖ ${e instanceof Error ? e.message : 'Check failed'}`));
  }
}

async function runNonInteractiveSession(config: ProviderConfig, prompt: string): Promise<void> {
  const projectRoot = findProjectRoot(process.cwd());
  const toolDefs = toolRegistry.getDefinitions();
  
  const agent = createAgent({
    config: { providerConfig: config, systemPrompt: 'You are a helpful AI coding assistant.', model: config.model, temperature: 0.2, maxTokens: 8000, maxToolCalls: 20, maxIterations: 10, enablePlanMode: true, autoApproveTools: [] },
    callbacks: {
      message: (msg) => { if (msg.role === 'assistant' && msg.content) console.log(msg.content); },
      tool_call: (tc) => console.log(chalk.cyan(`▸ ${tc.function.name}`)),
      tool_result: (r) => { if (r.isError) console.log(chalk.red(`Error: ${r.error}`)); else if (r.output) console.log(chalk.dim(JSON.stringify(r.output, null, 2))); },
      tool_progress: (n, p) => { if (p.stage === 'completed') console.log(chalk.green(`✔ ${n}`)); else if (p.stage === 'failed') console.log(chalk.red(`✖ ${n}: ${p.message}`)); },
      plan_update: (plan) => console.log(chalk.blue(`Plan: ${plan.title}`)),
      context_update: (usage) => { if (usage.percentage > 0.8) console.log(chalk.yellow(`Context: ${Math.round(usage.percentage * 100)}%`)); },
      error: (e) => console.log(chalk.red(`Error: ${e.message}`)), complete: (f) => console.log(f),
      permission_request: async () => 'allow_session' as const,
    },
    tools: toolDefs,
    toolContext: { workingDirectory: projectRoot, sessionId: `session-${Date.now()}`, permissions: permissionManager.getState() },
  });

  await agent.run(prompt);
  process.exit(0);
}

program
  .name('arcline')
  .description('A high-performance terminal AI agent')
  .version(getVersion())
  .option('-d, --debug', 'Enable debug mode')
  .option('-p, --prompt <prompt>', 'Run a single prompt (non-interactive)')
  .hook('preAction', (cmd) => { const opts = cmd.opts(); if (opts['debug']) { configManager.setDebugMode(true); tui.setDebugMode(true); } })
  .action(async (opts: { prompt?: string }) => {
    if (opts.prompt) {
      const config = await loadProviderConfig();
      if (!config) { console.log(chalk.red('✖ No provider configured. Run "arcline config" first.')); process.exit(1); }
      await runNonInteractiveSession(config, opts.prompt);
    } else {
      await runInteractiveSession();
    }
  });

program.command('config').description('Configure provider').action(async () => { await configureProviderInteractive(); process.exit(0); });
program.command('models').description('List models').action(async () => {
  const config = await loadProviderConfig();
  if (!config) { console.log(chalk.red('✖ Run "arcline config" first.')); process.exit(1); }
  try {
    const models = await providerRegistry.listModels(config);
    if (models.length === 0) console.log(chalk.cyan('ℹ No models found.'));
    else { console.log(chalk.bold('\n  Models:')); models.forEach(m => console.log(`  ${m.id}${m.name ? ` ${chalk.dim(`(${m.name})`)}` : ''}`)); }
  } catch (e) { if (e instanceof Error) console.log(chalk.red('✖ ' + e.message)); }
  process.exit(0);
});

program.command('update').description('Update to latest version').action(async () => { await checkAndUpdate(); process.exit(0); });

program.parseAsync(process.argv).catch(e => { if (e instanceof Error) console.log(chalk.red('✖ ' + e.message)); process.exit(1); });