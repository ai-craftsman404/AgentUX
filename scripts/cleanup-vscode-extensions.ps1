# VS Code Extension Cleanup Script
# Removes corrupted extension data and caches
# Run this if extensions are misbehaving or extension host is unstable

Write-Host "🧹 VS Code Extension Cleanup Script" -ForegroundColor Cyan
Write-Host "This will remove extension folders and caches." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Are you sure you want to continue? (yes/no)"
if ($confirm -ne "yes") {
    Write-Host "Cancelled." -ForegroundColor Red
    exit
}

Write-Host ""
Write-Host "Removing extension folders..." -ForegroundColor Yellow

# Remove installed extensions
$extensionsPath = "$env:USERPROFILE\.vscode\extensions"
if (Test-Path $extensionsPath) {
    Remove-Item $extensionsPath -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "✓ Removed: $extensionsPath" -ForegroundColor Green
} else {
    Write-Host "⚠ Not found: $extensionsPath" -ForegroundColor Yellow
}

# Remove VS Code caches
$cachePaths = @(
    "$env:APPDATA\Code\CachedData",
    "$env:APPDATA\Code\CachedExtensions",
    "$env:APPDATA\Code\User\workspaceStorage"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Remove-Item $path -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "✓ Removed cache: $path" -ForegroundColor Green
    } else {
        Write-Host "⚠ Not found: $path" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart VS Code completely" -ForegroundColor White
Write-Host "2. Reinstall only the extensions you need" -ForegroundColor White
Write-Host "3. Avoid installing Anthropic.claude-code or saoudrizwan.claude-dev" -ForegroundColor White
Write-Host ""

