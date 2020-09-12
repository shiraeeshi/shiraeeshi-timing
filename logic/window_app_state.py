
class WindowAppState(object):
    def __init__(self, page_communicator):
        self.page_communicator = page_communicator
        self.config = None
        self.after_page_loaded_actions = []

    def page_loaded(self):
        self.page_communicator.page_loaded()
        for action in self.after_page_loaded_actions:
            action()

    def after_page_loaded(self, action):
        self.after_page_loaded_actions.append(action)

