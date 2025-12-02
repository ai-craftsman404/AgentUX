export const window = {
  createOutputChannel: () => ({
    appendLine: () => {},
    dispose: () => {},
  }),
  createWebviewPanel: () => ({
    webview: {
      asWebviewUri: (uri: any) => uri,
      html: '',
    },
    reveal: () => {},
    dispose: () => {},
    onDidDispose: () => ({ dispose: () => {} }),
  }),
  showInformationMessage: () => Promise.resolve(undefined),
  showWarningMessage: () => Promise.resolve(undefined),
  showOpenDialog: () => Promise.resolve(undefined),
  showQuickPick: () => Promise.resolve(undefined),
  showErrorMessage: () => Promise.resolve(undefined),
  withProgress: (options: any, callback: any) => callback(),
  activeTextEditor: undefined,
};

export const ProgressLocation = {
  Notification: 15,
};

export const workspace = {
  fs: {
    writeFile: async () => {},
  },
  workspaceFolders: undefined,
};

export const commands = {
  registerCommand: () => ({ dispose: () => {} }),
};

export const Uri = {
  file: (path: string) => ({ fsPath: path, path }),
  parse: (uri: string) => ({ fsPath: uri.replace('file://', ''), path: uri.replace('file://', '') }),
};

export const ViewColumn = {
  One: 1,
  Two: 2,
  Three: 3,
  Beside: -1,
  Active: -1,
};

