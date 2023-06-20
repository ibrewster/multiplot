from flask import Flask

app = Flask(__name__)

from . import main, utils
utils.get_volcs()

# imported to register functions
from .generators import *
