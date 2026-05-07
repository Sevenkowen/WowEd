/**
 * Genera public/wowed-logo.png con fondo oscuro ~#0b111e transparente.
 * Colocá la imagen original en public/wowed-logo-source.png y ejecutá:
 *   npm run logo:transparent
 */
import sharp from 'sharp'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
const src = path.join(root, 'public', 'wowed-logo-source.png')
const out = path.join(root, 'public', 'wowed-logo.png')

if (!existsSync(src)) {
  console.error('Falta public/wowed-logo-source.png (exportá el logo con el fondo original).')
  process.exit(1)
}

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h } = info

const br = 11
const bg = 17
const bb = 30

for (let i = 0; i < data.length; i += 4) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255
  const sat = max === 0 ? 0 : (max - min) / max
  const dist = Math.hypot(r - br, g - bg, b - bb)

  let alpha = data[i + 3]
  if (dist < 52) alpha = 0
  else if (lum < 0.14 && sat < 0.32) alpha = 0
  else if (lum < 0.2 && sat < 0.22 && dist < 85) alpha = 0

  data[i + 3] = alpha
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(out)

console.log('OK ->', out)
