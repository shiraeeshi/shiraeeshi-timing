
export function addTagNodeLinksToForest(tagNode, resultForest) {
  // window.webkit.messageHandlers.foobar.postMessage("js addTagNodeLinksToForest tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  // for (let link of tagNode.links) {
  //   window.webkit.messageHandlers.foobar.postMessage("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
  // }
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

export function highlightNotesInForest(rootNodeViewOfNotes, forestToHighlight, isTopPanel) {
  try {
    rootNodeViewOfNotes.children.forEach(treeView => treeView.hide());

    openNotesInForest(rootNodeViewOfNotes, forestToHighlight, isTopPanel);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js highlightNotesInForest error msg: " + err.message);
    throw err;
  }
}

export function openNotesInForest(rootNodeViewOfNotes, forestToHighlight, isTopPanel) {
  try {
    forestToHighlight.forEach(nodeToHighlight => {
      rootNodeViewOfNotes.children.forEach(treeView => {
        if (treeView.name != nodeToHighlight.name) return;

        treeView.highlightTree(nodeToHighlight);
      });
    });

    if (!isTopPanel) {
      let notesOuterWrapper = document.getElementById('notes-content-outer-wrapper');
      notesOuterWrapper.classList.add('as-two-panels');
    }
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js openNotesInForest error msg: " + err.message);
    throw err;
  }
}

export function highlightTagsInForest(rootNodeViewOfTags, forestToHighlight) {
  try {
    rootNodeViewOfTags.children.forEach(treeView => treeView.hide());

    openTagsInForest(rootNodeViewOfTags, forestToHighlight);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js highlightTagsInForest error msg: " + err.message);
    throw err;
  }
}

export function openTagsInForest(rootNodeViewOfTags, forestToHighlight) {
  try {

    if (forestToHighlight.name === rootNodeViewOfTags.name) {
      rootNodeViewOfTags.highlightTree(forestToHighlight);
    }
    // forestToHighlight.forEach(nodeToHighlight => {
    //   rootNodeViewOfTags.children.forEach(treeView => {
    //     if (treeView.name != nodeToHighlight.name) return;

    //     treeView.highlightTree(nodeToHighlight);
    //   });
    // });

    let tagsOuterWrapper = document.getElementById('tags-and-links-content-outer-wrapper');
    tagsOuterWrapper.classList.add('as-two-panels');

  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js openTagsInForest error msg: " + err.message);
    throw err;
  }
}

export function buildTagsAndLinksForest(taggedNodes) {
  let result = {
    name: 'all tags',
    children: [],
    subTags: {}
  };
  taggedNodes.forEach(taggedNode => {
    let tagPath = taggedNode.tag.split(".");
    let obj = result;
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
  return result;
}

export function buildInitialNotesForest() {
  let resultForest = window.my.notesForest.map(tree => {
    return {
      name: tree.name,
      children: tree.children.map(ch => {
        return {
          name: ch.name,
          children: []
        };
      })
    };
  });
  return resultForest;
}

export function buildCurrentNotesForest(tagsAndLinksForestObj) {
  let resultForest = [];
  let currentTags = findCurrentTags(tagsAndLinksForestObj);
  for (let tag of currentTags) {
    // window.webkit.messageHandlers.composite_main_window.postMessage("js buildCurrentNotesForest current tag ancestry: " +
    //   tag.tagAncestry.join(" "));
    addTagNodeLinksToForest(tag, resultForest);
  }
  return resultForest;
}

function findCurrentTags(tagsAndLinksForestObj) {
  try {
    let currentTags = [];
    function addTag(tag) {
      currentTags[currentTags.length] = tag;
      for (let subTag of tag.children) {
        addTag(subTag);
      }
    }
    function inner(tag) {
      if (tag.name === "current") {
        addTag(tag);
      } else {
        for (let subTag of tag.children) {
          inner(subTag);
        }
      }
    }
    inner(tagsAndLinksForestObj);
    return currentTags;
  } catch (err) {
    window.webkit.messageHandlers.composite_main_window.postMessage("js findCurrentTags error msg: " + err.message);
  }
}

export function appendNotesForestHtml(notesForestHtml) {
  let notesWrapper = document.getElementById("notes-content-top-wrapper");
  notesWrapper.innerHTML = "";
  notesWrapper.appendChild(notesForestHtml);
}

export function appendNotesForestHtmlToBottomPanel(notesForestHtml) {
  let notesWrapper = document.getElementById("notes-content-bottom-wrapper");
  notesWrapper.innerHTML = "";
  notesWrapper.appendChild(notesForestHtml);
}

