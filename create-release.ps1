# create-release.ps1
# Creates a new release by tagging the current commit and pushing.
# Pushing tag v* triggers .github/workflows/release.yml which builds Windows + Mac and publishes the GitHub release.
#
# Usage:
#   .\create-release.ps1                    # use version from package.json
#   .\create-release.ps1 -Version 1.3.0    # explicit version
#   .\create-release.ps1 -DryRun            # show what would run, don't tag or push

param(
    [string] $Version,
    [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot

if (-not $Version) {
    $pkgPath = Join-Path $repoRoot 'package.json'
    if (-not (Test-Path $pkgPath)) {
        Write-Error "package.json not found at $pkgPath"
    }
    $pkg = Get-Content $pkgPath -Raw | ConvertFrom-Json
    $Version = $pkg.version
    if (-not $Version) {
        Write-Error "No version in package.json"
    }
    Write-Host "Using version from package.json: $Version"
} else {
    Write-Host "Using version: $Version"
}

$tag = "v$Version"

# Check tag doesn't already exist
$existing = git tag -l $tag 2>$null
if ($existing) {
    Write-Error "Tag $tag already exists. Delete it first with: git tag -d $tag; git push origin :refs/tags/$tag"
}

if ($DryRun) {
    Write-Host "[DryRun] Would run:"
    Write-Host "  git tag $tag -m `"Release $Version`""
    Write-Host "  git push origin $tag"
    Write-Host "Then the Release workflow would build and publish the release."
    exit 0
}

Push-Location $repoRoot
try {
    git tag $tag -m "Release $Version"
    git push origin $tag
    Write-Host "Pushed tag $tag. Release workflow: https://github.com/HarveyDodieReid/Rephrase/actions"
    Write-Host "When it finishes, release will be at: https://github.com/HarveyDodieReid/Rephrase/releases/tag/$tag"
} finally {
    Pop-Location
}
