import os
from datetime import datetime
from models.timing_timer_info import TimingTimerInfo

class TimingTimerManager(object):
    def __init__(self):
        self.current_timing_info = None;

    def has_timing(self):
        return self.current_timing_info is not None;

    def start_timing(self, timing_name):
        self.current_timing_info = TimingTimerInfo(timing_name, datetime.now())

    def stop_timing(self):
        if not self.has_timing():
            raise Exception("timing manager can't stop non-existent timing.")
        current_time = datetime.now()
        started_at = self.current_timing_info.started_at

        current_date_str = started_at.strftime("%d.%m.%Y")
        timing_start_str = started_at.strftime("%H:%M")
        timing_end_str = current_time.strftime("%H:%M")

        delta = current_time - started_at
        delta_str = "{} m".format(delta.seconds / 60)

        row = "{} {} - {}   ({}) {}".format(
                current_date_str,
                timing_start_str,
                timing_end_str,
                delta_str,
                self.current_timing_info.name)
        os.system("echo '{}' >> $HOME/testtiming".format(row))

        self.current_timing_info = None

