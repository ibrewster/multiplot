// Remote sensing detection type selector
export function rs_detections(addArgs){
    const types=['Ash','SO <sub>2</sub>','Elevated Temps','Steam/Water'];
    return generate_type_selector(types,addArgs,"Select detection types to show")
}