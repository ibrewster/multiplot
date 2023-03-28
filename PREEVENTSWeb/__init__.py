from flask import Flask

app = Flask(__name__)

from . import main

# imported to register functions
from .generators import *
