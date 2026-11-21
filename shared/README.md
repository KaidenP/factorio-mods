# shared/

Lua code shared across mods in this monorepo.

Factorio sandboxes each mod, so shared code can't be `require`d across mods at
runtime. Instead, `scripts/build.mjs` copies everything under `shared/` into
each mod before packaging. From any mod you can then write:

```lua
local util = require("shared.lib.util")
```

## Layout

- `lib/` — generic Lua helpers (no Factorio prototype/entity dependencies).

Add more top-level categories as the repo grows (e.g. `prototypes/`,
`gui/`, …), and use a mod's `build.json` to include only what it needs:

```json
{ "shared": ["lib"] }
```

Omitting `build.json` copies *all* of `shared/` into the mod.
