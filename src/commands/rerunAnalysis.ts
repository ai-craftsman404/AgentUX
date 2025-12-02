import * as vscode from 'vscode';
import { analyzeScreenshot } from './analyzeScreenshot';
import { getAnalysisState } from '../utils/state';

export const rerunAnalysisCommand = async (
  context: vscode.ExtensionContext,
): Promise<void> => {
  const state = getAnalysisState();
  if (!state.lastScreenshotUri) {
    vscode.window.showWarningMessage(
      'No previous screenshot found. Please run Analyse Screenshot first.',
    );
    return;
  }

  // Reuse existing metadata; analyzeScreenshot will prompt for reuse.
  await analyzeScreenshot(context);
};

