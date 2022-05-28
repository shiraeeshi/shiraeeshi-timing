import os
import re
from datetime import datetime
from logic.timing_index_manager import read_index

def read_timings(config):
    result = {}
    for timing in config.timings:
        timing_name = timing.get("name")
        filepath = os.path.expanduser(timing.get("filepath"))
        frmt = timing.get("format")
        with open(filepath, encoding='utf-8') as f:
            if frmt == "txt" or frmt == None:
                lines = f.readlines()
                lines = map(lambda l:l.rstrip(), lines)
                #result[timing_name] = lines
                timings = parse_timing_file_lines(lines)
                result[timing_name] = timings
                #import json
                #print(json.dumps(timings))
            elif frmt == "yaml":
                import yaml
                parsed_yaml = yaml.load(f)
                parsed_timings = parse_yaml_timings(parsed_yaml)
                result[timing_name] = parsed_timings
    return result

def read_timings_of_today(config, timing2indexFilename):
    result = {}
    current_time = datetime.now()
    today_str = current_time.strftime("%d.%m.%Y")
    for timing in config.timings:
        timing_name = timing.get("name")
        filepath = os.path.expanduser(timing.get("filepath"))
        indexFilename = timing2indexFilename[timing_name]
        offsets_by_date = read_index(indexFilename)
        offsets_of_today = None
        if today_str in offsets_by_date:
            offsets_of_today = offsets_by_date[today_str]
        frmt = timing.get("format")
        with open(filepath, encoding='utf-8') as f:
            if frmt == "txt" or frmt == None:
                lines = None
                if offsets_of_today == None:
                    lines = f.readlines()
                    lines = map(lambda l:l.rstrip(), lines)
                    #result[timing_name] = lines
                else:
                    f.seek(offsets_of_today["offset_from"])
                    a_string = f.read(offsets_of_today["offset_to"] - offsets_of_today["offset_from"])
                    lines = a_string.splitlines()
                timings = parse_timing_file_lines(lines)
                result[timing_name] = timings
                #import json
                #print(json.dumps(timings))
            elif frmt == "yaml":
                import yaml
                parsed_yaml = None
                if offsets_of_today == None:
                    #parsed_yaml = yaml.load(f)
                    parsed_yaml = {}
                    pass
                else:
                    #import json
                    #print("offsets_of_today: {}".format(json.dumps(offsets_of_today)))
                    f.seek(offsets_of_today["offset_from"])
                    a_string = f.read(offsets_of_today["offset_to"] - offsets_of_today["offset_from"])
                    print("debug index: timing: {}, a_string: {}".format(timing_name, a_string))
                    parsed_yaml = yaml.safe_load(a_string)
                parsed_timings = parse_yaml_timings(parsed_yaml)

                import json
                print("debug index: parsed_timings: {}".format(json.dumps(parsed_timings)))

                result[timing_name] = parsed_timings
    return result

def parse_yaml_timings(parsed_yaml):
    result = []

    current_day_timings = []
    current_day = None

    pattern_date = "([0-9]{2})\.([0-9]{2})\.([0-9]{2,4})"
    pattern_timing = "([0-9]{2}):([0-9]{2}) - ([0-9]{2}):([0-9]{2})( [- *] \(([0-9]+) m\) )?"
    pattern_date_and_timing = pattern_date + " " + pattern_timing
    for k, v in parsed_yaml.items():
        time_from_to = k
        match = re.match(pattern_date_and_timing, time_from_to)
        if match is None:
            continue
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
        dt = [int(day_of_month), int(month), year]
        if current_day is not None and dt == current_day:
            pass
        else:
            current_day = dt
            current_day_timings = []
            result.append({"date": current_day, "timings": current_day_timings})

        from_hour = match.group(4)
        from_minute = match.group(5)
        to_hour = match.group(6)
        to_minute = match.group(7)
        minutes = match.group(9)
        #name = match.group(10)
        from_hour = int(from_hour)
        from_minute = int(from_minute)
        to_hour = int(to_hour)
        to_minute = int(to_minute)
        if minutes is None:
            minutes = compute_minutes(from_hour, from_minute, to_hour, to_minute)
        else:
            minutes = int(minutes)

        import json
        name = json.dumps(v, ensure_ascii=False)

        current_day_timings.append({
            "from": [from_hour, from_minute],
            "to": [to_hour, to_minute],
            "minutes": minutes,
            "name": name,
            "value": v
            })
    return result

def parse_timing_file_lines(lines):
    result = []
    current_day_timings = []
    current_day = None

    pattern_date = "([0-9]{2})\.([0-9]{2})\.([0-9]{2,4})"
    pattern_timing = "([0-9]{2}):([0-9]{2}) - ([0-9]{2}):([0-9]{2}) [- *] (\(([0-9]+) m\) )?(.*)"
    pattern_date_and_timing = pattern_date + " " + pattern_timing

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
        match = re.match(pattern_date_and_timing, line)
        if match is not None:
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
            dt = [int(day_of_month), int(month), year]
            if current_day is not None and dt == current_day:
                pass
            else:
                current_day = dt
                current_day_timings = []
                result.append({"date": current_day, "timings": current_day_timings})

            from_hour = match.group(4)
            from_minute = match.group(5)
            to_hour = match.group(6)
            to_minute = match.group(7)
            minutes = match.group(9)
            name = match.group(10)
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

