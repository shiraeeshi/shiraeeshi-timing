import os
import re

def read_timings(config):
    result = {}
    for timing in config.timings:
        timing_name = timing.get("name")
        filepath = os.path.expanduser(timing.get("filepath"))
        with open(filepath) as f:
            lines = f.readlines()
            lines = map(lambda l:l.rstrip(), lines)
            #result[timing_name] = lines
            timings = parse_timing_file_lines(lines)
            result[timing_name] = timings
            #import json
            #print(json.dumps(timings))
    return result

def parse_timing_file_lines(lines):
    result = []
    current_day_timings = []
    current_day = None

    pattern_date = "([0-9]{2})\.([0-9]{2})\.([0-9]{2,4})"
    pattern_timing = "([0-9]{2}):([0-9]{2}) - ([0-9]{2}):([0-9]{2}) [- *] (\(([0-9]+) m\) )?(.*)"

    for line in lines:
        match = re.match(pattern_date, line)
        if match is not None:
            if current_day is not None:
                result.append({"date": current_day, "timings": current_day_timings})
            day_of_month = match.group(1)
            month = match.group(2)
            year = match.group(3)
            dict_date = {
                    "day_of_month": day_of_month,
                    "month": month,
                    "year": year
                    }
            #print("day: " + str(dict_date))
            year = int(year)
            if year < 100:
                year += 2000
            current_day = [int(day_of_month), int(month), year]
            current_day_timings = []
        match = re.match(pattern_timing, line)
        if match is not None:
            from_hour = match.group(1)
            from_minute = match.group(2)
            to_hour = match.group(3)
            to_minute = match.group(4)
            minutes = match.group(6)
            name = match.group(7)
            timing = {
                    "from_hour": from_hour,
                    "from_minute": from_minute,
                    "to_hour": to_hour,
                    "to_minute": to_minute,
                    "minutes": minutes,
                    "name": name
                    }
            #print("timing: " + str(timing))
            from_hour = int(from_hour)
            from_minute = int(from_minute)
            to_hour = int(to_hour)
            to_minute = int(to_minute)
            if minutes is None:
                minutes = compute_minutes(from_hour, from_minute, to_hour, to_minute)
            else:
                minutes = int(minutes)

            current_day_timings.append({
                "from": [from_hour, from_minute],
                "to": [to_hour, to_minute],
                "minutes": minutes,
                "name": name
                })
        if line == "-":
            #print("line is -")
            pass
    if current_day is not None and len(current_day_timings) > 0:
        result.append({"date": current_day, "timings": current_day_timings})
    return result

def compute_minutes(from_hour, from_minute, to_hour, to_minute):
    hour_diff = to_hour - from_hour
    minutes = to_minute - from_minute + 60*hour_diff
    return minutes
