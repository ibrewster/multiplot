import inspect
import re
import textwrap
import warnings

from collections import defaultdict
from collections.abc import Iterable
from functools import wraps

import pandas

from .descriptors import create_description_dataframe
from .descriptors import DESCRIPTION_SOURCES

######## Generator Decorator########
# This decorator registers a function with a category and label to do three things:
# 1) Create a label-->function lookup dictionary so python knows what function to run
#    when the user requests a plot with a given label.
# 2) Add the label to a list for the category to be used when generating
#    the select list in the javascript.
# 3) Create a label-->function *name* lookup dictionary to be used by the javascript to
#    determine what plotting function to run when the user requests a plot with a given
#    label (requires the existance of a javascript plotting function with the same name
#    as the python function)
#####################################
GEN_FUNCS = {}
GEN_CATEGORIES = defaultdict(list)
JS_FUNCS = {}

def generator(label_or_labels_or_func):
    """
    Decorator to register a function under one or more (label, category) pairs.

    Parameters
    ----------
    label_or_labels_or_func : str or list[str] or list[tuple[str, str]] or Callable
        A single string label (uses the default or global category),
        a list of string labels (all use the default or global category),
        a list of (label, category) tuples,
        or a function returning one of the above.

    Returns
    -------
    Callable
        The original function, registered under the specified label/category pairs.

    Notes
    -----
    - If a tuple in `label_or_labels_or_func` contains more than two elements,
      only the first two are used. This allows you to attach extra metadata without breaking things.
    - If multiple labels are specified, `description` must be a dict, a callable,
      or None — a plain string is only valid for single-label usage.
    - Category-level descriptions are auto-generated from the module-level docstring
      unless overridden by a callable.
    """
    
    # Try to determine a default category from the caller's module if not provided explicitly
    frame = inspect.stack()[1]

    category = frame.frame.f_globals.get('CATEGORY') # May be None, fine depending on how labels is passed.

    labels = resolve_labels(label_or_labels_or_func, category)
    category_doc = desc_from_docstring(frame.frame.f_globals.get('__doc__'))

    def inner(func):
        desc_rows = {}
        default_func_doc = desc_from_docstring(func.__doc__)

        for label, category in labels:
            if category is None:
                raise ValueError(f"No category provided for label {label}")

            if category not in GEN_CATEGORIES:
                GEN_CATEGORIES[category] = []

            tag = f"{category}|{label}"

            if label in GEN_CATEGORIES[category]:
                raise ValueError(f"Label '{label}' is duplicated in category '{category}'.")

            GEN_CATEGORIES[category].append(label)
            GEN_FUNCS[tag] = func
            JS_FUNCS[tag] = func.__name__

            # descriptions
            # Add function-level label description
            func_doc = None
            if len(labels) == 1:
                func_doc = default_func_doc

            if func_doc:
                desc_rows[(category, label)] = (category, label, func_doc)

            # Add category-level description if not already present
            if (category, '') not in desc_rows and category_doc:
                desc_rows[(category, '')] = (category, '', category_doc)

        if desc_rows:
            df = create_description_dataframe(desc_rows.values())
            DESCRIPTION_SOURCES.append(df)

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        return wrapper

    return inner

def desc_from_docstring(docstring: str) -> str:
    """
    Extracts the DESCRIPTION section from a docstring.

    Supports formats like:
    - DESCRIPTION: text
    - DESCRIPTION\n------\ntext
    - Description:\n    text
    If no DESCRIPTION section is found, returns the full docstring.
    """
    if not docstring:
        return ''

    # Normalize indentation
    docstring = textwrap.dedent(docstring)

    # Patterns to try, in order of specificity
    patterns = [
        r"^#*\s*DESCRIPTION:\s*(.+?)(?=\n\S|\Z)",                   # DESCRIPTION: text
        r"^#*\s*DESCRIPTION\n[-=]+\n(.+?)(?=\n\S|\Z)",              # DESCRIPTION\n-----
        r"^#*\s*DESCRIPTION\n\s*\n(.+?)(?=\n\S|\Z)",                # DESCRIPTION\n\ntext
        r"^#*\s*Description:\s*\n((?:[ \t].*\n)+)",                 # Description:\n    text
    ]

    for pattern in patterns:
        match = re.search(pattern, docstring, re.DOTALL | re.MULTILINE | re.IGNORECASE)
        if match:
            return match.group(1).strip()

    return docstring.strip()


# Normalize input into a list of (label, category) tuples
def resolve_labels(value, default_category):
    """
    Normalize various input types into a list of (label, category) pairs.
    Category may be None if not provided.
    """

    # If a function is passed in, call it and treat the result as the label input
    if callable(value):
        value = value()

    if isinstance(value, str):
        return [(value, default_category)]

    if isinstance(value, Iterable): # str is already handled, so no need to check here.
        out = []
        for item in value:
            if isinstance(item, str):
                out.append((item, default_category))
            elif isinstance(item, (tuple, list)) and len(item) >= 2:
                label, category = item[:2]
                if not (isinstance(label, str) and isinstance(category, str)):
                    raise TypeError("Label and category in tuple/list must both be strings.")
                out.append((label, category))
                if len(item) > 2:
                    warnings.warn("Ignoring extra elements in label/category tuple")
            else:
                raise TypeError("Iterable must contain strings or (label, category) tuples/lists.")
        return out

    else:
        raise TypeError(
            "Argument must be a string, iterable of strings or (label, category) pairs, or a function returning one of those."
        )