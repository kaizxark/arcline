import chalk from 'chalk';
import ora, { Ora } from 'ora';

export class UI {
  private spinner: Ora | null = null;
  private debugMode = false;

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  printHeader(): void {
    console.log(chalk.cyan('╭──────────────────────────────╮'));
    console.log(chalk.cyan('│') + chalk.bold('        ARCLINE        ') + chalk.cyan('│'));
    console.log(chalk.cyan('│') + chalk.gray('   Your terminal AI agent  ') + chalk.cyan('│'));
    console.log(chalk.cyan('╰──────────────────────────────╯'));
    console.log();
  }

  printProviderInfo(providerName: string, model: string, baseUrl: string): void {
    console.log(chalk.gray('Model:'), chalk.white(model));
    console.log(chalk.gray('Provider:'), chalk.white(`${providerName} (${baseUrl})`));
    console.log();
  }

  printPrompt(): void {
    process.stdout.write(chalk.green('> ') + chalk.reset(''));
  }

  printUserMessage(content: string): void {
    console.log(chalk.blue('▸') + ' ' + content);
  }

  printAssistantPrefix(): void {
    process.stdout.write(chalk.green('▸ ') + chalk.reset(''));
  }

  printAssistantContent(content: string): void {
    process.stdout.write(content);
  }

  printNewline(): void {
    console.log();
  }

  startSpinner(text: string): void {
    this.spinner = ora({ text, color: 'cyan' }).start();
  }

  stopSpinner(success = true, text?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(text);
      } else {
        this.spinner.fail(text);
      }
      this.spinner = null;
    }
  }

  printError(message: string, details?: string): void {
    console.log(chalk.red('✖ ') + chalk.red(message));
    if (details && this.debugMode) {
      console.log(chalk.gray(details));
    }
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

  printModelList(models: Array<{ id: string; name?: string }>, selected?: string): void {
    console.log(chalk.bold('Available models:'));
    console.log();
    models.forEach((model, index) => {
      const isSelected = model.id === selected;
      const prefix = isSelected ? chalk.green('❯ ') : '  ';
      const name = model.name ? chalk.gray(` (${model.name})`) : '';
      console.log(`${prefix}${chalk.white(model.id)}${name}`);
    });
    console.log();
  }

  printHelp(): void {
    console.log(chalk.bold('Usage:'));
    console.log('  arcline                    Start interactive session');
    console.log('  arcline config             Configure provider');
    console.log('  arcline models             List available models');
    console.log('  arcline --help             Show this help');
    console.log('  arcline --version          Show version');
    console.log();
    console.log(chalk.bold('Commands:'));
    console.log('  /exit, /quit               Exit the session');
    console.log('  /clear                     Clear conversation history');
    console.log('  /model <name>              Switch model');
    console.log('  /help                      Show session help');
    console.log();
    console.log(chalk.bold('Environment Variables:'));
    console.log('  ARCLINE_API_KEY            API key for provider');
    console.log('  ARCLINE_BASE_URL           Base URL for provider');
    console.log('  ARCLINE_MODEL              Default model to use');
    console.log('  ARCLINE_DEBUG              Enable debug mode');
  }

  printVersion(version: string): void {
    console.log(`arcline v${version}`);
  }

  printSeparator(): void {
    console.log(chalk.gray('─'.repeat(50)));
  }
}

export const ui = new UI();