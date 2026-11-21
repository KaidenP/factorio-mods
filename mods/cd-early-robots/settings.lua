data:extend{
    {   name = "er2_logistic-storage",
        type = "int-setting",
        setting_type = "startup",
        default_value = 48,
        minimum_value = 1,
        maximum_value = 299,
        order = "a"
    },
    {   name = "er2_trash-slots",
        type = "string-setting",
        setting_type = "startup",
        default_value = "er2_1.0.4",
        allowed_values = {"base", "er2_1.0.3", "er2_1.0.4"},
        order = "a"
    }
}
