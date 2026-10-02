#!/usr/bin/env node
import { program } from 'commander';
import { configManager } from '../config/index.js';
import { providerRegistry } from '../providers/index.js';
import { createSession } from '../session/index.js';
import { ui } from '../ui/index.js';
import type { ProviderConfig } from '../core/types.js';
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
  ui.startSpinner('Fetching models...');
  try {
    const models = await providerRegistry.listModels(config);
    ui.stopSpinner(true);

    if (models.length === 0) {
      ui.printWarning('No models discovered. You can enter a model ID manually.');
      const { modelId } = await inquirer.prompt([{
        type: 'input',
        name: 'modelId',
        message: 'Enter model ID:',
        validate: (input) => input.trim() ? true : 'Model ID is required',
      }]);
      return modelId.trim();
    }

    ui.printModelList(models, config.model);

    const { modelId } = await inquirer.prompt([{
      type: 'list',
      name: 'modelId',
      message: 'Select a model:',
      choices: models.map(m => ({ name: m.id + (m.name ? ` (${m.name})` : ''), value: m.id })),
      default: config.model,
    }]);

    return modelId;
  } catch (error) {
    ui.stopSpinner(false, 'Failed to fetch models');
    if (error instanceof Error) {
      ui.printError(error.message);
    }
    const { modelId } = await inquirer.prompt([{
      type: 'input',
      name: 'modelId',
      message: 'Enter model ID manually:',
      validate: (input) => input.trim() ? true : 'Model ID is required',
    }]);
    return modelId.trim();
  }
}

async function runInteractiveSession(config: ProviderConfig): Promise<void> {
  const model = await selectModel(config);
  config.model = model;
  configManager.setProvider(configManager.getConfig().activeProvider || 'default', config);

  ui.printHeader();
  ui.printProviderInfo('OpenAI Compatible', model, config.baseUrl);

  const session = createSession({
    provider: config,
    systemPrompt: 'You are a helpful AI assistant.',
    temperature: 0.7,
  });

  ui.printPrompt();

  const readline = await import('node:readline/promises');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  try {
    for await (const line of rl) {
      const input = line.trim();
      
      if (!input) {
        ui.printPrompt();
        continue;
      }

      if (input === '/exit' || input === '/quit') {
        break;
      }

      if (input === '/clear') {
        session.clear();
        ui.printSuccess('Conversation cleared');
        ui.printPrompt();
        continue;
      }

      if (input === '/help') {
        console.log();
        console.log(chalk.bold('Session Commands:'));
        console.log('  /exit, /quit     Exit the session');
        console.log('  /clear           Clear conversation history');
        console.log('  /model <name>    Switch model');
        console.log('  /help            Show this help');
        console.log();
        ui.printPrompt();
        continue;
      }

      if (input.startsWith('/model ')) {
        const newModel = input.slice(7).trim();
        if (newModel) {
          config.model = newModel;
          configManager.setProvider(configManager.getConfig().activeProvider || 'default', config);
          session.updateConfig({ provider: config });
          ui.printSuccess(`Switched to model: ${newModel}`);
        }
        ui.printPrompt();
        continue;
      }

      ui.printNewline();
      ui.printAssistantPrefix();

      try {
        for await (const chunk of await session.sendMessage(input, { stream: true })) {
          ui.printAssistantContent(chunk);
        }
        ui.printNewline();
      } catch (error) {
        ui.printNewline();
        if (error instanceof Error) {
          ui.printError(error.message);
        }
      }

      ui.printPrompt();
    }
  } catch (error) {
    if (error instanceof Error) {
      ui.printError(error.message);
    }
  } finally {
    rl.close();
    ui.printNewline();
    ui.printInfo('Goodbye!');
  }
}

async function configureProvider(): Promise<void> {
  console.log(chalk.bold('Configure Provider'));
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

  ui.printSuccess('Provider configured successfully');
}

async function listModels(): Promise<void> {
  const config = await loadProviderConfig();
  if (!config) {
    ui.printError('No provider configured. Run "arcline config" first.');
    process.exit(1);
  }

  ui.startSpinner('Fetching models...');
  try {
    const models = await providerRegistry.listModels(config);
    ui.stopSpinner(true);
    
    if (models.length === 0) {
      ui.printInfo('No models found. The provider may not support model discovery.');
      return;
    }

    ui.printModelList(models, config.model);
  } catch (error) {
    ui.stopSpinner(false, 'Failed to fetch models');
    if (error instanceof Error) {
      ui.printError(error.message);
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
      ui.setDebugMode(true);
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

program
  .command('session')
  .description('Start interactive session (default)')
  .action(async () => {
    const config = await loadProviderConfig();
    if (!config) {
      ui.printError('No provider configured. Run "arcline config" first.');
      process.exit(1);
    }
    await runInteractiveSession(config);
  });

program.parseAsync(process.argv).catch((error) => {
  if (error instanceof Error) {
    ui.printError(error.message);
  }
  process.exit(1);
});

if (!process.argv.slice(2).length) {
  const config = await loadProviderConfig();
  if (!config) {
    ui.printError('No provider configured. Run "arcline config" first.');
    process.exit(1);
  }
  await runInteractiveSession(config);
}