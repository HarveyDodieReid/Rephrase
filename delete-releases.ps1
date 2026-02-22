# Delete all GitHub releases and tags
# Run: $env:GITHUB_TOKEN="your_token"; .\delete-releases.ps1

$ErrorActionPreference = "Stop"
$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Host "Set GITHUB_TOKEN first: `$env:GITHUB_TOKEN='ghp_xxx'; .\delete-releases.ps1"
    exit 1
}

$pkg = Get-Content package.json | ConvertFrom-Json
$owner = $pkg.build.publish.owner
$repo  = $pkg.build.publish.repo
$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/vnd.github+json"
}

$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" -Headers $headers
foreach ($r in $releases) {
    Write-Host "Deleting release $($r.tag_name) (id $($r.id))..."
    Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/$($r.id)" -Method Delete -Headers $headers
    if ($r.tag_name) {
        try {
            Write-Host "Deleting tag $($r.tag_name)..."
            Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs/tags/$($r.tag_name)" -Method Delete -Headers $headers
        } catch { Write-Host "  (tag may already be gone: $_)" }
    }
}
Write-Host "All releases deleted."
