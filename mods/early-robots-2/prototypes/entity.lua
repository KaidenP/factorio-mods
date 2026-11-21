-- Returns the value of the setting with the provided name. Prefix should not be provided.
local function config(name)
    return settings.startup['er2_' .. name].value
end

-- Change Roboport energy requirements.
data.raw["roboport"]["roboport"].charging_energy = "400kW"
data.raw["roboport"]["roboport"].energy_usage = "20kW"
data.raw["roboport"]["roboport"].energy_source.buffer_capacity = "40MJ"
data.raw["roboport"]["roboport"].energy_source.input_flow_limit = "2MW"

-- Change Logistic Robot energy requirements.
data.raw["logistic-robot"]["logistic-robot"].energy_per_move = "2kJ"
data.raw["logistic-robot"]["logistic-robot"].energy_per_tick = "1200W"
data.raw["logistic-robot"]["logistic-robot"].max_energy = "600kJ"

-- Change inventory size of all Logistic Chests.
local LogisticChests = {"active-provider-chest", "passive-provider-chest", "storage-chest", "requester-chest", "buffer-chest"}
for _,LogisticChest in pairs(LogisticChests) do
    data.raw["logistic-container"][LogisticChest].inventory_size = config("logistic-storage")
    local TrashInventorySlots = 0
    if config("trash-slots") == "er2_1.0.4" then
        TrashInventorySlots = math.ceil(config("logistic-storage")/10) * 10
    elseif config("trash-slots") == "er2_1.0.4" then
        TrashInventorySlots = config("logistic-storage")
    end
    if config("trash-slots") ~= "base" then
        data.raw["logistic-container"][LogisticChest].trash_inventory_size = TrashInventorySlots
    end
end

-- Change Construction Robot energy requirements.
data.raw["construction-robot"]["construction-robot"].energy_per_move = "2kJ"
data.raw["construction-robot"]["construction-robot"].energy_per_tick = "1200W"
data.raw["construction-robot"]["construction-robot"].max_energy = "600kJ"