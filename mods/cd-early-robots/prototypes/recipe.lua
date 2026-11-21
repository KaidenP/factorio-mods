-- Returns the value of the setting with the provided name. Prefix should not be provided.
local function config(name)
    return settings.startup['er2_' .. name].value
end

-- Change the recipe for Roboports.
data.raw["recipe"]["roboport"].ingredients = {
    {type = "item", name = "electronic-circuit", amount = 45},
    {type = "item", name = "iron-plate", amount = 100},
    {type = "item", name = "iron-gear-wheel", amount = 45}
}
data.raw["recipe"]["roboport"].enabled = true

-- Change the recipe for Logistic Robots.
data.raw["recipe"]["logistic-robot"].ingredients = {
    {type = "item", name = "electronic-circuit", amount = 2},
    {type = "item", name = "flying-robot-frame", amount = 1}
}
data.raw["recipe"]["logistic-robot"].enabled = true

-- Change the recipes for Logistic Chests.
local LogisticChests = {"active-provider-chest", "passive-provider-chest", "storage-chest", "requester-chest", "buffer-chest"}
for _,LogisticChest in pairs(LogisticChests) do
    data.raw["recipe"][LogisticChest].ingredients = {
        {type = "item", name = "electronic-circuit", amount = 5},
        {type = "item", name = "iron-chest", amount = 1},
        {type = "item", name = "iron-plate", amount = 24},
    }
    data.raw["recipe"][LogisticChest].enabled = true
end

-- Change the recipe for Flying Robot Frames.
data.raw["recipe"]["flying-robot-frame"].ingredients = {
    {type = "item", name = "electronic-circuit", amount = 3},
    {type = "item", name = "iron-stick", amount = 20},
    {type = "item", name = "copper-plate", amount = 10},
    {type = "item", name = "iron-gear-wheel", amount = 4}
}
data.raw["recipe"]["flying-robot-frame"].enabled = true
data.raw["recipe"]["flying-robot-frame"].energy_required = 5

-- Change the recipe for Construction Robots.
data.raw["recipe"]["construction-robot"].ingredients = {
    {type = "item", name = "electronic-circuit", amount = 2},
    {type = "item", name = "flying-robot-frame", amount = 1}
}
data.raw["recipe"]["construction-robot"].enabled = true

-- Enable the recipe for Iron Sticks.
data.raw["recipe"]["iron-stick"].enabled = true