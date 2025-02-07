from MultiplotWeb import app

if __name__ == "__main__":
    app.config['TEMPLATES_AUTO_RELOAD'] = True
    app.run(host = "0.0.0.0", debug = False, port = 5050, use_reloader = True)
