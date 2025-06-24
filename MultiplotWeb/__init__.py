import importlib
import pkgutil

from flask import Flask
from flask_cors import CORS

app = Flask(__name__)
cors = CORS(app)

from . import main, utils
utils.get_volcs()

# Load data retreval "plugins"
import MultiplotWeb.generators as generators_pkg
def load_generators():
    for _, module_name, is_pkg in pkgutil.iter_modules(generators_pkg.__path__):
        if not is_pkg and not module_name.startswith("_"):
            importlib.import_module(f"{generators_pkg.__name__}.{module_name}")

load_generators()
