#!/usr/bin/env node
/**
 * Converts Logo.png to a white-on-transparent icon (Logo-white.png).
 * Dark pixels (owl shape) → white; black background → transparent.
 */
const fs = require('fs')
const path = require('path')

async function main() {
  let sharp
  try {
    sharp = require('sharp')
  } catch {
    console.error('Run: npm install sharp --save-dev')
    process.exit(1)
  }

  const root = path.resolve(__dirname, '..')
  const input = path.join(root, 'Logo.png')
  const output = path.join(root, 'Logo-white.png')

  if (!fs.existsSync(input)) {
    console.error('Logo.png not found')
    process.exit(1)
  }

  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b

  for (let i = 0; i < data.length; i += channels) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const a = channels === 4 ? data[i + 3] : 255

    if (a < 10 || lum(r, g, b) < 15) {
      // background → transparent
      data[i] = 0
      data[i + 1] = 0
      data[i + 2] = 0
      data[i + 3] = 0
    } else {
      // foreground (owl) → white
      data[i] = 255
      data[i + 1] = 255
      data[i + 2] = 255
      data[i + 3] = 255
    }
  }

  await sharp(Buffer.from(data), {
    raw: { width, height, channels: 4 }
  })
    .png()
    .toFile(output)

  console.log('Created Logo-white.png')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
