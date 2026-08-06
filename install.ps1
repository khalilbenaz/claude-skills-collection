# Installe un ou plusieurs skills dans ~\.claude\skills.
#
# Usage :
#   iex "& { $(iwr -useb https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main/install.ps1) } dev-code-reviewer -Launch"
#   iex "& { $(iwr -useb .../install.ps1) } -Category security"
#   iex "& { $(iwr -useb .../install.ps1) } -List"
#   iex "& { $(iwr -useb .../install.ps1) } -Search redis"
param(
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)][string[]]$Skills,
    [string]$Category,
    [string]$Search,
    [string]$Dest,
    [switch]$List,
    [switch]$Launch
)
$ErrorActionPreference = 'Stop'
# $env:SKILLS_BASE permet de tester en local sur une copie du dépôt.
$Base = if ($env:SKILLS_BASE) { $env:SKILLS_BASE } else { 'https://raw.githubusercontent.com/khalilbenaz/claude-skills-collection/main' }
$Catalog = 'https://khalilbenaz.github.io/claude-skills-collection/manuals/'
if (-not $Dest) { $Dest = Join-Path $HOME '.claude\skills' }

$index = ((Invoke-WebRequest -UseBasicParsing "$Base/manuals/skills.index").Content -split "`n") |
    Where-Object { $_.Trim() } |
    ForEach-Object {
        $p = $_ -split '\s+'
        [pscustomobject]@{ Name = $p[0]; Path = $p[1]; Category = $p[2] }
    }

if ($List) {
    Write-Host 'Catégories disponibles :'
    $index | Group-Object Category | Sort-Object Count -Descending |
        ForEach-Object { Write-Host ("  {0,-14} {1} skills" -f $_.Name, $_.Count) }
    Write-Host ''
    Write-Host 'Installer une catégorie : -Category dev'
    return
}

if ($Search) {
    $index | Where-Object { $_.Name -like "*$Search*" } | ForEach-Object { Write-Host "  $($_.Name)" }
    Write-Host ''
    Write-Host "Manuels : $Catalog"
    return
}

if ($Category) {
    $Skills = ($index | Where-Object { $_.Category -eq $Category }).Name
    if (-not $Skills) {
        Write-Host "✗ Catégorie inconnue : $Category (voir -List)" -ForegroundColor Red
        exit 1
    }
}

if (-not $Skills) {
    Write-Host 'Usage : install.ps1 <skill> [<skill>...] [-Launch] | -Category <préfixe> | -Search <terme> | -List'
    Write-Host "Catalogue : $Catalog"
    exit 1
}

$installed = @()
foreach ($skill in $Skills) {
    $entry = $index | Where-Object { $_.Name -eq $skill } | Select-Object -First 1
    if (-not $entry) {
        Write-Host "✗ Skill introuvable : $skill  (essayez : -Search $skill)" -ForegroundColor Red
        continue
    }
    $target = Join-Path $Dest (Split-Path $entry.Path -Leaf)
    New-Item -ItemType Directory -Force $target | Out-Null
    Invoke-WebRequest -UseBasicParsing "$Base/$($entry.Path)/SKILL.md" -OutFile (Join-Path $target 'SKILL.md')
    Write-Host "✓ $skill → $target" -ForegroundColor Green
    $installed += $skill
}

if (-not $installed) {
    Write-Host "Aucun skill installé. Catalogue : $Catalog" -ForegroundColor Yellow
    exit 1
}
Write-Host "$($installed.Count) skill(s) installé(s)."

$first = $installed[0]
if ($Launch) {
    if (Get-Command claude -ErrorAction SilentlyContinue) {
        claude "/$first"
        return
    }
    Write-Host '⚠ Claude Code non trouvé. Installation : npm install -g @anthropic-ai/claude-code' -ForegroundColor Yellow
}
Write-Host "Lancer : claude `"/$first`""
