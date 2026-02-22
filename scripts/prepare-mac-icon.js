#!/usr/bin/env node
/**
 * Resizes Logo.png to 512x512 for electron-builder mac icon (requires min 512x512).
 */
const fs = require('fs')
const path = require('path')

async function main() {
  const sharp = require('sharp')
  const root = path.resolve(__dirname, '..')
  const input = path.join(root, 'Logo.png')
  const output = path.join(root, 'Logo-mac.png')

  if (!fs.existsSync(input)) {
    console.error('Logo.png not found')
    process.exit(1)
  }

  await sharp(input)
    .resize(512, 512)
    .png()
    .toFile(output)

  console.log('Created Logo-mac.png (512x512)')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
