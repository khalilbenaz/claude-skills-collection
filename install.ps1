# Installe un skill dans ~\.claude\skills et le lance optionnellement dans Claude Code.
# Usage :
#   iex "& { $(iwr -useb https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.ps1) } <skill-name> -Launch"
param(
    [Parameter(Mandatory = $true, Position = 0)][string]$Skill,
    [switch]$Launch
)
$ErrorActionPreference = 'Stop'
$Base = 'https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main'

$index = (Invoke-WebRequest -UseBasicParsing "$Base/manuals/skills.index").Content -split "`n"
$entry = ($index | Where-Object { $_ -match "^$([regex]::Escape($Skill))\s+(\S+)" } | Select-Object -First 1)
if (-not $entry) {
    Write-Host "✗ Skill introuvable : $Skill" -ForegroundColor Red
    Write-Host "Catalogue : https://khalilbenaz.github.io/claude-skills-collection/manuals/"
    exit 1
}
$path = ($entry -split '\s+')[1]
$dest = Join-Path $HOME ".claude\skills\$(Split-Path $path -Leaf)"
New-Item -ItemType Directory -Force $dest | Out-Null
Invoke-WebRequest -UseBasicParsing "$Base/$path/SKILL.md" -OutFile (Join-Path $dest 'SKILL.md')
Write-Host "✓ $Skill installé dans $dest" -ForegroundColor Green

if ($Launch) {
    if (Get-Command claude -ErrorAction SilentlyContinue) {
        claude "/$Skill"
    } else {
        Write-Host "⚠ Claude Code non trouvé. Installation : npm install -g @anthropic-ai/claude-code" -ForegroundColor Yellow
        Write-Host "Puis lancez : claude `"/$Skill`""
    }
} else {
    Write-Host "Lancer : claude `"/$Skill`""
}
