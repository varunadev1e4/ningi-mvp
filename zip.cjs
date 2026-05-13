// zip.cjs — run after `npm run build` to produce ningi.zip
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const DIST = path.join(__dirname, 'dist')
const OUT  = path.join(__dirname, 'ningi.zip')

if (!fs.existsSync(DIST)) {
  console.error('❌  dist/ not found — run `npm run build` first')
  process.exit(1)
}

if (fs.existsSync(OUT)) fs.unlinkSync(OUT)
execSync(`cd "${DIST}" && zip -r "${OUT}" .`, { stdio: 'inherit' })
console.log(`✅  Created ${OUT}`)
