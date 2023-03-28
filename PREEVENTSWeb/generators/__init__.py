import glob
import os

path = os.path.dirname(__file__)
modules = glob.glob(os.path.join(path, "*.py"))

# Have to set this so import * works
__all__ = [os.path.basename(x).replace('.py', '')
           for x in modules
           if not os.path.basename(x).startswith('_')]
