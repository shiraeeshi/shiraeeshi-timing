
shorttask_prefix = "shorttsk>>"

def extract_short_tasks_from_processes_tree(processes):
    return filter_dict(processes)

def filter_dict(d):
    result = {}
    for k in d:
        v = d[k]
        if k.startswith(shorttask_prefix):
            result[k] = v
        elif type(v) == list:
            f = filter_lst(v)
            if f:
                result[k] = f
        elif type(v) == dict:
            f = filter_dict(v)
            if bool(f):
                result[k] = f
    return result

def filter_lst(l):
    result = []
    for elem in l:
        if type(elem) == dict:
            f = filter_dict(elem)
            if bool(f):
                result.append(f)
        elif type(elem) == str:
            if elem.startswith(shorttask_prefix):
                result.append(elem)
    return result
