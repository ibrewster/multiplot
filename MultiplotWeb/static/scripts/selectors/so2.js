//SO2 emission rate Fioletov/AVO selector
export function so2_em_rate_combined(addArgs){
    const types=['AVO','Fioletov']
    return generate_type_selector(types,addArgs,"Select Datasets to Show","Select Datasets...")
}

//SO2 mass Carn/AVO selector
export function so2_mass_combined(addArgs){
    const types=['AVO','Carn']
    return generate_type_selector(types,addArgs,"Select Datasets to Show","Select Datasets...")
}