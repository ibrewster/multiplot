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

def get_postgress_db_details() -> pandas.DataFrame:
    """Get the descriptions of the available datasets/datastreams from the preevents database"""
    with utils.PREEVENTSSQLCursor() as cursor:
        cursor.execute("""
            WITH numeric_streams AS (
                SELECT DISTINCT datastream_id
                FROM datavalues
                WHERE datavalue IS NOT NULL AND categoryvalue IS NULL
            )
            SELECT DISTINCT 
                discipline_name,
                datastream_displayname,
                variable_name||', '||variable_description
            FROM datastreams ds
            INNER JOIN numeric_streams ON ds.datastream_id=numeric_streams.datastream_id
            INNER JOIN datasets ON datasets.dataset_id=ds.dataset_id
            INNER JOIN disciplines ON datasets.discipline_id=disciplines.discipline_id
            INNER JOIN variables ON ds.variable_id=variables.variable_id
        """)
        plot_descriptions = cursor.fetchall()
        
    return create_description_dataframe(plot_descriptions)