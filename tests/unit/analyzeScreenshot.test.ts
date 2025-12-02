import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { analyzeScreenshot } from '../../src/commands/analyzeScreenshot';

// Mock VS Code API - use importOriginal to get Uri
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
    },
    workspace: {
      ...actual.workspace,
      workspaceFolders: undefined,
    },
    ViewColumn: actual.ViewColumn,
  };
});

describe('analyzeScreenshot', () => {
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

  it('should handle undefined screenshot gracefully', async () => {
    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);

    await analyzeScreenshot(mockContext);

    expect(vscode.window.showOpenDialog).toHaveBeenCalled();
    // Should return early without errors
  });

  it('should handle screenshot without fsPath', async () => {
    const mockUri = {
      fsPath: undefined,
    } as vscode.Uri;

    (vscode.window.showOpenDialog as any).mockResolvedValue([mockUri]);

    await analyzeScreenshot(mockContext);

    expect(vscode.window.showErrorMessage).toHaveBeenCalledWith(
      'Invalid file selection. Please select a local image file.',
    );
  });

  it('should capture screenshotPath early and use it consistently', async () => {
    const mockUri = {
      fsPath: '/test/image.png',
    } as vscode.Uri;

    (vscode.window.showOpenDialog as any).mockResolvedValue([mockUri]);
    (vscode.window.showQuickPick as any).mockResolvedValue('Provide new context');
    (vscode.window.showInformationMessage as any).mockResolvedValue('Run Mock Analysis');

    // Mock the metadata prompt
    vi.mock('../../src/utils/qna', () => ({
      promptForMetadata: vi.fn().mockResolvedValue({
        platform: 'Desktop Web',
        uiType: 'Dashboard',
        audience: 'General Public',
      }),
    }));

    // Mock API key
    vi.mock('../../src/utils/apiKey', () => ({
      getApiKey: vi.fn().mockResolvedValue(undefined),
    }));

    await analyzeScreenshot(mockContext);

    // Verify fsPath was accessed safely
    expect(mockUri.fsPath).toBe('/test/image.png');
  });

  it('should use provided fileUri from context menu', async () => {
    const mockUri = {
      scheme: 'file',
      fsPath: '/test/context-menu-image.png',
    } as vscode.Uri;

    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);
    (vscode.window.showQuickPick as any).mockResolvedValue('Provide new context');
    (vscode.window.showInformationMessage as any).mockResolvedValue('Run Mock Analysis');

    // Mock the metadata prompt
    vi.mock('../../src/utils/qna', () => ({
      promptForMetadata: vi.fn().mockResolvedValue({
        platform: 'Desktop Web',
        uiType: 'Dashboard',
        audience: 'General Public',
      }),
    }));

    // Mock API key
    vi.mock('../../src/utils/apiKey', () => ({
      getApiKey: vi.fn().mockResolvedValue(undefined),
    }));

    await analyzeScreenshot(mockContext, mockUri);

    // Should not call showOpenDialog when valid URI is provided
    expect(vscode.window.showOpenDialog).not.toHaveBeenCalled();
    expect(mockUri.fsPath).toBe('/test/context-menu-image.png');
  });

  it('should use active image editor if available', async () => {
    const mockUri = {
      scheme: 'file',
      fsPath: '/test/active-editor-image.png',
    } as vscode.Uri;

    const mockEditor = {
      document: {
        uri: mockUri,
      },
    } as vscode.TextEditor;

    (vscode.window as any).activeTextEditor = mockEditor;
    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);
    (vscode.window.showQuickPick as any).mockResolvedValue('Provide new context');
    (vscode.window.showInformationMessage as any).mockResolvedValue('Run Mock Analysis');

    // Mock the metadata prompt
    vi.mock('../../src/utils/qna', () => ({
      promptForMetadata: vi.fn().mockResolvedValue({
        platform: 'Desktop Web',
        uiType: 'Dashboard',
        audience: 'General Public',
      }),
    }));

    // Mock API key
    vi.mock('../../src/utils/apiKey', () => ({
      getApiKey: vi.fn().mockResolvedValue(undefined),
    }));

    await analyzeScreenshot(mockContext);

    // Should not call showOpenDialog when active editor has valid image
    expect(vscode.window.showOpenDialog).not.toHaveBeenCalled();
  });

  it('should default file picker to workspace root', async () => {
    const mockWorkspaceFolder = {
      uri: vscode.Uri.parse('file:///workspace'),
    };

    // Ensure no active editor and no provided URI
    (vscode.window as any).activeTextEditor = undefined;
    (vscode.workspace as any).workspaceFolders = [mockWorkspaceFolder];
    // Return undefined to simulate user cancelling file picker
    (vscode.window.showOpenDialog as any).mockResolvedValue(undefined);
    // Mock showQuickPick to return undefined (user cancels metadata dialog)
    (vscode.window.showQuickPick as any).mockResolvedValue(undefined);

    await analyzeScreenshot(mockContext);

    // Verify showOpenDialog was called with workspace defaultUri
    expect(vscode.window.showOpenDialog).toHaveBeenCalled();
    const callArgs = (vscode.window.showOpenDialog as any).mock.calls[0][0];
    expect(callArgs.defaultUri).toEqual(mockWorkspaceFolder.uri);
  });
});

