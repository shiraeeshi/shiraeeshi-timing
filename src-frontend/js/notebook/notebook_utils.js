const { TagsTreeNode } = require('./tags_tree_node.js')

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
      if (!rootNodeViewOfNotes.childrenByName.hasOwnProperty(nodeToHighlight.name)) {
        return;
      }
      let node = rootNodeViewOfNotes.childrenByName[nodeToHighlight.name];
      node.highlightTree(nodeToHighlight);
      // rootNodeViewOfNotes.children.forEach(treeView => {
      //   if (treeView.name != nodeToHighlight.name) return;

      //   treeView.highlightTree(nodeToHighlight);
      // });
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

export function openPathInTagsForest(rootNodeViewOfTags, path) {
  try {
    if (path.length === 0) {
      return;
    }
    let tagsToOpen = new TagsTreeNode(path[0]);
    let node = tagsToOpen;
    for (let pathSegment of path.slice(1)) {
      node = node.ensureSubtagWithName(pathSegment);
    }

    if (tagsToOpen.name === rootNodeViewOfTags.name) {
      rootNodeViewOfTags.highlightTree(tagsToOpen);
    }

    // let tagsOuterWrapper = document.getElementById('tags-and-links-content-outer-wrapper');
    // tagsOuterWrapper.classList.add('as-two-panels');

  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js openPathInTagsForest error msg: " + err.message);
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
  let result = new TagsTreeNode('all tags');
  taggedNodes.forEach(taggedNode => {
    let tagPath = taggedNode.tag.split(".");
    let obj = result;
    tagPath.forEach(tagPathSegment => {
      obj = obj.ensureSubtagWithName(tagPathSegment);
    });
    obj.links.push(taggedNode);
    taggedNode.tagsTreeNode = obj;
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

export function initBottomPanelButtons() {
  initBottomPanelButtonsOfTagsAndLinks();
  initBottomPanelButtonsOfNotes();
}

function initBottomPanelButtonsOfTagsAndLinks() {
  let btnClose = document.getElementById('btn-close-bottom-panel-of-tags-and-links');
  btnClose.addEventListener('click', (eve) => {
    let topPanel = document.getElementById('tags-and-links-content-top-wrapper');
    topPanel.style.removeProperty('height');
    let outerWrapper = document.getElementById('tags-and-links-content-outer-wrapper');
    outerWrapper.classList.remove('as-two-panels');
  });

  let btnOpenAbove = document.getElementById('btn-open-tags-in-above-panel');
  btnOpenAbove.addEventListener('click', (eve) => {
    let tagsToOpen = window.my.lastOpenedTags;
    openTagsInForest(window.my.rootNodeViewOfTags, tagsToOpen);
  });

  let btnOpenAboveExclusively = document.getElementById('btn-open-tags-in-above-panel-exclusively');
  btnOpenAboveExclusively.addEventListener('click', (eve) => {
    let tagsToOpen = window.my.lastOpenedTags;
    highlightTagsInForest(window.my.rootNodeViewOfTags, tagsToOpen);
  });
}

function initBottomPanelButtonsOfNotes() {
  let btnClose = document.getElementById('btn-close-bottom-panel-of-notes');
  btnClose.addEventListener('click', (eve) => {
    let topPanel = document.getElementById('notes-content-top-wrapper');
    topPanel.style.removeProperty('height');
    let outerWrapper = document.getElementById('notes-content-outer-wrapper');
    outerWrapper.classList.remove('as-two-panels');
  });

  let btnOpenAbove = document.getElementById('btn-open-notes-in-above-panel');
  btnOpenAbove.addEventListener('click', (eve) => {
    let nodesToOpen = window.my.lastOpenedNodesOfNotes;
    openNotesInForest(window.my.rootNodeViewOfNotes, nodesToOpen);
  });

  let btnOpenAboveExclusively = document.getElementById('btn-open-notes-in-above-panel-exclusively');
  btnOpenAboveExclusively.addEventListener('click', (eve) => {
    let nodesToOpen = window.my.lastOpenedNodesOfNotes;
    highlightNotesInForest(window.my.rootNodeViewOfNotes, nodesToOpen);
  });

  let btnMaximize = document.getElementById('btn-maximize-bottom-panel-of-notes');
  btnMaximize.addEventListener('click', (eve) => {
    let outerWrapper = document.getElementById('notes-content-outer-wrapper');
    outerWrapper.classList.remove('as-two-panels');
    outerWrapper.classList.add('maximized-bottom-panel');
  });

  let btnUnmaximize = document.getElementById('btn-unmaximize-bottom-panel-of-notes');
  btnUnmaximize.addEventListener('click', (eve) => {

    if (my.rootNodeViewOfNotes === undefined) {
      let viewBuilder = new NotesForestViewBuilder(true);
      viewBuilder.buildView(my.notesForest);
      my.rootNodeViewOfNotes = viewBuilder.getRootNodeViewOfNotes();
      appendNotesForestHtml(viewBuilder.getHtml());

      let initialNotesForest = buildInitialNotesForest();
      highlightNotesInForest(window.my.rootNodeViewOfNotes, initialNotesForest, true);
    }

    let outerWrapper = document.getElementById('notes-content-outer-wrapper');
    outerWrapper.classList.add('as-two-panels');
    outerWrapper.classList.remove('maximized-bottom-panel');
  });
}

export function initResizers() {
  initVerticalResizer();
  initHorizontalResizer('tags-and-links-content-top-wrapper', 'tags-and-links-content-bottom-outer-wrapper', 'resizer-between-top-and-bottom-panels-of-tags');
  initHorizontalResizer('notes-content-top-wrapper', 'notes-content-bottom-outer-wrapper', 'resizer-between-top-and-bottom-panels-of-notes');
}

function initHorizontalResizer(topPanelId, bottomPanelId, resizerId) {
  let topPanel = document.getElementById(topPanelId);
  let resizer = document.getElementById(resizerId);
  let bottomPanel = document.getElementById(bottomPanelId);

  let resizerX = 0;
  let resizerY = 0;

  let topPanelHeight = 0;

  resizer.addEventListener('mousedown', (eve) => {
    resizerX = eve.clientX;
    resizerY = eve.clientY;

    topPanelHeight = topPanel.getBoundingClientRect().height;

    document.documentElement.style.cursor = 'ns-resize';

    topPanel.style.userSelect = 'none';
    topPanel.style.pointerEvents = 'none';

    bottomPanel.style.userSelect = 'none';
    bottomPanel.style.pointerEvents = 'none';

    document.documentElement.addEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.addEventListener('mouseup', resizerMouseUpListener);
  });

  function resizerMouseMoveListener(eve) {
    const dx = eve.clientX - resizerX;
    const dy = eve.clientY - resizerY;

    const newTopPanelHeight = ((topPanelHeight + dy) * 100) / resizer.parentNode.getBoundingClientRect().height;

    topPanel.style.height = `${newTopPanelHeight}%`;
  }

  function resizerMouseUpListener(eve) {
    document.documentElement.style.removeProperty('cursor');

    topPanel.style.removeProperty('user-select');
    topPanel.style.removeProperty('pointer-events');

    bottomPanel.style.removeProperty('user-select');
    bottomPanel.style.removeProperty('pointer-events');

    document.documentElement.removeEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.removeEventListener('mouseup', resizerMouseUpListener);
  }
}

function initVerticalResizer() {
  let leftHalf = document.getElementById('tags-and-links-content-outer-wrapper');
  let resizer = document.getElementById('resizer-between-tags-and-notes');
  let rightHalf = document.getElementById('notes-content-outer-wrapper');

  let resizerX = 0;
  let resizerY = 0;

  let leftHalfWidth = 0;

  resizer.addEventListener('mousedown', (eve) => {
    resizerX = eve.clientX;
    resizerY = eve.clientY;

    leftHalfWidth = leftHalf.getBoundingClientRect().width;

    document.documentElement.style.cursor = 'ew-resize';

    leftHalf.style.userSelect = 'none';
    leftHalf.style.pointerEvents = 'none';

    rightHalf.style.userSelect = 'none';
    rightHalf.style.pointerEvents = 'none';

    document.documentElement.addEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.addEventListener('mouseup', resizerMouseUpListener);
  });

  function resizerMouseMoveListener(eve) {
    const dx = eve.clientX - resizerX;
    const dy = eve.clientY - resizerY;

    const newLeftHalfWidth = ((leftHalfWidth + dx) * 100) / resizer.parentNode.getBoundingClientRect().width;

    leftHalf.style.width = `${newLeftHalfWidth}%`;
  }

  function resizerMouseUpListener(eve) {
    document.documentElement.style.removeProperty('cursor');

    leftHalf.style.removeProperty('user-select');
    leftHalf.style.removeProperty('pointer-events');

    rightHalf.style.removeProperty('user-select');
    rightHalf.style.removeProperty('pointer-events');

    document.documentElement.removeEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.removeEventListener('mouseup', resizerMouseUpListener);
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

