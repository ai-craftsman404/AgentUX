/**
 * Runtime Extension Test Script
 * Attempts to verify extension is actually loaded and working
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

async function testExtensionRuntime(): Promise<void> {
  console.log('🧪 Testing Extension Runtime...\n');

  // Check if extension is installed
  const extensionsDir = path.join(
    process.env.USERPROFILE || process.env.HOME || '',
    '.vscode',
    'extensions',
  );

  const agentuxDir = path.join(extensionsDir, 'agentux.agentux-0.1.0');
  
  if (!fs.existsSync(agentuxDir)) {
    console.log('❌ Extension directory not found:', agentuxDir);
    return;
  }

  console.log('✅ Extension directory found:', agentuxDir);

  // Check package.json exists
  const packageJsonPath = path.join(agentuxDir, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    console.log('❌ package.json not found');
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  console.log('✅ Extension version:', packageJson.version);

  // Check main entry point exists
  const mainPath = path.join(agentuxDir, packageJson.main || 'out/extension.js');
  if (!fs.existsSync(mainPath)) {
    console.log('❌ Main entry point not found:', mainPath);
    return;
  }

  console.log('✅ Main entry point exists:', mainPath);

  // Check if commands are defined
  if (packageJson.contributes?.commands) {
    console.log('\n📋 Commands defined:');
    packageJson.contributes.commands.forEach((cmd: any) => {
      console.log(`  - ${cmd.title} (${cmd.command})`);
    });
  }

  // Check if menus are defined
  if (packageJson.contributes?.menus) {
    console.log('\n📋 Menus defined:');
    Object.keys(packageJson.contributes.menus).forEach((menuKey) => {
      const menuItems = packageJson.contributes.menus[menuKey];
      console.log(`  - ${menuKey}: ${menuItems.length} item(s)`);
    });
  }

  console.log('\n✅ Extension structure looks valid');
  console.log('\n⚠️  Note: Actual runtime testing requires VS Code to be running');
  console.log('   and the extension to be activated.');
}

testExtensionRuntime().catch(console.error);

