
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

function extractTag(str) {
  if (str.startsWith(">>")) {
    return str.slice(2, str.indexOf(" "));
  }
}