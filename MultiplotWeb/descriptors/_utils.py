from html.parser import HTMLParser
from io import StringIO

import pandas

########## Global description decorator/functions ##########
DESCRIPTION_SOURCES = []
def description_source(func):
    """
    Registers a function that returns a pandas DataFrame of descriptions.
    Each function must return a DataFrame indexed by (category, label),
    with a 'Description' column.

    These sources will be included in get_descriptions().
    """
    DESCRIPTION_SOURCES.append(func)
    return func

class _Stripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self.strict = False
        self.convert_charrefs = True
        self.text = StringIO()

    def handle_data(self, data):
        # This function is only called for the raw text, so tags don't show up here.
        self.text.write(data)
    def get_clean(self):
        return self.text.getvalue()

def _stripHTML(value):
    html = _Stripper()
    html.feed(value)
    return html.get_clean()

def create_description_dataframe(data: list[tuple], columns=['Category', 'Dataset', 'Description']) -> pandas.DataFrame:
    """
    Creates a standardized description DataFrame with proper formatting and indexing.

    ARGUMENTS
    ---------
        data: List of tuples containing the raw data
        columns: Column names for the DataFrame (default: ['Category', 'Dataset', 'Description'])

    RETURNS
    -------
        pandas.DataFrame: Formatted DataFrame with MultiIndex
    """
    df = pandas.DataFrame(data, columns=columns)

    # Strip HTML formatting from Category and Dataset
    df['Category'] = df['Category'].apply(_stripHTML)
    df['Dataset'] = df['Dataset'].apply(_stripHTML)

    # Create MultiIndex from Category and Dataset
    df.index = pandas.MultiIndex.from_frame(df[['Category', 'Dataset']])

    return df


def get_descriptions():
    to_concat = []
    # Add all registered external/global sources
    for item in DESCRIPTION_SOURCES:
        if callable(item):
            try:
                item = item()
            except Exception as e:
                print(f"Unable to get description from {func.__name__}: {e}")
                item = None
    
        if item is not None:
            to_concat.append(item)   

    details = pandas.concat(to_concat, sort=True, copy=False)
    # Entries from the google spreadsheet override identical entries from the database
    # Change 'first' to 'last' to reverse this logic.
    details = details[~details.index.duplicated(keep='first')]
    details = details.sort_index();

    return details