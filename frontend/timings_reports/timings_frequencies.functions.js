
function handleServerMessage(msg) {
  window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage start ");
  my.timings = msg;
  let timingsBySubcategoriesTree = handleTimings(my.timings);
  showTimingsBySubcategoriesAndLastModified(timingsByCategoriesByPrefixes);
  window.webkit.messageHandlers.timings_frequencies_msgs.postMessage("handleServerMessage end ");
}

function showTimingsBySubcategoriesAndLastModified(timingsBySubcategoriesTree) {
  let wrapper = document.getElementById("main-content-wrapper");
  wrapper.innerHTML = "";

  let viewBuilder = new ProcessesSubcategoriesViewBuilder();
  viewBuilder.buildViews(timingsBySubcategoriesTree);

  wrapper.appendChild(viewBuilder.getResultHtml());
}

function showTimingsByPrefixesAndLastModified(timingsByCategoriesByPrefixes) {
  let resultElem = withChildren(document.createElement("ul"),
    ...Object.keys(timingsByCategoriesByPrefixes).map(key => {
      let byPrefixes = timingsByCategoriesByPrefixes[key];
      let byPrefixesLst = Object.entries(byPrefixes).map(([k,v],idx) => v);
      byPrefixesLst.sort((a,b) => {
        return a.lastTiming.millisUntilNow > b.lastTiming.millisUntilNow;
      });

      return withChildren(document.createElement("li"),
        withChildren(document.createElement("div"),
          withChildren(document.createElement("span"),
            document.createTextNode(key)
          ),
          withChildren(document.createElement("ul"),
            ...byPrefixesLst.map(prefixObj => {
              return withChildren(document.createElement("li"),
                withChildren(document.createElement("span"),
                  document.createTextNode(prefixObj.prefix)
                )
              );
            })
          )
        )
      )
    })
  );
  let wrapper = document.getElementById("main-content-wrapper");
  wrapper.innerHTML = "";

  wrapper.appendChild(resultElem);
}

function handleTimings(timingsByCategories) {
  let timingsByCategoriesByPrefixes = {}; // obj[cat][prefix] = {prefix:"...",timings:[], lastTiming:{...}}

  Object.keys(timingsByCategories).forEach(key => {
    let byPrefixes = {};
    timingsByCategoriesByPrefixes[key] = byPrefixes;

    let thisTimingsByDays = my.timings[key];
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      eachTimingDay.timings.forEach(t => {
        let prefix = t.name;
        if (t.name.includes("(")) {
          prefix = t.name.slice(0, t.name.indexOf("("));
        }
        prefix = prefix.trim();
        if (!byPrefixes.hasOwnProperty(prefix)) {
          byPrefixes[prefix] = {
            prefix: prefix,
            timings: []
          };
        }
        byPrefixes[prefix].timings.push(t);

        let d = timingDateArrays2Date(dt, t.from);
        t.fromdate = d;
      });
    }
  });
  Object.keys(timingsByCategoriesByPrefixes).forEach(key => {
    let byPrefixes = timingsByCategoriesByPrefixes[key];
    Object.keys(byPrefixes).forEach(prefix => {
      let timings = byPrefixes[prefix].timings;
      timings.sort((t1, t2) => t1.fromdate.getTime() - t2.fromdate.getTime());
      let previousTiming = timings[0];
      let i = 1;
      while (i < timings.length) {
        let timing = timings[i];
        let diff = timing.fromdate.getTime() - previousTiming.fromdate.getTime();
        previousTiming.millisUntilNext = diff;
        timing.millisFromPrevious = diff;
        previousTiming = timing;
        i++;
      }
      let lastTiming = timings[timings.length - 1];
      let now = new Date();
      lastTiming.millisUntilNow = now.getTime() - lastTiming.fromdate.getTime();
      byPrefixes[prefix].lastTiming = lastTiming;
    });
  });
  return timingsByCategoriesByPrefixes;
}

function handleTimings(timingsByCategories) {

  let timingsBySubcategoriesTree = {}; // obj.childrenByName[subCategoryName].childrenByName[subCategoryName] = {timings: []}
  timingsBySubcategoriesTree.childrenByName = {};

  // populate each timing's fromdate field
  Object.keys(timingsByCategories).forEach(key => {
    let thisTimingsByDays = my.timings[key];
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      eachTimingDay.timings.forEach(t => {
        let d = timingDateArrays2Date(dt, t.from);
        t.fromdate = d;
      });
    }
  });

  Object.keys(timingsByCategories).forEach(key => {
    let thisTimingsByDays = my.timings[key];
    for (let i = thisTimingsByDays.length - 1; i >= 0; i--) {
      let eachTimingDay = thisTimingsByDays[i];
      let dt = eachTimingDay.date;
      eachTimingDay.timings.forEach(t => {
        let yamlValue = t.value;
        let node = {
          name: key,
          children: [],
          childrenByName: {},
          timings: []
        };
        timingsBySubcategoriesTree.childrenByName[key] = node;
        timingsBySubcategoriesTree.children.push(node);
        if (yamlValue.constructor !== Array) {
          throw Error("wrong format: timing's categories should be list-typed");
        }
        for (let index = 0; index < yamlValue.length; index++) {
          let item = yamlValue[index];
          if (item.constructor === Object) {
            let keys = Object.keys(item);
            if (keys.length !== 1 || index !== (yamlValue.length - 1)) {
              throw Error("wrong format: all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}).");
            }
            let propName = keys[0];
            let propValue = item[propName];
            if (!node.childrenByName[propName]) {
              let newNode = {
                name: propName,
                children: [],
                childrenByName: {},
                timings: []
              };
              node.childrenByName[propName] = newNode;
              node.children.push(newNode);
            }
            node = node.childrenByName[propName];
            t.info = propValue;
          } else {
            if (!node.childrenByName[item]) {
              let newNode = {
                name: item,
                children: [],
                childrenByName: {},
                timings: []
              };
              node.childrenByName[item] = newNode;
              node.children.push(newNode);
            }
            node = node.childrenByName[item];
          }
        }
        node.timings.push(t);
      });
    }
  });
  return timingsBySubcategoriesTree;
}

function ProcessesSubcategoriesViewBuilder() {
  this.htmls = [];
  this.views = [];
}

ProcessesSubcategoriesViewBuilder.prototype.buildViews = function(timingsBySubcategoriesTree) {
  let that = this;
  for (let subtree in timingsBySubcategoriesTree) {
    that.addSubtree(subtree);
  }
};

ProcessesSubcategoriesViewBuilder.prototype.addSubtree = function(timingsBySubcategoriesSubtree) {
  let that = this;
  let htmls = that.htmls;
  let views = that.views;
  let treeView = new ProcessSubcategoryNodeView(processesTree);
  views[views.length] = treeView;

  // let wrapperDiv = document.createElement('div');
  // let headerElem = document.createElement('h3');
  // let headerTxt = document.createTextNode(treeView.name);

  // treeView.children.forEach(childNode => childNode.buildAsHtmlLiElement());
  // let treeHtml =
  //   withChildren(wrapperDiv,
  //     withChildren(headerElem,
  //       headerTxt),
  //     withChildren(document.createElement('ul'),
  //       ...treeView.children.map(childNode => childNode.html)
  //     )
  //   );
  // treeView.html = treeHtml;

  // htmls[htmls.length] = treeHtml;

  treeView.buildAsHtmlLiElement();
  htmls.push(treeView.html);
};

ProcessesSubcategoriesViewBuilder.prototype.getResultHtml = function() {
  let that = this;
  return withChildren(document.createElement('ul'),
    ...that.htmls
  );
};

ProcessesSubcategoriesViewBuilder.prototype.getHtmlElements = function() {
  return this.htmls;
};

ProcessesSubcategoriesViewBuilder.prototype.getProcessesForestViews = function() {
  return this.views;
};

function ProcessSubcategoryNodeView(processNode) {
  let that = this;
  that.name = processNode.name;
  that.isCollapsed = false;
  that.children = processNode.children.map(childNode => new ProcessSubcategoryNodeView(childNode));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
}

ProcessSubcategoryNodeView.prototype.name2html = function() {
  let that = this;
  if (that.name.includes("\n")) {
    return withChildren(document.createElement('div'),
            ...that.name.split("\n")
                        .map(line => document.createTextNode(line))
                        .flatMap(el => [el,document.createElement("br")])
                        .slice(0, -1)
          );
  } else {
    return withChildren(document.createElement('span'),
            document.createTextNode(that.name)
          );
  }
}

ProcessSubcategoryNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;
  if (that.children.length == 0) {
    let htmlElement = withClass(withChildren(document.createElement('li'), that.name2html()), 'proc-leaf');
    that.html = htmlElement;
    return;
  }

  that.children.forEach(childNode => childNode.buildAsHtmlLiElement());
  let htmlElement =
    withChildren(
      withChildren(withClass(document.createElement('li'), 'proc-node-open'),
        (function() {
          let elem = document.createElement('span');
          elem.classList.add('proc-node-icon');
          elem.addEventListener('click', eve => {
            that.toggleCollapse();
          });
          return elem;
        })(),
        that.name2html()
      ),
      withChildren(document.createElement('ul'),
        ...that.children.map(childNode => childNode.html)
      )
    );
  that.html = htmlElement;
};

ProcessSubcategoryNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

ProcessSubcategoryNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    that.uncollapse();
  } else {
    that.collapse();
  }
};

ProcessSubcategoryNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (that.html.classList.contains("proc-node-open")) {
    that.html.classList.remove("proc-node-open");
    that.html.classList.add("proc-node-closed");
  }
};

ProcessSubcategoryNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html.classList.contains("proc-node-closed")) {
    that.html.classList.remove("proc-node-closed");
    that.html.classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
};

ProcessSubcategoryNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
};

ProcessSubcategoryNodeView.prototype.hide = function() {
  let that = this;
  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  }
  that.html.style.display = 'none';
  that.children.forEach(childView => childView.hide());
};

ProcessSubcategoryNodeView.prototype.unhide = function() {
  let that = this;

  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  } else {
    that.html.style.display = that.oldDisplay;
  }
  that.children.forEach(childView => childView.unhide());
};

ProcessSubcategoryNodeView.prototype.highlightTree = function(nodeToHighlight) {
  let that = this;

  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  } else {
    that.html.style.display = that.oldDisplay;
  }

  if (nodeToHighlight.children.length == 0) {
    if (!that.isLeaf()) {
      if (!that.isCollapsed) {
        that.collapse();
      }
      that.children.forEach(childView => childView.parentIsHighlighted());
    }
  } else {
    if (!that.isLeaf()) {
      if (that.isCollapsed) {
        that.uncollapse();
      }
      nodeToHighlight.children.forEach(childNodeToHighlight => {
        if (that.childrenByName.hasOwnProperty(childNodeToHighlight.name)) {
          that.childrenByName[childNodeToHighlight.name].highlightTree(childNodeToHighlight);
        }
      });
    }
  }
};

ProcessSubcategoryNodeView.prototype.parentIsHighlighted = function() {
  let that = this;
  that.unhide();
  if (!that.isCollapsed) {
    that.collapse();
  }
};


function timingDateArrays2Date(dateArray, hourMinuteArray) {
  let d = new Date();
  d.setDate(1);
  d.setMonth(dateArray[1] - 1);
  d.setDate(dateArray[0]);
  d.setFullYear(dateArray[2]);
  d.setHours(hourMinuteArray[0]);
  d.setMinutes(hourMinuteArray[1]);
  return d;
}

function withChildren(elem, ...children) {
  children.forEach(child => elem.appendChild(child));
  return elem;
}
