import os
import yaml

def parse_processes_file(filepath):
    expanded_filepath = os.path.expanduser(filepath)

    #f = file(expanded_filepath, 'r')
    f = open(expanded_filepath, 'r')
    return yaml.load(f)
