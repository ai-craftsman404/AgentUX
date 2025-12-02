import * as vscode from 'vscode';
import * as path from 'path';
import { getAnalysisState } from '../utils/state';
import { getWebviewHtml } from './template';

let panel: vscode.WebviewPanel | undefined;

const getLocalResourceRoots = (
  context: vscode.ExtensionContext,
): vscode.Uri[] => {
  const workspaceRoots =
    vscode.workspace.workspaceFolders?.map((folder) => folder.uri) ?? [];
  return [context.extensionUri, context.globalStorageUri, ...workspaceRoots];
};

export const renderAnalysisPanel = (context: vscode.ExtensionContext): void => {
  const state = getAnalysisState();
  const baseRoots = getLocalResourceRoots(context);
  const screenshotDir =
    state.lastScreenshotUri != null
      ? vscode.Uri.file(path.dirname(state.lastScreenshotUri))
      : undefined;
  const localResourceRoots = screenshotDir
    ? [...baseRoots, screenshotDir]
    : baseRoots;

  if (!panel) {
    panel = vscode.window.createWebviewPanel(
      'agentux.analysis',
      'AgentUX Analysis',
      vscode.ViewColumn.Beside,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots,
      },
    );

    panel.onDidDispose(() => {
      panel = undefined;
    });
  } else {
    panel.webview.options = {
      ...panel.webview.options,
      localResourceRoots,
    };
  }

  panel.webview.html = getWebviewHtml(
    panel.webview,
    context.extensionUri,
    state,
  );
};


