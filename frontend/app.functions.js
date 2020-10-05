
function handleServerMessage(msg) {
  try {
    let processes_object = msg.processes;
    showProcesses(processes_object);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}

function withChildren(elem, ...children) {
  children.forEach(child => elem.appendChild(child));
  return elem;
}

function showProcesses(processes_object) {
  let processesWrapper = document.getElementById("processes-content-wrapper");
  let processCategoryNames = Object.keys(processes_object);
  let processCategoryDivs = processCategoryNames.map(procCatName => {
    return listProcesses(
      processes_object[procCatName],
      procCatName + " processes");
  });
  processCategoryDivs.forEach(procCatDiv => {
    processesWrapper.appendChild(procCatDiv);
  });
}

function listProcesses(processes, header) {
  let wrapperDiv = document.createElement('div');
  let headerElem = document.createElement('h3');
  let headerTxt = document.createTextNode(header);

  let unorderedList;
  if (processes.constructor === Object) {
    unorderedList = objectAsUl(processes);
  } else {
    unorderedList = listAsUl(processes);
  }

  return withChildren(wrapperDiv, 
    withChildren(headerElem,
      headerTxt),
    unorderedList
  );
}

function string2li(value) {
  let li = document.createElement('li');
  let span = document.createElement('span');
  let txt = document.createTextNode(value);
  return withChildren(li,
    withChildren(span, txt)
  );
}

function objectAsUl(obj) {
  let ul = document.createElement('ul');
  let keys = Object.keys(obj);
  let propsAsLis = keys.map(key => {
    let li = string2li(key);
    let prop = obj[key];
    if (prop.constructor === Object) {
      return withChildren(li, objectAsUl(prop));
    } else if (prop.constructor === Array) {
      return withChildren(li, listAsUl(prop));
    } else {
      return string2li(key + ": " + prop);
    }
  });
  return withChildren(ul, ...propsAsLis);
}

function tmpLi() {
  return document.createElement('li');
}

function listAsUl(lst) {
  let ul = document.createElement('ul');
  let lstAsLis = lst.map(el => {
    if (el.constructor === Object) {
      let keys = Object.keys(el);
      let firstKey = keys[0];
      if (keys.length == 1 && el[firstKey].constructor === Array) {
        let li = string2li(firstKey);
        return withChildren(li, listAsUl(el[firstKey]));
      } else {
        return withChildren(tmpLi(), objectAsUl(el));
      }
    } else if (el.constructor === Array) {
      return withChildren(tmpLi(), listAsUl(el));
    } else {
      return string2li(el);
    }
  });
  return withChildren(ul, ...lstAsLis);
}

