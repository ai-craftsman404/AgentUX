# Testing VS Code Extension - Quick Guide

**Date**: 2025-12-01  
**Status**: Development & Production Testing Methods

---

## Two Methods for Testing

### 🚀 Method 1: F5 Development Mode (Recommended for Development)

**Best for**: Quick iteration during development

**Steps**:
1. **Compile code** (if not already compiled):
   ```bash
   npm run compile
   ```

2. **Press F5** in VS Code (or go to Run → Start Debugging)

3. **New VS Code window opens** - This is the "Extension Development Host"
   - Your extension is loaded automatically
   - Changes require recompiling and reloading

4. **Test in the new window**:
   - Right-click image files → "Analyze with AgentUX"
   - Use Command Palette → "UX Audit: Analyse Screenshot"
   - All commands work in this window

5. **After making code changes**:
   - Press `Ctrl+Shift+F5` to reload the Extension Development Host
   - OR stop debugging (Shift+F5) and press F5 again

**Advantages**:
- ✅ Fast iteration
- ✅ No packaging needed
- ✅ Debugging support (breakpoints, console logs)
- ✅ Hot reload with Ctrl+Shift+F5

**Disadvantages**:
- ⚠️ Requires separate VS Code window
- ⚠️ Must recompile before reloading

---

### 📦 Method 2: Package & Install VSIX (Production-Like Testing)

**Best for**: Testing the final packaged extension, verifying installation

**Steps**:
1. **Compile code**:
   ```bash
   npm run compile
   ```

2. **Package extension**:
   ```bash
   vsce package
   ```
   Creates: `agentux-0.1.0.vsix`

3. **Install VSIX** (choose one method):

   **Option A: VS Code UI**
   - Open VS Code
   - Press `Ctrl+Shift+X` (Extensions view)
   - Click `...` menu → "Install from VSIX..."
   - Select `agentux-0.1.0.vsix`
   - Reload VS Code when prompted

   **Option B: Command Line**
   ```bash
   code --install-extension agentux-0.1.0.vsix
   ```
   Then reload VS Code

4. **Test in your main VS Code instance**:
   - Right-click image files → "Analyze with AgentUX"
   - Use Command Palette → "UX Audit: Analyse Screenshot"
   - Verify all features work

5. **After making changes**:
   - Recompile: `npm run compile`
   - Repackage: `vsce package`
   - Uninstall old version: `code --uninstall-extension agentux.agentux`
   - Install new: `code --install-extension agentux-0.1.0.vsix`
   - Reload VS Code

**Advantages**:
- ✅ Tests actual installation process
- ✅ Tests in your real VS Code environment
- ✅ Verifies packaging works correctly
- ✅ Production-like experience

**Disadvantages**:
- ⚠️ Slower iteration (must package each time)
- ⚠️ Must uninstall/reinstall for updates

---

## Quick Reference

### Development Workflow (F5 Method)
```bash
# 1. Make code changes
# 2. Compile
npm run compile

# 3. Press F5 in VS Code
# 4. Test in Extension Development Host window
# 5. After changes: Ctrl+Shift+F5 to reload
```

### Production Testing Workflow (VSIX Method)
```bash
# 1. Make code changes
# 2. Compile
npm run compile

# 3. Package
vsce package

# 4. Install
code --install-extension agentux-0.1.0.vsix

# 5. Reload VS Code
# 6. Test in main VS Code instance
```

---

## Which Method Should You Use?

### Use F5 Development Mode When:
- ✅ Actively developing/debugging
- ✅ Making frequent code changes
- ✅ Need debugging support
- ✅ Testing new features quickly

### Use VSIX Package When:
- ✅ Testing final version
- ✅ Verifying installation process
- ✅ Testing in production-like environment
- ✅ Sharing extension with others
- ✅ Preparing for release

---

## Testing Checklist

After loading extension (either method), test:

### 1. Context Menu (New Feature)
- [ ] Right-click PNG/JPG file in Explorer
- [ ] See "Analyze with AgentUX" option
- [ ] Click → Analysis starts

### 2. Command Palette
- [ ] Press `Ctrl+Shift+P`
- [ ] Type "UX Audit"
- [ ] See all commands listed
- [ ] Commands execute correctly

### 3. Active Editor Detection
- [ ] Open image file in VS Code
- [ ] Run "UX Audit: Analyse Screenshot" from Command Palette
- [ ] Uses open image automatically (no file picker)

### 4. File Picker Fallback
- [ ] Close all image files
- [ ] Run "UX Audit: Analyse Screenshot"
- [ ] File picker opens in workspace root
- [ ] Can select image file

### 5. Full Analysis Workflow
- [ ] Select/analyze image
- [ ] Q&A dialog appears
- [ ] Analysis completes
- [ ] Webview opens with results
- [ ] Overlay image shows bounding boxes

---

## Troubleshooting

### F5 Method Issues

**Problem**: Extension not loading in Development Host
- **Solution**: Check `out/extension.js` exists (run `npm run compile`)

**Problem**: Changes not appearing after reload
- **Solution**: Make sure you compiled (`npm run compile`) before reloading

**Problem**: Breakpoints not working
- **Solution**: Ensure source maps are generated (check `tsconfig.json`)

### VSIX Method Issues

**Problem**: VSIX installation fails
- **Solution**: Check `.vscodeignore` doesn't exclude required files

**Problem**: Extension doesn't appear after install
- **Solution**: Reload VS Code (`Ctrl+R` or `Ctrl+Shift+P` → "Reload Window")

**Problem**: Old version still running
- **Solution**: Uninstall old version first: `code --uninstall-extension agentux.agentux`

---

## Recommended Workflow

**For Active Development**:
1. Use F5 method for quick iteration
2. Test frequently with `Ctrl+Shift+F5` reload
3. Use VSIX method before committing major changes

**For Final Testing**:
1. Use VSIX method
2. Test in clean VS Code instance
3. Verify all features work
4. Document any issues

---

*Guide created: 2025-12-01*

