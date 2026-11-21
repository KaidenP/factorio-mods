-- shared/lib/util.lua
-- Example shared module. Copied into each mod at build time (see scripts/build.mjs)
-- and loadable via:  local util = require("shared.lib.util")

local util = {}

--- Log a friendly greeting using Factorio's `log` global.
--- @param mod_name string
function util.log_hello(mod_name)
  log(mod_name .. ": shared library loaded")
end

return util
