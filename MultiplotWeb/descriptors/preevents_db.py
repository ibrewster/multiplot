from . import description_source, create_description_dataframe

import pandas

from MultiplotWeb.generators.preevents_db import preevents_label_query

@description_source
def get_preevents_db_details() -> pandas.DataFrame:
    """Get the descriptions of the available datasets/datastreams from the preevents database"""
    labels = preevents_label_query()
    plot_descriptions = []
    for item in labels:
        desc = f"<p>{item[4]}, {item[5]}</p><p>{item[6]}</p>"
        plot_descriptions.append((item[1], item[0], desc))

    return create_description_dataframe(plot_descriptions)