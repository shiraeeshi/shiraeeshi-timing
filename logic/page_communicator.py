class PageCommunicator(object):
    def __init__(self, webview):
        self.webview = webview
        self.load_finished = False
        #self.load_finished_event = asyncio.Event()
        self.config_load_finished = False
        self.config = None

    def page_loaded(self):
        self.load_finished = True
        #self.load_finished_event.set()
        self._send_initial_message_or_wait()

    def config_loaded(self, config):
        self.config_load_finished = True
        self.config = config
        self._send_initial_message_or_wait()

    def _send_initial_message_or_wait(self):
        if self.load_finished and self.config_load_finished:
            #self.webview.run_javascript("init_listener({});".format(self.config.as_json()))
            pass

    def send_json(self, message_as_json):
        if self.load_finished:
            self.webview.run_javascript("handleServerMessage({});".format(message_as_json))
        else:
            #print("didn't send json (because load is not finished): {}".format(message_as_json))
            pass

    def handleScriptMessage(self, value):
        print("value as json: {}".format(value.get_js_value().to_json(2)))

