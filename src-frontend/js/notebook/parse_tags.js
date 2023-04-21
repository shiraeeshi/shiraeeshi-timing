
export function parseTagsFromRootForest(forest) {
  let result = [];
  forest.forEach(tree => {
    result = result.concat(parseTagsFromNode(tree, []));
  });
  return result;
}

function parseTagsFromNode(node, ancestry) {
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
    result = result.concat(parseTagsFromNode(subTree, newAncestry));
  });
  return result;
}

function extractTag(str) {
  if (str.startsWith(">>")) {
    let indexOfWhitespace = str.indexOf(" ")
    return str.slice(2, indexOfWhitespace >= 0 ? indexOfWhitespace : str.length);
  }
}
