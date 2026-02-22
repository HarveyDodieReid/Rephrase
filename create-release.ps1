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

# Upload assets — use names that match latest.yml (electron-updater expects Rephrase-Setup-X.X.X.exe)
$uploadBase = $create.upload_url -replace '\{.*\}',''
$baseName = "Rephrase-Setup-$version"
$assets = @(
    @{ Path = "dist-electron\Rephrase Setup $version.exe"; Name = "$baseName.exe" },
    @{ Path = "dist-electron\latest.yml"; Name = "latest.yml" },
    @{ Path = "dist-electron\Rephrase Setup $version.exe.blockmap"; Name = "$baseName.exe.blockmap" }
)

foreach ($a in $assets) {
    $path = $a.Path
    $name = $a.Name
    if (Test-Path $path) {
        $uri = "$uploadBase`?name=" + [System.Uri]::EscapeDataString($name)
        $bytes = [System.IO.File]::ReadAllBytes((Resolve-Path $path))
        Invoke-RestMethod -Uri $uri -Method Post -Headers $headers -Body $bytes -ContentType "application/octet-stream"
        Write-Host "Uploaded $name"
    }
}
Write-Host "Release $tag created: $($create.html_url)"
