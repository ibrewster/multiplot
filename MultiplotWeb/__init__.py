from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
cors = CORS(app)

from . import main, utils
utils.get_volcs()

# imported to register functions
from .generators import *
