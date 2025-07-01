**MultiplotWeb** is a plugin-based framework for building a display of multiple time-series plots that share a time axis. It uses a simple decorator system in Python to register dataset-generating functions, which are then rendered on the frontend via Plotly.js.

---

# Overview

MultiplotWeb is structured as a Python + JavaScript web system, allowing developers to easily plug in new dataset generators by adding simple Python functions. These functions are exposed to the frontend via Flask and rendered using Plotly.

Key features:

- Register new datasets with a single `@generator(...)` decorator
- Organize datasets into categories and labels
- Optionally define custom JavaScript renderers
- Automatic UI population via registered metadata

---

# Plugin Development

MultiplotWeb plugins are organized into two key systems on the python side, and three on the JavaScript side:

## Python:

### 🔹 [Dataset Generators](MultiplotWeb/generators/README.md)

Dataset generator functions define what data is returned to the frontend. Each is registered using the `@generator(...)` decorator and can:

- Return basic dictionary output for default Plotly rendering
- Define custom JavaScript handlers for complex visualizations
- Specify labels and categories via simple arguments or dynamic functions
- Include descriptions parsed from docstrings or provided externally

See [`generators/README.md`](MultiplotWeb/generators/README.md) for full instructions and examples.

---

### 🔹 [Dataset Descriptions](MultiplotWeb/descriptors/README.md)

If you want to document datasets beyond simple docstring descriptions (e.g if your function handles multiple datasets and/or you want to retrieve the descriptions from an external source), you can register description providers using the `@description_source` decorator. This allows you to supply descriptions from centralized sources like:

- Google Sheets
- Shared CSV files
- Dynamic external APIs
- Database queries
- etc

See [`descriptors/README.md`](MultiplotWeb/descriptors/README.md) for how to implement metadata sources.

---

## 🔹 JavaScript

On the javascript side, there are three types of plugins you can create: plotters, selectors, and exporters. In all cases, the function should be defined as:
```
export function my_plot_function_name(...){...}
```
where `my_plot_function_name` is the same name given to the python `@generator` wrapped function that generates the data for the plot. Yes, you can, and should, use the same function name for all three javascript functions if creating multiple plugins, though you cannot use the same name for two plugin functions _of the same type_.

For more complex cases, where a single function may generate multiple plot types and categories, each of which need to be handled separately, you can instead create a class for the category, and individual static functions for the types/labels, with the names being the category and label with any spaces or special characters removed. For example, if you had a single `@generator` that returned plots with a category of `Remote Sensing`, and a labels of `HotLINK Radiative Power` and `HotLINK probability`, and you wanted to create custom selectors for each label, you could do so with the following structure:
```
class RemoteSensing{
    static HotLINKRadiativePower(addArgs){
        ...
    }

    static HotLINKprobability(addArgs){
        ...
    }
}
```
which will match the selector by category and label rather than by generator function name.


### **plotters**  
Plotter plugins can be used if you want custom plotting code. Plotters will take one argument, which is the return value of the python function, and must return a two element array of [data,layout], where data and layout are plotly data and layout objects, respectively.

If no custom plotter is available for a plot type, a generic plotting function will be used to create a scatter plot.
    
---

### **selectors**  
Selectors are used to create an HTML element to provide additional filtering or options for a given plot. A selector function should take one argument - an object that contains the current/default arguments - and return a block of HTML. This HTML should contain at a minimum a button with its click handler set to showTypeSelector:
```
const selButton = $('<button>', {
    text: label,
    click: showTypeSelector
});
```
and a div containing the content you want displayed when the selector is open, with the `display` style attribute set to `none`:
```
const selectorDiv = $('<div>', {
    class: 'multiplot-typeSelector',
    style: 'display:none'
});
```
this div can contain whatever you want, but should at a minumum have a close button with click handler `closeTypeSelector(this)`. Finally, the select button and selector div are wrapped in an outter div and returned from the function.

---

### **exporters**  
Exporter plugins are used to provide custom formatting for the CSV export of the plot. They take as an argument the jQuery div that is the plot (from which you can extract the data, if desired), and return an array of `[headers, columnData[]]`, where `headers` is an array of column headers, and `columnData[]` is an array of column data arrays, eg `[[dates...],[col1 values...],[col2 values...],...]`

If no exporter function is found, a generic exporter is used that simply exports the X values (dates), and Y values from the plot.