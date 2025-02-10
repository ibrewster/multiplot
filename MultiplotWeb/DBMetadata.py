from io import StringIO
import pandas

from html.parser import HTMLParser

from . import utils

class Stripper(HTMLParser):
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

def stripHTML(value):
    html = Stripper()
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
    df['Category'] = df['Category'].apply(stripHTML)
    df['Dataset'] = df['Dataset'].apply(stripHTML)

    # Create MultiIndex from Category and Dataset
    df.index = pandas.MultiIndex.from_frame(df[['Category', 'Dataset']])

    return df

def get_db_details() -> pandas.DataFrame:
    """Get the description of the available datasets from the database"""
    with utils.PostgreSQLCursor("multiplot") as cursor:
        # Get plot descriptions
        cursor.execute("""
            SELECT categories.name, title, plotinfo.description
            FROM plotinfo
            INNER JOIN categories ON categories.id=plotinfo.category
        """)
        plot_descriptions = cursor.fetchall()

        # Get category descriptions
        cursor.execute("SELECT name, '', description FROM categories")
        cat_descriptions = cursor.fetchall()

        descriptions = plot_descriptions + cat_descriptions

    return create_description_dataframe(descriptions)

def get_preevents_db_details() -> pandas.DataFrame:
    """Get the descriptions of the available datasets/datastreams from the preevents database"""
    with utils.PREEVENTSSQLCursor() as cursor:
        cursor.execute("""
SELECT DISTINCT
    discipline_name,
    displayname,
    variable_name||', '||variable_description --string to be displayed to user.
FROM disciplines
INNER JOIN datasets ON datasets.discipline_id=disciplines.discipline_id
INNER JOIN datastreams ON datastreams.dataset_id=datasets.dataset_id
INNER JOIN variables ON variables.variable_id=datastreams.variable_id
INNER JOIN displaynames ON displaynames.displayname_id=variables.displayname_id
WHERE variables.unit_id!=6; --id 6 = categorical
        """)
        plot_descriptions = cursor.fetchall()

    return create_description_dataframe(plot_descriptions)
