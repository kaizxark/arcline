import chalk from 'chalk';
import figlet from 'figlet';

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isStreaming?: boolean;
}

export class TUI {
  private messages: Message[] = [];
  private inputBuffer = '';
  private cursorPosition = 0;
  private scrollOffset = 0;
  private isRunning = false;
  private debugMode = false;
  private terminalHeight = 0;
  private terminalWidth = 0;
  private messageAreaHeight = 0;
  private inputAreaHeight = 3;
  private headerHeight = 8;
  private providerInfo = '';
  private modelName = '';
  private baseUrl = '';
  private rawMode = false;

  constructor() {
    this.updateTerminalSize();
    process.stdout.on('resize', () => this.updateTerminalSize());
  }

  setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
  }

  setProviderInfo(provider: string, model: string, baseUrl: string): void {
    this.modelName = model;
    this.baseUrl = baseUrl.replace(/^https?:\/\//, '');
    this.providerInfo = `${provider} • ${model} • ${this.baseUrl}`;
  }

  private updateTerminalSize(): void {
    this.terminalHeight = process.stdout.rows || 24;
    this.terminalWidth = process.stdout.columns || 80;
    this.messageAreaHeight = this.terminalHeight - this.headerHeight - this.inputAreaHeight - 2;
    if (this.messageAreaHeight < 5) this.messageAreaHeight = 5;
  }

  private clearScreen(): void {
    process.stdout.write('\x1b[2J\x1b[H');
  }

  private moveCursor(row: number, col: number): void {
    process.stdout.write(`\x1b[${row};${col}H`);
  }

  private saveCursor(): void {
    process.stdout.write('\x1b[s');
  }

  private restoreCursor(): void {
    process.stdout.write('\x1b[u');
  }

  private hideCursor(): void {
    process.stdout.write('\x1b[?25l');
  }

  private showCursor(): void {
    process.stdout.write('\x1b[?25h');
  }

  private clearLine(): void {
    process.stdout.write('\x1b[2K');
  }

  private clearFromCursor(): void {
    process.stdout.write('\x1b[0J');
  }

  enableRawMode(): void {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      this.rawMode = true;
      this.hideCursor();
    }
  }

  disableRawMode(): void {
    if (this.rawMode && process.stdin.isTTY) {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      this.rawMode = false;
      this.showCursor();
    }
  }

  printIntro(): void {
    this.clearScreen();
    this.moveCursor(1, 1);
    const banner = figlet.textSync('ARCLINE', {
      font: 'Big',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: this.terminalWidth,
      whitespaceBreak: true,
    });
    console.log(chalk.cyan(banner));
    console.log(chalk.gray('  Your terminal AI agent'));
    console.log(chalk.gray('  ────────────────────────────────────────'));
    console.log();
  }

  render(): void {
    this.updateTerminalSize();
    this.clearScreen();
    this.moveCursor(1, 1);

    this.renderHeader();
    this.renderMessages();
    this.renderInputBar();
    this.updateInputCursor();
  }

  private renderHeader(): void {
    this.moveCursor(1, 1);
    const banner = figlet.textSync('ARCLINE', {
      font: 'Small',
      horizontalLayout: 'default',
      verticalLayout: 'default',
      width: this.terminalWidth,
      whitespaceBreak: true,
    });
    const lines = banner.split('\n');
    lines.forEach((line, i) => {
      this.moveCursor(i + 1, 1);
      this.clearLine();
      process.stdout.write(chalk.cyan(line));
    });

    const infoLine = lines.length + 1;
    this.moveCursor(infoLine, 1);
    this.clearLine();
    process.stdout.write(chalk.gray('  Your terminal AI agent'));

    const separatorLine = infoLine + 1;
    this.moveCursor(separatorLine, 1);
    this.clearLine();
    process.stdout.write(chalk.gray('  ' + '─'.repeat(this.terminalWidth - 4)));

    const providerLine = separatorLine + 1;
    this.moveCursor(providerLine, 1);
    this.clearLine();
    process.stdout.write(chalk.dim('  Provider: ') + chalk.white(this.providerInfo));

    const dividerLine = providerLine + 1;
    this.moveCursor(dividerLine, 1);
    this.clearLine();
    process.stdout.write(chalk.gray('  ' + '─'.repeat(this.terminalWidth - 4)));
  }

  private renderMessages(): void {
    const startRow = this.headerHeight + 1;
    const visibleMessages = this.getVisibleMessages();

    for (let i = 0; i < this.messageAreaHeight; i++) {
      const row = startRow + i;
      this.moveCursor(row, 1);
      this.clearLine();

      if (i < visibleMessages.length) {
        const msg = visibleMessages[i];
        if (msg) this.renderMessage(msg, row);
      }
    }
  }

  private getVisibleMessages(): Message[] {
    const allMessages = this.messages.filter(m => m.role !== 'system');
    const maxVisible = this.messageAreaHeight;
    const start = Math.max(0, allMessages.length - maxVisible - this.scrollOffset);
    const end = allMessages.length - this.scrollOffset;
    return allMessages.slice(start, end);
  }

  private renderMessage(msg: Message, row: number): void {
    this.moveCursor(row, 1);
    const prefix = msg.role === 'user' ? chalk.blue('▸ You') : chalk.green('▸ Arcline');
    const content = msg.content || (msg.isStreaming ? '' : '');

    if (msg.role === 'user') {
      process.stdout.write(prefix);
      if (content) {
        const lines = this.wrapText(content, this.terminalWidth - 8);
        if (lines.length === 1) {
          process.stdout.write(' ' + lines[0]);
        } else {
          process.stdout.write('\n');
          lines.forEach((line, idx) => {
            this.moveCursor(row + idx + 1, 1);
            this.clearLine();
            process.stdout.write(chalk.gray('  │ ') + line);
          });
        }
      }
    } else {
      process.stdout.write(prefix);
      if (content) {
        const lines = this.wrapText(content, this.terminalWidth - 8);
        if (lines.length === 1) {
          process.stdout.write(' ' + lines[0]);
        } else {
          process.stdout.write('\n');
          lines.forEach((line, idx) => {
            this.moveCursor(row + idx + 1, 1);
            this.clearLine();
            process.stdout.write(chalk.gray('  │ ') + line);
          });
        }
      }
      if (msg.isStreaming) {
        process.stdout.write(chalk.dim(' █'));
      }
    }
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      if ((currentLine + ' ' + word).length > maxWidth) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = currentLine ? currentLine + ' ' + word : word;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines.length > 0 ? lines : [''];
  }

  private renderInputBar(): void {
    const inputRow = this.terminalHeight - this.inputAreaHeight + 1;
    const prompt = chalk.green('▸ ') + chalk.reset('');

    this.moveCursor(inputRow, 1);
    this.clearLine();
    process.stdout.write(chalk.gray('─'.repeat(this.terminalWidth)));

    this.moveCursor(inputRow + 1, 1);
    this.clearLine();
    process.stdout.write(prompt + this.inputBuffer);

    this.moveCursor(inputRow + 2, 1);
    this.clearLine();
    const hints = chalk.dim('Enter: send  •  ↑/↓: scroll  •  /help: commands  •  Ctrl+C: exit');
    process.stdout.write(hints);
  }

  private updateInputCursor(): void {
    const inputRow = this.terminalHeight - this.inputAreaHeight + 2;
    const promptLength = 2;
    this.moveCursor(inputRow, promptLength + this.cursorPosition + 1);
    this.showCursor();
  }

  addMessage(message: Message): void {
    this.messages.push(message);
    this.scrollOffset = 0;
    this.render();
  }

  updateLastMessage(content: string, isStreaming = false): void {
    const lastIdx = this.messages.length - 1;
    const lastMsg = this.messages[lastIdx];
    if (lastIdx >= 0 && lastMsg && lastMsg.role === 'assistant') {
      lastMsg.content = content;
      lastMsg.isStreaming = isStreaming;
      this.render();
    }
  }

  setInputBuffer(buffer: string): void {
    this.inputBuffer = buffer;
    this.cursorPosition = buffer.length;
    this.renderInputBar();
    this.updateInputCursor();
  }

  getInputBuffer(): string {
    return this.inputBuffer;
  }

  clearInputBuffer(): void {
    this.inputBuffer = '';
    this.cursorPosition = 0;
  }

  moveCursorLeft(): void {
    if (this.cursorPosition > 0) {
      this.cursorPosition--;
      this.updateInputCursor();
    }
  }

  moveCursorRight(): void {
    if (this.cursorPosition < this.inputBuffer.length) {
      this.cursorPosition++;
      this.updateInputCursor();
    }
  }

  moveCursorHome(): void {
    this.cursorPosition = 0;
    this.updateInputCursor();
  }

  moveCursorEnd(): void {
    this.cursorPosition = this.inputBuffer.length;
    this.updateInputCursor();
  }

  deleteChar(): void {
    if (this.cursorPosition > 0) {
      this.inputBuffer = this.inputBuffer.slice(0, this.cursorPosition - 1) + this.inputBuffer.slice(this.cursorPosition);
      this.cursorPosition--;
      this.renderInputBar();
      this.updateInputCursor();
    }
  }

  deleteCharForward(): void {
    if (this.cursorPosition < this.inputBuffer.length) {
      this.inputBuffer = this.inputBuffer.slice(0, this.cursorPosition) + this.inputBuffer.slice(this.cursorPosition + 1);
      this.renderInputBar();
      this.updateInputCursor();
    }
  }

  insertChar(char: string): void {
    this.inputBuffer = this.inputBuffer.slice(0, this.cursorPosition) + char + this.inputBuffer.slice(this.cursorPosition);
    this.cursorPosition++;
    this.renderInputBar();
    this.updateInputCursor();
  }

  scrollUp(): void {
    const maxScroll = Math.max(0, this.messages.filter(m => m.role !== 'system').length - this.messageAreaHeight);
    if (this.scrollOffset < maxScroll) {
      this.scrollOffset++;
      this.renderMessages();
    }
  }

  scrollDown(): void {
    if (this.scrollOffset > 0) {
      this.scrollOffset--;
      this.renderMessages();
    }
  }

  scrollToBottom(): void {
    this.scrollOffset = 0;
    this.renderMessages();
  }

  printError(message: string): void {
    this.addMessage({ role: 'system', content: chalk.red('✖ ') + message });
  }

  printSuccess(message: string): void {
    this.addMessage({ role: 'system', content: chalk.green('✔ ') + message });
  }

  printInfo(message: string): void {
    this.addMessage({ role: 'system', content: chalk.cyan('ℹ ') + message });
  }

  printSessionHelp(): void {
    this.addMessage({ role: 'system', content: chalk.bold('Commands:') });
    this.addMessage({ role: 'system', content: chalk.dim('  /exit, /quit    ') + 'Exit session' });
    this.addMessage({ role: 'system', content: chalk.dim('  /clear          ') + 'Clear conversation' });
    this.addMessage({ role: 'system', content: chalk.dim('  /model          ') + 'Switch model' });
    this.addMessage({ role: 'system', content: chalk.dim('  /config         ') + 'Reconfigure provider' });
    this.addMessage({ role: 'system', content: chalk.dim('  /help           ') + 'Show this help' });
  }

  clearMessages(): void {
    this.messages = this.messages.filter(m => m.role === 'system');
    this.render();
  }

  getMessages(): Message[] {
    return [...this.messages];
  }

  getLastUserMessage(): string | null {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      if (msg && msg.role === 'user') return msg.content;
    }
    return null;
  }

  cleanup(): void {
    this.disableRawMode();
    this.moveCursor(this.terminalHeight, 1);
    this.clearLine();
    this.showCursor();
  }
}

export const tui = new TUI();