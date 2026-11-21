-- Returns the value of the setting with the provided name. Prefix should not be provided.
local function config(name)
    return settings.startup['er2_' .. name].value
end

require("prototypes/entity")
require("prototypes/recipe")