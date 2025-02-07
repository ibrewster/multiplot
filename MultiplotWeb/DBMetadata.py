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


def get_db_details():
    """Get the description of the available datasets from the database"""
    with utils.PostgreSQLCursor("multiplot") as cursor:
        cursor.execute("SELECT categories.name, title, plotinfo.description FROM plotinfo INNER JOIN categories ON categories.id=plotinfo.category")

        plot_descriptions = cursor.fetchall()

        cursor.execute("SELECT name, '', description FROM categories")
        cat_descriptions = cursor.fetchall()

        descriptions = plot_descriptions + cat_descriptions
        df = pandas.DataFrame(descriptions, columns=['Category', 'Dataset', 'Description'])

        # Strip HTML formatting from Category and Dataset
        df['Category'] = df['Category'].apply(stripHTML)
        df['Dataset'] = df['Dataset'].apply(stripHTML)

        df.index = pandas.MultiIndex.from_frame(df[['Category', 'Dataset']])

        return df
