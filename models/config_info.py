import json

def json2config(config_contents_as_json):
    config_parsed = json.loads(config_contents_as_json)
    config_info = ConfigInfo(
            config_parsed.get("timings"),
            config_parsed.get("processes-filepath")
            )
    return config_info

class ConfigInfo(object):
    def __init__(self, timings, processes_filepath):
        self.timings = timings
        self.processes_filepath = processes_filepath

    def as_json(self):
        t = self.timings
        return json.dumps({
                 "timings": t
               })

