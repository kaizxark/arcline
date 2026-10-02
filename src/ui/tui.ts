import chalk from 'chalk';
import figlet from 'figlet';

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  isStreaming?: boolean;
  toolCallId?: string;
}

export interface AutocompleteOption {
  label: string;
  value: string;
  type: 'command' | 'file' | 'model';
  description?: string;
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
  private autocompleteActive = false;
  private autocompleteOptions: AutocompleteOption[] = [];
  private autocompleteSelected = 0;
  private autocompletePrefix = '';
  private inputHistory: string[] = [];
  private historyIndex = -1;

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
    this.addMessage({ role: 'system', content: chalk.dim('  /plan           ') + 'Create a plan for a complex task' });
    this.addMessage({ role: 'system', content: chalk.dim('  /permissions    ') + 'Manage tool permissions' });
    this.addMessage({ role: 'system', content: chalk.dim('  /cost           ') + 'Show usage and cost' });
    this.addMessage({ role: 'system', content: chalk.dim('  /compact        ') + 'Compact conversation history' });
    this.addMessage({ role: 'system', content: chalk.dim('  /resume         ') + 'Resume previous session' });
    this.addMessage({ role: 'system', content: chalk.dim('  /init           ') + 'Initialize project instructions' });
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

  addToHistory(input: string): void {
    if (input.trim() && (this.inputHistory.length === 0 || this.inputHistory[this.inputHistory.length - 1] !== input)) {
      this.inputHistory.push(input);
      if (this.inputHistory.length > 100) this.inputHistory.shift();
    }
    this.historyIndex = this.inputHistory.length;
  }

  navigateHistory(direction: 'up' | 'down'): void {
    if (this.inputHistory.length === 0) return;
    
    if (direction === 'up') {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        const historyItem = this.inputHistory[this.historyIndex];
        if (historyItem !== undefined) {
          this.inputBuffer = historyItem;
          this.cursorPosition = this.inputBuffer.length;
          this.renderInputBar();
          this.updateInputCursor();
        }
      }
    } else {
      if (this.historyIndex < this.inputHistory.length - 1) {
        this.historyIndex++;
        const historyItem = this.inputHistory[this.historyIndex];
        if (historyItem !== undefined) {
          this.inputBuffer = historyItem;
          this.cursorPosition = this.inputBuffer.length;
          this.renderInputBar();
          this.updateInputCursor();
        }
      } else {
        this.historyIndex = this.inputHistory.length;
        this.inputBuffer = '';
        this.cursorPosition = 0;
        this.renderInputBar();
        this.updateInputCursor();
      }
    }
  }

  showAutocomplete(options: AutocompleteOption[], prefix: string): void {
    this.autocompleteOptions = options;
    this.autocompleteSelected = 0;
    this.autocompletePrefix = prefix;
    this.autocompleteActive = true;
    this.renderAutocomplete();
  }

  hideAutocomplete(): void {
    if (this.autocompleteActive) {
      this.autocompleteActive = false;
      this.autocompleteOptions = [];
      this.autocompleteSelected = 0;
      this.autocompletePrefix = '';
      this.renderInputBar();
    }
  }

  selectAutocompleteNext(): void {
    if (!this.autocompleteActive || this.autocompleteOptions.length === 0) return;
    this.autocompleteSelected = (this.autocompleteSelected + 1) % this.autocompleteOptions.length;
    this.renderAutocomplete();
  }

  selectAutocompletePrev(): void {
    if (!this.autocompleteActive || this.autocompleteOptions.length === 0) return;
    this.autocompleteSelected = (this.autocompleteSelected - 1 + this.autocompleteOptions.length) % this.autocompleteOptions.length;
    this.renderAutocomplete();
  }

  acceptAutocomplete(): void {
    if (!this.autocompleteActive || this.autocompleteOptions.length === 0) return;
    const option = this.autocompleteOptions[this.autocompleteSelected];
    if (!option) return;
    const beforeCursor = this.inputBuffer.slice(0, this.cursorPosition - this.autocompletePrefix.length);
    this.inputBuffer = beforeCursor + option.value;
    this.cursorPosition = this.inputBuffer.length;
    this.hideAutocomplete();
    this.renderInputBar();
    this.updateInputCursor();
  }

  private renderAutocomplete(): void {
    if (!this.autocompleteActive || this.autocompleteOptions.length === 0) return;
    
    const inputRow = this.terminalHeight - this.inputAreaHeight + 1;
    const startRow = Math.max(1, inputRow - this.autocompleteOptions.length - 2);
    
    for (let i = 0; i < this.autocompleteOptions.length; i++) {
      const row = startRow + i;
      this.moveCursor(row, 1);
      this.clearLine();
      
      const option = this.autocompleteOptions[i];
      if (!option) continue;
      const isSelected = i === this.autocompleteSelected;
      const prefix = isSelected ? chalk.green('▸ ') : '  ';
      const typeColor = option.type === 'command' ? chalk.cyan : option.type === 'file' ? chalk.green : chalk.yellow;
      
      process.stdout.write(prefix + typeColor(option.label));
      if (option.description) {
        process.stdout.write(chalk.dim(`  ${option.description}`));
      }
    }
    
    this.moveCursor(startRow + this.autocompleteOptions.length, 1);
    this.clearLine();
  }

  getAutocompleteMatches(query: string, commands: string[], files: string[], models: string[]): AutocompleteOption[] {
    const options: AutocompleteOption[] = [];
    const lowerQuery = query.toLowerCase();
    
    if (query.startsWith('/')) {
      for (const cmd of commands) {
        if (cmd.toLowerCase().startsWith(lowerQuery)) {
          options.push({ label: cmd, value: cmd, type: 'command' });
        }
      }
    } else if (query.startsWith('@')) {
      for (const file of files) {
        if (file.toLowerCase().includes(lowerQuery.slice(1).toLowerCase())) {
          options.push({ label: file, value: `@${file}`, type: 'file' });
        }
      }
    } else {
      for (const model of models) {
        if (model.toLowerCase().includes(lowerQuery)) {
          options.push({ label: model, value: model, type: 'model' });
        }
      }
    }
    
    return options.slice(0, 10);
  }

  cleanup(): void {
    this.disableRawMode();
    this.moveCursor(this.terminalHeight, 1);
    this.clearLine();
    this.showCursor();
  }
}

export const tui = new TUI();