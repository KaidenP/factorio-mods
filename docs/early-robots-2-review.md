# EarlyRobots2 — Review & Improvement Report

- **Mod:** Early Robots for 2.0 (`EarlyRobots2`), version 1.0.4
- **Source:** <https://mods.factorio.com/mod/EarlyRobots2> — reviewed the published `EarlyRobots2_1.0.4.zip`
- **Authors:** Dziebel 133 and BCC (successor to *Early Robots* by AriMeower)
- **License:** MIT (per the mod portal)
- **Factorio target:** 2.0 (`dependencies: ["base >= 2.0"]`)
- **Imported into this repo at:** `mods/early-robots-2/` (builds to `dist/EarlyRobots2_1.0.4.zip`)

---

## 1. Overview

EarlyRobots2 is a small, data-only mod that makes the utility-robot tech
(construction/logistic robots, roboports, logistic chests, and the flying robot
frame) available **much earlier and much cheaper** than in vanilla, while also
cutting their energy costs. It does not add new items — it rewrites existing
prototypes so the player can build robots from the very start of the game.

There is no `control.lua`; the entire mod runs in the data stage and produces no
runtime scripts.

## 2. How it works

The mod has five Lua files plus locale and a changelog:

| File | Stage | Role |
| ---- | ----- | ---- |
| `settings.lua` | settings | Defines 2 startup settings (`er2_logistic-storage`, `er2_trash-slots`) |
| `data-updates.lua` | data-updates | Entry point — `require`s the two prototype files |
| `prototypes/recipe.lua` | data-updates | Rewrites recipes (roboport, robots, chests, frames, iron stick) |
| `prototypes/entity.lua` | data-updates | Rewrites entity energy costs + chest inventory/trash sizes |
| `locale/en/mod.cfg` | — | Setting names, descriptions, and string-setting labels |

It deliberately runs in the **data-updates** stage (after `data`), so its
changes apply on top of the base game *and* after most other mods' data-stage
changes. All prototype field names referenced below were verified against the
official Factorio 2.0 prototype API (`prototype-api.json`).

### Recipe changes (`prototypes/recipe.lua`)

| Recipe | New ingredients | Also |
| ------ | --------------- | ---- |
| `roboport` | 45× electronic circuit, 100× iron plate, 45× iron gear wheel | `enabled = true` |
| `logistic-robot` | 2× electronic circuit, 1× flying robot frame | `enabled = true` |
| `construction-robot` | 2× electronic circuit, 1× flying robot frame | `enabled = true` |
| `flying-robot-frame` | 3× electronic circuit, 20× iron stick, 10× copper plate, 4× iron gear wheel | `enabled = true`, `energy_required = 5` |
| `active-provider-chest`, `passive-provider-chest`, `storage-chest`, `requester-chest`, `buffer-chest` | 5× electronic circuit, 1× iron chest, 24× iron plate | `enabled = true` |
| `iron-stick` | *(unchanged)* | `enabled = true` |

Setting `enabled = true` is what removes the research/trigger gate — these
recipes are normally hidden until the appropriate research unlocks them, so this
single flag is the core "early robots" mechanism.

### Entity changes (`prototypes/entity.lua`)

| Entity | Field | New value |
| ------ | ----- | --------- |
| `roboport` | `charging_energy` | `400kW` |
| | `energy_usage` | `20kW` |
| | `energy_source.buffer_capacity` | `40MJ` |
| | `energy_source.input_flow_limit` | `2MW` |
| `logistic-robot` / `construction-robot` | `energy_per_move` | `2kJ` |
| | `energy_per_tick` | `1200W` |
| | `max_energy` | `600kJ` |
| all 5 logistic chests | `inventory_size` | `er2_logistic-storage` setting (default 59) |
| | `trash_inventory_size` | per `er2_trash-slots` setting |

The robot energy numbers substantially cut per-tile and per-tick operating
cost and shrink the battery (`max_energy`), which also shortens recharge
cycles. The roboport is likewise made far cheaper to idle (`energy_usage` =
20kW) while keeping a 2MW input cap and a 40MJ buffer.

---

## 3. Bugs

### 3.1 (High) Dead `elseif` — "Old 1.0.3" trash-slot scheme is broken

`prototypes/entity.lua`:

```lua
if config("trash-slots") == "er2_1.0.4" then
    TrashInventorySlots = math.ceil(config("logistic-storage")/10) * 10
elseif config("trash-slots") == "er2_1.0.4" then      -- ← should be "er2_1.0.3"
    TrashInventorySlots = config("logistic-storage")
end
```

Both branches test the **same** value `"er2_1.0.4"`, so the `elseif` is dead
code. When the user selects **"Old 1.0.3"**, neither branch matches,
`TrashInventorySlots` stays at its initial `0`, and the code then writes
`trash_inventory_size = 0` — silently giving chests **zero trash slots** instead
of the intended "same as normal inventory size" behaviour. (`0` is a valid value
for `trash_inventory_size` — it's the prototype default — so this fails silently
rather than erroring on load.)

**Fix:** change the `elseif` condition to `== "er2_1.0.3"`.

### 3.2 (Low) "Next multiple of 10 greater than" is actually "rounded up"

`math.ceil(storage/10) * 10` rounds **up** to the nearest multiple of 10, which
equals the input when the storage size is already a multiple of 10 (e.g. storage
50 → 50, not 60). The 1.0.4 changelog wording ("next multiple of 10 *greater
than* the normal inventory size") doesn't match the code. Cosmetic, but if the
intent was strictly "greater", it needs `+10` when already a multiple.

### 3.3 (Medium) No defensive `data.raw` guards — brittle against other mods

Every access assumes the target prototype exists:

```lua
data.raw["recipe"][LogisticChest].ingredients = { ... }
data.raw["logistic-container"][LogisticChest].inventory_size = ...
```

If another mod removes or renames a chest/recipe/robot (the changelog already
records a real compatibility break with **AAI Containers & Warehouses** in
1.0.1), any of these lines throws `attempt to index a nil value` and **the mod
fails to load**, taking the whole save down with it. Wrapping each in a
nil-check (or iterating only over chests that still exist) would make it
resilient and is the standard pattern for "tweak other mods' stuff" mods.

---

## 4. Improvements & suggestions

1. **Fix 3.1** — trivial one-line correction of the `elseif` condition.

2. **DRY the `config()` helper.** The identical `local function config(name)`
   is copy-pasted into all three of `data-updates.lua`, `prototypes/entity.lua`,
   and `prototypes/recipe.lua` (and is unused in `data-updates.lua`). Move it
   into a `prototypes/config.lua` that returns the function and `require` it,
   or define the setting prefix as a single constant.

3. **Guard the prototype lookups (3.3).** E.g.
   `local r = data.raw["logistic-container"][name]` `if r then ... end`, or
   build the chest list from `data.raw` rather than a hard-coded list.

4. **Space Age awareness.** In the 2.0 *Space Age* expansion the logistics
   network (and requester/buffer chests) is gated behind space science and
   interplanetary logistics. Unconditionally `enabled = true` on all five chests
   and the robots bypasses that progression and may unbalance SA runs. Consider
   detecting `mods["space-age"]` (or the relevant trigger tech) and offering a
   setting or gating behaviour that preserves SA pacing.

5. **Make the tuning numbers settings.** The recipe quantities and energy values
   are hard-coded magic numbers. A handful of startup settings (or at least
   named `local` constants at the top of each file with comments explaining the
   vanilla values being replaced) would make the mod much easier to balance and
   maintain.

6. **Distinct setting `order` values.** Both settings use `order = "a"`; giving
   them `"a"` / `"b"` sorts them deterministically in the settings UI.

7. **Ship a `LICENSE` file.** The portal declares MIT but the zip contains no
   license text; adding one makes the terms unambiguous for downstream reuse
   (relevant since this monorepo is importing it).

8. **Minor style/consistency.**
   - `settings.lua` writes `data:extend{ ... }` while the rest of the code uses
     `data.raw` mutations — fine, but worth standardising the intent (extend vs.
     mutate) in comments.
   - The hard-coded chest list is duplicated in `recipe.lua` and `entity.lua`;
     hoist it into the shared `config` module.
   - `math.ceil` is only needed in one place; the `config()` lookups inside the
     loop could be hoisted out of the per-chest loop.

---

## 5. Compatibility notes

- **Targets `base >= 2.0`** and runs purely in data-updates, so it plays nicely
  with most content mods *provided they don't rename/remove the vanilla
  robots/chests* (see 3.3).
- Historically collided with **AAI Containers & Warehouses** (fixed in 1.0.1);
  the current code's unguarded lookups mean similar collisions are still a load
  failure, not a graceful skip.
- No `control.lua`, no migrations, no runtime state — it's purely data-stage,
  so it adds no per-save footprint and is trivial to remove. Prototype edits
  apply on every load, so they affect existing saves as well as new ones
  (existing entities pick up the new energy/inventory values).

## 6. Verdict

A focused, easy-to-understand quality-of-life mod that does exactly what it says
with very little code. It ships one real bug (the dead `elseif` that zeroes trash
slots for the "1.0.3" option) and is overly brittle against mod conflicts, but
the core recipe/energy changes are sound and correctly staged in data-updates.
Recommended fixes: **3.1** (correctness) and **3.3** (robustness) first; the
rest are polish.
