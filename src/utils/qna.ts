import * as vscode from 'vscode';
import { AnalysisMetadata, Audience, Platform, UIType } from '../types';
import { logger } from './logger';

const platformOptions: Platform[] = [
  'Desktop Web',
  'Mobile Web',
  'Tablet',
  'Native iOS',
  'Native Android',
  'Desktop App',
];

const uiTypeOptions: UIType[] = [
  'Dashboard',
  'Landing Page',
  'Form / Input Flow',
  'Settings Panel',
  'E-commerce Product / Checkout',
  'Marketing Page',
  'Component-Level UI',
  'Generic Interface',
];

const audienceOptions: Audience[] = [
  'General Public',
  'Enterprise Users',
  'Accessibility-Focused',
  'Mobile-First Users',
  'Developer / Technical Users',
];

export const promptForMetadata = async (): Promise<AnalysisMetadata | null> => {
  const platform = (await vscode.window.showQuickPick(platformOptions, {
    placeHolder: 'Which platform does this UI target?',
  })) as Platform | undefined;

  if (!platform) {
    logger.warn('Platform selection cancelled.');
    return null;
  }

  const uiType = (await vscode.window.showQuickPick(uiTypeOptions, {
    placeHolder: 'What kind of UI is this screenshot showing?',
  })) as UIType | undefined;

  if (!uiType) {
    logger.warn('UI type selection cancelled.');
    return null;
  }

  const audience = (await vscode.window.showQuickPick(audienceOptions, {
    placeHolder: 'Who is the primary audience for this UI?',
  })) as Audience | undefined;

  if (!audience) {
    logger.warn('Audience selection cancelled.');
    return null;
  }

  return {
    platform,
    uiType,
    audience,
  };
};

