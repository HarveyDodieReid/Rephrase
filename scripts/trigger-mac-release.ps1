# Trigger "Add Mac to Release" workflow via GitHub API
# Run: $env:GITHUB_TOKEN="your_token"; .\scripts\trigger-mac-release.ps1

$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Host "Set GITHUB_TOKEN first: `$env:GITHUB_TOKEN='ghp_xxx'; .\scripts\trigger-mac-release.ps1"
    exit 1
}

$headers = @{
    Authorization = "Bearer $token"
    Accept        = "application/vnd.github+json"
}
$body = @{ ref = "main" } | ConvertTo-Json

$resp = Invoke-RestMethod -Uri "https://api.github.com/repos/HarveyDodieReid/Rephrase/actions/workflows/add-mac-to-release.yml/dispatches" `
    -Method Post -Headers $headers -Body $body -ContentType "application/json"

Write-Host "Triggered Add Mac to Release workflow. Check: https://github.com/HarveyDodieReid/Rephrase/actions"
