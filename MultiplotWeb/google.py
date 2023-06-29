import os
from cachetools.func import ttl_cache

import pandas

from . import app

from apiclient import discovery
from google.oauth2 import service_account

AUTH_DIR = os.path.join(app.static_folder, 'GoogleAuth')
SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

def auth():
    secrets_file = os.path.join(AUTH_DIR, 'client_secret.json')
    creds = service_account.Credentials.from_service_account_file(secrets_file, scopes = SCOPES)
    return creds
  
@ttl_cache(ttl = 86400)
def get_data():
    service = discovery.build('sheets', 'v4', credentials = auth())
    sheet = service.spreadsheets()
    result = sheet.values().get(
        spreadsheetId = '1F_7WloLpoOq_WAvypoUfo6PUuqvNE5HLbmQPcfth-6U',
        range = 'Dataset Descriptions'
    ).execute()
    values = result.get('values', [])
    
    df = pandas.DataFrame(values)
    df.columns = df.iloc[0]
    df = df[1:]
    df.index = pandas.MultiIndex.from_frame(df[['Category', 'Dataset']])
    
    return df