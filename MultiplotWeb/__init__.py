import importlib
import pkgutil

from flask import Flask
from flask_cors import CORS

# Creating the Flask app is cheap and side-effect-free, so it stays at import
# time: the @app.route handlers in main/pdf/plugins reference this module-level
# object. The heavy work (a live DB query and plugin loading) is deferred to
# create_app() so that importing MultiplotWeb submodules (e.g. config, utils)
# from standalone scripts does not boot the whole web stack.
app = Flask(__name__)
cors = CORS(app)


def load_plugins(pkg):
    for _, module_name, is_pkg in pkgutil.iter_modules(pkg.__path__):
        if not is_pkg and not module_name.startswith("_"):
            importlib.import_module(f"{pkg.__name__}.{module_name}")


def create_app():
    """Register routes, load data-retrieval plugins, and return the app.

    Call this from the WSGI / run entry points. Importing this package alone
    does not trigger any of this side-effecting setup.
    """
    from . import main, utils, pdf  # noqa: F401 -- registers @app.route handlers
    utils.get_volcs()

    # Load data retrieval "plugins"
    import MultiplotWeb.generators as generators_pkg
    import MultiplotWeb.descriptors as descriptors_pkg

    print("loading descriptors")
    load_plugins(descriptors_pkg)
    print("Loading generators")
    load_plugins(generators_pkg)

    return app