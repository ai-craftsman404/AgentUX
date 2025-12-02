import type * as VSCode from 'vscode';

let vscodeModule: typeof VSCode | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  vscodeModule = require('vscode');
} catch {
  vscodeModule = undefined;
}

export class AgentUxLogger {
  private readonly channel: VSCode.OutputChannel | undefined;

  constructor(channel?: VSCode.OutputChannel) {
    this.channel =
      channel ?? vscodeModule?.window.createOutputChannel('AgentUX');
  }

  info(message: string): void {
    if (this.channel) {
      this.channel.appendLine(`[info] ${message}`);
    } else {
      console.log(`[AgentUX][info] ${message}`);
    }
  }

  warn(message: string): void {
    if (this.channel) {
      this.channel.appendLine(`[warn] ${message}`);
    } else {
      console.warn(`[AgentUX][warn] ${message}`);
    }
  }

  error(message: string, error?: unknown): void {
    const suffix = error instanceof Error ? ` :: ${error.message}` : '';
    if (this.channel) {
      this.channel.appendLine(`[error] ${message}${suffix}`);
      if (error instanceof Error && error.stack) {
        this.channel.appendLine(error.stack);
      }
    } else {
      console.error(`[AgentUX][error] ${message}${suffix}`);
      if (error instanceof Error && error.stack) {
        console.error(error.stack);
      }
    }
  }

  dispose(): void {
    this.channel?.dispose();
  }
}

export const logger = new AgentUxLogger();

