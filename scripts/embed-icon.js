/**
 * Electron-builder afterPack hook: embed icon in the .exe using rcedit.
 * Used when signAndEditExecutable is false (avoids winCodeSign symlink issues).
 */
const path = require('path')
const { rcedit } = require('rcedit')

exports.default = async function (context) {
  if (context.electronPlatformName !== 'win32') return

  const appOutDir = context.appOutDir
  const exeName = `${context.packager.appInfo.productFilename}.exe`
  const exePath = path.join(appOutDir, exeName)
  const iconPath = path.join(context.packager.projectDir, 'build-resources', 'icon.ico')

  try {
    await rcedit(exePath, { icon: iconPath })
    console.log(`Embedded icon in ${exeName}`)
  } catch (err) {
    console.warn('rcedit failed (icon not embedded):', err.message)
  }
}
