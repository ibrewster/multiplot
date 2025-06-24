**MultiplotWeb** is a plugin-based framework for building interactive data dashboards, especially suited for volcano and geoscience datasets. It uses a simple decorator system in Python to register dataset-generating functions, which are then rendered on the frontend via Plotly.js.

---

## Overview

MultiplotWeb is structured as a Python + JavaScript web system, allowing developers to easily plug in new dataset generators by adding simple Python functions. These functions are exposed to the frontend via Flask and rendered using Plotly.

Key features:

- Register new datasets with a single `@generator(...)` decorator
- Organize datasets into categories and labels
- Optionally define custom JavaScript renderers
- Automatic UI population via registered metadata

---

## Plugin Development

### 🐍 Python

To add a new dataset plugin:

1. **Create a new file** in the `generators/` directory with a descriptive name.
2. **Set a `CATEGORY`** variable to group the datasets in the dropdown.
    - Alternatively, supply categories directly via the `@generator(...)` call (using `(label, category)` pairs).
3. **Add a function** decorated with `@generator(...)`:
    - The function must accept three parameters: `volcano`, `start`, `end`
    - The first argument to the decorator defines how the function is registered. You can provide:
        - A single label (string)
        - Multiple labels (list of strings)
        - Label/category pairs (list of `(label, category)` tuples), in which case the provided category overrrides the default.
        - A function that returns any of the above
    - If the function handles multiple labels, you can access the label requested using `utils.current_plot_tag.get()`. Value will be in the format `category|label`.
4. **(Optional) Add a `description=` argument to the decorator**:
   Description formats allowed:

   - A string (for single-label usage)
   - A dictionary mapping `label` or `(label, category)` to a string
   - A function returning a `pandas.DataFrame` with columns: `Category`, `Label`, and `Description`

   - If using a function to provide descriptions, you can include a row with an empty string (`""`) for the `Label` column to define a **category-level description**.
     Example: `("My Category", "", "This is the description for the entire category.")`

   If you do **not** provide a description:

   - The system will use the **function's docstring** as the label’s description (if available).

   Also:

   - The file-level docstring (i.e., the string at the top of the `.py` file) will be used as the **category description** for any category associated with labels in that file.
   - In case of duplication (e.g. category description provided by multiple decorators), the **first** description provided will be used.

5. Your function will be registered and appear in the UI automatically.

➡ For code examples, see [`MultiplotWeb/generators/_SAMPLE.py`](MultiplotWeb/generators/_SAMPLE.py)

#### Return Formats

There are two return format options:

##### a) Generic Format (default rendering):

If no JavaScript renderer exists for your function, the system expects:

```python
{
    "date": [...],      # ISO-format datetime strings
    "y": [...],         # Y-axis values
    "ylabel": "..."     # (Optional) Label for the y-axis
}
```

##### b) Custom Format:

If a matching JavaScript function exists, your Python function can return **any JSON-serializable object**. The JavaScript renderer will be passed the return value directly.

The JavaScript function must return a two-element array:

```javascript
return [data, layout];
```

Where:

- `data`: a Plotly.js-compatible data array (trace objects)
- `layout`: a Plotly.js layout configuration object

---

### 💻 JavaScript

In the frontend, JavaScript is responsible for rendering plots using Plotly.

#### Generic Rendering

If no renderer exists for a label, a fallback renderer will be used to display the data assuming it conforms to the generic format shown above (`date`, `y`, `ylabel`). This will give you a scatter plot with your ylabel on the Y axis.

#### Custom Rendering

To override rendering:

1. Create a JavaScript function **named identically** to the Python function.
2. This function will receive the exact return value from Python.
3. It must return an array: `[data, layout]`, where:

```javascript
function myCustomPlot(result) {
    const data = [...];     // one or more Plotly trace objects
    const layout = {...};   // a Plotly layout configuration
    return [data, layout];
}
```

---

## Design Notes

- Decorated functions are auto-discovered on startup by importing all files in the `generators/` module.
- Categories are inferred from the module `CATEGORY` constant or provided per-label in the decorator.
- All metadata is collected and used to populate dropdowns and tooltips in the UI.
