
export function parseTagsFromRootForest(forest) {
  let result = [];
  forest.forEach(tree => {
    result = result.concat(parseTagsFromNode(tree, undefined, []));
  });
  return result;
}

function parseTagsFromNode(node, parentNode, ancestry) {
  let result = [];
  let tag = extractTag(node.name);
  if (tag) {
    let tagObj = {
      tag: tag,
      name: node.name,
      ancestry: ancestry
    };
    result.push(tagObj);
    node.tag = tagObj;
    if (parentNode !== undefined) {
      parentNode.hasChildrenWithTags = true;
      if (parentNode.tagsOfChildren === undefined) {
        parentNode.tagsOfChildren = [];
      }
      parentNode.tagsOfChildren.push(tagObj);
    }
  }
  if (!node.children || node.children.length == 0) {
    return result;
  }
  let newAncestry = ancestry.concat([node.name]);
  node.children.forEach(subTree => {
    result = result.concat(parseTagsFromNode(subTree, node, newAncestry));
  });
  return result;
}

function extractTag(str) {
  if (str.startsWith(">>")) {
    let indexOfWhitespace = str.indexOf(" ")
    return str.slice(2, indexOfWhitespace >= 0 ? indexOfWhitespace : str.length);
  }
}
