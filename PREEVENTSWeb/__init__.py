from flask import Flask

app = Flask(__name__)

from . import main

# imported to register functions
from .generators import (
    General,
    Petrology,
    Seismology_TC,
    Seismology_AQMS,
    Seismology_REC,
    Thermal
)
