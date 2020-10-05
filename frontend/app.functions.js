
function handleServerMessage(msg) {
  try {
    let timings_object = msg.timings;
    showTimings(timings_object);

    let processes_object = msg.processes;
    showProcesses(processes_object);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}

function showTimings(timings_object) {
  let contentWrapper = document.getElementById("timings-content-wrapper");
  let keys = Object.keys(timings_object);
  contentWrapper.innerHTML = "msg keys: " + keys;
  let keyElems = keys.map(key => {
    let timingWrapperDiv = document.createElement('div');
    let timingHeaderElem = document.createElement('h3');
    let timingNameTextNode = document.createTextNode(key);
    let timingDaysInDivs = timings_object[key].map(oneDayTiming => {
      let oneDayTimingWrapper = document.createElement('div');
      let dateParagraph = document.createElement('p');
      let dateTextNode = document.createTextNode(oneDayTiming.date.join("."));
      let ul = document.createElement('ul');
      let lis = oneDayTiming.timings.map(timingItem => {
        let li = document.createElement('li');
        let span = document.createElement('span');
        let txt = document.createTextNode([
          timingItem.from.join("."),
          "-",
          timingItem.to.join("."),
          timingItem2symbol(timingItem),
          ['(',timingItem.minutes,' m)'].join(""),
          timingItem.name
        ].join(" "));
        return withChildren(li, withChildren(span, txt));
      });
      return withChildren(oneDayTimingWrapper,
        withChildren(dateParagraph, dateTextNode),
        withChildren(ul, ...lis),
      );
    });
    return withChildren(timingWrapperDiv,
      withChildren(timingHeaderElem,
        timingNameTextNode
      ),
      ...timingDaysInDivs
    );
  });
  keyElems.forEach(keyElem => contentWrapper.appendChild(keyElem));
  //contentWrapper.innerHTML = "msg keys: " + keys;
}

function withChildren(elem, ...children) {
  children.forEach(child => elem.appendChild(child));
  return elem;
}

function timingItem2symbol(timingItem) {
  if (timingItem.minutes > 60) {
    return "*";
  } else if (timingItem.minutes < 60) {
    return "-";
  } else {
    return " ";
  }
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

/*
function sum(a, b) {
  return a + b;
}
function init_listener(config_line) {
  var button = document.getElementById("some-button");
  var counter = 0;
  button.addEventListener("click", function() {
    counter++;
    if (window.webkit) {
      button.innerHTML = "" + sum(3, 2);
      if (window.webkit.messageHandlers.foobar) {
        window.webkit.messageHandlers.foobar.postMessage("bar " + counter);
      } else {
        button.innerHTML = "no webkit.messageHandlers.foobar";
      }
    } else {
      if (window.messageHandlers && window.messageHandlers.foobar) {
        button.innerHTML = "no webkit, HAS messageHandlers.foobar";
        window.messageHandlers.foobar.postMessage("bar" + counter);
      } else {
        button.innerHTML = "no webkit, no messageHandlers.foobar";
      }
    }
  });
  //var mainContentWrapper = document.getElementById("main-content-wrapper");
  //mainContentWrapper.innerHTML = "config_line: " + config_line;
}
*/
