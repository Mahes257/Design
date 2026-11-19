# Installs the local CAD bridge on THIS computer.
#
#   powershell -ExecutionPolicy Bypass -File tools\cad-bridge\install-startup.ps1
#   powershell -ExecutionPolicy Bypass -File tools\cad-bridge\install-startup.ps1 -Uninstall
#
# The bridge is copied to %LOCALAPPDATA%\MechanicalDesignCadBridge so it does not
# depend on the ERP project folder, and a shortcut is added to this user's
# Startup folder so it starts when the user signs in. The bridge listens on
# 127.0.0.1 only; no firewall rule or administrator rights are needed.

param(
  [switch]$Uninstall,
  [switch]$NoStartup
)

$ErrorActionPreference = 'Stop'
$source = Split-Path -Parent $MyInvocation.MyCommand.Path
$target = Join-Path $env:LOCALAPPDATA 'MechanicalDesignCadBridge'
$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup 'Mechanical Design CAD Bridge.lnk'

if ($Uninstall) {
  if (Test-Path $shortcutPath) { Remove-Item $shortcutPath -Force }
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match 'MechanicalDesignCadBridge|cad-bridge' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Write-Host 'CAD Bridge startup shortcut removed and running bridge stopped.'
  Write-Host "Files remain in $target (delete that folder to remove them completely)."
  exit 0
}

$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
  Write-Error "Node.js was not found. Install Node.js LTS from https://nodejs.org/ and run this script again."
}

New-Item -ItemType Directory -Path $target -Force | Out-Null
foreach ($file in 'server.mjs', 'catalogue.mjs', 'start-bridge.cmd', 'start-bridge-hidden.vbs') {
  Copy-Item (Join-Path $source $file) (Join-Path $target $file) -Force
}
Write-Host "CAD Bridge copied to $target"

if (-not $NoStartup) {
  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($shortcutPath)
  $shortcut.TargetPath = Join-Path $env:WINDIR 'System32\wscript.exe'
  $shortcut.Arguments = '"' + (Join-Path $target 'start-bridge-hidden.vbs') + '"'
  $shortcut.WorkingDirectory = $target
  $shortcut.Description = 'Local CAD Bridge (127.0.0.1:47823) for the Design ERP'
  $shortcut.WindowStyle = 7
  $shortcut.Save()
  Write-Host "Startup shortcut created: $shortcutPath"
}

$env:PATH = "$env:PATH;$env:ProgramFiles\nodejs"
Start-Process -FilePath (Join-Path $target 'start-bridge.cmd') -WindowStyle Hidden
Start-Sleep -Seconds 3
try {
  $health = Invoke-RestMethod -Uri 'http://127.0.0.1:47823/cad-bridge/health' -TimeoutSec 8
  Write-Host "Bridge is running: $($health.service) $($health.version)"
} catch {
  Write-Warning "The bridge did not answer yet. Check $target\bridge.log."
}
Write-Host ''
Write-Host 'Done. Open the ERP in this computer''s browser and press Connect / Retry in the CAD dialog.'
Write-Host 'Each client computer must run its own bridge; it is never shared over the network.'
