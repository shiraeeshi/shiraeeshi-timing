#!/usr/bin/env python3.8

from common import gtk, appindicator, WebKit2
from models.indic_env import IndicEnv
from view.menu.menu import create_menu

#import asyncio

#async def main():
def main():
    indicator = appindicator.Indicator.new("customtray", "clock-icon", appindicator.IndicatorCategory.APPLICATION_STATUS)
    indicEnv = IndicEnv(indicator);
    indicator.set_status(appindicator.IndicatorStatus.ACTIVE)
    #menu = await create_menu(indicEnv)
    menu = create_menu(indicEnv)
    indicator.set_menu(menu)
    gtk.main()



if __name__ == "__main__":
    #asyncio.run(main())
    main()
