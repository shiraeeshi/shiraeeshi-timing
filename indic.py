#!/usr/bin/env python3.8

from common import gtk, appindicator, WebKit2
from models.indic_env import IndicEnv
from view.menu.menu import create_menu
from logic.timing_index_manager import create_index

#import asyncio

#async def main():
def main():
    indicator = appindicator.Indicator.new("customtray", "clock-icon", appindicator.IndicatorCategory.APPLICATION_STATUS)
    timing2indexFilename = create_index()
    indicEnv = IndicEnv(indicator, timing2indexFilename);
    indicator.set_status(appindicator.IndicatorStatus.ACTIVE)
    #menu = await create_menu(indicEnv)
    menu = create_menu(indicEnv)
    indicator.set_menu(menu)
    gtk.main()



if __name__ == "__main__":
    #asyncio.run(main())
    main()
