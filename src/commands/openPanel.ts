import { ExtensionContext, window } from 'vscode';
import { getAnalysisState } from '../utils/state';
import { renderAnalysisPanel } from '../webview/panel';

export const openPanelCommand = (context: ExtensionContext): void => {
  const state = getAnalysisState();
  if (!state.metadata) {
    window.showWarningMessage(
      'No analysis yet. Run "UX Audit: Analyse Screenshot" first.',
    );
    return;
  }

  renderAnalysisPanel(context);
};

