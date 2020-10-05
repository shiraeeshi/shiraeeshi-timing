import os
import json
from common import gtk, WebKit2
from definitions import ROOT_DIR
from logic.page_communicator import PageCommunicator
from logic.window_app_state import WindowAppState
from models.config_info import json2config
from logic.processes_file_parser import parse_processes_file

#async def show_window():
#async def show_window(_):
def show_window():
    window = gtk.Window()
    window.set_title("Something")
    window.connect("destroy", gtk.main_quit)
    window.set_default_size(1200, 800)

    headerbar = gtk.HeaderBar()
    headerbar.set_show_close_button(True)
    window.set_titlebar(headerbar)

    scrolled_window = gtk.ScrolledWindow()

    show_web_inspector = False

    webview = WebKit2.WebView()

    webview.get_settings().set_allow_file_access_from_file_urls(True)

    if (show_web_inspector):
        webview.get_settings().set_enable_developer_extras(True)
    #webview.open("https://www.gnome.org/")

    app_functions_file = os.path.join(ROOT_DIR, "frontend", "app.functions.js")
    with open(app_functions_file) as f:
        contents = f.read()
        webview.get_user_content_manager().add_script(
                WebKit2.UserScript.new(contents, 0, 1, ["file:///"], None)
                )

    app_styles_file = os.path.join(ROOT_DIR, "frontend", "app.styles.css")
    with open(app_styles_file) as f:
        contents = f.read()
        webview.get_user_content_manager().add_style_sheet(
                WebKit2.UserStyleSheet.new(contents, 0, 1, None, [])
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
        #print("config contents: {}".format(contents))
        config = json2config(contents)
        app_state.config = config
        page_communicator.config_loaded(config)
        processes_info = parse_processes_file(config.processes_filepath)
        composed_info = {
                "processes": processes_info
                }
        #await page_communicator.load_finished_event.wait()
        app_state.after_page_loaded(
                lambda : page_communicator.send_json(json.dumps(composed_info)))

    app_html_file = os.path.join(ROOT_DIR, "frontend", "app.html")
    with open(app_html_file) as f:
        base_uri = "file:///"
        webview.load_html(f.read(), base_uri)

    if (show_web_inspector):
        webview.get_inspector().show()

    scrolled_window.add(webview)

    window.add(scrolled_window)
    window.show_all()

    gtk.main()

