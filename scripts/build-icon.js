#!/usr/bin/env node
/**
 * Creates build-resources/icon.ico from Logo.png for electron-builder.
 * Windows requires .ico for exe/installer icons.
 */
const fs = require('fs')
const path = require('path')

async function main() {
  const sharp = require('sharp')
  const pngToIco = require('png-to-ico')

  const root = path.resolve(__dirname, '..')
  const input = path.join(root, 'Logo.png')
  const outDir = path.join(root, 'build-resources')
  const output = path.join(outDir, 'icon.ico')

  if (!fs.existsSync(input)) {
    console.error('Logo.png not found')
    process.exit(1)
  }

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true })
  }

  const sizes = [256, 48, 32, 16]
  const buffers = await Promise.all(
    sizes.map((size) =>
      sharp(input)
        .resize(size, size)
        .png()
        .toBuffer()
    )
  )

  const toIco = pngToIco.default || pngToIco
  const ico = await toIco(buffers)
  fs.writeFileSync(output, ico)
  console.log('Created build-resources/icon.ico')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
