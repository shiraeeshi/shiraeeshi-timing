from logic.timing_timer_manager import TimingTimerManager

class IndicEnv(object):
    def __init__(self, indicator, timing2indexFilename):
        self.indicator = indicator
        self.timing_manager = TimingTimerManager()
        self.timing2indexFilename = timing2indexFilename

