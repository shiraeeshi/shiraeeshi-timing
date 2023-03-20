#!/usr/bin/env python3.8

from common import gtk, appindicator, WebKit2
from definitions import ROOT_DIR, icon_of_default_mode
import os
from models.indic_env import IndicEnv
from view.menu.menu import create_menu
from logic.timing_index_manager import create_or_refresh_index

#import asyncio

#async def main():
def main():
    unique_indicator_name = "customtray"
    #icon_name = "clock-icon" # or icon_name = gtk.STOCK_INFO
    icon = icon_of_default_mode()
    indicator = appindicator.Indicator.new(unique_indicator_name, icon, appindicator.IndicatorCategory.APPLICATION_STATUS)
    create_or_refresh_index()
    indicEnv = IndicEnv(indicator);
    indicator.set_status(appindicator.IndicatorStatus.ACTIVE)
    #menu = await create_menu(indicEnv)
    menu = create_menu(indicEnv)
    indicator.set_menu(menu)
    gtk.main()



if __name__ == "__main__":
    #asyncio.run(main())
    main()
