import os

script_dir = os.path.dirname(__file__)
script_dir = os.path.abspath(os.path.join(script_dir,'..'))

wsgi_app = "MultiplotWeb:app"
chdir = script_dir
# user = "mapgen"
# group = "nginx"
bind = ['unix:/var/run/multiplot/multiplot.sock']
workers = 8
threads = 50
worker_connections = 51
timeout = 300
accesslog = "/var/log/multiplot/access.log"
errorlog = "/var/log/multiplot/error.log"
capture_output = True
