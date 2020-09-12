import os
import json
from common import gtk, WebKit2
from definitions import ROOT_DIR
from logic.page_communicator import PageCommunicator
from logic.window_app_state import WindowAppState
from models.config_info import json2config
from logic.timing_file_parser import read_timings

#async def show_window():
#async def show_window(_):
def show_window():
    window = gtk.Window()
    window.set_title("Something")
    window.connect("destroy", gtk.main_quit)
    window.set_default_size(800, 600)

    headerbar = gtk.HeaderBar()
    headerbar.set_show_close_button(True)
    window.set_titlebar(headerbar)

    scrolled_window = gtk.ScrolledWindow()

    webview = WebKit2.WebView()
    #webview.open("https://www.gnome.org/")

    app_functions_file = os.path.join(ROOT_DIR, "frontend", "app.functions.js")
    with open(app_functions_file) as f:
        contents = f.read()
        webview.get_user_content_manager().add_script(
                WebKit2.UserScript.new(contents, 0, 1, None, None)
                )

    app_styles_file = os.path.join(ROOT_DIR, "frontend", "app.styles.css")
    with open(app_styles_file) as f:
        contents = f.read()
        webview.get_user_content_manager().add_style_sheet(
                WebKit2.UserStyleSheet.new(contents, 0, 1, None, None)
                )

    page_communicator = PageCommunicator(webview)
    app_state = WindowAppState(page_communicator)

    def load_changed_handler(a_webview, load_event):
        if load_event == WebKit2.LoadEvent.FINISHED:
            app_state.page_loaded()
    webview.connect("load_changed", load_changed_handler);
    webview.get_user_content_manager().connect("script-message-received::foobar"
            , lambda userContentManager, value: page_communicator.handleScriptMessage(value))
    webview.get_user_content_manager().register_script_message_handler("foobar")

    config_file = os.path.join(ROOT_DIR, "indic.config.txt")
    with open(config_file) as f:
        contents = f.read().rstrip()
        print("config contents: {}".format(contents))
        config = json2config(contents)
        app_state.config = config
        page_communicator.config_loaded(config)
        timings_contents = read_timings(config)
        #await page_communicator.load_finished_event.wait()
        app_state.after_page_loaded(
                lambda : page_communicator.send_json(json.dumps(timings_contents)))

    app_html_file = os.path.join(ROOT_DIR, "frontend", "app.html")
    with open(app_html_file) as f:
        webview.load_html(f.read())

    scrolled_window.add(webview)

    window.add(scrolled_window)
    window.show_all()

    gtk.main()

