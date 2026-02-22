#!/usr/bin/env node
/**
 * Creates an animated GIF of the Rephrase voice widget (Ctrl+Win).
 * Run: node scripts/create-widget-gif.js
 * Output: widget-demo.gif
 */

const fs = require('fs')
const path = require('path')

async function main() {
  const gifenc = require('gifenc')
  const GIFEncoder = gifenc.GIFEncoder
  const quantize = gifenc.quantize
  const applyPalette = gifenc.applyPalette

  // Same size as actual voice overlay: 178×40
  const W = 178
  const H = 40
  const fps = 30
  const duration = 2
  const frames = fps * duration
  const delayMs = 1000 / fps

  // Colors RGBA — matches VoiceOverlay
  const BG = [26, 26, 46, 255]
  const PILL = [255, 255, 255, 255]
  const BAR = [26, 26, 26, 255]
  // Chrome logo quadrants: red, blue, yellow, green
  const CHROME_RED = [234, 67, 53, 255]
  const CHROME_BLUE = [66, 133, 244, 255]
  const CHROME_YELLOW = [251, 188, 4, 255]
  const CHROME_GREEN = [52, 168, 83, 255]

  function setPixel(data, x, y, color) {
    if (x < 0 || x >= W || y < 0 || y >= H) return
    const i = (y * W + x) * 4
    data[i] = color[0]
    data[i + 1] = color[1]
    data[i + 2] = color[2]
    data[i + 3] = color[3]
  }

  function inPill(x, y) {
    const px = 4, py = 6, pw = 170, ph = 28, r = 14
    if (x < px || x > px + pw || y < py || y > py + ph) return false
    if (x >= px + r && x <= px + pw - r) return true
    if (y >= py + r && y <= py + ph - r) return true
    const corners = [
      [px + r, py + r], [px + pw - r, py + r],
      [px + r, py + ph - r], [px + pw - r, py + ph - r]
    ]
    return corners.some(([cx, cy]) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r)
  }

  const maxH = [4, 8, 6, 10, 7, 12, 9, 6, 10, 5, 9, 6, 4]
  const gif = GIFEncoder()

  for (let f = 0; f < frames; f++) {
    const data = new Uint8Array(W * H * 4)
    const t = (f / fps) * 0.5

    // Background
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        setPixel(data, x, y, BG)
      }
    }

    // Pill
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        if (inPill(x, y)) setPixel(data, x, y, PILL)
      }
    }

    // Chrome logo — 4 quadrants (red, blue, yellow, green)
    const ix = 10, iy = 10, iw = 20, ih = 20
    const midX = ix + iw / 2, midY = iy + ih / 2
    for (let dy = 0; dy < ih; dy++) {
      for (let dx = 0; dx < iw; dx++) {
        const gx = ix + dx, gy = iy + dy
        if (!inPill(gx, gy)) continue
        const inLeft = dx < iw / 2, inTop = dy < ih / 2
        const c = inTop ? (inLeft ? CHROME_RED : CHROME_BLUE) : (inLeft ? CHROME_YELLOW : CHROME_GREEN)
        setPixel(data, gx, gy, c)
      }
    }

    // Bars (13 bars, animated heights)
    const barX = 38
    const barGap = 1
    const barW = 1
    const barBaseY = 26
    for (let i = 0; i < 13; i++) {
      const phase = (i / 13) * Math.PI * 2 + t * 4
      const h = Math.max(2, (Math.sin(phase) * 0.5 + 0.5) * 0.85 * maxH[i] + maxH[i] * 0.15)
      const bx = barX + i * (barW + barGap)
      for (let py = 0; py < h; py++) {
        const y = barBaseY - py
        for (let px = 0; px < barW; px++) {
          if (inPill(bx + px, y)) setPixel(data, bx + px, y, BAR)
        }
      }
    }

    const palette = quantize(data, 256)
    const index = applyPalette(data, palette)
    gif.writeFrame(index, W, H, { palette, delay: delayMs })
  }

  gif.finish()
  const outPath = path.join(__dirname, '..', 'widget-demo.gif')
  fs.writeFileSync(outPath, Buffer.from(gif.bytes()))
  console.log('Created', outPath)
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
