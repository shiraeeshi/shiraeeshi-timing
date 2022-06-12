import os

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))

def icon_of_window():
    icon = os.path.join(ROOT_DIR, "img", "cedar-svgrepo-com.svg")
    return icon

def icon_of_default_mode():
    icon = os.path.join(ROOT_DIR, "img", "cedar-svgrepo-com.svg")
    return icon

def icon_of_active_timer_mode():
    icon = os.path.join(ROOT_DIR, "img", "grey-circle.svg")
    return icon
