import gi
#import pgi
#pgi.install_as_gi()

gi.require_version('Gtk', '3.0')
gi.require_version('WebKit2', '4.0')
gi.require_version('WebKit2WebExtension', '4.0')
gi.require_version('AppIndicator3', '0.1')

from gi.repository import Gtk as gtk, Gdk, AppIndicator3 as appindicator, WebKit2

