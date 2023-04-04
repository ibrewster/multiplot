from flask import Flask

app = Flask(__name__)

from . import main, utils
utils.get_volc_ids()

# imported to register functions
from .generators import *
