import os
from common import gtk
from definitions import ROOT_DIR, icon_of_default_mode, icon_of_active_timer_mode
from enum import Enum
from view.some_window import show_window
from view.composite_main_window import show_composite_main_window
from view.timings_summary.summary import show_timings_summary
from view.timings_history.timings_history_latest import show_timings_history_latest
from view.timings_reports.timings_frequencies_prob01 import show_timings_frequencies

#async def create_menu(indicEnv):
def create_menu(indicEnv):
    menu = gtk.Menu()

    def start_timing(_):
        timing_name = "test timing"
        indicEnv.timing_manager.start_timing(timing_name)
        change_icon()
        indicEnv.indicator.set_menu(second_menu(indicEnv, timing_name))
    item_start_timing = gtk.MenuItem('Start Timing')
    item_start_timing.connect('activate', start_timing)
    menu.append(item_start_timing)

    #item_command_one = gtk.MenuItem('My Notes')
    #item_command_one.connect('activate', note)
    #menu.append(item_command_one)

    item_command_one = gtk.MenuItem('Main Window')
    item_command_one.connect('activate', lambda _: show_composite_main_window(indicEnv))
    menu.append(item_command_one)

    item_command_two = gtk.MenuItem('Processes')
    #item_command_two.connect('activate', show_window)
    item_command_two.connect('activate', lambda _: show_window())
    menu.append(item_command_two)

    #item_with_submenu = gtk.MenuItem('With Submenu')
    #item_with_submenu.set_submenu(create_some_submenu())
    #menu.append(item_with_submenu)

    item_timings_frequencies = gtk.MenuItem('Timings Frequencies')
    item_timings_frequencies.connect('activate', lambda _: show_timings_frequencies())
    menu.append(item_timings_frequencies)

    item_timings_history = gtk.MenuItem('Timings History Latest')
    item_timings_history.connect('activate', lambda _: show_timings_history_latest())
    menu.append(item_timings_history)

    item_timing_summary = gtk.MenuItem('Timing Summary')
    item_timing_summary.connect('activate', lambda _: show_timings_summary(TimingSummaryType.LAST_24_HOURS))
    menu.append(item_timing_summary)

    item_sep = gtk.SeparatorMenuItem()
    menu.append(item_sep)

    item_exittray = gtk.MenuItem('Exit Tray')
    item_exittray.connect('activate', quit)
    menu.append(item_exittray)

    def change_icon():
        if indicEnv.timing_manager.has_timing():
            indicEnv.indicator.set_icon(icon_of_active_timer_mode());
        else:
            indicEnv.indicator.set_icon(icon_of_default_mode());

    menu.show_all()
    return menu

def create_some_submenu():
    summaries_menu = gtk.Menu()

    item_24_hours = gtk.MenuItem('24 Hours')
    item_24_hours.connect('activate', lambda _: show_timings_summary(TimingSummaryType.LAST_24_HOURS))
    summaries_menu.append(item_24_hours)

    item_12_hours = gtk.MenuItem('12 Hours')
    item_12_hours.connect('activate', lambda _: show_timings_summary(TimingSummaryType.LAST_12_HOURS))
    summaries_menu.append(item_12_hours)

    item_from_zero_hours = gtk.MenuItem('from 00:00')
    item_from_zero_hours.connect('activate', lambda _: show_timings_summary(TimingSummaryType.FROM_ZERO_HOURS))
    summaries_menu.append(item_from_zero_hours)

    return summaries_menu

class TimingSummaryType(Enum):
    LAST_24_HOURS = 1
    LAST_12_HOURS = 2
    FROM_ZERO_HOURS = 3


def second_menu(indicEnv, timing_name):
    menu = gtk.Menu()

    def stop_timing(_):
        indicEnv.timing_manager.stop_timing()
        change_icon()
        indicEnv.indicator.set_menu(create_menu(indicEnv))
    item_stop_timing = gtk.MenuItem('Stop Timing: {}'.format(timing_name))
    item_stop_timing.connect('activate', stop_timing)
    menu.append(item_stop_timing)

    def change_icon():
        if indicEnv.timing_manager.has_timing():
            indicEnv.indicator.set_icon(icon_of_active_timer_mode());
        else:
            indicEnv.indicator.set_icon(icon_of_default_mode());

    exittray = gtk.MenuItem('Exit Something')
    exittray.connect('activate', quit)
    menu.append(exittray)

    menu.show_all()
    return menu

def note(_):
    os.system("gedit $HOME/timing")

def quit(_):
    gtk.main_quit()
