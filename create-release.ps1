# Create GitHub release with Rephrase Setup
# Run: $env:GITHUB_TOKEN="your_token"; .\create-release.ps1
# Get token: https://github.com/settings/tokens (scope: repo)

$ErrorActionPreference = "Stop"
$token = $env:GITHUB_TOKEN
if (-not $token) {
    Write-Host "Set GITHUB_TOKEN first: `$env:GITHUB_TOKEN='ghp_xxx'; .\create-release.ps1"
    exit 1
}

$pkg = Get-Content package.json | ConvertFrom-Json
$version = $pkg.version
$owner = $pkg.build.publish.owner
$repo  = $pkg.build.publish.repo
$tag = "v$version"
$headers = @{
    Authorization = "Bearer $token"
    Accept = "application/vnd.github+json"
}

# Create or get existing release
$body = @{
    tag_name = $tag
    name = $tag
    body = "Rephrase $tag - Groq AI rephrase widget. See CHANGELOG.md for details."
} | ConvertTo-Json

try {
    $create = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases" -Method Post -Headers $headers -Body $body -ContentType "application/json"
    Write-Host "Created release $tag"
} catch {
    if ($_.Exception.Response.StatusCode -eq 422) {
        $create = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/tags/$tag" -Method Get -Headers $headers
        Write-Host "Release $tag already exists, uploading assets"
        foreach ($a in $create.assets) {
            Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/releases/assets/$($a.id)" -Method Delete -Headers $headers | Out-Null
            Write-Host "Deleted existing $($a.name)"
        }
    } else { throw }
}

# Upload assets
$uploadBase = $create.upload_url -replace '\{.*\}',''
$assets = @(
    "dist-electron\Rephrase Setup $version.exe",
    "dist-electron\latest.yml",
    "dist-electron\Rephrase Setup $version.exe.blockmap"
)

foreach ($path in $assets) {
    if (Test-Path $path) {
        $name = Split-Path $path -Leaf
        $uri = "$uploadBase`?name=" + [System.Uri]::EscapeDataString($name)
        $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $path))
        Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bytes -ContentType "application/octet-stream"
        Write-Host "Uploaded $name"
    }
}
Write-Host "Release $tag created: $($create.html_url)"
