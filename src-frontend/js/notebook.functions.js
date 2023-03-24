const { withChildren, withClass } = require('./html_utils.js');

function extractTag(str) {
  if (str.startsWith(">>")) {
    return str.slice(2, str.indexOf(" "));
  }
}

export function showTagsAndLinks(forest) {
  try {
    let mainWrapper = document.getElementById("tags-and-links-content-wrapper");
    let taggedNodes = extractTagsFromRootForest(forest);
    let tagsAndLinksForest = buildTagsAndLinksForest(taggedNodes);

    let viewBuilder = new NotebookTagsForestViewBuilder();
    viewBuilder.buildView(tagsAndLinksForest);

    window.my.notebookTagsForestViews = viewBuilder.getNotebookTagsForestViews();
    withChildren(mainWrapper,
      withChildren(document.createElement('div'),
        (function() {
                let btnShowAll = document.createElement('button');
                btnShowAll.addEventListener('click', eve => {
                          showAllNotes();
                        });
                return withChildren(btnShowAll, document.createTextNode('all'))
              })(),
        withChildren(document.createElement('ul'),
          ...viewBuilder.getHtmlElements()
        )
      )
    );
    viewBuilder.getNotebookTagsForestViews().forEach(v => v.collapse());
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js showTagsAndLinks error msg: " + err.message);
    throw err;
  }
}

function showAllNotes() {
  try {
    let resultForest = window.my.notesForest.map(tree => {
      return {name: tree.name, children: tree.children.map(ch => { return { name: ch.name, children: [] }; }) };
    });
    highlightNotesInForest(window.my.notesForestViews, resultForest);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js showAllNotes error msg: " + err.message);
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
  highlightNotesInForest(window.my.notesForestViews, resultForest);
}

export function addTagNodeLinksToForest(tagNode, resultForest) {
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

export function highlightNotesInForest(notesForestViews, forestToHighlight) {
  try {
    notesForestViews.forEach(treeView => treeView.hide());

    forestToHighlight.forEach(nodeToHighlight => {
      notesForestViews.forEach(treeView => {
        if (treeView.name != nodeToHighlight.name) return;

        treeView.highlightTree(nodeToHighlight);
      });
    });
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js highlightProcLeafsInForest error msg: " + err.message);
    throw err;
  }
}

export function buildTagsAndLinksForest(taggedNodes) {
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

export function yamlRootObject2forest(yamlRootObject) {
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
    window.webkit.messageHandlers.foobar.postMessage("js yamlObject2treeNode error msg: " + err.message + " yaml object keys: " + Object.keys(yamlObject));
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

export function extractTagsFromRootForest(forest) {
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

export function NotesForestViewBuilder() {
  let that = this;
  that.htmls = [];
  that.views = [];
}

NotesForestViewBuilder.prototype.buildView = function(notesForest) {
  let that = this;
  notesForest.forEach(notesTree => {
    that.addTree(notesTree);
  });
}

NotesForestViewBuilder.prototype.addTree = function(notesTree) {
  let that = this;
  let htmls = that.htmls;
  let views = that.views;
  let treeView = new NotebookNodeView(notesTree);
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

NotesForestViewBuilder.prototype.getHtmlElements = function() {
  return this.htmls;
};

NotesForestViewBuilder.prototype.getNotesForestViews = function() {
  return this.views;
};

function NotebookTagsForestViewBuilder() {
  let that = this;
  that.htmls = [];
  that.views = [];
}

NotebookTagsForestViewBuilder.prototype.buildView = function(notebookTagsForest) {
  let that = this;
  Object.keys(notebookTagsForest).forEach(propName => {
    let notebookTagsTreeNode = notebookTagsForest[propName];
    that.addTree(notebookTagsTreeNode);
  });
}

NotebookTagsForestViewBuilder.prototype.addTree = function(notebookTagsTree) {
  let that = this;

  let htmls = that.htmls;
  let views = that.views;

  let treeView = new NotebookTagsTreeNodeView(notebookTagsTree);
  treeView.buildAsHtmlLiElement();

  views[views.length] = treeView;
  htmls[htmls.length] = treeView.html;
};

NotebookTagsForestViewBuilder.prototype.getHtmlElements = function() {
  return this.htmls;
};

NotebookTagsForestViewBuilder.prototype.getNotebookTagsForestViews = function() {
  return this.views;
};

function NotebookNodeView(notebookNode) {
  let that = this;
  that.name = notebookNode.name;
  that.isCollapsed = false;
  that.children = notebookNode.children.map(childNode => new NotebookNodeView(childNode));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
}

NotebookNodeView.prototype.name2html = function() {
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

NotebookNodeView.prototype.buildAsHtmlLiElement = function() {
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

NotebookNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

NotebookNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    that.uncollapse();
  } else {
    that.collapse();
  }
};

NotebookNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (that.html.classList.contains("proc-node-open")) {
    that.html.classList.remove("proc-node-open");
    that.html.classList.add("proc-node-closed");
  }
};

NotebookNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html.classList.contains("proc-node-closed")) {
    that.html.classList.remove("proc-node-closed");
    that.html.classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
};

NotebookNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
};

NotebookNodeView.prototype.hide = function() {
  let that = this;
  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  }
  that.html.style.display = 'none';
  that.children.forEach(childView => childView.hide());
};

NotebookNodeView.prototype.unhide = function() {
  let that = this;

  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  } else {
    that.html.style.display = that.oldDisplay;
  }
  that.children.forEach(childView => childView.unhide());
};

NotebookNodeView.prototype.highlightTree = function(nodeToHighlight) {
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

NotebookNodeView.prototype.parentIsHighlighted = function() {
  let that = this;
  that.unhide();
  if (!that.isCollapsed) {
    that.collapse();
  }
};

export function appendNotesForestHtml(notesForestHtmlElements) {
  let notesWrapper = document.getElementById("notes-content-wrapper");
  notesWrapper.innerHTML = "";
  notesForestHtmlElements.forEach(el => notesWrapper.appendChild(el));
}

let NotebookTagsTreeNodeView = (function() {

  function NotebookTagsTreeNodeViewConstructorFunction(notebookTagsTreeNode) {
    let that = this;
    that.tagsTreeNode = notebookTagsTreeNode;
    that.name = notebookTagsTreeNode.name;
    that.isCollapsed = false;
    that.children = notebookTagsTreeNode.children.map(childNode => new NotebookTagsTreeNodeView(childNode));
    that.childrenByName = {};
    that.children.forEach(childView => {
      that.childrenByName[childView.name] = childView;
    });
  }

  for (let propName in NotebookNodeView.prototype) {
    NotebookTagsTreeNodeViewConstructorFunction.prototype[propName] = NotebookNodeView.prototype[propName];
  }

  NotebookTagsTreeNodeViewConstructorFunction.prototype.name2html = function() {
    let that = this;
    let a = document.createElement('a');
    a.onclick = function() {
      searchByTag(that.tagsTreeNode);
    };
    return withChildren(a, document.createTextNode(that.name))
  }

  return NotebookTagsTreeNodeViewConstructorFunction;

})();

// function withClass(elem, cls) {
//   elem.classList.add(cls);
//   return elem;
// }

// function string2li(value) {
//   let li = document.createElement('li');
//   let span = document.createElement('span');
//   let txt = document.createTextNode(value);
//   return withChildren(li,
//     withChildren(span, txt)
//   );
// }

// function tmpLi() {
//   return document.createElement('li');
// }

