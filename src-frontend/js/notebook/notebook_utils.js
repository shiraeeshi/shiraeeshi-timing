
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


export function appendNotesForestHtml(notesForestHtmlElements) {
  let notesWrapper = document.getElementById("notes-content-wrapper");
  notesWrapper.innerHTML = "";
  notesForestHtmlElements.forEach(el => notesWrapper.appendChild(el));
}

