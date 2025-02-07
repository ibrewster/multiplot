from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
cors = CORS(app)

from . import main, utils
utils.get_volcs()
utils.get_db_labels()

# imported to register functions
from .generators import *
utils.get_preevents_labels()
