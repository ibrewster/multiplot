**MultiplotWeb** is a plugin-based framework for building a display of multiple time-series plots that share a time axis. It uses a simple decorator system in Python to register dataset-generating functions, which are then rendered on the frontend via Plotly.js.

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

MultiplotWeb plugins are organized into two key systems:

### 🔹 [Dataset Generators](MultiplotWeb/generators/README.md)

Dataset generator functions define what data is returned to the frontend. Each is registered using the `@generator(...)` decorator and can:

- Return basic dictionary output for default Plotly rendering
- Define custom JavaScript handlers for complex visualizations
- Specify labels and categories via simple arguments or dynamic functions
- Include descriptions parsed from docstrings or provided externally

See [`generators/README.md`](MultiplotWeb/generators/README.md) for full instructions and examples.

---

### 🔹 [Descriptions](MultiplotWeb/descriptors/README.md)

If you want to document datasets beyond simple docstring descriptions (e.g if your function handles multiple datasets and/or you want to retrieve the descriptions from an external source), you can register description providers using the `@description_source` decorator. This allows you to supply descriptions from centralized sources like:

- Google Sheets
- Shared CSV files
- Dynamic external APIs
- Database queries
- etc

See [`descriptors/README.md`](MultiplotWeb/descriptors/README.md) for how to implement metadata sources.

---