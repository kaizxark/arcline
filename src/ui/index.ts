import chalk from 'chalk';
import figlet from 'figlet';
import ora, { Ora } from 'ora';
import inquirer from 'inquirer';

export class UI {
  private spinner: Ora | null = null;
  private debugMode = false;
  private sessionActive = false;

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  printIntro(): void {
    console.clear();
    const banner = figlet.textSync('ARCLINE', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: 120,
      whitespaceBreak: true,
    });
    console.log(chalk.cyan(banner));
    console.log(chalk.gray('  Your terminal AI agent'));
    console.log(chalk.gray('  ────────────────────────────────────────'));
    console.log();
  }

  printProviderInfo(providerName: string, model: string, baseUrl: string): void {
    const urlDisplay = baseUrl.replace(/^https?:\/\//, '');
    console.log(
      chalk.dim('  Provider: ') + chalk.white(providerName) +
      chalk.dim('  •  Model: ') + chalk.cyan.bold(model) +
      chalk.dim('  •  ') + chalk.gray(urlDisplay)
    );
    console.log(chalk.gray('  ────────────────────────────────────────'));
    console.log();
  }

  printPrompt(): void {
    process.stdout.write(chalk.green('▸ ') + chalk.reset(''));
  }

  printUserMessage(content: string): void {
    const lines = content.split('\n');
    console.log(chalk.blue('│  You'));
    lines.forEach(line => {
      console.log(chalk.blue('│  ') + line);
    });
    console.log(chalk.blue('└'));
  }

  printAssistantPrefix(): void {
    process.stdout.write(chalk.green('│  Arcline') + '\n' + chalk.green('│  '));
  }

  printAssistantContent(content: string): void {
    process.stdout.write(content);
  }

  printAssistantComplete(): void {
    console.log();
    console.log(chalk.green('└'));
    console.log();
  }

  printNewline(): void {
    console.log();
  }

  startSpinner(text: string): void {
    this.spinner = ora({ text: chalk.cyan(text), color: 'cyan' }).start();
  }

  stopSpinner(success = true, text?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(text ? chalk.green(text) : undefined);
      } else {
        this.spinner.fail(text ? chalk.red(text) : undefined);
      }
      this.spinner = null;
    }
  }

  printError(message: string, details?: string): void {
    console.log();
    console.log(chalk.red('✖ ') + chalk.red(message));
    if (details && this.debugMode) {
      console.log(chalk.gray(details));
    }
    console.log();
  }

  printWarning(message: string): void {
    console.log(chalk.yellow('⚠ ') + chalk.yellow(message));
  }

  printSuccess(message: string): void {
    console.log(chalk.green('✔ ') + chalk.green(message));
  }

  printInfo(message: string): void {
    console.log(chalk.cyan('ℹ ') + chalk.cyan(message));
  }

  printDebug(message: string): void {
    if (this.debugMode) {
      console.log(chalk.gray('[debug] ') + chalk.gray(message));
    }
  }

  async selectModel(models: Array<{ id: string; name?: string }>, currentModel?: string): Promise<string> {
    if (models.length === 0) {
      console.log(chalk.yellow('  No models discovered from provider.'));
      console.log(chalk.dim('  You can enter a model ID manually.'));
      console.log();
      const { modelId } = await inquirer.prompt([{
        type: 'input',
        name: 'modelId',
        message: 'Model ID:',
        default: currentModel,
        validate: (input) => input.trim() ? true : 'Model ID is required',
      }]);
      return modelId.trim();
    }

    const choices = models.map(m => ({
      name: `${m.id}${m.name ? `  ${chalk.dim(`(${m.name})`)}` : ''}${m.id === currentModel ? `  ${chalk.green('← current')}` : ''}`,
      value: m.id,
      short: m.id,
    }));

    choices.unshift({
      name: chalk.italic('Enter custom model ID...'),
      value: '__custom__',
      short: 'Custom',
    });

    console.log(chalk.bold('  Select a model:'));
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
        default: currentModel,
        validate: (input) => input.trim() ? true : 'Model ID is required',
      }]);
      return customModel.trim();
    }

    return modelId;
  }

  printModelList(models: Array<{ id: string; name?: string }>, selected?: string): void {
    console.log(chalk.bold('  Available models:'));
    console.log();
    models.forEach((model) => {
      const isSelected = model.id === selected;
      const prefix = isSelected ? chalk.green('▸ ') : '  ';
      const name = model.name ? chalk.dim(` (${model.name})`) : '';
      console.log(`${prefix}${chalk.white(model.id)}${name}`);
    });
    console.log();
  }

  printSessionHelp(): void {
    console.log();
    console.log(chalk.bold('  Commands:'));
    console.log(chalk.dim('    /exit, /quit    ') + 'Exit session');
    console.log(chalk.dim('    /clear          ') + 'Clear conversation');
    console.log(chalk.dim('    /model          ') + 'Switch model');
    console.log(chalk.dim('    /help           ') + 'Show this help');
    console.log(chalk.dim('    /config         ') + 'Reconfigure provider');
    console.log();
  }

  printHelp(): void {
    console.log();
    console.log(chalk.bold('Usage:'));
    console.log('  arcline                    Start interactive session');
    console.log('  arcline config             Configure provider');
    console.log('  arcline models             List available models');
    console.log('  arcline --help             Show this help');
    console.log('  arcline --version          Show version');
    console.log('  arcline --debug            Enable debug mode');
    console.log();
    console.log(chalk.bold('Environment Variables:'));
    console.log('  ARCLINE_API_KEY            API key for provider');
    console.log('  ARCLINE_BASE_URL           Base URL for provider');
    console.log('  ARCLINE_MODEL              Default model to use');
    console.log('  ARCLINE_DEBUG              Enable debug mode');
    console.log();
  }

  printVersion(version: string): void {
    console.log(`arcline v${version}`);
  }

  printSeparator(): void {
    console.log(chalk.gray('─'.repeat(60)));
  }

  printThinking(): void {
    process.stdout.write(chalk.dim('  Arcline is thinking... '));
  }

  clearThinking(): void {
    process.stdout.write('\r' + ' '.repeat(30) + '\r');
  }
}

export const ui = new UI();