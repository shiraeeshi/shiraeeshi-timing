from logic.timing_timer_manager import TimingTimerManager

class IndicEnv(object):
    def __init__(self, indicator):
        self.indicator = indicator
        self.timing_manager = TimingTimerManager()

