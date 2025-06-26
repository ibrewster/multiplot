# Descriptors Module

This module provides the mechanism for attaching human-readable descriptions to datasets in the MultiplotWeb system.

Descriptions appear in the frontend UI when the user is selecting items from the menu, and are used to help users understand what each dataset represents.

---

## Overview

Descriptions for dataset labels and categories can come from two places:

1. **Description provider functions** — defined using the `@description_source` decorator in this module.
2. **Plugin docstrings** — pulled from the Python functions and files in the `generators/` directory.

If a description is defined by a provider function, it takes precedence and overrides any matching plugin docstrings.

---

## Registering a Description Source

To register a description source, create a function in the `descriptors` module and decorate it with `@description_source`.

Your function must return a `pandas.DataFrame` with the following structure:

- Columns: `Category` (str), `Label` (str), `Description` (str)
- The DataFrame **must** have a **MultiIndex** on `(Category, Label)`

Use the helper function `create_description_dataframe(...)` to simplify construction.

### Example

```python
from . import description_source, create_description_dataframe

@description_source
def global_descriptions():
    # Each tuple is a (Category, Label, Description) set
    data = [
        ("Seismic", "RSAM", "Real-time Seismic Amplitude Measurement"),
        ("Gas", "SO₂", "SO₂ flux data from DOAS instruments"),
        ("Seismic", "", "Seismic data products and measurements")  # ← category-level description
    ]
    return create_description_dataframe(data)
```

---

## Special Notes

- To assign a **category-level** description, use an empty string (`""`) as the label.
- The helper `create_description_dataframe(...)` takes a list of `(category, label, description)` tuples and returns a properly formatted DataFrame.
- Description source functions can return data from any source — hardcoded, dynamic, or external — as long as they return the correct structure.
- The module also imports the following from the main system:
  - `utils`: shared utilities for DB access and helpers
  - `app`: Flask app instance (for logging, if needed)
  - `config`: system configuration (e.g. runtime parameters)

---

## Docstring Behavior

If no matching description is found from a provider function, the system will attempt to extract one from:

- The **function docstring**, for label-level descriptions
- The **file-level docstring**, for category-level descriptions

Docstrings are parsed using the following rule:

- If a `Description:` (or similar, like `# Description`, `DESCRIPTION`, etc.) heading is found at the beginning of a line, the text following that line is extracted and used.
- If no such heading exists, the full docstring is used.

If a function is registered under **multiple labels**, docstring-based descriptions are **not used**, to avoid assigning the same text to unrelated entries.