import * as vscode from 'vscode';
import { promptForMetadata } from '../utils/qna';
import { setMetadata } from '../utils/state';

export const configureContextCommand = async (): Promise<void> => {
  const metadata = await promptForMetadata();
  if (!metadata) {
    vscode.window.showWarningMessage(
      'Context configuration cancelled. Defaults will be used.',
    );
    return;
  }

  setMetadata(metadata);
  vscode.window.showInformationMessage(
    `Context saved (${metadata.platform} · ${metadata.uiType} · ${metadata.audience}).`,
  );
};

