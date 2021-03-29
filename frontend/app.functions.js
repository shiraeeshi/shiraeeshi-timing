let my = {
  processesTree: null
};

function extractTag(str) {
  if (str.startsWith(">>")) {
    return str.slice(2, str.indexOf(" "));
  }
}

function handleServerMessage(msg) {
  try {
    let processes_object = msg.processes;
    my.processesTree = processes_object;
    // //window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage processes: " + JSON.stringify(my.processesTree));
    let forest = yamlRootObject2forest(msg.processes);
    showTagsAndLinks(forest);
    showProcessesForest(forest);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}

function showProcessesAndTags() {
  try {
    let forest = yamlRootObject2forest(my.processesTree);
    showTagsAndLinks(forest);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js showProcessesAndTags error msg: " + err.message);
    throw err;
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
    let tagsAndLinksElements = Object.keys(tagsAndLinksForest).map(tagsTreeNodeName => {
      let tagsTreeNode = tagsAndLinksForest[tagsTreeNodeName];
      return tagsTreeNode2html(tagsTreeNode);
    });
    tagsAndLinksElements.forEach(el => {
      mainWrapper.appendChild(el);
    });
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js showTagsAndLinks error msg: " + err.message);
    throw err;
  }
}

function tagsTreeRootNode2html(tagsTreeRootNode) {
  try {
    return withChildren(document.createElement('div'),
             withChildren(document.createElement('span'),
               document.createTextNode(tagsTreeRootNode.name),
               withChildren(document.createElement('ul'),
                 ...Object.keys(tagsTreeNode.subTags).map(tagsTreeNodeName => {
                   let tagsTreeNode = tagsTreeRootNode[tagsTreeNodeName];
                   return tagsTreeNode2html(tagsTreeNode);
                 })
               )
             )
           );
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js tagsTreeRootNode2html error msg: " + err.message);
    throw err;
  }
}

function searchByTag(tagAncestry, tagName) {
  window.webkit.messageHandlers.foobar.postMessage("js searchByTag tag: " + (tagAncestry.concat([tagName]).join(".")));
  //console.log("search by tag: " + )
}

function tagsTreeNode2html(tagsTreeNode) {
  try {
    return withChildren(document.createElement('li'),
              withChildren(document.createElement('span'),
                (function() {
                  let a = document.createElement('a');
                  a.onclick = function() {
                    searchByTag(tagsTreeNode.tagAncestry, tagsTreeNode.name);
                  };
                  return withChildren(a, document.createTextNode(tagsTreeNode.name))
                })(),
                withChildren(document.createElement('ul'),
                  ...Object.keys(tagsTreeNode.subTags).map(subTagName => {
                    return tagsTreeNode2html(tagsTreeNode.subTags[subTagName]);
                  })
                )
              )
            );
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js tagsTreeNode2html error msg: " + err.message);
    throw err;
  }
}

function buildTagsAndLinksForest(taggedNodes) {
  let preResult = {
    subTags: {}
  };
  taggedNodes.forEach(taggedNode => {
    let tagPath = taggedNode.tag.split(".");
    let obj = preResult;
    let tagAncestry = [];
    tagPath.forEach(tagPathSegment => {
      if (!obj.subTags.hasOwnProperty(tagPathSegment)) {
        obj.subTags[tagPathSegment] = {
          name: tagPathSegment,
          tagAncestry: tagAncestry,
          subTags: {},
          links: []
        };
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

function showProcessesForest(processesForest) {
  let processesWrapper = document.getElementById("processes-content-wrapper");
  let processCategoryDivs = processesForest.map(procNode => {
    return processesTree2html(procNode);
  });
  processCategoryDivs.forEach(procCatDiv => {
    processesWrapper.appendChild(procCatDiv);
  });
}

function processesTree2html(procNode) {
  let wrapperDiv = document.createElement('div');
  let headerElem = document.createElement('h3');
  let headerTxt = document.createTextNode(procNode.name);

  return withChildren(wrapperDiv,
    withChildren(headerElem,
      headerTxt),
    withChildren(document.createElement('ul'),
      ...procNode.children.map(childNode => {
        if (childNode.children.length > 0) {
          return showProcessesTreeNodeAsLiElem(childNode)
        } else {
          return string2li(childNode.name);
        }
      })
    )
  );
}

function showProcessesTreeNodeAsLiElem(procNode) {
  if (procNode.children.length == 0) {
    return string2li(procNode.name);
  }
  return withChildren(string2li(procNode.name),
      withChildren(document.createElement('ul'),
        ...procNode.children.map(childNode => {
          if (childNode.children.length > 0) {
            return showProcessesTreeNodeAsLiElem(childNode)
          } else {
            return string2li(childNode.name);
          }
        })
      )
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

function tmpLi() {
  return document.createElement('li');
}

