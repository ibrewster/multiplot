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
import MultiplotWeb.descriptors as descriptors_pkg

def load_plugins(pkg):
    for _, module_name, is_pkg in pkgutil.iter_modules(pkg.__path__):
        if not is_pkg and not module_name.startswith("_"):
            importlib.import_module(f"{pkg.__name__}.{module_name}")

print("Loading generators")
load_plugins(generators_pkg)
print("loading descriptors")
load_plugins(descriptors_pkg)