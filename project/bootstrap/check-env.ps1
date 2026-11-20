$ErrorActionPreference = "Continue"
Write-Host "=== Toolbox Vision Demo: environment check (Windows) ==="
Write-Host "OS:"
Get-CimInstance Win32_OperatingSystem | Select-Object Caption, Version, OSArchitecture | Format-List
Write-Host "PowerShell:"
$PSVersionTable.PSVersion
$commands = @("codex", "node", "npm", "docker", "pi", "magpie", "herdr")
foreach ($name in $commands) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if ($cmd) {
        Write-Host ("{0}: FOUND ({1})" -f $name, $cmd.Source)
    } else {
        Write-Host ("{0}: NOT_FOUND" -f $name)
    }
}
if (Get-Command codex -ErrorAction SilentlyContinue) { codex --version }
if (Get-Command node -ErrorAction SilentlyContinue) { node --version }
if (Get-Command npm -ErrorAction SilentlyContinue) { npm --version }
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker --version
    docker compose version
}
Write-Host "=== Check complete. No environment variables or credentials were printed. ==="
