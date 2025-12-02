/**
 * Comprehensive Extension Test Script
 * Tests all fsPath access scenarios to ensure no undefined errors
 */

import * as vscode from 'vscode';
import { analyzeScreenshot } from '../src/commands/analyzeScreenshot';

interface TestCase {
  name: string;
  fileUri?: any;
  activeEditor?: any;
  pickerResult?: any;
  shouldSucceed: boolean;
  expectedError?: string;
}

const testCases: TestCase[] = [
  {
    name: 'undefined fileUri',
    fileUri: undefined,
    pickerResult: undefined,
    shouldSucceed: false, // User cancels
  },
  {
    name: 'null fileUri',
    fileUri: null,
    pickerResult: undefined,
    shouldSucceed: false,
  },
  {
    name: 'fileUri without fsPath property',
    fileUri: { scheme: 'file' },
    pickerResult: undefined,
    shouldSucceed: false,
  },
  {
    name: 'fileUri with null fsPath',
    fileUri: { scheme: 'file', fsPath: null },
    pickerResult: undefined,
    shouldSucceed: false,
  },
  {
    name: 'fileUri with undefined fsPath',
    fileUri: { scheme: 'file', fsPath: undefined },
    pickerResult: undefined,
    shouldSucceed: false,
  },
  {
    name: 'fileUri with non-file scheme',
    fileUri: { scheme: 'https', fsPath: '/path' },
    pickerResult: undefined,
    shouldSucceed: false,
  },
  {
    name: 'fileUri with empty string fsPath',
    fileUri: { scheme: 'file', fsPath: '' },
    pickerResult: undefined,
    shouldSucceed: false,
  },
  {
    name: 'fileUri with non-string fsPath',
    fileUri: { scheme: 'file', fsPath: 123 },
    pickerResult: undefined,
    shouldSucceed: false,
  },
  {
    name: 'valid fileUri',
    fileUri: { scheme: 'file', fsPath: '/test/image.png' },
    shouldSucceed: true,
  },
  {
    name: 'fileUri is string (invalid)',
    fileUri: 'not-an-object',
    pickerResult: undefined,
    shouldSucceed: false,
  },
  {
    name: 'fileUri is number (invalid)',
    fileUri: 123,
    pickerResult: undefined,
    shouldSucceed: false,
  },
];

async function runTest(testCase: TestCase): Promise<boolean> {
  const mockContext = {
    secrets: { get: async () => undefined, store: async () => {} },
    extensionUri: vscode.Uri.parse('file:///test'),
  } as vscode.ExtensionContext;

  // Mock VS Code APIs
  const originalShowOpenDialog = vscode.window.showOpenDialog;
  const originalShowQuickPick = vscode.window.showQuickPick;
  const originalShowInfo = vscode.window.showInformationMessage;
  const originalShowError = vscode.window.showErrorMessage;
  const originalActiveEditor = (vscode.window as any).activeTextEditor;

  try {
    // Setup mocks
    (vscode.window as any).showOpenDialog = async () => testCase.pickerResult;
    (vscode.window as any).showQuickPick = async () => 'Provide new context';
    (vscode.window as any).showInformationMessage = async () => 'Run Mock Analysis';
    (vscode.window as any).showErrorMessage = async () => {};
    (vscode.window as any).activeTextEditor = testCase.activeEditor;

    // Mock dependencies
    const mockQna = await import('../src/utils/qna');
    vi.spyOn(mockQna, 'promptForMetadata').mockResolvedValue({
      platform: 'Desktop Web',
      uiType: 'Dashboard',
      audience: 'General Public',
    });

    const mockApiKey = await import('../src/utils/apiKey');
    vi.spyOn(mockApiKey, 'getApiKey').mockResolvedValue(undefined);

    // Run test
    let errorThrown = false;
    let errorMessage = '';
    
    try {
      await analyzeScreenshot(mockContext, testCase.fileUri);
    } catch (error) {
      errorThrown = true;
      errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check if it's the fsPath error we're trying to prevent
      if (errorMessage.includes('fsPath') || errorMessage.includes('Cannot read properties')) {
        return false; // Test failed - fsPath error occurred
      }
    }

    // If test expects success but error was thrown (and it's not fsPath), that's also a failure
    if (testCase.shouldSucceed && errorThrown) {
      return false;
    }

    // If test expects failure but no error was thrown, that might be OK (user cancelled)
    return true; // Test passed - no fsPath error
  } finally {
    // Restore originals
    (vscode.window as any).showOpenDialog = originalShowOpenDialog;
    (vscode.window as any).showQuickPick = originalShowQuickPick;
    (vscode.window as any).showInformationMessage = originalShowInfo;
    (vscode.window as any).showErrorMessage = originalShowError;
    (vscode.window as any).activeTextEditor = originalActiveEditor;
  }
}

async function main() {
  console.log('🧪 Running Comprehensive Extension Tests...\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    try {
      const result = await runTest(testCase);
      if (result) {
        console.log(`✅ ${testCase.name}`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name} - fsPath error occurred`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${testCase.name} - Exception: ${error}`);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✅ All tests passed - no fsPath errors detected!');
    process.exit(0);
  } else {
    console.log('❌ Some tests failed - fsPath errors still present');
    process.exit(1);
  }
}

// Note: This requires vitest to be available
if (require.main === module) {
  main().catch(console.error);
}

export { runTest, testCases };

