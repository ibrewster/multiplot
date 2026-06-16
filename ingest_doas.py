import io

from pathlib import Path
from urllib.parse import urlparse

from cachetools.func import ttl_cache
from google.oauth2 import service_account
from googleapiclient import discovery

import pandas
import requests
from psycopg import sql
from pandas import DataFrame

from MultiplotWeb.utils import PostgreSQLCursor, VOLC_IDS, get_volcs
from MultiplotWeb import app

static_folder = app.static_folder
AUTH_DIR = Path(static_folder, 'GoogleAuth')
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

COLUMN_MAP = {
    'DateTime [UTC]': 'datetime',
    'InstrumentID': 'instrument_id',
    'SO2EmissionRate [kg/s]': 'so2_rate_kg_s',
    'SO2EmissionRate [t/d]': 'so2_rate_t_d',
    'PlumeCompleteness': 'plume_completeness',
    'WindSpeed [m/s]': 'wind_speed',
    'WindDirection [deg]': 'wind_direction',
    'PlumeHeight [m]': 'plume_height',
    'PlumeCenter [deg]': 'plume_center',
    'PlumeEdge1 [deg]': 'plume_edge1',
    'PlumeEdge2 [deg]': 'plume_edge2',
    'OKFlux': 'ok_flux',
    'Temperature [degC]': 'temperature',
    'BatteryVoltage [V]': 'battery_voltage',
    'EsposureTime [ms]': 'exposure_time',
    'ScanStartTime [hh:mm:ss]': 'scan_start_time',
    'ScanStopTime [hh:mm:ss]': 'scan_stop_time',
    'TimeStamp [UTC]': 'timestamp_utc'
}

def auth():
    secrets_file = Path(AUTH_DIR, 'client_secret.json')
    creds = service_account.Credentials.from_service_account_file(str(secrets_file), scopes=SCOPES)
    return creds


@ttl_cache(ttl=300)
def get_data(url: str = 'https://novac-community.org/data/cleveland_data') -> DataFrame:
    # Extract file ID from URL
    headers = {
        'User-Agent': 'curl/7.68.0',
        'Accept': '*/*'
    }
    response = requests.get(url, allow_redirects=True, stream=True, headers=headers)
    final_url = response.url
    response.close()

    parsed = urlparse(final_url)
    path_parts = parsed.path.split('/')
    if 'd' in path_parts:
        GOOGLE_DRIVE_CSV_FILE_ID = path_parts[path_parts.index('d') + 1]
    else:
        GOOGLE_DRIVE_CSV_FILE_ID = path_parts[-2]

    print(f"Google Drive CSV File ID: {GOOGLE_DRIVE_CSV_FILE_ID}")

    service = discovery.build('drive', 'v3', credentials=auth())

    request = service.files().get_media(fileId=GOOGLE_DRIVE_CSV_FILE_ID)
    csv_bytes = request.execute()

    df = pandas.read_csv(io.BytesIO(csv_bytes))
    if 'Category' in df.columns and 'Dataset' in df.columns:
        df.index = pandas.MultiIndex.from_frame(df[['Category', 'Dataset']])

    return df


def create_table():
    with PostgreSQLCursor("multiplot") as cursor:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS doas (
                datetime TIMESTAMP NOT NULL,
                volcano TEXT NOT NULL,
                instrument_id TEXT NOT NULL,
                so2_rate_kg_s FLOAT,
                so2_rate_t_d FLOAT,
                plume_completeness FLOAT,
                wind_speed FLOAT,
                wind_direction FLOAT,
                plume_height FLOAT,
                plume_center FLOAT,
                plume_edge1 FLOAT,
                plume_edge2 FLOAT,
                ok_flux BOOLEAN,
                temperature FLOAT,
                battery_voltage FLOAT,
                exposure_time FLOAT,
                scan_start_time TIME,
                scan_stop_time TIME,
                timestamp_utc FLOAT,
                PRIMARY KEY (datetime, volcano, instrument_id)
            )
        """)
        cursor.connection.commit()


def ingest_data(df, volcano_name):
    get_volcs()
    volcano_id = VOLC_IDS.get(volcano_name)
    if not volcano_id:
        print(f"Error: Volcano {volcano_name} not found in database.")
        return

    # Prepare DataFrame
    df = df.rename(columns=COLUMN_MAP)
    df['datetime'] = pandas.to_datetime(df['datetime'])
    df['volcano'] = volcano_id
    df['ok_flux'] = df['ok_flux'].astype(bool)
    # -999 is Null
    df = df.replace(-999, None)

    # Handle time columns
    for col in ['scan_start_time', 'scan_stop_time']:
        if col in df.columns:
            df[col] = pandas.to_datetime(df[col], format='%H:%M:%S', errors='coerce').dt.time

    with PostgreSQLCursor("multiplot") as cursor:
        insert_cols = [
            col
            for col in ['volcano', *COLUMN_MAP.values()]
            if col in df.columns
        ]

        df_to_insert = df[insert_cols]

        query = sql.SQL("""
            INSERT INTO {table} ({columns})
            VALUES ({placeholders})
            ON CONFLICT ({conflict_columns}) DO NOTHING
        """).format(
            table=sql.Identifier('doas'),
            columns=sql.SQL(', ').join(map(sql.Identifier, insert_cols)),
            placeholders=sql.SQL(', ').join(sql.Placeholder()*len(insert_cols)),
            conflict_columns=sql.SQL(', ').join(map(sql.Identifier, [
                'datetime',
                'volcano',
                'instrument_id',
            ])),
        )

        data = [tuple(row) for row in df_to_insert.to_numpy()]
        cursor.executemany(query, data)
        inserted_count = cursor.rowcount
        cursor.connection.commit()
        print(f"Inserted {inserted_count} new records; skipped {len(data) - inserted_count} duplicates.")


if __name__ == "__main__":
    url = 'https://novac-community.org/data/cleveland_data'
    df = get_data(url)
    volcano_name = Path(urlparse(url).path).name.replace('_data', '').title()
    
    create_table()
    ingest_data(df, volcano_name)