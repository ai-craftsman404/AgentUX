import * as vscode from 'vscode';
import {
  analyzeScreenshot,
  configureContextCommand,
  exportResultsCommand,
  openPanelCommand,
  rerunAnalysisCommand,
  setApiKeyCommand,
} from './commands';
import { AgentUxLogger } from './utils/logger';

let logger: AgentUxLogger | null = null;

export function activate(context: vscode.ExtensionContext): void {
  // Use console.log as fallback if logger fails
  const log = (message: string) => {
    try {
      if (logger) {
        logger.info(message);
      } else {
        console.log(`[AgentUX] ${message}`);
      }
    } catch {
      console.log(`[AgentUX] ${message}`);
    }
  };

  const logError = (message: string) => {
    try {
      if (logger) {
        logger.error(message);
      } else {
        console.error(`[AgentUX ERROR] ${message}`);
      }
    } catch {
      console.error(`[AgentUX ERROR] ${message}`);
    }
  };

  try {
    logger = new AgentUxLogger();
    log('AgentUX extension activating...');

    // Register all commands - if any fail, log but continue
    const registerCommand = (
      commandId: string,
      callback: (...args: any[]) => any,
    ): void => {
      try {
        const disposable = vscode.commands.registerCommand(commandId, callback);
        context.subscriptions.push(disposable);
        log(`✓ Registered command: ${commandId}`);
        // Also show in output channel for visibility
        vscode.window.showInformationMessage(
          `AgentUX: Registered ${commandId}`,
        ).then(() => {}, () => {});
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logError(`✗ Failed to register ${commandId}: ${errorMsg}`);
        vscode.window.showErrorMessage(
          `AgentUX: Failed to register ${commandId}: ${errorMsg}`,
        );
      }
    };

    // Register analyzeScreenshot command
    registerCommand('agentux.analyzeScreenshot', (uri?: vscode.Uri) => {
      let fileUri: vscode.Uri | undefined = undefined;
      if (uri && typeof uri === 'object' && uri !== null) {
        if ('scheme' in uri && 'fsPath' in uri) {
          const scheme = (uri as any).scheme;
          if (scheme === 'file') {
            fileUri = uri;
          }
        }
      }
      return analyzeScreenshot(context, fileUri).catch((error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`AgentUX Analysis Error: ${errorMsg}`);
      });
    });

    // Register setApiKey command
    registerCommand('agentux.setApiKey', () => {
      return setApiKeyCommand(context).catch((error) => {
        const errorMsg = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`AgentUX Set API Key Error: ${errorMsg}`);
      });
    });

    // Register other commands
    registerCommand('agentux.configureContext', configureContextCommand);
    registerCommand('agentux.rerunLastAnalysis', () =>
      rerunAnalysisCommand(context),
    );
    registerCommand('agentux.exportResults', exportResultsCommand);
    registerCommand('agentux.openPanel', () => openPanelCommand(context));

    log('AgentUX extension activation completed successfully.');
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logError(`Extension activation failed: ${errorMsg}`);
    vscode.window.showErrorMessage(
      `AgentUX activation failed: ${errorMsg}. Check Output panel (AgentUX) for details.`,
    );
    // Try to show stack trace in debug console
    if (error instanceof Error && error.stack) {
      console.error('[AgentUX] Activation stack:', error.stack);
    }
  }
}

export function deactivate(): void {
  logger?.dispose();
  logger = null;
}

