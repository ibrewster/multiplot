import pandas

from . import utils, create_description_dataframe, description_source

@description_source
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