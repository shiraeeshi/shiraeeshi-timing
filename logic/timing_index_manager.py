#!/usr/bin/env python3.8

import os
import re
import uuid

from definitions import ROOT_DIR
from models.config_info import json2config

def create_index():

    config_file = os.path.join(ROOT_DIR, "indic.config.txt")

    tmp_dir = os.path.join(ROOT_DIR, "tmp")
    if not os.path.exists(tmp_dir):
        os.makedirs(tmp_dir)

    timing2indexFilename = {}

    with open(config_file) as f:
        contents = f.read().rstrip()
        #print("config contents: {}".format(contents))
        config = json2config(contents)

        pattern_date = "([0-9]{2})\.([0-9]{2})\.([0-9]{2,4})"
        pattern_timing = "([0-9]{2}):([0-9]{2}) - ([0-9]{2}):([0-9]{2})( [- *] \(([0-9]+) m\) )?"
        pattern_date_and_timing = pattern_date + " " + pattern_timing


        for timing in config.timings:
            timing_name = timing.get("name")
            filepath = os.path.expanduser(timing.get("filepath"))
            timing_uuid = uuid.uuid4()
            timing2indexFilename[timing_name] = str(timing_uuid)
            tmp_index_filepath = os.path.join(tmp_dir, str(timing_uuid))
            frmt = timing.get("format")
            print("timing: {}".format(timing_name))
            with open(filepath, encoding='utf-8') as f:
                with open(tmp_index_filepath, 'a', encoding='utf-8') as f_out:
                    prev_index_entry = None
                    while True:
                        offset = f.tell()
                        line = f.readline()

                        if line == "":
                            if prev_index_entry != None:
                                f_out.write("date: {}, offset_from: {}, offset_to: {}\n".format(prev_index_entry["date"], prev_index_entry["offset_from"], offset))
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
                            f_out.write("date: {}, offset_from: {}, offset_to: {}\n".format(prev_index_entry["date"], prev_index_entry["offset_from"], offset))
                            prev_index_entry = {"date": a_date, "offset_from": offset}

    return timing2indexFilename

def read_index(indexFilename):
    filepath = os.path.join(ROOT_DIR, "tmp", indexFilename)
    offsets_by_date = {}
    with open(filepath, encoding='utf-8') as f:
        lines = f.readlines()
        lines = map(lambda l:l.rstrip(), lines)
        pattern_index_entry = "date: ([0-9]{2}\.[0-9]{2}\.[0-9]{2,4}), offset_from: ([0-9]+), offset_to: ([0-9]+)"
        line_number = 0
        for line in lines:
            line_number += 1
            match = re.match(pattern_index_entry, line)
            if match is None:
                print("error while parsing timing index. line {}: {}".format(line_number, line))
                continue
            date = match.group(1)
            offset_from = match.group(2)
            offset_to = match.group(3)

            offset_from = int(offset_from)
            offset_to = int(offset_to)

            offsets_by_date[date] = {"offset_from": offset_from, "offset_to": offset_to}


    return offsets_by_date

def main():
    create_index()

if __name__ == "__main__":
    #asyncio.run(main())
    main()
