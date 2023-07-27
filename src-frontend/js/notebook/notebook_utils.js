const { TagsTreeNode } = require('./tags_tree_node.js')
const { NotesForestViewBuilder } = require('./notes_forest_view_builder.js');
const { showTagsAndLinks, showTagsAndLinksOfBottomPanel } = require('./show_tags.js');
const {
  addSiblingWithInputToTheRightSideNode,
  appendChildWithInputToTheRightSideNode,
  editRightSideNode,
  deleteNodeFromTheRightSide,
  pasteNodeInto,
  isNotebookNodeInViewport,
  bringNotebookNodeToViewport
} = require('./notebook_node_view_utils.js');

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

function highlightNotesInForestInBottomPanel(forestToHighlight) {
  try {
    let rootNodeViewOfNotes = window.my.rootNodeViewOfNotesOfBottomPanel;
    rootNodeViewOfNotes.children.forEach(treeView => treeView.hideAsPartOfBottomPanelClearOperation());
    openNotesInForestInBottomPanel(forestToHighlight);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js highlightNotesInForestInBottomPanel error msg: " + err.message);
    throw err;
  }
}

function openNotesInForestInBottomPanel(forestToHighlight) {
  try {
    let rootNodeViewOfNotes = window.my.rootNodeViewOfNotesOfBottomPanel;
    forestToHighlight.forEach(nodeToHighlight => {
      if (!rootNodeViewOfNotes.childrenByName.hasOwnProperty(nodeToHighlight.name)) {
        return;
      }
      let node = rootNodeViewOfNotes.childrenByName[nodeToHighlight.name];
      node.highlightTreeInBottomPanel(nodeToHighlight);
    });
    let notesOuterWrapper = document.getElementById('notes-content-outer-wrapper');
    notesOuterWrapper.classList.add('as-two-panels');
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js openNotesInForestInBottomPanel error msg: " + err.message);
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

export function searchByTag(tagNode) {
  // window.webkit.messageHandlers.foobar.postMessage("js searchByTag tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  console.log("js searchByTag tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  for (let link of tagNode.links) {
    // window.webkit.messageHandlers.foobar.postMessage("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
    console.log("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
  }
  if (window.my.lastOpenedTagsTreeNode) {
    delete window.my.lastOpenedTagsTreeNode.handlerLinkAdded;
    delete window.my.lastOpenedTagsTreeNode.handlerLinkDeleted;
    delete window.my.lastOpenedTagsTreeNode.handlerLinksChanged;
  }
  window.my.lastOpenedTagsTreeNode = tagNode;

  tagNode.handlerLinkAdded = function() {
    showLinksOfTag(tagNode); // TODO optimize: get the notebookNode from the new link, build its html, unhide it, unhide its ancestors
  };

  tagNode.handlerLinkDeleted = function() {
    showLinksOfTag(tagNode); // TODO optimize: get the notebookNode from the deleted link, remove its html, handle visibility of ancestors
  };

  tagNode.handlerLinksChanged = function() {
    showLinksOfTag(tagNode);
  }

  showLinksOfTag(tagNode);
}

function showLinksOfTag(tagNode) {

  let resultForest = [];
  addTagNodeLinksToForest(tagNode, resultForest);

  // TODO for each node in window.my.lastOpenedNodesOfNotes, delete values (instead of doing it in hideAsPartOfBottomPanelClearOperation method):
  //   node.isPartOfHighlightedBottomPanelTree,
  //   node.isLeafOfHighlightedBottomPanelTree,
  //   node.isManuallyAddedToHighlightedBottomPanelTree

  window.my.lastOpenedNodesOfNotes = resultForest;

  my.isCursorOnRightSide = true;
  my.isCursorOnTopRightPanel = false;
  my.isCursorOnBottomRightPanel = true;

  if (my.rootNodeViewOfNotesOfBottomPanel === undefined) {

    let viewBuilder = new NotesForestViewBuilder();
    viewBuilder.buildView(my.notebookTree);
    my.rootNodeViewOfNotesOfBottomPanel = viewBuilder.getRootNodeViewOfNotes();
    appendNotesForestHtmlToBottomPanel(viewBuilder.getHtml());

    my.rightBottomNodeInRectangle = my.rootNodeViewOfNotesOfBottomPanel;
    my.rightBottomNodeInRectangle.wrapInRectangle();
  }
  highlightNotesInForestInBottomPanel(resultForest);

  if (my.rightBottomNodeInRectangle.isHidden) {
    let prev = my.rightBottomNodeInRectangle;
    my.rightBottomNodeInRectangle = my.rootNodeViewOfNotesOfBottomPanel;
    my.rightBottomNodeInRectangle.wrapInRectangle();
    prev.removeRectangleWrapper();
  }

  my.rightSideNodeInRectangle = my.rightBottomNodeInRectangle;
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

export function initNotesContentTopWrapperContextMenu(tagsAndLinksObj) {
  let notesContentTopWrapper = document.getElementById('notes-content-top-wrapper');
  notesContentTopWrapper.addEventListener('contextmenu', (eve) => {
    eve.preventDefault();
    my.contextMenuHandler = function(commandName) {
      if (commandName === 'show-tags-panel') {
        my.isHiddenTagsPanel = false;
        let notebookContentWrapper = document.getElementById('notebook-main-container');
        notebookContentWrapper.classList.remove('hidden-tags-panel');
        if (my.rootNodeViewOfTags === undefined) {
          showTagsAndLinks(tagsAndLinksObj);
          showTagsAndLinksOfBottomPanel(tagsAndLinksObj);
        }
      } else if (commandName === 'hide-tags-panel') {
        my.isHiddenTagsPanel = true;
        let notebookContentWrapper = document.getElementById('notebook-main-container');
        notebookContentWrapper.classList.add('hidden-tags-panel');
      }
    };
    window.webkit.messageHandlers.show_notebook_container_context_menu.postMessage('notes-top-panel', {
      isHiddenTagsPanel: my.isHiddenTagsPanel,
    });
    return false;
  });
}

export function initPanelButtons() {
  initTopPanelButtonsOfTagsAndLinks();
  initBottomPanelButtonsOfTagsAndLinks();
  initBottomPanelButtonsOfNotes();
}

function initTopPanelButtonsOfTagsAndLinks() {
  let btnClose = document.getElementById('btn-close-panel-of-tags-and-links');
  btnClose.addEventListener('click', (eve) => {
    window.my.isHiddenTagsPanel = true;
    let notebookContainer = document.getElementById('notebook-main-container');
    notebookContainer.classList.add('hidden-tags-panel');
  });

}

function initBottomPanelButtonsOfTagsAndLinks() {
  let btnClose = document.getElementById('btn-close-bottom-panel-of-tags-and-links');
  btnClose.addEventListener('click', (eve) => {
    let topPanel = document.getElementById('tags-and-links-content-top-outer-wrapper');
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

    my.isCursorOnTopRightPanel = true;
    my.isCursorOnBottomRightPanel = false;
    my.rightSideNodeInRectangle = my.rightTopNodeInRectangle;

    if (!isNotebookNodeInViewport(my.rightSideNodeInRectangle)) {
      bringNotebookNodeToViewport(my.rightSideNodeInRectangle.htmlElement);
    }
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

    my.isCursorOnTopRightPanel = true;
    my.isCursorOnBottomRightPanel = false;
    my.rightSideNodeInRectangle = my.rightTopNodeInRectangle;

    if (my.rightTopNodeInRectangle.isHidden) {
      let prev = my.rightTopNodeInRectangle;
      my.rightTopNodeInRectangle = my.rootNodeViewOfNotes;
      my.rightTopNodeInRectangle.wrapInRectangle();
      my.rightSideNodeInRectangle = my.rightTopNodeInRectangle;
      prev.removeRectangleWrapper();
    }
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
  initHorizontalResizer('tags-and-links-content-top-outer-wrapper', 'tags-and-links-content-bottom-outer-wrapper', 'resizer-between-top-and-bottom-panels-of-tags');
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

export function handleKeyDown(eve) {


// hotkeys:
//   ArrowLeft: go-to-parent-node
//   ArrowRight: go-to-child-node
//   Ctrl+ArrowUp: switch-to-top-panel-of-notes
//   ArrowUp: go-to-previous-sibling-node
//   Ctrl+ArrowDown: switch-to-bottom-panel-of-notes
//   ArrowDown: go-to-next-sibling-node
//   ' ': toggle-collapse-node
//   Ctrl+x: cut-node-under-cursor
//   Ctrl+c: copy-node-under-cursor
//   Delete: delete-node
//   o: add-sibling-node
//   a: append-child-node
//   F2: edit-node-text
//   Ctrl+v: paste-into-node-under-cursor

  if (my.isKeyboardListenerDisabled) {
    return;
  }

  if (my.config.hotkeys === undefined || my.config.hotkeys.notebook === undefined) {
    return;
  }

  let key = eve.key;

  if (eve.ctrlKey) {
    key = 'Ctrl+' + key;
  }

  let action;

  // if (key === 'ArrowLeft') {
  //   action = 'go-to-parent-node';
  // } else if (key === 'ArrowRight') {
  //   action = 'go-to-child-node';
  // } else if (eve.ctrlKey && key === 'ArrowUp') {
  //   action = 'switch-to-top-panel-of-notes';
  // } else if (key === 'ArrowUp') {
  //   action = 'go-to-previous-sibling-node';
  // } else if (eve.ctrlKey && key === 'ArrowDown') {
  //   action = 'switch-to-bottom-panel-of-notes';
  // } else if (key === 'ArrowDown') {
  //   action = 'go-to-next-sibling-node';
  // } else if (key === ' ') {
  //   action = 'toggle-collapse-node';
  // } else if (eve.ctrlKey && key === 'x') {
  //   action = 'cut-node-under-cursor';
  // } else if (eve.ctrlKey && key === 'c') {
  //   action = 'copy-node-under-cursor';
  // }

  if (key === 'ArrowUp' || key === 'ArrowDown' || key === ' ') {
    eve.preventDefault();
  }

  action = my.config.hotkeys.notebook[key];
  
  if (action === undefined) {
    return;
  }

  if (action === 'go-to-parent-node') {
    if (my.isCursorOnRightSide) {
      if (my.rightSideNodeInRectangle.parentNodeView !== undefined) {
        my.rightSideNodeInRectangle.removeRectangleWrapper();

        let newNodeInRectangle = my.rightSideNodeInRectangle.parentNodeView;
        newNodeInRectangle.wrapInRectangle();

        my.rightSideNodeInRectangle = newNodeInRectangle;

        if (!isNotebookNodeInViewport(newNodeInRectangle)) {
          bringNotebookNodeToViewport(newNodeInRectangle.htmlElement);
        }

        if (my.isCursorOnTopRightPanel) {
          my.rightTopNodeInRectangle = my.rightSideNodeInRectangle;
        } else {
          my.rightBottomNodeInRectangle = my.rightSideNodeInRectangle;
        }
      }
      return true;
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.parentNodeView !== undefined) {
        nodeInRectangle.removeRectangleWrapper();

        let newNodeInRectangle = nodeInRectangle.parentNodeView;
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
      return true;
    }
  } else if (action === 'go-to-child-node') {
    if (my.isCursorOnRightSide) {
      if (my.rightSideNodeInRectangle.children.length > 0) {

        if (my.rightSideNodeInRectangle.isCollapsed) {
          my.rightSideNodeInRectangle.toggleCollapse();
        }

        let newHtmlNodeInRectangle = my.rightSideNodeInRectangle.htmlContainerUl.children[0];

        if (newHtmlNodeInRectangle === undefined) {
          my.rightSideNodeInRectangle.unhideHiddenChildren();
        }

        newHtmlNodeInRectangle = my.rightSideNodeInRectangle.htmlContainerUl.children[0];

        if (newHtmlNodeInRectangle === undefined) {
          return;
        }

        my.rightSideNodeInRectangle.removeRectangleWrapper();

        let newNodeInRectangle = newHtmlNodeInRectangle.nodeView;
        newNodeInRectangle.wrapInRectangle();

        if (!isNotebookNodeInViewport(newNodeInRectangle)) {
          bringNotebookNodeToViewport(newNodeInRectangle.htmlElement);
        }

        my.rightSideNodeInRectangle = newNodeInRectangle;

        if (my.isCursorOnTopRightPanel) {
          my.rightTopNodeInRectangle = my.rightSideNodeInRectangle;
        } else {
          my.rightBottomNodeInRectangle = my.rightSideNodeInRectangle;
        }
      }
      return true;
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.children.length > 0) {

        if (nodeInRectangle.isCollapsed) {
          nodeInRectangle.toggleCollapse();
        }

        let newHtmlNodeInRectangle = nodeInRectangle.htmlContainerUl.children[0];

        if (newHtmlNodeInRectangle === undefined) {
          nodeInRectangle.unhideHiddenChildren();
        }

        newHtmlNodeInRectangle = nodeInRectangle.htmlContainerUl.children[0];

        if (newHtmlNodeInRectangle === undefined) {
          return;
        }

        nodeInRectangle.removeRectangleWrapper();

        let newNodeInRectangle = newHtmlNodeInRectangle.nodeView;
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
      return true;
    }
  } else if (action === 'switch-to-top-panel-of-notes') {
    if (my.isCursorOnRightSide) {
      my.isCursorOnTopRightPanel = true;
      my.isCursorOnBottomRightPanel = false;
      my.rightBottomNodeInRectangle = my.rightSideNodeInRectangle;
      my.rightSideNodeInRectangle = my.rightTopNodeInRectangle;
    }
    return true;
  } else if (action === 'go-to-previous-sibling-node') {
    if (my.isCursorOnRightSide) {
      if (my.rightSideNodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = my.rightSideNodeInRectangle.findPreviousVisibleSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        my.rightSideNodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        if (!isNotebookNodeInViewport(newNodeInRectangle)) {
          bringNotebookNodeToViewport(newNodeInRectangle.htmlElement);
        }

        my.rightSideNodeInRectangle = newNodeInRectangle;

        if (my.isCursorOnTopRightPanel) {
          my.rightTopNodeInRectangle = my.rightSideNodeInRectangle;
        } else {
          my.rightBottomNodeInRectangle = my.rightSideNodeInRectangle;
        }
      }
      return true;
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = nodeInRectangle.findPreviousVisibleSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        nodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
      return true;
    }
  } else if (action === 'switch-to-bottom-panel-of-notes') {
    if (my.isCursorOnRightSide) {
      my.isCursorOnTopRightPanel = false;
      my.isCursorOnBottomRightPanel = true;
      my.rightTopNodeInRectangle = my.rightSideNodeInRectangle;
      my.rightSideNodeInRectangle = my.rightBottomNodeInRectangle;
    }
    return true;
  } else if (action === 'go-to-next-sibling-node') {
    if (my.isCursorOnRightSide) {
      if (my.rightSideNodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = my.rightSideNodeInRectangle.findNextVisibleSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        my.rightSideNodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        if (!isNotebookNodeInViewport(newNodeInRectangle)) {
          bringNotebookNodeToViewport(newNodeInRectangle.htmlElement);
        }

        my.rightSideNodeInRectangle = newNodeInRectangle;

        if (my.isCursorOnTopRightPanel) {
          my.rightTopNodeInRectangle = my.rightSideNodeInRectangle;
        } else {
          my.rightBottomNodeInRectangle = my.rightSideNodeInRectangle;
        }
      }
      return true;
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = nodeInRectangle.findNextVisibleSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        nodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
      return true;
    }
  } else if (action === 'toggle-collapse-node') {
    if (my.isCursorOnRightSide) {
      my.rightSideNodeInRectangle.toggleCollapse();
    } else {
      that.nodeInRectangle.toggleCollapse();
    }
    return true;
  } else if (action === 'cut-node-under-cursor') {
    delete my.notebookNodeToCopy;
    my.notebookNodeToCut = my.rightSideNodeInRectangle.notebookNode;
    return true;
  } else if (action === 'copy-node-under-cursor') {
    delete my.notebookNodeToCut;
    my.notebookNodeToCopy = my.rightSideNodeInRectangle.notebookNode;
    return true;
  }
}

export function handleKeyUp(eve) {

  if (my.isKeyboardListenerDisabled) {
    return;
  }

  if (my.config.hotkeys === undefined) {
    return;
  }

  let key = eve.key;

  let prefix = '';

  if (eve.shiftKey) {
    prefix = 'Shift+' + prefix;
  }

  if (eve.altKey) {
    prefix = 'Alt+' + prefix;
  }

  if (eve.ctrlKey) {
    prefix = 'Ctrl+' + prefix;
  }

  key = prefix + key;

  let action;

  // if (key === 'o') {
  //   action = 'add-sibling-node';
  // } else if (key === 'a') {
  //   action = 'append-child-node';
  // } else if (key === 'F2') {
  //   action = 'edit-node-text';
  // } else if (eve.ctrlKey && key === 'v') {
  //   action = 'paste-into-node-under-cursor';
  // } else if (key === 'Delete') {
  //   action = 'delete-node';
  // }

  if (key === 'ArrowUp' || key === 'ArrowDown' || key === ' ') {
    eve.preventDefault();
  }

  if (my.config.hotkeys === undefined || my.config.hotkeys.notebook === undefined) {
    return;
  }

  action = my.config.hotkeys.notebook[key];
  
  if (action === undefined) {
    return;
  }

  if (action === 'add-sibling-node') {
    if (!my.isCursorOnRightSide) {
      return true;
    }
    addSiblingWithInputToTheRightSideNode(my.rightSideNodeInRectangle);
    return true;
  } else if (action === 'append-child-node') {
    if (!my.isCursorOnRightSide) {
      return true;
    }
    appendChildWithInputToTheRightSideNode(my.rightSideNodeInRectangle);
    return true;
  } else if (action === 'edit-node-text') {
    if (!my.isCursorOnRightSide) {
      return true;
    }
    editRightSideNode(my.rightSideNodeInRectangle);
    return true;
  } else if (action === 'paste-into-node-under-cursor') {
    pasteNodeInto(my.rightSideNodeInRectangle.notebookNode);
    return true;
  } else if (action === 'delete-node') {
    if (my.isCursorOnRightSide) {
      deleteNodeFromTheRightSide(my.rightSideNodeInRectangle);
    } else {
      that.deleteCorrespondingNodeFromTheRightSide(that.nodeInRectangle)
    }
    return true;
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

