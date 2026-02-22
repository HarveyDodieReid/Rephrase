# Code Signing (Fix Windows SmartScreen Warning)

Windows SmartScreen blocks unsigned apps with "Unknown publisher". To fix this, sign your installer with a code signing certificate.

## Option 1: Use a Code Signing Certificate (Recommended)

1. **Get a certificate** (one of these):
   - [SignPath.io](https://signpath.io) – free for open source
   - [DigiCert](https://www.digicert.com/signing/code-signing-certificates), [Sectigo](https://sectigo.com/ssl-certificates-tls/code-signing) – paid EV certs (~$200–400/year)
   - [Azure Trusted Signing](https://learn.microsoft.com/en-us/azure/trusted-signing/overview) – cloud-based

2. **Export your cert as a `.pfx` file** (if you get a .pfx from the provider, you’re done).

3. **Build and sign** – set these env vars before `npm run build`:
   ```powershell
   $env:CSC_LINK = "path\to\your-certificate.pfx"
   $env:CSC_KEY_PASSWORD = "your-certificate-password"
   npm run build
   ```

4. **Create the release** as usual with `create-release.ps1`.

## Option 2: User Workaround (No Signing)

Users can still run the installer:
- Click **More info**
- Click **Run anyway**

This is safe for your own builds, but many users won’t accept the warning.
