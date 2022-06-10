import os
import json
from datetime import datetime
from common import gtk, WebKit2, Gdk
from definitions import ROOT_DIR
from logic.page_communicator import PageCommunicator
from logic.window_app_state import WindowAppState
from models.config_info import json2config
from logic.timing_file_parser import read_timings, read_timings_for_range_of_dates
from logic.timing_index_manager import create_or_refresh_index

def show_timings_frequencies():
    timing2indexFilename = create_or_refresh_index()
    window = gtk.Window()
    window.set_title("Something")
    window.connect("destroy", gtk.main_quit)
    window.set_default_size(800, 900)
    window.set_position(gtk.WindowPosition.CENTER)

    headerbar = gtk.HeaderBar()
    headerbar.set_show_close_button(True)
    window.set_titlebar(headerbar)

    scrolled_window = gtk.ScrolledWindow()

    webview = WebKit2.WebView()

    webview.get_settings().set_enable_developer_extras(True)

    app_my_file = os.path.join(ROOT_DIR, "frontend", "timings_reports", "timings_frequencies_prob01.my.js")
    with open(app_my_file) as f:
        contents = f.read()
        webview.get_user_content_manager().add_script(
                WebKit2.UserScript.new(contents, 0, 1, None, None)
                )

    app_functions_file = os.path.join(ROOT_DIR, "frontend", "timings_reports", "timings_frequencies_prob01.functions.js")
    with open(app_functions_file) as f:
        contents = f.read()
        webview.get_user_content_manager().add_script(
                WebKit2.UserScript.new(contents, 0, 1, None, None)
                )

    app_styles_file = os.path.join(ROOT_DIR, "frontend", "timings_reports", "timings_frequencies_prob01.styles.css")
    with open(app_styles_file) as f:
        contents = f.read()
        webview.get_user_content_manager().add_style_sheet(
                WebKit2.UserStyleSheet.new(contents, 0, 0, None, None)
                )

    page_communicator = PageCommunicator(webview)
    app_state = WindowAppState(page_communicator)

    def load_changed_handler(a_webview, load_event):
        if load_event == WebKit2.LoadEvent.FINISHED:
            app_state.page_loaded()
    webview.connect("load_changed", load_changed_handler);

    webview.get_user_content_manager().connect("script-message-received::timings_frequencies_msgs"
            , lambda userContentManager, value: page_communicator.handleScriptMessage(value))
    webview.get_user_content_manager().register_script_message_handler("timings_frequencies_msgs")

    def handle_request_timings_for_period(userContentManager, value):
        dates_as_strings = json.loads(value.get_js_value().to_json(2)).split(" - ")
        if len(dates_as_strings) != 2:
            print("handle_request_timings_for_period. error: unexpected request parameter value (expected two dates with ' - ' between them)")
            return
        strPeriodFrom = dates_as_strings[0]
        strPeriodTo = dates_as_strings[1]
        periodFrom = datetime.strptime(strPeriodFrom, "%d.%m.%Y")
        periodTo = datetime.strptime(strPeriodTo, "%d.%m.%Y")
        print("handle_request_timings_for_period. from: {}, to: {}".format(periodFrom, periodTo))
        timings = read_timings_for_range_of_dates(app_state.config, timing2indexFilename, periodFrom, periodTo)
        response = json.dumps({"msg_type": "timings_query_response", "timings": timings});
        # print("handle_request_timings_for_period. response: " + response)
        page_communicator.send_json(response)
        pass

    webview.get_user_content_manager().connect("script-message-received::timings_frequencies_msgs__timings_for_period"
            , handle_request_timings_for_period)
    webview.get_user_content_manager().register_script_message_handler("timings_frequencies_msgs__timings_for_period")



    def webview_key_press_handler(a_webview, eve):
        keyval = eve.keyval
        keyval_name = Gdk.keyval_name(keyval)
        print ("webview_key_press_handler. keyval: " + keyval_name)
        if keyval_name == "Escape":
            if not window.emit("delete-event", Gdk.Event(Gdk.EventType.DELETE)):
                window.destroy()
            return True
        #if keyval_name == "Left":
        #    page_communicator.send_json("{\"msg_type\": \"keypress_event\", \"keyval\": \"Left\"}")
        #    return True
        #if keyval_name == "Right":
        #    page_communicator.send_json("{\"msg_type\": \"keypress_event\", \"keyval\": \"Right\"}")
        #    return True
        if keyval_name == "f":
            if app_state.is_fullscreen:
                window.unfullscreen()
            else:
                window.fullscreen()
            app_state.is_fullscreen = not app_state.is_fullscreen 
            return True

        if (keyval_name == "J" or keyval_name == "j") and (eve.state & Gdk.ModifierType.SHIFT_MASK != 0) and (eve.state & Gdk.ModifierType.CONTROL_MASK != 0):
            webview.get_inspector().show()
    webview.connect("key_press_event", webview_key_press_handler);

    def webview_button_press_handler(a_webview, eve):
        if eve.type == Gdk.EventType.DOUBLE_BUTTON_PRESS:
            if app_state.is_fullscreen:
                window.unfullscreen()
            else:
                window.fullscreen()
            app_state.is_fullscreen = not app_state.is_fullscreen 
            return True
    webview.connect("button_press_event", webview_button_press_handler);

    config_file = os.path.join(ROOT_DIR, "indic.config.txt")
    with open(config_file) as f:
        contents = f.read().rstrip()
        print("config contents: {}".format(contents))
        config = json2config(contents)
        app_state.config = config
        page_communicator.config_loaded(config)
        timings_contents = read_timings(config)

        # app_state.after_page_loaded(
        #         lambda : page_communicator.send_json(json.dumps(timings_contents, ensure_ascii=False).encode('utf8')))

        app_state.after_page_loaded(
                lambda : page_communicator.send_json(json.dumps(timings_contents, ensure_ascii=False)))

    app_html_file = os.path.join(ROOT_DIR, "frontend", "timings_reports", "timings_frequencies_prob01.html")
    with open(app_html_file) as f:
        #base_uri = "file:///"
        from urllib.parse import urljoin
        from urllib.request import pathname2url
        base_uri = urljoin('file:', pathname2url(ROOT_DIR)) + "/"
        webview.load_html(f.read(), base_uri)

    scrolled_window.add(webview)

    window.add(scrolled_window)
    window.show_all()

    gtk.main()



