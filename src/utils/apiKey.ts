import * as vscode from 'vscode';
import { logger } from './logger';

const SECRET_KEY = 'agentux.openai.apiKey';

export const storeApiKey = async (
  context: vscode.ExtensionContext,
  apiKey: string,
): Promise<void> => {
  await context.secrets.store(SECRET_KEY, apiKey);
  logger.info('OpenAI API key stored securely.');
};

export const getApiKey = async (
  context: vscode.ExtensionContext,
): Promise<string | undefined> => {
  return context.secrets.get(SECRET_KEY);
};

export const promptForApiKey = async (): Promise<string | undefined> => {
  const apiKey = await vscode.window.showInputBox({
    prompt: 'Enter your OpenAI API key',
    placeHolder: 'sk-...',
    password: true,
    ignoreFocusOut: true,
  });

  if (!apiKey) {
    vscode.window.showWarningMessage('API key entry cancelled.');
    return undefined;
  }

  return apiKey.trim();
};

