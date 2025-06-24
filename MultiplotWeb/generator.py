import inspect
import re
import warnings

from collections import defaultdict
from collections.abc import Iterable
from functools import wraps

import pandas

from .utils import create_description_dataframe, GEN_DESCRIPTION_SOURCES

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
GEN_DESCRIPTIONS: list[pandas.DataFrame] = []


def generator(label_or_labels_or_func, description = None):
    """
    Decorator to register a function under one or more (label, category) pairs.

    Parameters
    ----------
    label_or_labels_or_func : str or list[str] or list[tuple[str, str]] or Callable
        A single string label (uses the default or global category),
        a list of string labels (all use the default or global category),
        a list of (label, category) tuples,
        or a function returning one of the above.

    description : str or dict or Callable, optional
        Description text for the registered label(s), used for tooltips or UI metadata.

        - If a **string**, it applies only when registering a single label.
        - If a **dict**, keys may be labels or (label, category) pairs, with
          description strings as values.
        - If a **callable**, it must return a DataFrame with
          ['Category', 'Dataset', 'Description'] columns and a MultiIndex of
          (Category, Dataset).
        - If **None**, the function docstring is used (for single labels),
          and the module-level docstring is used for the category.

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

    if callable(description):
        GEN_DESCRIPTIONS.append(description())

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
            if not callable(description):
                func_doc = None
                if isinstance(description, dict):
                    # Try label+category key first, then label alone, else fallback
                    func_doc = description.get((label, category)) or description.get(label)
                elif isinstance(description, str):
                    if len(labels) > 1:
                        raise ValueError("Need dict or callable description for multiple labels")
                    func_doc = description
                elif description is None and len(labels) == 1:
                    func_doc = default_func_doc
                elif description is not None:
                    raise ValueError("description must be either callable, dictionary, string, or None")

                if func_doc:
                    desc_rows[(category, label)] = (category, label, func_doc)

                # Add category-level description if not already present
                if (category, '') not in desc_rows and category_doc:
                    desc_rows[(category, '')] = (category, '', category_doc)

        if desc_rows:
            df = create_description_dataframe(desc_rows.values())
            GEN_DESCRIPTIONS.append(df)

        @wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)

        return wrapper

    return inner

def desc_from_docstring(docstring: str) -> str:
    """
    If a DESCRIPTION: section exists in the docstring, use it.
    Otherwise return the entire docstring.
    """
    if not docstring:
        return ''
    match = re.search(r"DESCRIPTION:(.*)", docstring, re.IGNORECASE | re.DOTALL)
    return match.group(1).strip() if match else docstring.strip()


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

def generator_descriptions():
    to_concat = []
    # Add all registered external/global sources
    for func in GEN_DESCRIPTION_SOURCES:
        try:
            df = func()
            to_concat.append(df)
        except Exception as e:
            print(f"Unable to get description from {func.__name__}: {e}")

    to_concat.extend(GEN_DESCRIPTIONS.copy())

    details = pandas.concat(to_concat, sort=True, copy=False)
    # Entries from the google spreadsheet override identical entries from the database
    # Change 'first' to 'last' to reverse this logic.
    details = details[~details.index.duplicated(keep='first')]
    details = details.sort_index();

    return details
