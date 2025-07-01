export async function loadUserModules(path) {
    const registry = {};
    try {
        const fileList = await fetch(`list-js/${path}`).then(res => res.json());
        for (const file of fileList) {
            try {
                const module = await import(`../${path}/${file}`);
                for (const [exportName, exportValue] of Object.entries(module)) {
                    if (isClass(exportValue) ){
                        const className = exportValue.name;
                        const staticMethods = Object.getOwnPropertyNames(exportValue).filter(name =>
                            typeof exportValue[name] === 'function' &&
                            name !== 'prototype' &&
                            name !== 'length' &&
                            name !== 'name'
                        );
                        for (const methodName of staticMethods) {
                            const key = `${className}|${methodName}`;
                            console.log(`Registering static method: ${key} from ${path}/${file}`);
                            registry[key] = exportValue[methodName];
                        }
                    }
                    else if (typeof exportValue === 'function') {
                        console.log(`Registering function: ${exportName} from ${path}/${file}`);
                        registry[exportName] = exportValue;

                        // Register aliases with validation
                        if (exportValue.aliases && Array.isArray(exportValue.aliases)) {
                            exportValue.aliases.forEach(alias => {
                                console.log(`Registering alias: ${alias} -> ${exportName} from ${path}/${file}`);
                                registry[alias] = exportValue;
                            });
                        }
                    }
                }
            } catch (error) {
                console.error(`Failed to load module ${file} from ${path}:`, error);
            }
        }
    } catch (error) {
        console.error('Failed to fetch file list:', error);
    }
    return registry;
}


function isClass(value) {
  return typeof value === 'function' && Function.prototype.toString.call(value).startsWith('class');
}

export function formatUTCDateString(date){
    let dateYear=date.getUTCFullYear();
    let dateMonth=date.getUTCMonth()+1;
    let dateDay=date.getUTCDate();

    if(dateMonth<10){ dateMonth = "0" + dateMonth; }
    if(dateDay<10){ dateDay = "0" + dateDay;}

    return `${dateYear}-${dateMonth}-${dateDay}`
}

export async function getFunc(registry, identifier, default_func=null){
    const funcRegistry=await registry;

    const funcName = [
        identifier.replace(/[^a-zA-Z0-9|]/g, ''),
        plotFuncs[identifier],
        default_func
    ].find(candidate => Object.hasOwn(funcRegistry, candidate));

    return funcRegistry[funcName]
}
