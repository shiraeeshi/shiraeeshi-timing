
export function parseTagsFromRootForest(forest) {
  let result = [];
  forest.forEach(tree => {
    result = result.concat(parseTagsFromNodeRecursively(tree, []));
  });
  return result;
}

export function parseTagsFromNodeRecursively(node, ancestry) {
  let result = [];
  let tagObj = parseTagFromNodeIfExists(node, ancestry);
  if (tagObj !== undefined) {
    result.push(tagObj);
  }
  if (!node.children || node.children.length == 0) {
    return result;
  }
  let newAncestry = ancestry.concat([node.name]);
  node.children.forEach(subTree => {
    result = result.concat(parseTagsFromNodeRecursively(subTree, newAncestry));
  });
  return result;
}

export function parseTagFromNodeIfExists(node, ancestry) {
  let tag = extractTag(node.name);
  if (tag === undefined) {
    return;
  }
  let tagObj = {
    tag: tag,
    name: node.name,
    ancestry: ancestry,
    notebookNode: node,
  };
  if (node.tag !== undefined) {
    Object.assign(node.tag, tagObj);
  } else {
    node.tag = tagObj;
    let parentNode = node.parent;
    if (parentNode !== null) {
      parentNode.hasChildrenWithTags = true;
      if (parentNode.tagsOfChildren === undefined) {
        parentNode.tagsOfChildren = [];
      }
      parentNode.tagsOfChildren.push(tagObj);
    }
  }
  return tagObj;
}

function extractTag(str) {
  if (str.startsWith(">>")) {
    let indexOfWhitespace = str.indexOf(" ")
    return str.slice(2, indexOfWhitespace >= 0 ? indexOfWhitespace : str.length);
  }
}
