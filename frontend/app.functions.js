function extractTag(str) {
  if (str.startsWith(">>")) {
    return str.slice(2, str.indexOf(" "));
  }
}

function handleServerMessage(msg) {
  try {
    let processes_object = msg.processes;
    let forest = yamlRootObject2forest(msg.processes);
    my.processesForest = forest;
    showTagsAndLinks(forest);
    let viewBuilder = new ProcessesForestViewBuilder();
    viewBuilder.buildView(forest);
    my.processesForestViews = viewBuilder.getProcessesForestViews();
    appendProcessesForestHtml(viewBuilder.getHtmlElements());
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}

function withChildren(elem, ...children) {
  children.forEach(child => elem.appendChild(child));
  return elem;
}

function showTagsAndLinks(forest) {
  try {
    let mainWrapper = document.getElementById("tags-and-links-content-wrapper");
    let taggedNodes = extractTagsFromRootForest(forest);
    let tagsAndLinksForest = buildTagsAndLinksForest(taggedNodes);

    let viewBuilder = new ProcessTagsForestViewBuilder();
    viewBuilder.buildView(tagsAndLinksForest);

    my.processTagsForestViews = viewBuilder.getProcessTagsForestViews();
    withChildren(mainWrapper,
      withChildren(document.createElement('div'),
        (function() {
                let btnShowAll = document.createElement('button');
                btnShowAll.addEventListener('click', eve => {
                          showAllProcesses();
                        });
                return withChildren(btnShowAll, document.createTextNode('all'))
              })(),
        withChildren(document.createElement('ul'),
          ...viewBuilder.getHtmlElements()
        )
      )
    );
    viewBuilder.getProcessTagsForestViews().forEach(v => v.collapse());
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js showTagsAndLinks error msg: " + err.message);
    throw err;
  }
}

function showAllProcesses() {
  try {
    let resultForest = my.processesForest.map(tree => {
      return {name: tree.name, children: tree.children.map(ch => { return { name: ch.name, children: [] }; }) };
    });
    highlightProcessesInForest(my.processesForestViews, resultForest);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js showAllProcesses error msg: " + err.message);
    throw err;
  }
}

function searchByTag(tagNode) {
  window.webkit.messageHandlers.foobar.postMessage("js searchByTag tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  for (let link of tagNode.links) {
    window.webkit.messageHandlers.foobar.postMessage("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
  }
  let resultForest = [];
  addTagNodeLinksToForest(tagNode, resultForest);
  highlightProcessesInForest(my.processesForestViews, resultForest);
}

function addTagNodeLinksToForest(tagNode, resultForest) {
  window.webkit.messageHandlers.foobar.postMessage("js addTagNodeLinksToForest tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  for (let link of tagNode.links) {
    window.webkit.messageHandlers.foobar.postMessage("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
  }
  for (let link of tagNode.links) {
    let lst = resultForest;
    link.ancestry.forEach(linkParent => {
      let found = lst.find(el => el.name == linkParent);
      if (found) {
        lst = found.children;
      } else {
        let newLst = [];
        lst[lst.length] = {
          name: linkParent,
          children: newLst
        };
        lst = newLst;
      }
    });
    lst[lst.length] = {
      name: link.name,
      children: []
    };
  }
}

function highlightProcessesInForest(processesForestViews, forestToHighlight) {
  try {
    processesForestViews.forEach(treeView => treeView.hide());

    forestToHighlight.forEach(nodeToHighlight => {
      processesForestViews.forEach(treeView => {
        if (treeView.name != nodeToHighlight.name) return;

        treeView.highlightTree(nodeToHighlight);
      });
    });
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js highlightProcLeafsInForest error msg: " + err.message);
    throw err;
  }
}

function buildTagsAndLinksForest(taggedNodes) {
  let preResult = {
    children: [],
    subTags: {}
  };
  taggedNodes.forEach(taggedNode => {
    let tagPath = taggedNode.tag.split(".");
    let obj = preResult;
    let tagAncestry = [];
    tagPath.forEach(tagPathSegment => {
      if (!obj.subTags.hasOwnProperty(tagPathSegment)) {
        let subTag = {
          name: tagPathSegment,
          tagAncestry: tagAncestry,
          subTags: {},
          children: [],
          links: []
        };
        obj.subTags[tagPathSegment] = subTag;
        obj.children[obj.children.length] = subTag;
      }
      tagAncestry = tagAncestry.concat([tagPathSegment]);
      obj = obj.subTags[tagPathSegment];
    });
    obj.links[obj.links.length] = taggedNode;
  });
  return preResult.subTags;
}

function yamlRootObject2forest(yamlRootObject) {
  try {
    let keys = Object.keys(yamlRootObject);
    let result = keys.map(key => {
      let lst = yamlRootObject[key];
      if (lst.constructor !== Array) {
        throw Error("Wrong structure: non-list property in root object. key: '" + key + "' (root object has many list-typed properties, objects have single (list-typed) property, lists contain many strings or one object)");
      }
      let nodeChildren = yamlList2SubtreesList(lst);
      return {
        name: key,
        children: nodeChildren
      };
    });
    return result;
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js yamlRootObject2forest error msg: " + err.message);
    throw err;
  }
}

function yamlObject2treeNode(yamlObject) {
  try {
    let keys = Object.keys(yamlObject);
    if (keys.length == 0) {
      throw Error("Wrong structure: object with zero properties (objects have single (list-typed) property, lists contain strings or objects)");
    }
    if (keys.length > 1) {
      throw Error("Wrong structure: object with more than one property (objects have single (list-typed) property, lists contain strings or objects)");
    }
    let key = keys[0];
    let lst = yamlObject[key];
    if (lst.constructor === Object) {
      throw Error("Wrong structure: object in object (objects have single (list-typed) property, lists contain strings or objects)");
    }
    if (lst.constructor !== Array) {
      throw Error("Wrong structure: non-list property in object. key: '" + key + "' (objects have single (list-typed) property, lists contain strings or objects)");
    }
    let nodeChildren = yamlList2SubtreesList(lst);
    return {
      name: key,
      children: nodeChildren
    };
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js yamlObject2treeNode error msg: " + err.message);
    throw err;
  }
}

function yamlList2SubtreesList(yamlList) {
  try {
    return yamlList.map(el => {
      if (el.constructor === Object) {
        return yamlObject2treeNode(el);
      } else if (el.constructor === Array) {
        throw Error("Wrong structure: list in list (objects have single (list-typed) property, lists contain strings or objects)");
      } else {
        return {name: el, children: []};
      }
    });
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js yamlList2SubtreesList error msg: " + err.message);
    throw err;
  }
}

function extractTagsFromRootForest(forest) {
  let result = [];
  forest.forEach(tree => {
    result = result.concat(extractTagsFromNode(tree, []));
  });
  return result;
}

function extractTagsFromNode(node, ancestry) {
  let result = [];
  let tag = extractTag(node.name);
  if (tag) {
    result[result.length] = {
      tag: tag,
      name: node.name,
      ancestry: ancestry
    };
  }
  if (!node.children || node.children.length == 0) {
    return result;
  }
  let newAncestry = ancestry.concat([node.name]);
  node.children.forEach(subTree => {
    result = result.concat(extractTagsFromNode(subTree, newAncestry));
  });
  return result;
}

function ProcessesForestViewBuilder() {
  let that = this;
  that.htmls = [];
  that.views = [];
}

ProcessesForestViewBuilder.prototype.buildView = function(processesForest) {
  let that = this;
  processesForest.forEach(processesTree => {
    that.addTree(processesTree);
  });
}

ProcessesForestViewBuilder.prototype.addTree = function(processesTree) {
  let that = this;
  let htmls = that.htmls;
  let views = that.views;
  let treeView = new ProcessNodeView(processesTree);
  views[views.length] = treeView;

  let wrapperDiv = document.createElement('div');
  let headerElem = document.createElement('h3');
  let headerTxt = document.createTextNode(treeView.name);

  treeView.children.forEach(childNode => childNode.buildAsHtmlLiElement());
  let treeHtml =
    withChildren(wrapperDiv,
      withChildren(headerElem,
        headerTxt),
      withChildren(document.createElement('ul'),
        ...treeView.children.map(childNode => childNode.html)
      )
    );
  treeView.html = treeHtml;

  htmls[htmls.length] = treeHtml;
};

ProcessesForestViewBuilder.prototype.getHtmlElements = function() {
  return this.htmls;
};

ProcessesForestViewBuilder.prototype.getProcessesForestViews = function() {
  return this.views;
};

function ProcessTagsForestViewBuilder() {
  let that = this;
  that.htmls = [];
  that.views = [];
}

ProcessTagsForestViewBuilder.prototype.buildView = function(processTagsForest) {
  let that = this;
  Object.keys(processTagsForest).forEach(propName => {
    let processTagsTreeNode = processTagsForest[propName];
    that.addTree(processTagsTreeNode);
  });
}

ProcessTagsForestViewBuilder.prototype.addTree = function(processTagsTree) {
  let that = this;

  let htmls = that.htmls;
  let views = that.views;

  let treeView = new ProcessTagsTreeNodeView(processTagsTree);
  treeView.buildAsHtmlLiElement();

  views[views.length] = treeView;
  htmls[htmls.length] = treeView.html;
};

ProcessTagsForestViewBuilder.prototype.getHtmlElements = function() {
  return this.htmls;
};

ProcessTagsForestViewBuilder.prototype.getProcessTagsForestViews = function() {
  return this.views;
};

function ProcessNodeView(processNode) {
  let that = this;
  that.name = processNode.name;
  that.isCollapsed = false;
  that.children = processNode.children.map(childNode => new ProcessNodeView(childNode));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
}

ProcessNodeView.prototype.name2html = function() {
  let that = this;
  return withChildren(document.createElement('span'),
           document.createTextNode(that.name)
         );
}

ProcessNodeView.prototype.buildAsHtmlLiElement = function() {
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

ProcessNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

ProcessNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    that.uncollapse();
  } else {
    that.collapse();
  }
};

ProcessNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (that.html.classList.contains("proc-node-open")) {
    that.html.classList.remove("proc-node-open");
    that.html.classList.add("proc-node-closed");
  }
};

ProcessNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html.classList.contains("proc-node-closed")) {
    that.html.classList.remove("proc-node-closed");
    that.html.classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
};

ProcessNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
};

ProcessNodeView.prototype.hide = function() {
  let that = this;
  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  }
  that.html.style.display = 'none';
  that.children.forEach(childView => childView.hide());
};

ProcessNodeView.prototype.unhide = function() {
  let that = this;

  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  } else {
    that.html.style.display = that.oldDisplay;
  }
  that.children.forEach(childView => childView.unhide());
};

ProcessNodeView.prototype.highlightTree = function(nodeToHighlight) {
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

ProcessNodeView.prototype.parentIsHighlighted = function() {
  let that = this;
  that.unhide();
  if (!that.isCollapsed) {
    that.collapse();
  }
};

function appendProcessesForestHtml(processesForestHtmlElements) {
  let processesWrapper = document.getElementById("processes-content-wrapper");
  processesWrapper.innerHTML = "";
  processesForestHtmlElements.forEach(el => processesWrapper.appendChild(el));
}

let ProcessTagsTreeNodeView = (function() {

  function ProcessTagsTreeNodeViewConstructorFunction(processTagsTreeNode) {
    let that = this;
    that.tagsTreeNode = processTagsTreeNode;
    that.name = processTagsTreeNode.name;
    that.isCollapsed = false;
    that.children = processTagsTreeNode.children.map(childNode => new ProcessTagsTreeNodeView(childNode));
    that.childrenByName = {};
    that.children.forEach(childView => {
      that.childrenByName[childView.name] = childView;
    });
  }

  for (let propName in ProcessNodeView.prototype) {
    ProcessTagsTreeNodeViewConstructorFunction.prototype[propName] = ProcessNodeView.prototype[propName];
  }

  ProcessTagsTreeNodeViewConstructorFunction.prototype.name2html = function() {
    let that = this;
    let a = document.createElement('a');
    a.onclick = function() {
      searchByTag(that.tagsTreeNode);
    };
    return withChildren(a, document.createTextNode(that.name))
  }

  return ProcessTagsTreeNodeViewConstructorFunction;

})();

function withClass(elem, cls) {
  elem.classList.add(cls);
  return elem;
}

function string2li(value) {
  let li = document.createElement('li');
  let span = document.createElement('span');
  let txt = document.createTextNode(value);
  return withChildren(li,
    withChildren(span, txt)
  );
}

function tmpLi() {
  return document.createElement('li');
}

