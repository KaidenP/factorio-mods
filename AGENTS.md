# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

Monorepo for developing Factorio mods. Each mod is a directory under `mods/`
containing Factorio Lua files (`data.lua`, `control.lua`, `settings.lua`, …) and
a required `info.json`. The build tooling packages each mod into a
`<name>_<version>.zip` that Factorio can load.

## Stack

- Lua (Factorio 2.0 API, mod structure) — no Lua toolchain required to build
- Node.js 18+ for build tooling — **zero npm dependencies** (pure Node stdlib)
- `scripts/zip.mjs` writes zips by hand (CRC-32 + "stored" method), so builds
  work anywhere Node runs, no `zip` binary needed.

## Commands

```bash
npm run build            # build all mods -> dist/*.zip
npm run build <name>     # build a single mod
npm run watch            # rebuild on change
npm run clean            # remove dist/ and staging
npm run install-mods     # build + copy zips into the Factorio mods folder
```

The Factorio mods folder is auto-detected (Windows
`%APPDATA%\factorio\mods`, macOS `~/Library/Application Support/factorio/mods`,
Linux `~/.factorio/mods`). Override with `FACTORIO_MODS_DIR`.

## Layout

- `mods/<name>/` — one mod per directory. `info.json` holds `name` and
  `version`; the zip is named from those fields.
- `mods/<name>/build.json` — optional; `{ "shared": ["lib"] }` restricts which
  `shared/` subdirectories get copied into the mod at build time. Omit to copy
  all of `shared/`.
- `shared/` — Lua code shared across mods. Copied into each mod (as
  `shared/…`) at build time, then `require("shared.lib.foo")` from the mod.
- `scripts/build.mjs` — orchestration (discover, stage, zip, install, watch).
- `scripts/zip.mjs` — minimal, dependency-free ZIP writer.
- `dist/`, `.build/` — build output, gitignored.

## Gotchas that matter

### 1. Line endings: LF only
Committed files use LF. Factorio's Lua runtime can misbehave on CRLF, and mixed
endings produce `git status` noise on Windows. `.gitattributes` enforces
`eol=lf`. **Never commit line-ending-only changes.** If you must, strip CRs:
`sed -i 's/\r$//' <file>`.

### 2. `info.json` name/version drive the artifact
The output zip is `<name>_<version>.zip`. Changing a mod's `name` or `version`
changes the artifact filename. Never hand-edit a zip in `dist/`; rebuild.

### 3. Each mod is sandboxed — no cross-mod require
Factorio loads each mod in isolation. Shared code must be physically copied into
the mod (the build does this) and `require`d relative to the mod root. Don't
`require` across `mods/<a>` → `mods/<b>`.

### 4. Entry points are magic
Only `data.lua`, `data-updates.lua`, `data-final-fixes.lua`, `settings.lua`,
`settings-updates.lua`, `settings-final-fixes.lua`, and `control.lua` are loaded
automatically. Any other `.lua` file is only loaded when explicitly `require`d.

### 5. Dependencies use Factorio mod names
`info.json` `dependencies` entries reference mod *names* (e.g. `base`,
`space-age`), not directory paths. Required mods must be installed in Factorio
for the mod to load.

### 6. Don't commit `dist/` or zips
Build artifacts are gitignored. The repo is source only; CI (if added later)
runs `npm run build`.
