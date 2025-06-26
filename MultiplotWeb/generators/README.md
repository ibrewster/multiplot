# MultiplotWeb Generator Plugins

This document describes how to create and register new dataset-generating functions for use in the MultiplotWeb system.

Each plugin is a Python module (a .py file) inside the generators/ package. These modules contain one or more functions decorated with `@generator(...)`, which register them under specific category/label pairs. These functions generate datasets that are rendered by the frontend using JavaScript.

---

## Plugin Function Requirements

All functions registered with `@generator(...)` **must** accept the following three arguments:

```python
(volcano, start, end)
```

These are passed automatically from the frontend when the user requests a plot.

---

## Writing a Plugin

1. **Create a new file** in the `generators/` directory. The filename should reflect the category or topic (e.g., `GasFlux.py`, `Seismology.py`).

2. **Define a `CATEGORY` constant** at the top of the file:

   ```python
   CATEGORY = "Gas Flux"
   ```

   This sets the default category for all decorated functions in that file. If you instead provide labels as `(label, category)` tuples (or a function returning such) inside the decorator, this is not required.

3. **Decorate your dataset-generating function** with `@generator(...)`:

   ```python
   @generator("SO₂ Flux")
   def flux_plot(volcano, start, end):
       ...
   ```

   If you want to register multiple labels for a single function:

   ```python
   @generator(["Type A", "Type B"])
   ```

   Or with category overrides per label:

   ```python
   @generator([("Gas Flux", "Remote Sensing"), ("SO₂", "Gas Data")])
   ```
   
   You can also use a function to generate label/categories, for example to pull from a database:
   
    ```python
    @generator(get_db_plots_func)
    ```
---

## Return Format

Your Python function **must** return one of the following:

### a) Generic Format

If no custom JavaScript renderer exists for your function, the system expects:

```python
{
    "date": [...],      # ISO-format datetime strings
    "y": [...],         # Y-axis values
    "ylabel": "..."     # (Optional) Label for the y-axis
}
```

This format will be rendered using the built-in JavaScript plotter.

### b) Custom Format

If a JavaScript function exists with the same name as your Python function, your Python return value can be **any** JSON-serializable structure.

The JavaScript function will receive that data and must return:

```javascript
[data, layout]
```

Where:
- `data`: Plotly.js trace object(s)
- `layout`: Plotly.js layout config

---

## Providing Descriptions

Descriptions shown in the UI can come from:

- Function docstrings (used by default)
- File-level docstrings (used for the category)
- Functions decorated with the `description_source` decorator and returning a properly formatted pandas dataframe. See the [`descriptors ` module README](../descriptors/README.md) for more information.


---

## Accessing the Current Label at Runtime

If your function supports multiple labels (e.g. `["Type A", "Type B"]`), you can retrieve the currently requested label via:

```python
from utils import current_plot_tag

tag = current_plot_tag.get()  # Returns "Category|Label"
```

---

## Imports

The following are available by default in every plugin module via `generators/__init__.py`:

- `generator` — decorator for registering functions
- `utils` — helper utilities (e.g. `current_plot_tag`, `create_description_dataframe`)
- `app` — Flask app instance (for logging/request context access)
- `config` — shared configuration (e.g., database connection details)

---

## See Also

For concrete examples, see [`./_SAMPLES.py`](./_SAMPLES.py).