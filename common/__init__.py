import gi
#import pgi
#pgi.install_as_gi()

gi.require_version('Gtk', '3.0')
gi.require_version('WebKit2', '4.0')
gi.require_version('WebKit2WebExtension', '4.0')

from gi.repository import Gtk as gtk, AppIndicator3 as appindicator, WebKit2

