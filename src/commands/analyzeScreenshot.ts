import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
  ensureMetadata,
  getAnalysisState,
  setMetadata,
  updateAnalysisState,
} from '../utils/state';
import { promptForMetadata } from '../utils/qna';
import { getApiKey } from '../utils/apiKey';
import { VisionClient } from '../utils/visionClient';
import { logger } from '../utils/logger';
import { renderAnalysisPanel } from '../webview/panel';
import type { AnalysisMetadata } from '../types';
import { emptyAgentFindings } from '../types';
import { runPipeline } from '../agents';
import { getMockVisionResult } from '../utils/mockData';
import { calculateCoverageMetrics } from '../utils/coverageMetrics';
import { getImageDimensions } from '../utils/imageValidation';

const MODEL = 'gpt-4o';

const persistScreenshotForWebview = async (
  context: vscode.ExtensionContext,
  sourcePath: string,
): Promise<string> => {
  if (!sourcePath || typeof sourcePath !== 'string') {
    throw new Error(`Invalid screenshot path: ${sourcePath}`);
  }

  const normalizedSource = path.normalize(sourcePath);
  if (!fs.existsSync(normalizedSource)) {
    throw new Error(`Screenshot does not exist: ${normalizedSource}`);
  }

  const screenshotsDir = vscode.Uri.joinPath(
    context.globalStorageUri,
    'screenshots',
  );
  await vscode.workspace.fs.createDirectory(screenshotsDir);

  const fileName = `analysis-${Date.now()}${path.extname(normalizedSource) || '.png'}`;
  const targetUri = vscode.Uri.joinPath(screenshotsDir, fileName);

  const MAX_RETRIES = 5;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      await vscode.workspace.fs.copy(
        vscode.Uri.file(normalizedSource),
        targetUri,
        { overwrite: true },
      );
      return targetUri.fsPath;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Failed to copy screenshot after ${MAX_RETRIES} attempts: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
  }

  throw new Error('Unexpected failure copying screenshot.');
};

/**
 * Picks a screenshot file using the file picker dialog.
 * Defaults to workspace root for better UX.
 */
const pickScreenshot = async (): Promise<vscode.Uri | undefined> => {
  // Default to workspace root if available
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  const defaultUri = workspaceFolder?.uri;

  const file = await vscode.window.showOpenDialog({
    canSelectMany: false,
    defaultUri: defaultUri,
    filters: {
      Images: ['png', 'jpg', 'jpeg'],
    },
  });

  return file?.[0];
};

/**
 * Checks if an image file is currently open in the active editor.
 * Returns the URI if it's a valid image file, otherwise undefined.
 */
const getActiveImageEditor = (): vscode.Uri | undefined => {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return undefined;
  }

  const uri = activeEditor.document.uri;
  
  // Only handle file URIs (local files) - use defensive property access
  if (!uri || typeof uri !== 'object') {
    return undefined;
  }
  
  // Check properties exist before accessing
  if (!('scheme' in uri) || !('fsPath' in uri)) {
    return undefined;
  }
  
  const scheme = (uri as any).scheme;
  const fsPath = (uri as any).fsPath;
  
  // Only handle file URIs with valid fsPath
  if (scheme !== 'file' || !fsPath || typeof fsPath !== 'string') {
    return undefined;
  }

  // Safe access - we've validated fsPath exists and is a string
  const ext = fsPath.toLowerCase();
  
  // Check if it's an image file
  if (ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg')) {
    return uri;
  }

  return undefined;
};

const resolveMetadata = async (): Promise<AnalysisMetadata | null> => {
  const existing = ensureMetadata();
  const reuse = await vscode.window.showQuickPick(
    ['Use previous context', 'Provide new context'],
    { placeHolder: 'Choose metadata for this analysis' },
  );

  if (!reuse) {
    return null;
  }

  if (reuse === 'Use previous context' && existing) {
    return existing;
  }

  const metadata = await promptForMetadata();
  if (metadata) {
    setMetadata(metadata);
  }
  return metadata;
};

/**
 * Analyzes a screenshot using OpenAI Vision API.
 * 
 * Supports multiple input methods:
 * 1. Context menu: fileUri provided from right-click on image file
 * 2. Active editor: automatically uses open image if available
 * 3. File picker: shows dialog to select image file
 * 
 * @param context - VS Code extension context
 * @param fileUri - Optional URI provided by context menu or command arguments
 */
const resolveLocalPath = (uri?: vscode.Uri): string | null => {
  if (!uri || uri.scheme !== 'file') {
    return null;
  }

  const fsPath = uri.fsPath;
  if (!fsPath || typeof fsPath !== 'string') {
    return null;
  }

  return path.normalize(fsPath);
};

export const analyzeScreenshot = async (
  context: vscode.ExtensionContext,
  fileUri?: vscode.Uri,
): Promise<void> => {
  try {
    const INVALID_SELECTION_MESSAGE =
      'Invalid file selection. Please select a local image file.';

    let screenshotPath: string | null = null;

    // If invoked from context menu with a URI, never fall back to the file picker.
    if (fileUri) {
      const candidate = resolveLocalPath(fileUri);
      if (!candidate || !fs.existsSync(candidate)) {
        vscode.window.showErrorMessage(INVALID_SELECTION_MESSAGE);
        return;
      }
      screenshotPath = candidate;
    } else {
      // If an image is open in the active editor, use it (and do not show the picker).
      const activeUri = getActiveImageEditor();
      if (activeUri) {
        const candidate = resolveLocalPath(activeUri);
        if (!candidate || !fs.existsSync(candidate)) {
          vscode.window.showErrorMessage(INVALID_SELECTION_MESSAGE);
          return;
        }
        screenshotPath = candidate;
      } else {
        // Otherwise, prompt the user to pick a file.
        const pickedUri = await pickScreenshot();
        const candidate = resolveLocalPath(pickedUri);
        if (!candidate || !fs.existsSync(candidate)) {
          vscode.window.showErrorMessage(INVALID_SELECTION_MESSAGE);
          return;
        }
        screenshotPath = candidate;
      }
    }

    const metadata = await resolveMetadata();
    if (!metadata) {
      vscode.window.showWarningMessage(
        'Context missing — please answer the UI context questions.',
      );
      return;
    }

    const apiKey = await getApiKey(context);
    const shouldUseMock = !apiKey;

    if (!apiKey) {
      const selection = await vscode.window.showInformationMessage(
        'OpenAI API key not set. Run mock analysis instead?',
        'Run Mock Analysis',
        'Cancel',
      );
      if (selection !== 'Run Mock Analysis') {
        return;
      }
    }

    const progressTitle = shouldUseMock
      ? 'Running mock AgentUX analysis'
      : 'Contacting OpenAI Vision';

    // screenshotPath is guaranteed to be string at this point (validated above)
    const finalScreenshotPath: string = screenshotPath;
    
    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: progressTitle },
      async () => {
        try {
          // Pre-validate image (including multi-page detection)
          const imageDims = await getImageDimensions(finalScreenshotPath);
          const { validateImage } = await import('../utils/imageValidation');
          const validation = await validateImage(finalScreenshotPath);

        // Check for multi-page screenshot
        if (validation.multiPageDetection?.isMultiPage) {
          const detection = validation.multiPageDetection;
          if (detection.recommendation === 'split') {
            // High confidence multi-page - ask user if they want to proceed
            const proceed = await vscode.window.showWarningMessage(
              `This image appears to contain ${detection.estimatedPageCount} separate UI pages. Analysis accuracy may be reduced.\n\nWould you like to proceed anyway, or split the image into individual pages first?`,
              'Proceed Anyway',
              'Cancel',
            );
            if (proceed !== 'Proceed Anyway') {
              vscode.window.showInformationMessage(
                'Analysis cancelled. Please split the image into individual page screenshots for best results.',
              );
              return;
            }
          } else if (detection.recommendation === 'proceed_with_warning') {
            // Medium confidence - warn but proceed
            vscode.window.showWarningMessage(
              `This image may contain ${detection.estimatedPageCount} separate UI pages. Analysis may mix contexts. Consider splitting for better accuracy.`,
            );
          }
        }

          const visionResult = shouldUseMock
            ? getMockVisionResult()
            : await new VisionClient({ apiKey: apiKey!, model: MODEL }).analyse(
                finalScreenshotPath,
                metadata,
              );

        const screenshotForWebview = await persistScreenshotForWebview(
          context,
          finalScreenshotPath,
        );

        const baseState = {
          metadata,
          regions: visionResult.regions,
          attentionGrid: visionResult.attentionGrid,
          summary: visionResult.summary,
          lastScreenshotUri: screenshotForWebview,
          warnings: [],
          agentFindings: emptyAgentFindings(),
        };

        updateAnalysisState(baseState);

        const pipelineState = runPipeline(getAnalysisState());
        const persistedScreenshotUri = baseState.lastScreenshotUri;
        
        // Calculate coverage metrics
        const metrics = calculateCoverageMetrics(pipelineState, imageDims.width, imageDims.height);
        const finalState = {
          ...pipelineState,
          metrics,
          lastScreenshotUri: persistedScreenshotUri,
        };
        
        updateAnalysisState(finalState);

        renderAnalysisPanel(context);
        vscode.window.showInformationMessage('AgentUX analysis completed.');
      } catch (error) {
        logger.error('Analysis failed', error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        
        // Provide user-friendly error messages
        let userMessage = 'Analysis failed. ';
        if (errorMessage.includes('Image validation failed')) {
          userMessage += errorMessage.replace('Image validation failed: ', '');
        } else if (errorMessage.includes('Unexpected Vision response')) {
          userMessage +=
            'The Vision API returned an unexpected response format. Please retry.';
        } else if (errorMessage.includes('invalid model output')) {
          userMessage +=
            'The Vision API response could not be parsed. Please retry or try a different image.';
        } else {
          userMessage += errorMessage || 'Please retry or update AgentUX.';
        }
        
        vscode.window.showErrorMessage(userMessage);
      }
    },
  );
  } catch (error) {
    // Catch any unexpected errors, especially fsPath access errors
    logger.error('Unexpected error in analyzeScreenshot', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorMessage.includes('fsPath') || errorMessage.includes('Cannot read properties')) {
      vscode.window.showErrorMessage(
        'AgentUX Analysis Error: Invalid file selection. Please ensure you select a local image file.',
      );
    } else {
      vscode.window.showErrorMessage(
        `AgentUX Analysis Error: ${errorMessage || 'An unexpected error occurred. Please try again.'}`,
      );
    }
  }
};

