export function yamlNotebook2forest(yamlList) {
  try {
    return yamlList2SubtreesList(yamlList);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js yamlNotebook2forest error msg: " + err.message);
    throw err;
  }
}

export function convertNotebookTreeToPreYamlJson(notebookTree) {
  try {
    return notebookTree.children.map(function ff(childNode) {
      if (childNode.children.length === 0) {
        return childNode.name;
      }
      let obj = {};
      obj[childNode.name] = childNode.children.map(ff);
      return obj;
    });
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js convertNotebookTreeToPreYamlJson error msg: " + err.message);
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

