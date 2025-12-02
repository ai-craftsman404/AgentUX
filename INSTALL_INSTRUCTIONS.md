# AgentUX Extension Installation Instructions

## Critical: Clean Installation Required

The extension requires a **complete clean reinstall** to work properly.

### Step 1: Uninstall Old Extension

**Option A: Via VS Code UI**
1. Press `Ctrl+Shift+X` (Extensions view)
2. Search for "AgentUX"
3. Click the gear icon → **Uninstall**
4. If you see multiple versions, uninstall ALL of them

**Option B: Via Command Line**
```powershell
code --uninstall-extension agentux.agentux
```

### Step 2: Delete Extension Folder (CRITICAL)

**This step is ESSENTIAL** - VS Code may cache the old broken version.

1. Close VS Code completely
2. Open File Explorer
3. Navigate to: `%USERPROFILE%\.vscode\extensions\`
4. Delete the folder: `agentux.agentux-0.1.0` (if it exists)
5. Delete the folder: `agentux.agentux-0.1.1` (if it exists)

**Or use PowerShell:**
```powershell
Remove-Item "$env:USERPROFILE\.vscode\extensions\agentux.agentux-*" -Recurse -Force
```

### Step 3: Disable Claude Code Extensions (REQUIRED)

The Claude Code extension corrupts the extension host and prevents AgentUX from activating.

1. Press `Ctrl+Shift+P`
2. Type: `Extensions: Show Installed Extensions`
3. Search: `claude`
4. **Disable** both:
   - `Anthropic.claude-code`
   - `saoudrizwan.claude-dev`
5. **Restart VS Code completely** (close all windows)

### Step 4: Install New Extension

**Option A: Via VS Code UI**
1. Press `Ctrl+Shift+X` (Extensions view)
2. Click `...` (top right) → **"Install from VSIX..."**
3. Navigate to: `C:\Users\georg\CursorDev\AgentUX\agentux-0.1.1.vsix`
4. Select and install

**Option B: Via Command Line**
```powershell
code --install-extension agentux-0.1.1.vsix --force
```

### Step 5: Verify Installation

1. **Restart VS Code completely** (close all windows)
2. Press `Ctrl+Shift+P`
3. Type: `UX Audit`
4. You should see all 6 commands:
   - UX Audit: Analyse Screenshot
   - UX Audit: Set OpenAI API Key
   - UX Audit: Configure Context
   - UX Audit: Re-run Last Analysis
   - UX Audit: Export Results
   - UX Audit: Open UX Panel

### Step 6: Check Activation Logs

1. Open **Output** panel (`Ctrl+Shift+U`)
2. Select **"AgentUX"** from the dropdown
3. You should see:
   ```
   AgentUX extension activating...
   ✓ Registered command: agentux.analyzeScreenshot
   ✓ Registered command: agentux.setApiKey
   ...
   AgentUX extension activation completed successfully.
   ```

### Troubleshooting

**If commands don't appear:**
- Check Output panel for errors
- Verify Claude Code extensions are disabled
- Try full cleanup: `.\scripts\cleanup-vscode-extensions.ps1`

**If you see "Cannot find module 'node-fetch'":**
- Ensure you installed `agentux-0.1.1.vsix` (not 0.1.0)
- Delete extension folder and reinstall
- Check that `node-fetch` is in the VSIX: `npx @vscode/vsce ls --tree | Select-String "node-fetch"`

**If F5 doesn't work:**
- Disable Claude Code extensions first
- Restart VS Code completely
- Try F5 again

