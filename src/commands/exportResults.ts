import * as vscode from 'vscode';
import * as path from 'path';
import { getAnalysisState } from '../utils/state';
import { generateDescriptiveReport, formatReportAsMarkdown } from '../utils/reportGenerator';
import { generateOverlayImage } from '../utils/overlayGenerator';
import { generateErrorReport, formatErrorReportAsMarkdown } from '../utils/errorReportGenerator';

export const exportResultsCommand = async (): Promise<void> => {
  const state = getAnalysisState();

  if (!state.summary || !state.lastScreenshotUri) {
    vscode.window.showWarningMessage(
      'Nothing to export yet. Run an analysis first.',
    );
    return;
  }

  const options = ['All Formats', 'Markdown Report', 'Visual Overlay', 'JSON'];
  const choice = await vscode.window.showQuickPick(options, {
    placeHolder: 'Select export format',
  });

  if (!choice) {
    return;
  }

  // Get base directory for exports
  const filterMap: Record<string, { [name: string]: string[] }> = {
    'All Formats': { 'All Formats': ['md'] },
    'Markdown Report': { 'Markdown': ['md'] },
    'Visual Overlay': { 'PNG Image': ['png'] },
    'JSON': { 'JSON': ['json'] },
  };

  const baseUri = await vscode.window.showSaveDialog({
    filters: filterMap[choice] || { 'Markdown': ['md'] },
    saveLabel: `Export AgentUX ${choice}`,
  });

  if (!baseUri) {
    return;
  }

  // Safe fsPath access
  if (!baseUri || typeof baseUri !== 'object' || !('fsPath' in baseUri)) {
    vscode.window.showErrorMessage('Invalid file path for export.');
    return;
  }
  const basePath = (baseUri as any).fsPath;
  if (!basePath || typeof basePath !== 'string') {
    vscode.window.showErrorMessage('Invalid file path for export.');
    return;
  }
  const baseDir = path.dirname(basePath);
  const baseName = path.parse(basePath).name;

  try {
    if (choice === 'All Formats' || choice === 'Markdown Report') {
      // Check if this is an error state
      const weaknesses = state.summary?.weaknesses || [];
      const isErrorState = state.regions.length === 0 && weaknesses.some((w) =>
        w.toLowerCase().includes('unable to analyse') ||
        w.toLowerCase().includes('invalid') ||
        w.toLowerCase().includes('failed'),
      );

      let markdown: string;
      if (isErrorState) {
        // Generate error report
        const errorReport = generateErrorReport(state);
        markdown = formatErrorReportAsMarkdown(errorReport);
      } else {
        // Generate comprehensive markdown report
        const report = generateDescriptiveReport(state);
        markdown = formatReportAsMarkdown(report);
      }

      const reportPath = choice === 'All Formats' 
        ? path.join(baseDir, `${baseName}-report.md`)
        : basePath;
      
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(reportPath),
        Buffer.from(markdown, 'utf8'),
      );
    }

    if (choice === 'All Formats' || choice === 'Visual Overlay') {
      // Generate overlay image
      const overlayPath = choice === 'All Formats'
        ? path.join(baseDir, `${baseName}-overlay.png`)
        : basePath.endsWith('.png') ? basePath : `${basePath}.png`;
      
      await generateOverlayImage(
        state.lastScreenshotUri,
        state,
        overlayPath,
      );
    }

    if (choice === 'All Formats' || choice === 'JSON') {
      // Export JSON
      const jsonPath = choice === 'All Formats'
        ? path.join(baseDir, `${baseName}-data.json`)
        : basePath;
      
      await vscode.workspace.fs.writeFile(
        vscode.Uri.file(jsonPath),
        Buffer.from(JSON.stringify(state, null, 2), 'utf8'),
      );
    }

    const message = choice === 'All Formats'
      ? 'AgentUX export complete: Report, overlay image, and JSON data saved.'
      : `AgentUX ${choice} export saved.`;
    
    vscode.window.showInformationMessage(message);
  } catch (error) {
    vscode.window.showErrorMessage(
      `Export failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
};

