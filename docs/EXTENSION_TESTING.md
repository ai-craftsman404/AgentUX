# VS Code Extension Testing Guide

## Test Plan for AgentUX Extension

### Prerequisites
- VS Code installed on workstation
- Extension packaged as `.vsix` file
- OpenAI API key (for real testing)

### Installation Steps

1. **Package Extension**
   ```bash
   npm run compile
   vsce package
   ```

2. **Install VSIX**
   - Open VS Code
   - Go to Extensions view (Ctrl+Shift+X)
   - Click "..." menu → "Install from VSIX..."
   - Select the generated `.vsix` file

3. **Verify Installation**
   - Check Extensions view shows "AgentUX" installed
   - Check Command Palette (Ctrl+Shift+P) shows all AgentUX commands

### Test Cases

#### 1. Command Registration
- [ ] All commands appear in Command Palette
- [ ] Commands are executable
- [ ] Command titles match expected format

**Commands to Test:**
- `UX Audit: Analyse Screenshot`
- `UX Audit: Set OpenAI API Key`
- `UX Audit: Configure Context`
- `UX Audit: Re-run Last Analysis`
- `UX Audit: Export Results`
- `UX Audit: Open UX Panel`

#### 2. API Key Management
- [ ] Set API key command works
- [ ] API key stored securely in SecretStorage
- [ ] API key persists across VS Code restarts
- [ ] Invalid API key format rejected

#### 3. Screenshot Analysis Workflow
- [ ] Select screenshot file (PNG/JPG)
- [ ] Q&A context dialog appears
- [ ] All three questions answered/defaulted
- [ ] Analysis runs successfully
- [ ] Results displayed in webview
- [ ] Overlay image generated correctly
- [ ] All regions visible in overlay

#### 4. Webview Functionality
- [ ] Webview opens correctly
- [ ] Screenshot displays
- [ ] Bounding boxes render
- [ ] Heatmap displays
- [ ] Category findings list works
- [ ] Hover-to-highlight works (region ↔ text)
- [ ] Keyboard navigation works
- [ ] Theme-aware styling (light/dark)

#### 5. Export Functionality
- [ ] Export JSON works
- [ ] Export Markdown works
- [ ] Export SVG works (if implemented)
- [ ] Export PNG overlay works
- [ ] Files saved to correct location

#### 6. Error Handling
- [ ] Invalid image file rejected gracefully
- [ ] Missing API key shows helpful message
- [ ] API errors handled gracefully
- [ ] Network errors handled
- [ ] Invalid JSON responses handled

#### 7. Performance
- [ ] Extension activates quickly
- [ ] Commands respond promptly
- [ ] Large images handled reasonably
- [ ] Memory usage acceptable

#### 8. Multi-Image Support
- [ ] Can analyze multiple screenshots sequentially
- [ ] State persists between analyses
- [ ] Previous analysis accessible

### Test Scenarios

#### Scenario 1: First-Time User
1. Install extension
2. Run "Set OpenAI API Key"
3. Run "Analyse Screenshot"
4. Complete Q&A dialog
5. Verify analysis completes
6. Verify webview displays results

#### Scenario 2: Returning User
1. Open VS Code (extension already installed)
2. Run "Analyse Screenshot"
3. Verify API key persists
4. Verify analysis works without re-entering key

#### Scenario 3: Error Recovery
1. Run analysis with invalid API key
2. Verify error message displayed
3. Set correct API key
4. Re-run analysis
5. Verify success

#### Scenario 4: Export Workflow
1. Complete analysis
2. Run "Export Results"
3. Select export format
4. Verify file created
5. Verify file content correct

### Expected Behaviors

- **Activation**: Extension activates on first command use
- **Commands**: All commands accessible via Command Palette
- **Webview**: Opens in new panel, persists across sessions
- **State**: Analysis state persists in workspace storage
- **Errors**: User-friendly error messages, no crashes

### Known Issues to Verify Fixed

- [ ] Overlay-JSON consistency (regions match)
- [ ] Small attention grid handling
- [ ] Confidence threshold filtering
- [ ] Very thin boxes detection

### Test Data

Use test images from:
- `fixtures/images/real/` - Real screenshots
- Various sizes and formats (PNG, JPG)
- Desktop and mobile layouts

### Reporting

Document:
- Test results (pass/fail)
- Screenshots of issues
- Console errors
- Performance metrics
- User experience notes

