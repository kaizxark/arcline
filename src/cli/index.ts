#!/usr/bin/env node
import { program } from 'commander';
import { configManager } from '../config/index.js';
import { providerRegistry } from '../providers/index.js';
import { createSession } from '../session/index.js';
import { tui, TUI } from '../ui/tui.js';
import type { ProviderConfig, Message } from '../core/types.js';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import inquirer from 'inquirer';
import chalk from 'chalk';

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

async function runInteractiveSession(config: ProviderConfig): Promise<void> {
  const model = await selectModel(config);
  config.model = model;
  configManager.setProvider(configManager.getConfig().activeProvider || 'default', config);

  tui.setProviderInfo('OpenAI Compatible', model, config.baseUrl);
  tui.printIntro();

  const session = createSession({
    provider: config,
    systemPrompt: 'You are a helpful AI assistant.',
    temperature: 0.7,
  });

  tui.enableRawMode();
  tui.render();

  let shouldExit = false;
  
  process.stdin.on('data', async (key) => {
    if (shouldExit) return;
    const result = await handleKeypress(key, tui, session, config);
    if (result.shouldExit) {
      shouldExit = true;
      tui.cleanup();
      process.exit(0);
    }
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
  .hook('preAction', (thisCommand) => {
    const opts = thisCommand.opts();
    if (opts['debug']) {
      configManager.setDebugMode(true);
      tui.setDebugMode(true);
    }
  })
  .action(async () => {
    const config = await loadProviderConfig();
    if (!config) {
      console.log(chalk.red('✖ ') + 'No provider configured. Run "arcline config" first.');
      process.exit(1);
    }
    await runInteractiveSession(config);
  });

program
  .command('config')
  .description('Configure AI provider')
  .action(configureProvider);

program
  .command('models')
  .description('List available models')
  .action(listModels);

program.parseAsync(process.argv).catch((error) => {
  if (error instanceof Error) {
    console.log(chalk.red('✖ ') + error.message);
  }
  process.exit(1);
});