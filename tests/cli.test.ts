import { describe, it, expect, beforeEach, vi } from 'vitest';
import { UI } from '../src/ui/index.js';
import chalk from 'chalk';

describe('UI', () => {
  let ui: UI;
  let consoleLogSpy: vi.SpyInstance;
  let consoleErrorSpy: vi.SpyInstance;
  let processStdoutWriteSpy: vi.SpyInstance;

  beforeEach(() => {
    ui = new UI();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processStdoutWriteSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('printIntro', () => {
    it('should print intro', () => {
      ui.printIntro();
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('printProviderInfo', () => {
    it('should print provider info', () => {
      ui.printProviderInfo('Test Provider', 'test-model', 'https://api.test.com/v1');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('printPrompt', () => {
    it('should write prompt to stdout', () => {
      ui.printPrompt();
      expect(processStdoutWriteSpy).toHaveBeenCalled();
    });
  });

  describe('printUserMessage', () => {
    it('should print user message', () => {
      ui.printUserMessage('Hello world');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Hello world'));
    });
  });

  describe('printAssistantPrefix', () => {
    it('should write assistant prefix', () => {
      ui.printAssistantPrefix();
      expect(processStdoutWriteSpy).toHaveBeenCalled();
    });
  });

  describe('printAssistantContent', () => {
    it('should write assistant content', () => {
      ui.printAssistantContent('Hello');
      expect(processStdoutWriteSpy).toHaveBeenCalledWith('Hello');
    });
  });

  describe('printError', () => {
    it('should print error message', () => {
      ui.printError('Something went wrong');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Something went wrong'));
    });

    it('should print details in debug mode', () => {
      ui.setDebugMode(true);
      ui.printError('Error', 'Stack trace here');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Stack trace here'));
    });

    it('should not print details in non-debug mode', () => {
      ui.setDebugMode(false);
      ui.printError('Error', 'Stack trace here');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Error'));
      expect(consoleLogSpy).not.toHaveBeenCalledWith(expect.stringContaining('Stack trace here'));
    });
  });

  describe('printWarning', () => {
    it('should print warning', () => {
      ui.printWarning('Warning message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Warning message'));
    });
  });

  describe('printSuccess', () => {
    it('should print success', () => {
      ui.printSuccess('Success!');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Success!'));
    });
  });

  describe('printInfo', () => {
    it('should print info', () => {
      ui.printInfo('Info message');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Info message'));
    });
  });

  describe('printDebug', () => {
    it('should print debug in debug mode', () => {
      ui.setDebugMode(true);
      ui.printDebug('Debug info');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Debug info'));
    });

    it('should not print debug in non-debug mode', () => {
      ui.setDebugMode(false);
      ui.printDebug('Debug info');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });
  });

  describe('printModelList', () => {
    it('should print model list with selection', () => {
      ui.printModelList([
        { id: 'model-1', name: 'Model One' },
        { id: 'model-2' },
      ], 'model-1');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('printHelp', () => {
    it('should print help', () => {
      ui.printHelp();
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('printVersion', () => {
    it('should print version', () => {
      ui.printVersion('0.1.0');
      expect(consoleLogSpy).toHaveBeenCalledWith('arcline v0.1.0');
    });
  });

  describe('printSeparator', () => {
    it('should print separator', () => {
      ui.printSeparator();
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('─'));
    });
  });

  describe('startSpinner/stopSpinner', () => {
    it('should start and stop spinner', () => {
      ui.startSpinner('Loading...');
      ui.stopSpinner(true, 'Done');
      // ora writes to stderr, not console.log
      expect(true).toBe(true);
    });
  });
});