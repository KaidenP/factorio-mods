# factorio-mods

Monorepo for developing [Factorio](https://www.factorio.com/) mods.

Each mod lives in its own directory under [`mods/`](mods), shares common Lua
code from [`shared/`](shared), and is packaged into a ready-to-install
`<name>_<version>.zip` by a dependency-free Node build script.

## Layout

```
factorio-mods/
├── mods/                    # one directory per mod
│   └── example-mod/         #   a working starter mod (copy me)
│       ├── info.json        #   required mod metadata
│       ├── data.lua         #   data stage (prototypes)
│       ├── control.lua      #   control stage (runtime)
│       ├── settings.lua     #   mod settings
│       └── locale/en/       #   translations
├── shared/                  # Lua code shared across mods
│   └── lib/                 #   copied into each mod at build time
├── scripts/                 # build tooling (no dependencies)
│   ├── build.mjs
│   └── zip.mjs
├── dist/                    # built zips (gitignored)
└── .luarc.json              # Lua language server config
```

## Prerequisites

- **Node.js 18+** (only needed for the build tooling, not to run Factorio)
- Factorio 2.0+ (or later) installed
- Optional: [lua-language-server](https://luals.github.io/) for editor
  IntelliSense — the workspace `.luarc.json` wires it up for Factorio.

## Quick start

1. Copy the starter mod:

   ```bash
   cp -r mods/example-mod mods/my-mod
   ```

2. Edit `mods/my-mod/info.json` (name, version, title, author, description).

3. Build:

   ```bash
   npm run build          # packages every mod into dist/
   npm run build my-mod   # build a single mod
   ```

4. Install into Factorio:

   ```bash
   npm run install-mods   # copies dist/*.zip into your Factorio mods folder
   ```

   If your mods folder isn't auto-detected, set `FACTORIO_MODS_DIR`:

   ```bash
   FACTORIO_MODS_DIR=/path/to/mods npm run install-mods
   ```

## Shared code

Factorio runs each mod in its own sandbox, so shared Lua can't be `require`d
across mods at runtime. Instead, the build script copies everything under
`shared/` into each mod before packaging. From a mod you can then write:

```lua
local util = require("shared.lib.util")
```

By default **all** of `shared/` is copied into every mod. To be selective, add a
`build.json` next to a mod's `info.json`:

```json
{ "shared": ["lib"] }
```

## Mod structure conventions

| File | Stage | Purpose |
| ---- | ----- | ------- |
| `info.json` | — | Required metadata: `name`, `version`, `title`, `author`, `factorio_version`, `dependencies` |
| `settings.lua` | settings | Defines player/map settings (before data) |
| `data.lua` | data | Defines prototypes (items, recipes, entities, …) |
| `data-updates.lua` / `data-final-fixes.lua` | data | Late data-stage changes |
| `control.lua` | runtime | Game logic and event handlers |
| `locale/en/locale.cfg` | — | Human-readable names and descriptions |

## Commands

```bash
npm run build          # build all mods -> dist/
npm run build <name>   # build one mod
npm run watch          # rebuild on file changes
npm run clean          # remove dist/ and build staging
npm run install-mods   # build + copy zips to the Factorio mods folder
```

## Editor setup

Install `lua-language-server` and open the repo — `.luarc.json` configures it
to:

- treat `data`, `control`, `settings`, `remote` and the Factorio globals as
  available,
- resolve `require("shared.…")` paths to `shared/`.

For full Factorio API autocomplete, generate type definitions from the official
API docs (for example with
[`factorio-types-to-defs`](https://github.com/justarandomgeek/factorio-types-to-defs))
and drop the generated `*.lua` files into a `lua/` directory at the repo root,
then add that path to `.luarc.json`'s `workspace.library`.
