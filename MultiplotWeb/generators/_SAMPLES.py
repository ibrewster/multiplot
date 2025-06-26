"""
_SAMPLE.py

This file demonstrates how to create dataset-generating plugin functions for the MultiplotWeb system.

Each plugin defines one or more functions decorated with `@generator(...)`, which registers
them under specific categories and labels. These functions generate datasets that the frontend
can request and render using JavaScript.

All registered functions must accept exactly three arguments:

    (volcano, start, end)

These are automatically passed in from the frontend.

The file-level docstring (this one!) is used as the **category description** for this file's category.
"""
# Optional if all @generator calls include categories.
CATEGORY = "Example Category"

# Various symbols exposed in the module
from . import (
    generator,  # the decorator to register your function for the MultiPlot GUI
    utils,      # Utility functions, such as DB accessors and the current_plot_tag
    app,        # Flask app, for logging/context (i.e. pulling request arguments)
    config      # App-level config file (i.e. database hosts/users/passwords/etc)
)

# ---------------------------
# Basic Example (single label)
# ---------------------------
@generator("Simple Example")
def basic_plot(volcano, start, end):
    """
    This is a basic example using a single label and the default CATEGORY from the module.

    This docstring will be used as the descriptive text in the GUI, unless overridden.
    """
    return {
        "date": ["2020-01-01", "2020-01-02"],
        "y": [10, 15],
        "ylabel": "Event Count"
    }

# ---------------------------------------------------------------------
# Custom return format (requires matching JS function on frontend)
# ---------------------------------------------------------------------
@generator("Custom Format Example")
def custom_return(volcano, start, end):
    """
    Returns a custom data structure. You must provide a JavaScript function named
    `custom_return` on the frontend to render this plot.
    """
    return {
        "dataset_1": {
            "date": ["2020-01-01", "2020-01-02"],
            "y": [100, 200],
            "ylabel": "Value A"
        },
        "dataset_2": {
            "date": ["2020-01-01", "2020-01-02"],
            "y": [300, 400],
            "ylabel": "Value B"
        }
    }

# ----------------------------------------------
# Multiple Labels Using a List (same CATEGORY)
# ----------------------------------------------
@generator(["Type A", "Type B"])
def multi_plot(volcano, start, end):
    """
    Registers the function under multiple labels within the same CATEGORY.
    """
    # Determine which tag (category|label) is currently being rendered
    tag = utils.current_plot_tag.get()

    return {
        "date": ["2020-01-01", "2020-01-02"],  # Replace with actual x-axis data
        "y": [1, 2],                           # Replace with actual y-axis data
        "ylabel": f"Current tag: {tag}"
    }

# ----------------------------------------------------------------
# Multiple Labels, Each With Their Own Category (advanced usage)
# ----------------------------------------------------------------
@generator([("Gas Flux", "Remote Sensing"), ("SO2", "Gas Data")])
def multi_cat_plot(volcano, start, end):
    """
    Registers the function under multiple (label, category) pairs.
    Useful for functions shared across domains.
    """
    # Determine which tag (category|label) is currently being rendered
    tag = utils.current_plot_tag.get()

    return {
        "date": ["2020-01-01", "2020-01-02"],
        "y": [3.1, 4.2],
        "ylabel": f"Current tag: {tag}"
    }

# ---------------------------------------------------------------------
# Dynamic: Labels and Categories returned from a function (advanced)
# ---------------------------------------------------------------------
def label_func():
    """
    Returns a list of (label, category) tuples.
    This can be generated dynamically from a database or config file.
    """
    return [("Auto A", "Dynamic Cat"), ("Auto B", "Dynamic Cat")]

@generator(label_func)
def dynamic_labels(volcano, start, end):
    """
    Registers dynamically generated (label, category) pairs via a callable.
    """
    tag = utils.current_plot_tag.get()

    return {
        "date": ["2020-01-01", "2020-01-02"],
        "y": [5, 6],
        "ylabel": f"Dynamic tag: {tag}"
    }