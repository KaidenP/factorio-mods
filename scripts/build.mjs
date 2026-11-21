// scripts/build.mjs
//
// Build tooling for the Factorio mods monorepo. Discovers every mod under
// mods/, stages it (mod source + selected shared/ code) into .build/, and
// writes a ready-to-install <name>_<version>.zip into dist/.
//
// Usage:
//   node scripts/build.mjs            build every mod
//   node scripts/build.mjs <name>     build a single mod (by directory name)
//   node scripts/build.mjs --clean    remove dist/ and .build/
//   node scripts/build.mjs --install  build + copy zips into the Factorio mods dir
//   node scripts/build.mjs --watch    rebuild whenever mods/ or shared/ change

import { createZip } from './zip.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MODS_DIR = path.join(ROOT, 'mods');
const SHARED_DIR = path.join(ROOT, 'shared');
const DIST_DIR = path.join(ROOT, 'dist');
const STAGING_DIR = path.join(ROOT, '.build');

// Files that are repo/metadata artifacts, not part of the packaged mod.
const SKIP_NAMES = new Set(['build.json', 'readme.md']);

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

function log(...args) {
  console.log(...args);
}

function warn(...args) {
  console.warn('!', ...args);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

// Recursively list files under `dir`, returning paths relative to `dir`
// (POSIX separators, which is what ZIP entries and Factorio expect).
function listFiles(dir) {
  const results = [];
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else if (entry.isFile()) {
        results.push(path.relative(dir, full).split(path.sep).join('/'));
      }
    }
  }
  return results.sort();
}

function copyEntry(src, destRoot) {
  const name = path.basename(src);
  if (name.startsWith('.') || /^README(\.md)?$/i.test(name)) {
    return;
  }
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    const dest = path.join(destRoot, name);
    ensureDir(dest);
    for (const child of fs.readdirSync(src)) {
      copyEntry(path.join(src, child), dest);
    }
  } else if (stat.isFile()) {
    const dest = path.join(destRoot, name);
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

function discoverMods() {
  if (!fs.existsSync(MODS_DIR)) {
    return [];
  }
  return fs
    .readdirSync(MODS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => fs.existsSync(path.join(MODS_DIR, name, 'info.json')))
    .sort();
}

// ---------------------------------------------------------------------------
// Staging
// ---------------------------------------------------------------------------

function stageMod(name) {
  const modSrc = path.join(MODS_DIR, name);
  const info = readJson(path.join(modSrc, 'info.json'));

  if (!info.name || !info.version) {
    throw new Error(`mods/${name}/info.json must define "name" and "version"`);
  }

  const staging = path.join(STAGING_DIR, name);
  removeDir(staging);
  ensureDir(staging);

  // 1. Copy the mod's own files (everything except build config / dotfiles).
  for (const rel of listFiles(modSrc)) {
    const baseName = rel.split('/').pop().toLowerCase();
    if (SKIP_NAMES.has(baseName) || rel.startsWith('.')) {
      continue;
    }
    const src = path.join(modSrc, ...rel.split('/'));
    const dest = path.join(staging, ...rel.split('/'));
    ensureDir(path.dirname(dest));
    fs.copyFileSync(src, dest);
  }

  // 2. Copy shared code. Default: everything in shared/. A mod's build.json
  //    can restrict this to a subset of shared/'s top-level entries.
  let selection = null;
  const buildConfig = path.join(modSrc, 'build.json');
  if (fs.existsSync(buildConfig)) {
    selection = readJson(buildConfig).shared ?? null;
  }

  if (fs.existsSync(SHARED_DIR)) {
    const entries = selection ?? fs.readdirSync(SHARED_DIR);
    for (const entry of entries) {
      const src = path.join(SHARED_DIR, entry);
      if (fs.existsSync(src)) {
        copyEntry(src, path.join(staging, 'shared'));
      } else if (selection) {
        warn(`mods/${name}/build.json references missing shared entry "${entry}"`);
      }
    }
  }

  return { name, info, staging };
}

// ---------------------------------------------------------------------------
// Packaging
// ---------------------------------------------------------------------------

function packageMod({ name, info, staging }) {
  // Factorio requires mod files to live inside a single top-level directory
  // within the zip. The directory name is arbitrary; use the mod's internal
  // name for consistency.
  const files = listFiles(staging).map((rel) => ({
    name: `${info.name}/${rel}`,
    data: fs.readFileSync(path.join(staging, ...rel.split('/'))),
    mtime: fs.statSync(path.join(staging, ...rel.split('/'))).mtime,
  }));

  ensureDir(DIST_DIR);
  const outFile = path.join(DIST_DIR, `${info.name}_${info.version}.zip`);
  fs.writeFileSync(outFile, createZip(files));
  return outFile;
}

// ---------------------------------------------------------------------------
// Install
// ---------------------------------------------------------------------------

function detectFactorioModsDir() {
  const override = process.env.FACTORIO_MODS_DIR;
  if (override) {
    return override;
  }

  if (process.env.APPDATA) {
    return path.join(process.env.APPDATA, 'factorio', 'mods');
  }

  const home = os.homedir();
  const candidates = [
    // WSL: the Windows AppData dir for the invoking user.
    path.join('/mnt/c/Users', os.userInfo().username, 'AppData', 'Roaming', 'factorio', 'mods'),
    path.join(home, 'Library', 'Application Support', 'factorio', 'mods'), // macOS
    path.join(home, '.factorio', 'mods'), // Linux
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function installMods(zipFiles) {
  const modsDir = detectFactorioModsDir();
  if (!modsDir) {
    warn('could not detect the Factorio mods folder; set FACTORIO_MODS_DIR');
    return;
  }
  ensureDir(modsDir);
  for (const zipFile of zipFiles) {
    fs.copyFileSync(zipFile, path.join(modsDir, path.basename(zipFile)));
    log(`installed ${path.basename(zipFile)} -> ${modsDir}`);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const flags = new Set();
  const positional = [];
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      flags.add(arg);
    } else {
      positional.push(arg);
    }
  }
  return { flags, positional };
}

function build(nameFilter) {
  const requested = nameFilter
    ? [nameFilter]
    : discoverMods();

  if (nameFilter && !discoverMods().includes(nameFilter)) {
    throw new Error(`no mod named "${nameFilter}" found in mods/ (must contain info.json)`);
  }

  const zipFiles = [];
  for (const name of requested) {
    log(`building ${name} ...`);
    const staged = stageMod(name);
    const zipFile = packageMod(staged);
    zipFiles.push(zipFile);
    log(`  -> ${path.relative(ROOT, zipFile)}`);
  }

  if (zipFiles.length === 0) {
    log('no mods found under mods/');
  }

  return zipFiles;
}

function clean() {
  removeDir(DIST_DIR);
  removeDir(STAGING_DIR);
  log('removed dist/ and .build/');
}

function watch() {
  const targets = [MODS_DIR, SHARED_DIR].filter((dir) => fs.existsSync(dir));
  let timer = null;
  const rebuild = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      try {
        build();
      } catch (error) {
        warn(error.message);
      }
    }, 150);
  };
  for (const dir of targets) {
    fs.watch(dir, { recursive: true }, rebuild).on('error', () => {
      warn(`watch on ${dir} failed (common on WSL/DrvFs); run "npm run build" manually`);
    });
  }
  log('watching for changes (Ctrl+C to stop) ...');
  build();
}

function main() {
  const { flags, positional } = parseArgs(process.argv.slice(2));

  if (flags.has('--clean')) {
    clean();
    return;
  }
  if (flags.has('--watch')) {
    watch();
    return;
  }

  const zipFiles = build(positional[0]);
  if (flags.has('--install')) {
    installMods(zipFiles);
  }
}

main();
