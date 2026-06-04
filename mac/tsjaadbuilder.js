#!/usr/bin/env node
// tsjaadbuilder.js
// Self-contained build script for Tsjaad Olifant.
//
// Usage:
//   node tsjaadbuilder.js             # build for current platform
//   node tsjaadbuilder.js --mac       # build for macOS
//   node tsjaadbuilder.js --run       # build + launch
//
// What it does:
//   1. Runs `npm install` if node_modules is missing
//   2. Generates icon.icns from Tsjaad.png if missing (macOS only)
//   3. Runs electron-builder
//   4. Packages the result as a ready-to-run zip (kant-en-klaar)

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const args = process.argv.slice(2);
const flags = new Set(args);
const isMac = flags.has('--mac') || process.platform === 'darwin';
const shouldRun = flags.has('--run');
const projectDir = __dirname;
const distDir = path.join(projectDir, 'dist');

function log(msg) { console.log(`\x1b[36m[tsjaadbuilder]\x1b[0m ${msg}`); }
function ok(msg)  { console.log(`\x1b[32m[tsjaadbuilder]\x1b[0m ${msg}`); }
function die(msg) { console.error(`\x1b[31m[tsjaadbuilder]\x1b[0m ${msg}`); process.exit(1); }

function run(cmd, opts = {}) {
  log(`$ ${cmd}`);
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true, ...opts });
  if (r.status !== 0) die(`${cmd} failed (exit ${r.status})`);
}

function stepInstall() {
  if (!fs.existsSync(path.join(projectDir, 'node_modules'))) {
    log('Installing dependencies...');
    run('npm install', { cwd: projectDir });
  } else {
    log('node_modules already present, skipping install');
  }
}

function stepIcon() {
  const icnsPath = path.join(projectDir, 'icon.icns');
  if (fs.existsSync(icnsPath)) return;

  if (process.platform !== 'darwin') {
    log('icon.icns missing; only auto-generated on macOS. Skipping.');
    return;
  }
  if (!fs.existsSync('/usr/bin/sips') || !fs.existsSync('/usr/bin/iconutil')) {
    log('sips/iconutil not found, skipping icon generation.');
    return;
  }

  log('Generating icon.icns from Tsjaad.png...');
  const tmpIconset = path.join(projectDir, 'icon.iconset');
  fs.rmSync(tmpIconset, { recursive: true, force: true });
  fs.mkdirSync(tmpIconset, { recursive: true });

  const sizes = [16, 32, 64, 128, 256, 512];
  for (const s of sizes) {
    execSync(`sips -z ${s} ${s} Tsjaad.png --out "${tmpIconset}/icon_${s}x${s}.png"`,
      { cwd: projectDir, stdio: 'ignore' });
    const d = s * 2;
    if (d <= 1024) {
      execSync(`sips -z ${d} ${d} Tsjaad.png --out "${tmpIconset}/icon_${s}x${s}@2x.png"`,
        { cwd: projectDir, stdio: 'ignore' });
    }
  }
  execSync(`sips -z 1024 1024 Tsjaad.png --out "${tmpIconset}/icon_512x512@2x.png"`,
    { cwd: projectDir, stdio: 'ignore' });
  execSync(`iconutil -c icns "${tmpIconset}" -o "${icnsPath}"`, { stdio: 'inherit' });
  fs.rmSync(tmpIconset, { recursive: true, force: true });
  ok('icon.icns generated');
}

function stepBuild() {
  log('Running electron-builder...');
  const cmd = isMac ? 'npx electron-builder --mac' : 'npx electron-builder';
  run(cmd, { cwd: projectDir });
}

function stepPackage() {
  // Find the built .app
  const builtApps = [];
  function walk(dir) {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name.endsWith('.app')) builtApps.push(p);
        else walk(p);
      }
    }
  }
  if (!fs.existsSync(distDir)) die(`No dist/ directory found after build`);
  walk(distDir);
  if (builtApps.length === 0) die(`No .app bundle found in dist/`);

  const app = builtApps[0];
  const appName = path.basename(app);
  const arch = app.includes('arm64') ? 'mac-arm64' :
               app.includes('x64')   ? 'mac-x64'   : 'mac';
  const stage = path.join(os.tmpdir(), `tsjaad-stage-${Date.now()}`);
  const stageFolder = path.join(stage, appName.replace('.app', ''));
  fs.mkdirSync(stageFolder, { recursive: true });

  log(`Packaging ${appName} into ready-to-run folder...`);

  // Copy the .app
  execSync(`ditto "${app}" "${path.join(stageFolder, appName)}"`);

  // Write the launcher
  const launcher = path.join(stageFolder, `${appName.replace('.app','')}.command`);
  fs.writeFileSync(launcher, `#!/bin/bash
# Tsjaad Olifant launcher
DIR="$(cd "$(dirname "$0")" && pwd)"
APP="$DIR/${appName}"
xattr -cr "$APP" 2>/dev/null
codesign --force --deep --sign - "$APP" 2>/dev/null
open "$APP"
`);
  fs.chmodSync(launcher, 0o755);

  // Write a tiny README
  fs.writeFileSync(path.join(stageFolder, 'README.txt'),
`Tsjaad Olifant — macOS Desktop Pet
==================================

HOW TO RUN:

  Double-click "${appName.replace('.app','')}.command" (one-time setup)

  After that, just double-click ${appName} normally.

TO QUIT: Cmd+Q while the elephant window is focused.

`);

  // Zip it
  const zipPath = path.join(projectDir, `TsjaadOlifant-${arch}.zip`);
  if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
  log(`Creating ${path.basename(zipPath)}...`);
  execSync(`ditto -c -k --sequesterRsrc --keepParent "${stageFolder}" "${zipPath}"`);
  fs.rmSync(stage, { recursive: true, force: true });
  ok(`Done! Output: ${zipPath}`);
  return zipPath;
}

function stepRun(zipPath) {
  log('Launching the built app...');
  // Extract the zip to a temp dir and run the launcher
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tsjaad-run-'));
  execSync(`ditto -x -k "${zipPath}" "${tmp}"`);
  const entries = fs.readdirSync(tmp);
  const folder = path.join(tmp, entries[0]);
  const launcher = fs.readdirSync(folder).find(f => f.endsWith('.command'));
  if (!launcher) die('No .command launcher found in zip');
  execSync(`open "${path.join(folder, launcher)}"`);
  ok('Launched! Look for the elephant on your desktop.');
}

(async () => {
  log('Tsjaad Olifant self-builder');
  stepInstall();
  stepIcon();
  stepBuild();
  const zipPath = stepPackage();
  ok('Build complete.');
  if (shouldRun) stepRun(zipPath);
})().catch(err => die(err.stack || err.message));
