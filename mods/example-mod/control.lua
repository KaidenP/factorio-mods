-- control.lua — control stage (runtime).
-- Runs inside a save. Hook game events with script.on_event / script.on_init,
-- read mod settings via settings.startup / settings.global, etc.

-- Shared code is copied into the mod at build time, so it can be require'd
-- exactly like local code. Run `npm run build` before loading the mod.
local util = require("shared.lib.util")

script.on_init(function()
  util.log_hello("example-mod")
end)
