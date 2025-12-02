import * as vscode from 'vscode';
import { promptForApiKey, storeApiKey } from '../utils/apiKey';

export const setApiKeyCommand = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  const apiKey = await promptForApiKey();
  if (!apiKey) {
    return;
  }

  await storeApiKey(context, apiKey);
  vscode.window.showInformationMessage('OpenAI API key saved for AgentUX.');
};

