import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { analyzeScreenshot } from '../../src/commands/analyzeScreenshot';

// Mock VS Code API comprehensively
vi.mock('vscode', async (importOriginal) => {
  const actual = await importOriginal<typeof vscode>();
  return {
    ...actual,
    window: {
      ...actual.window,
      showOpenDialog: vi.fn(),
      showQuickPick: vi.fn(),
      showInformationMessage: vi.fn(),
      showWarningMessage: vi.fn(),
      showErrorMessage: vi.fn(),
      withProgress: vi.fn((options, callback) => callback()),
      activeTextEditor: undefined,
      createWebviewPanel: vi.fn(() => ({
        webview: {
          asWebviewUri: (uri: any) => uri,
          html: '',
        },
        reveal: () => {},
        dispose: () => {},
        onDidDispose: () => ({ dispose: () => {} }),
      })),
    },
    workspace: {
      ...actual.workspace,
      workspaceFolders: undefined,
    },
    ViewColumn: actual.ViewColumn,
  };
});

describe('analyzeScreenshot - Integration Tests', () => {
  const mockContext = {
    secrets: {
      get: vi.fn(),
      store: vi.fn(),
    },
    extensionUri: vscode.Uri.parse('file:///test'),
  } as unknown as vscode.ExtensionContext;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should handle undefined fileUri gracefully', async () => {
    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);

    await analyzeScreenshot(mockContext, undefined);

    expect(vscode.window.showOpenDialog).toHaveBeenCalled();
    // Should not throw fsPath error
  });

  it('should handle fileUri without fsPath property', async () => {
    const mockUri = {
      scheme: 'file',
      // fsPath is missing
    } as any;

    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);

    await analyzeScreenshot(mockContext, mockUri);

    // Should fall back to file picker, not crash
    expect(vscode.window.showOpenDialog).toHaveBeenCalled();
  });

  it('should handle fileUri with null fsPath', async () => {
    const mockUri = {
      scheme: 'file',
      fsPath: null,
    } as any;

    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);

    await analyzeScreenshot(mockContext, mockUri);

    // Should fall back to file picker, not crash
    expect(vscode.window.showOpenDialog).toHaveBeenCalled();
  });

  it('should handle fileUri with undefined fsPath', async () => {
    const mockUri = {
      scheme: 'file',
      fsPath: undefined,
    } as any;

    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);

    await analyzeScreenshot(mockContext, mockUri);

    // Should fall back to file picker, not crash
    expect(vscode.window.showOpenDialog).toHaveBeenCalled();
  });

  it('should handle non-file URI scheme', async () => {
    const mockUri = {
      scheme: 'https',
      fsPath: '/some/path',
    } as any;

    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);

    await analyzeScreenshot(mockContext, mockUri);

    // Should fall back to file picker for non-file URIs
    expect(vscode.window.showOpenDialog).toHaveBeenCalled();
  });

  it('should handle valid fileUri correctly', async () => {
    const mockUri = {
      scheme: 'file',
      fsPath: '/test/image.png',
    } as any;

    (vscode.window.showQuickPick as any).mockResolvedValue('Provide new context');
    (vscode.window.showInformationMessage as any).mockResolvedValue('Run Mock Analysis');

    vi.mock('../../src/utils/qna', () => ({
      promptForMetadata: vi.fn().mockResolvedValue({
        platform: 'Desktop Web',
        uiType: 'Dashboard',
        audience: 'General Public',
      }),
    }));

    vi.mock('../../src/utils/apiKey', () => ({
      getApiKey: vi.fn().mockResolvedValue(undefined),
    }));

    await analyzeScreenshot(mockContext, mockUri);

    // Should not call showOpenDialog when valid URI provided
    expect(vscode.window.showOpenDialog).not.toHaveBeenCalled();
  });

  it('should handle fileUri that is null', async () => {
    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);

    await analyzeScreenshot(mockContext, null as any);

    // Should fall back to file picker
    expect(vscode.window.showOpenDialog).toHaveBeenCalled();
  });

  it('should handle fileUri that is not an object', async () => {
    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);

    await analyzeScreenshot(mockContext, 'not-an-object' as any);

    // Should fall back to file picker
    expect(vscode.window.showOpenDialog).toHaveBeenCalled();
  });
});

