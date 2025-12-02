# VS Code Dev Testing Limitation

**Date**: 2025-12-01  
**Issue**: Testing extension in vscode.dev

---

## Limitation Discovered

**vscode.dev** (browser-based VS Code) has significant limitations for testing local extensions:

### ❌ Cannot Install Local VSIX Files
- vscode.dev only supports extensions from the VS Code Marketplace
- Local `.vsix` files cannot be installed in the browser version
- Extensions must be published to the marketplace first

### ✅ What vscode.dev CAN Do
- Open and edit code files
- View project structure
- Run code analysis
- Test TypeScript compilation (if workspace is opened)
- View file contents

### ❌ What vscode.dev CANNOT Do
- Install local VSIX extensions
- Test extension commands
- Test context menus
- Verify extension activation
- Test runtime behavior

---

## Alternative: F5 Development Mode

To actually test the extension, we need to use **F5 Development Mode** in the desktop VS Code:

1. Open the workspace in desktop VS Code
2. Press F5 (or Run → Start Debugging)
3. Extension Development Host window opens
4. Extension is loaded automatically
5. Test commands and functionality there

---

## Conclusion

**vscode.dev cannot be used to test the extension** because:
- ❌ No local VSIX installation support
- ❌ No extension runtime testing capability
- ❌ Browser limitations prevent full VS Code extension API

**Proper testing requires**:
- ✅ Desktop VS Code with F5 Development Mode
- ✅ OR installed VSIX in desktop VS Code
- ✅ Manual verification of commands and functionality

---

*Limitation documented: 2025-12-01*

