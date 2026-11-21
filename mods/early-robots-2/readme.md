# Early Robots for 2.0

Want construction and logistics robots from the very start of the game?
**EarlyRobots2** rewrites the recipes and energy costs of the utility robots —
construction robots, logistic robots, roboports, and the five logistic chests —
so they are available far earlier and are much cheaper to build and run than in
vanilla.

## Features

- **Robots from the start** — construction and logistic robot recipes are
  unlocked immediately, no research required.
- **Cheaper recipes** — roboports, robots, flying robot frames, and logistic
  chests cost a fraction of their vanilla resources, and the iron stick recipe
  is enabled at the start of the game.
- **Cheaper to run** — robot `energy_per_move` and `energy_per_tick` are cut,
  and the roboport's idle power draw is reduced.
- **Bigger logistic chests** — configurable inventory size (default 59 slots,
  vs. the base game's 48).
- **Configurable trash slots** — choose how many trash slots logistic chests
  get.

## Settings

- **Logistic Chest Storage Size** — the number of slots each logistic chest has
  (default 59, range 1–299).
- **Trash Slot Scheme** — how trash slots are sized:
  - *New 1.0.4* (default): the next multiple of 10 above the storage size.
  - *Old 1.0.3*: the same number of slots as the normal inventory.
  - *Base Game*: leave trash slots at their vanilla values.

## Compatibility

Targets Factorio **2.0** (`base >= 2.0`). The mod only edits prototypes in the
data-updates stage, so it works alongside most mods that do not remove or rename
the vanilla robots and chests.

## Credits

- Original *Early Robots* mod by **AriMeower**.
- *Early Robots for 2.0* (EarlyRobots2) by **Dziebel 133** and **BCC**.
- Licensed under the **MIT** license.
