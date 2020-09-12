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

function handleServerMessage(msg) {
  let mainContentWrapper = document.getElementById("main-content-wrapper");
  let keys = Object.keys(msg);
  mainContentWrapper.innerHTML = "msg keys: " + keys;
  let keyElems = keys.map(key => {
    let timingWrapperDiv = document.createElement('div');
    let timingHeaderElem = document.createElement('h3');
    let timingNameTextNode = document.createTextNode(key);
    let timingDaysInDivs = msg[key].map(oneDayTiming => {
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
  keyElems.forEach(keyElem => mainContentWrapper.appendChild(keyElem));
  //mainContentWrapper.innerHTML = "msg keys: " + keys;
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
