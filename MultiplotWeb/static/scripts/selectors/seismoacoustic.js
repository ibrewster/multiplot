// seidb keyword selector
export function seisdb_keywords(addArgs){
    const types=[
        ['Seismic Swarm', 71],
        ['Low-Frequency Event', 81],
        ['very long period event(s)',91],
        ['tremor',101],
        ['suspected rockfall/debris flow/avalanche',111],
        ['other earthquake of note',121],
        ['composite event',122],
        ['felt event',123],
        ['Station Problem',131],
        ['Local Earthquake',141],
        ['Wind Noise',151],
        ['Ground Coupled Airwaves',161],
        ['Other Seismic Events',171],
        ['Mystery Events',181],
        ['Explosions/Eruption',191],
        ['Network Outage',201],
    ];
    return generate_type_selector(types,addArgs,"Select detection types to show")
}