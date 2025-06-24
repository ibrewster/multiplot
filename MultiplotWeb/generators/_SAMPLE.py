"""
_SAMPLE.py

DESCRIPTION:
------------
Documentation for creating new dataset plugins in the MultiplotWeb system.

Each plugin defines one or more functions decorated with `@generator(...)`, which registers
them under the specified category and label(s). These functions generate datasets that the
frontend can request and render using JavaScript.

All registered functions must accept exactly three arguments:

    (volcano, start, end)

These are passed automatically from the frontend request.


INSTRUCTIONS:
-------------
1. Create a new file in the 'generators' directory, and give it a descriptive name.
2. Set the `CATEGORY` variable to the name you want shown at the top-level in the dropdown menu.

   This provides a default for all @generator-decorated functions in the file.
   If you instead provide labels as (label, category) tuples (or a function that returns such)
   in the @generator(...) call, the CATEGORY variable is not needed and can be omitted.

   NOTE: if you want a new dataset under an existing category, skip steps 1 & 2, and simply
         proceed with step 3 in the existing file.
3. Add one or more functions decorated with `@generator(...)`.
   - If your function needs access to the requested plot, it can be accessed by calling
     `utils.current_plot_tag.get()`
   NOTE: Make sure your function either:
         - Returns the expected dictionary for the *generic* plotter
         - Has a JavaScript function of the same name that handles rendering


NOTES ON RETURN FORMATS
------------------------
Your Python function must return one of the following:

1. **For the default (generic) JavaScript renderer:**
   Return a dictionary with the following keys:

       {
           "date": [...],      # List of ISO-format date strings (x-axis)
           "y": [...],         # List of y-values (y-axis)
           "ylabel": "..."     # (Optional) Label for the y-axis
       }

   This format is used automatically if **no matching JavaScript function** exists.

2. **For custom rendering in JavaScript:**
   Create a JavaScript function with the **same name** as your Python function.
   Your Python function can then return any valid JSON-serializable structure.

   The JavaScript function will:
   - Receive the exact return value from the Python function.
   - Must return a **two-element array**: `[data, layout]`, where:
       - `data`: a Plotly.js data array (or array of trace dicts)
       - `layout`: a Plotly.js layout object

IMPORTS:
--------
The following are made available via `generators/__init__.py`:
    - `generator`: the decorator
    - `utils`: shared utilities (e.g., current_plot_tag, create_description_dataframe)
    - `app`: Flask app instance (for logging/debugging)
    - `config`: configuration module containing run-time parameters for this MultiPlot instance
                (e.g database host/user/password)
"""

# Optional if all @generator calls include categories.
CATEGORY = "Example Category"

# Import framework symbols exposed via generators/__init__.py
from . import generator, utils, app, config

# ---------------------------
# Basic Example (single label)
# ---------------------------
@generator("Simple Example")
def basic_plot(volcano, start, end):
    """
    This is a basic example using a single label and the default CATEGORY from the module.

    This docstring will be shown as the descrptive text in the GUI.
    """
    return {
        "date": ["2020-01-01", "2020-01-02"],
        "y": [10, 15],
        "ylabel": "Event Count"
    }

# ----------------------------------
# Description as a simple string
# ----------------------------------
@generator("String Description Example", description="A simple description for this dataset.")
def string_desc_plot(volcano, start, end):
    """This docstring will be ignored in favor of the provided description string."""
    # Implement your data generation here
    return {
        "date": [...],
        "y": [...],
        "ylabel": ""
    }


# ----------------------------------------------
# Multiple Labels Using a List (same CATEGORY)
# ----------------------------------------------
@generator(["Type A", "Type B"])
def multi_plot(volcano, start, end):
    """
    Registers the function under multiple labels within the same CATEGORY.

    You can access the current plot tag (category|label) being processed via:
    `current_tag = utils.current_plot_tag.get()`
    """
    # Implement your data generation here
    return {
        "date": [...],
        "y": [...],
        "ylabel": ""
    }

# ----------------------------------------------------------------
# Multiple Labels, Each With Their Own Category (advanced usage)
# ----------------------------------------------------------------
@generator([("Gas Flux", "Remote Sensing"), ("SO2", "Gas Data")])
def multi_cat_plot(volcano, start, end):
    """
    Registers the function under two different (label, category) pairs.

    You can access the current plot tag (category|label) being processed via:
    `current_tag = utils.current_plot_tag.get()`
    """
    # Implement your data generation here
    return {
        "date": [...],
        "y": [...],
        "ylabel": ""
    }

# ----------------------------------
# Description as a dictionary for multiple labels
# ----------------------------------
@generator(
    ["Type A", "Type B"],
    description={
        "Type A": "First dataset description.",
        "Type B": "Second dataset description."
    }
)
def multi_desc_dict(volcano, start, end):
    """This docstring is ignored since descriptions are supplied via dictionary."""
    # Implement your data generation here
    return {
        "date": [...],
        "y": [...],
        "ylabel": ""
    }

# ----------------------------------
# Advanced: Dynamic label and description via functions
# ----------------------------------
def label_func():
    # Return a list of (label, category) tuples
    return [("Dynamic 1", "Sample Category"), ("Dynamic 2", "Sample Category")]

def desc_func():
    # The description function must return a pandas DataFrame with columns:
    #   Category (str), Label (str), Description (str)
    #
    # The DataFrame should have a MultiIndex on (Category, Label) to enable
    # easy lookup of descriptions.
    #
    # Use the helper function `create_description_dataframe(data)` to build
    # this DataFrame from a list of tuples.
    #
    # Each tuple must be in the form: (category, label, description)
    data = [
        ("Sample Category", "Dynamic 1", "This is the first dynamically described dataset."),
        ("Sample Category", "Dynamic 2", "This is the second one.")
    ]
    return utils.create_description_dataframe(data)


@generator(label_func, description=desc_func)
def dynamic_func(volcano, start, end):
    """This docstring is ignored; label and description are both provided by functions."""
    # Implement your data generation here
    # If returning something other than the default format, make sure
    # to implement a matching javascript plotting function.
    return {...}
