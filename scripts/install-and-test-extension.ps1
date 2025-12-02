# AgentUX Extension Installation and Testing Script
# This script installs the VSIX and provides testing guidance

param(
    [string]$VsixPath = "agentux-0.1.0.vsix"
)

Write-Host "`n🚀 AgentUX Extension Installation & Testing`n" -ForegroundColor Cyan

# Check if VSIX exists
if (-not (Test-Path $VsixPath)) {
    Write-Host "❌ VSIX file not found: $VsixPath" -ForegroundColor Red
    Write-Host "   Run 'vsce package' first to create the VSIX file.`n" -ForegroundColor Yellow
    exit 1
}

$vsixFile = Get-Item $VsixPath
Write-Host "✅ Found VSIX: $($vsixFile.Name)" -ForegroundColor Green
Write-Host "   Size: $([math]::Round($vsixFile.Length / 1KB, 2)) KB`n" -ForegroundColor White

Write-Host "📋 Installation Steps:" -ForegroundColor Yellow
Write-Host "1. Open VS Code" -ForegroundColor White
Write-Host "2. Press Ctrl+Shift+X to open Extensions view" -ForegroundColor White
Write-Host "3. Click the '...' menu (top right)" -ForegroundColor White
Write-Host "4. Select 'Install from VSIX...'" -ForegroundColor White
Write-Host "5. Navigate to: $($vsixFile.FullName)" -ForegroundColor White
Write-Host "6. Select the file and click 'Install'" -ForegroundColor White
Write-Host "7. Reload VS Code when prompted`n" -ForegroundColor White

Write-Host "🧪 Testing Checklist:" -ForegroundColor Yellow
Write-Host "`n1. VERIFY INSTALLATION:" -ForegroundColor Cyan
Write-Host "   [ ] Extension appears in Extensions view" -ForegroundColor White
Write-Host "   [ ] Extension shows as 'Installed'" -ForegroundColor White
Write-Host "   [ ] No errors in Output panel (View → Output → 'AgentUX')`n" -ForegroundColor White

Write-Host "2. TEST COMMANDS (Ctrl+Shift+P → 'UX Audit'):" -ForegroundColor Cyan
Write-Host "   [ ] 'UX Audit: Analyse Screenshot' - appears and executes" -ForegroundColor White
Write-Host "   [ ] 'UX Audit: Set OpenAI API Key' - appears and executes" -ForegroundColor White
Write-Host "   [ ] 'UX Audit: Configure Context' - appears and executes" -ForegroundColor White
Write-Host "   [ ] 'UX Audit: Re-run Last Analysis' - appears" -ForegroundColor White
Write-Host "   [ ] 'UX Audit: Export Results' - appears" -ForegroundColor White
Write-Host "   [ ] 'UX Audit: Open UX Panel' - appears and executes`n" -ForegroundColor White

Write-Host "3. TEST API KEY SETUP:" -ForegroundColor Cyan
Write-Host "   [ ] Run 'Set OpenAI API Key' command" -ForegroundColor White
Write-Host "   [ ] Enter a test API key (or real one)" -ForegroundColor White
Write-Host "   [ ] Key is stored securely" -ForegroundColor White
Write-Host "   [ ] Key persists after VS Code restart`n" -ForegroundColor White

Write-Host "4. TEST SCREENSHOT ANALYSIS:" -ForegroundColor Cyan
Write-Host "   [ ] Run 'Analyse Screenshot' command" -ForegroundColor White
Write-Host "   [ ] Select a PNG/JPG file" -ForegroundColor White
Write-Host "   [ ] Q&A dialog appears (Platform, UI Type, Audience)" -ForegroundColor White
Write-Host "   [ ] Can answer or skip questions" -ForegroundColor White
Write-Host "   [ ] Analysis runs (shows progress)" -ForegroundColor White
Write-Host "   [ ] Webview opens with results" -ForegroundColor White
Write-Host "   [ ] Screenshot displays correctly" -ForegroundColor White
Write-Host "   [ ] Bounding boxes visible" -ForegroundColor White
Write-Host "   [ ] Findings list displays`n" -ForegroundColor White

Write-Host "5. TEST WEBVIEW:" -ForegroundColor Cyan
Write-Host "   [ ] Screenshot renders" -ForegroundColor White
Write-Host "   [ ] Overlay boxes visible" -ForegroundColor White
Write-Host "   [ ] Heatmap displays (if available)" -ForegroundColor White
Write-Host "   [ ] Category findings list works" -ForegroundColor White
Write-Host "   [ ] Hover highlights regions" -ForegroundColor White
Write-Host "   [ ] Keyboard navigation works" -ForegroundColor White
Write-Host "   [ ] Theme-aware (light/dark)`n" -ForegroundColor White

Write-Host "6. TEST EXPORT:" -ForegroundColor Cyan
Write-Host "   [ ] Run 'Export Results' command" -ForegroundColor White
Write-Host "   [ ] Select export format" -ForegroundColor White
Write-Host "   [ ] File saves successfully" -ForegroundColor White
Write-Host "   [ ] File content is correct`n" -ForegroundColor White

Write-Host "7. TEST ERROR HANDLING:" -ForegroundColor Cyan
Write-Host "   [ ] Invalid image file shows error" -ForegroundColor White
Write-Host "   [ ] Missing API key shows helpful message" -ForegroundColor White
Write-Host "   [ ] Network errors handled gracefully`n" -ForegroundColor White

Write-Host "📝 Test Results Location:" -ForegroundColor Yellow
Write-Host "   Document results in: docs/EXTENSION_TEST_RESULTS.md`n" -ForegroundColor White

Write-Host "💡 Quick Test Command:" -ForegroundColor Yellow
Write-Host "   Press Ctrl+Shift+P → type 'UX Audit' → select any command`n" -ForegroundColor White

Write-Host "✅ Ready to test! Install the VSIX in VS Code and follow the checklist above.`n" -ForegroundColor Green

