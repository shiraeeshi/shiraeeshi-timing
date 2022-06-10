#!/usr/bin/env python3.8

import os
import re
import uuid
from datetime import datetime

from definitions import ROOT_DIR
from models.config_info import json2config

def create_or_refresh_index():

    config_file = os.path.join(ROOT_DIR, "indic.config.txt")

    tmp_dir = os.path.join(ROOT_DIR, "tmp")
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)

    file_index_names = os.path.join(tmp_dir, "filenames_of_indexes")

    timing2indexFilename = {}

    if os.path.exists(file_index_names):
        pattern_names = "index-name: ([a-z0-9-]+), timing-name: (.+)$"
        with open(file_index_names) as f:
            lines = f.readlines()
            for line in lines:
                match = re.match(pattern_names, line)
                if match is None:
                    continue
                index_name = match.group(1)
                timing_name = match.group(2)
                timing2indexFilename[timing_name] = index_name

    with open(config_file) as f:
        contents = f.read().rstrip()
        #print("config contents: {}".format(contents))
        config = json2config(contents)

        for timing in config.timings:
            timing_name = timing.get("name")
            index_name = None
            if timing_name in timing2indexFilename:
                index_name = timing2indexFilename[timing_name]
                timing_filepath = os.path.expanduser(timing.get("filepath"))
                tmp_index_filepath = os.path.join(tmp_dir, index_name)
                if os.path.isfile(tmp_index_filepath):
                    _refresh_index(timing, index_name, tmp_dir)
                else:
                    _create_index_for_timing(timing, index_name, tmp_dir)
            else:
                timing_uuid = uuid.uuid4()
                index_name = str(timing_uuid)
                timing2indexFilename[timing_name] = index_name
                _create_index_for_timing(timing, index_name, tmp_dir)

    with open(file_index_names, 'w') as f:
        for timing_name, index_name in timing2indexFilename.items():
            f.write("index-name: {}, timing-name: {}\n".format(index_name, timing_name))

    return timing2indexFilename

def _refresh_index(timing, index_name, tmp_dir):
    timing_name = timing.get("name")
    timing_filepath = os.path.expanduser(timing.get("filepath"))
    timing_last_modified = os.path.getmtime(timing_filepath)

    index_last_modified_filepath = os.path.join(tmp_dir, index_name + ".last_modified")
    if os.path.isfile(index_last_modified_filepath):
        with open(index_last_modified_filepath) as f_ilm:
            index_last_modified = None
            ilm_str = ""
            try:
                ilm_str = f_ilm.read()
                index_last_modified = float(ilm_str)
            except:
                print("error reading index_last_modified for timing {}, value: {}".format(timing_name, ilm_str))
                index_last_modified = None

            if index_last_modified == timing_last_modified:
                print("index_last_modified is the same as timing_last_modified, skipping recreating index for timing {}".format(timing_name))
                pass # do nothing, no need to refresh or recreate the index
            elif index_last_modified is None:
                print("couldn't read index_last_modified for timing {}, recreating index".format(timing_name))
                tmp_index_filepath = os.path.join(tmp_dir, index_name)
                os.remove(tmp_index_filepath) # wipe out the old contents
                _create_index_for_timing(timing, index_name, tmp_dir)
            else:
                print("index_last_modified != timing_last_modified, going to refresh the index for timing {}".format(timing_name))
                _truncate_after_first_diff_and_append_to_index(timing, index_name, tmp_dir)
                print("refreshed the index for timing {}".format(timing_name))

def _truncate_after_first_diff_and_append_to_index(timing, index_name, tmp_dir):
    timing_name = timing.get("name")
    timing_filepath = os.path.expanduser(timing.get("filepath"))
    with open(timing_filepath, encoding='utf-8') as timing_file:
        _traverse_index_prefix_and_truncate_after_first_diff(timing, index_name, tmp_dir, timing_file)
        tmp_index_filepath = os.path.join(tmp_dir, index_name)
        with open(tmp_index_filepath, 'a', encoding='utf-8') as index_file:
            _append_to_index_for_timing(timing_file, index_file)
        _remember_timing_last_modified(timing_filepath, index_name, tmp_dir)

# traverse the prefix of index that is safe to append to, and truncate the rest
def _traverse_index_prefix_and_truncate_after_first_diff(timing, index_name, tmp_dir, timing_file):
    timing_name = timing.get("name")
    tmp_index_filepath = os.path.join(tmp_dir, index_name)
    with open(tmp_index_filepath, "r+", encoding='utf-8') as f_ind_in:
        first_line_of_index = f_ind_in.readline().rstrip()
        if (first_line_of_index != "date,offset_from,offset_to"):
            raise Exception("error reading index: wrong format (doesn't start with header \"date,offset_from,offset_to\"). timing: {}, index file: {}".format(timing_name, index_name))
        prev_index_entry = None
        while True:
            index_offset = f_ind_in.tell()
            line_of_index = f_ind_in.readline()
            if line_of_index == "":
                print("_traverse_index_prefix_and_truncate_after_first_diff: about to return (reached the end of index) for timing {}".format(timing_name));
                timing_file.seek(prev_index_entry["offset_from"])
                return
            line_of_index = line_of_index.rstrip()
            while True:
                offset = timing_file.tell()
                line_timing = timing_file.readline()

                if line_timing == "":
                    if prev_index_entry != None:
                        expected_index_line = "{},{},{}".format(prev_index_entry["date"], prev_index_entry["offset_from"], offset)
                        if line_of_index != expected_index_line:
                            print("_traverse_index_prefix_and_truncate_after_first_diff: about to truncate for timing {}: line_of_index != expected_index_line, line_of_index: {}, expected_index_line: {}".format(timing_name, line_of_index, expected_index_line))
                            f_ind_in.seek(index_offset)
                            f_ind_in.truncate()
                            timing_file.seek(prev_index_entry["offset_from"])
                            return
                    end_of_index_reached = f_ind_in.readline() == ""
                    if end_of_index_reached == False:
                        print("_traverse_index_prefix_and_truncate_after_first_diff: about to truncate (end_of_index_reached is False) for timing {}".format(timing_name));
                        f_ind_in.truncate()
                    return

                match = re.match(pattern_date_and_timing, line_timing)
                if match is None:
                    continue
                day_of_month = match.group(1)
                month = match.group(2)
                year = match.group(3)
                year = int(year)
                if year < 100:
                    year += 2000
                a_date = "{}.{}.{}".format(day_of_month, month, year)
                if prev_index_entry == None:
                    prev_index_entry = {"date": a_date, "offset_from": offset}
                    continue
                if a_date != prev_index_entry["date"]:
                    expected_index_line = "{},{},{}".format(prev_index_entry["date"], prev_index_entry["offset_from"], offset)
                    if line_of_index != expected_index_line:
                        print("_traverse_index_prefix_and_truncate_after_first_diff: about to truncate for timing {}: line_of_index != expected_index_line, line_of_index: {}, expected_index_line: {}".format(timing_name, line_of_index, expected_index_line))
                        f_ind_in.seek(index_offset)
                        f_ind_in.truncate()
                        timing_file.seek(prev_index_entry["offset_from"])
                        return
                    else:
                        prev_index_entry = {"date": a_date, "offset_from": offset}
                        break

def _append_to_index_for_timing(timing_file, index_file):
    prev_index_entry = None
    while True:
        offset = timing_file.tell()
        line = timing_file.readline()

        if line == "":
            if prev_index_entry != None:
                index_file.write("{},{},{}\n".format(prev_index_entry["date"], prev_index_entry["offset_from"], offset))
            break

        match = re.match(pattern_date_and_timing, line)
        if match is None:
            continue
        day_of_month = match.group(1)
        month = match.group(2)
        year = match.group(3)
        year = int(year)
        if year < 100:
            year += 2000
        a_date = "{}.{}.{}".format(day_of_month, month, year)
        if prev_index_entry == None:
            prev_index_entry = {"date": a_date, "offset_from": offset}
            continue
        if a_date != prev_index_entry["date"]:
            index_file.write("{},{},{}\n".format(prev_index_entry["date"], prev_index_entry["offset_from"], offset))
            prev_index_entry = {"date": a_date, "offset_from": offset}

def _create_index_for_timing(timing, index_name, tmp_dir):
    timing_name = timing.get("name")
    print("timing: {}".format(timing_name))
    timing_filepath = os.path.expanduser(timing.get("filepath"))
    tmp_index_filepath = os.path.join(tmp_dir, index_name)
    with open(timing_filepath, encoding='utf-8') as timing_file:
        with open(tmp_index_filepath, 'a', encoding='utf-8') as index_file:
            index_file.write("date,offset_from,offset_to\n")
            _append_to_index_for_timing(timing_file, index_file)

    _remember_timing_last_modified(timing_filepath, index_name, tmp_dir)

def _remember_timing_last_modified(timing_filepath, index_name, tmp_dir):
    index_last_modified_filepath = os.path.join(tmp_dir, index_name + ".last_modified")
    timing_last_modified = os.path.getmtime(timing_filepath)
    with open(index_last_modified_filepath, 'w') as f_ilm:
        f_ilm.write("{}".format(timing_last_modified))

def yield_index_for_range_of_dates(indexFilename, dateFrom, dateTo):
    filepath = os.path.join(ROOT_DIR, "tmp", indexFilename)
    with open(filepath, encoding='utf-8') as f:
        first_line = f.readline().rstrip()
        if (first_line != "date,offset_from,offset_to"):
            raise Exception("error reading index: wrong format (doesn't start with header \"date,offset_from,offset_to\")")
        line_number = 0
        while True:
            line_number += 1
            line = f.readline()
            if line == "":
                break
            line = line.rstrip()
            words = line.split(",")

            if len(words) != 3:
                raise Exception("error while parsing timing index: wrong format (len(line.split(\",\")) != 3). line {}: {}".format(line_number, line))

            dateAsStr = words[0]
            date = datetime.strptime(dateAsStr, "%d.%m.%Y")

            if date < dateFrom:
                continue
            if date > dateTo:
                break

            offset_from = words[1]
            offset_to = words[2]

            try:
                offset_from = int(offset_from)
                offset_to = int(offset_to)

                offsets_line_obj = {"date": dateAsStr, "offset_from": offset_from, "offset_to": offset_to}
                yield offsets_line_obj
            except ValueError as err:
                print("error while parsing timing index: wrong format (couldn't parse as int). line {}: {}".format(line_number, line))
                raise err

def read_index_for_set_of_dates(indexFilename, set_of_dates):
    filepath = os.path.join(ROOT_DIR, "tmp", indexFilename)
    offsets_by_date = {}
    with open(filepath, encoding='utf-8') as f:
        first_line = f.readline().rstrip()
        if (first_line != "date,offset_from,offset_to"):
            raise Exception("error reading index: wrong format (doesn't start with header \"date,offset_from,offset_to\")")
        line_number = 0
        while True:
            line_number += 1
            line = f.readline()
            if line == "":
                break
            line = line.rstrip()
            words = line.split(",")

            if len(words) != 3:
                raise Exception("error while parsing timing index: wrong format (len(line.split(\",\")) != 3). line {}: {}".format(line_number, line))

            date = words[0]

            if not date in set_of_dates:
                continue

            offset_from = words[1]
            offset_to = words[2]

            try:
                offset_from = int(offset_from)
                offset_to = int(offset_to)

                offsets_by_date[date] = {"offset_from": offset_from, "offset_to": offset_to}
            except ValueError as err:
                print("error while parsing timing index: wrong format (couldn't parse as int). line {}: {}".format(line_number, line))
                raise err


    return offsets_by_date

def read_index(indexFilename):
    filepath = os.path.join(ROOT_DIR, "tmp", indexFilename)
    offsets_by_date = {}
    with open(filepath, encoding='utf-8') as f:
        first_line = f.readline().rstrip()
        if (first_line != "date,offset_from,offset_to"):
            raise Exception("error reading index: wrong format (doesn't start with header \"date,offset_from,offset_to\")")
        line_number = 0
        while True:
            line_number += 1
            line = f.readline()
            if line == "":
                break
            line = line.rstrip()
            words = line.split(",")

            if len(words) != 3:
                raise Exception("error while parsing timing index: wrong format (len(line.split(\",\")) != 3). line {}: {}".format(line_number, line))

            date = words[0]
            offset_from = words[1]
            offset_to = words[2]

            try:
                offset_from = int(offset_from)
                offset_to = int(offset_to)

                offsets_by_date[date] = {"offset_from": offset_from, "offset_to": offset_to}
            except ValueError as err:
                print("error while parsing timing index: wrong format (couldn't parse as int). line {}: {}".format(line_number, line))
                raise err


    return offsets_by_date

pattern_date = "([0-9]{2})\.([0-9]{2})\.([0-9]{2,4})"
pattern_timing = "([0-9]{2}):([0-9]{2}) - ([0-9]{2}):([0-9]{2})( [- *] \(([0-9]+) m\) )?"
pattern_date_and_timing = pattern_date + " " + pattern_timing

def main():
    create_index()

if __name__ == "__main__":
    #asyncio.run(main())
    main()
