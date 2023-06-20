const { NotebookNodeView } = require('./notebook_node_view.js');
const { NotesForestViewBuilder } = require('./notes_forest_view_builder.js');
const { appendNotesForestHtmlToBottomPanel, addTagNodeLinksToForest, highlightNotesInForest } = require('./notebook_utils.js');
const { withChildren } = require('../html_utils.js');


export function NotebookTagsTreeNodeView(notebookTagsTreeNode, parentNodeView) {
  let that = this;
  that.tagsTreeNode = notebookTagsTreeNode;
  notebookTagsTreeNode.nodeView = that;
  that.name = notebookTagsTreeNode.name;
  that.isCollapsed = true;
  that.parentNodeView = parentNodeView;
  that.children = notebookTagsTreeNode.children.map(childNode => new NotebookTagsTreeNodeView(childNode, that));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.hasManuallyHiddenChildren = false;
  that.htmlContainerUl = document.createElement('ul');
  // that.isTopPanelTree = undefined;
}

for (let propName in NotebookNodeView.prototype) {
  NotebookTagsTreeNodeView.prototype[propName] = NotebookNodeView.prototype[propName];
}

NotebookTagsTreeNodeView.prototype.mergeWithNewTags = function(tagsTreeNode) {
  let that = this;
  that.tagsTreeNode = tagsTreeNode;
  let lengthBefore = that.children.length;
  tagsTreeNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = new NotebookTagsTreeNodeView(childNode, that);
      newChildView.buildAsHtmlLiElement();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
    } else {
      oldChild.mergeWithNewTags(childNode);
    }
  });
  if (lengthBefore > 0) {
    that.children = that.tagsTreeNode.children.map(ch => ch.nodeView);
    that.htmlContainerUl.innerHTML = "";
    withChildren(that.htmlContainerUl, ...that.children.map(ch => ch.html()));
  }
  let currentLength = that.children.length;
  if (lengthBefore === 0 && currentLength > 0) {
    if (that.htmlElement === undefined) {
      return;
    }
    that._rebuildHtmlElement();
    if (!that.isCollapsed) {
      that.children = that.tagsTreeNode.children.map(ch => ch.nodeView);
      that.htmlContainerUl.innerHTML = "";
      withChildren(that.htmlContainerUl, ...that.children.map(ch => ch.html()));
    }
  }
};

NotebookTagsTreeNodeView.prototype.initFontSize = function(htmlElement) {
  let that = this;
  let fontSize;
  if (that.isTopPanelTree) {
    fontSize = window.my.fontSizeOfTopPanelOfTags;
  } else {
    fontSize = window.my.fontSizeOfBottomPanelOfTags;
  }
  htmlElement.style.fontSize = `${fontSize}px`;
};

NotebookTagsTreeNodeView.prototype.increaseFontSize = function() {
  let that = this;
  let fontSize;
  if (that.isTopPanelTree) {
    fontSize = window.my.fontSizeOfTopPanelOfTags;
  } else {
    fontSize = window.my.fontSizeOfBottomPanelOfTags;
  }
  fontSize++;
  if (that.isTopPanelTree) {
    window.my.fontSizeOfTopPanelOfTags = fontSize;
  } else {
    window.my.fontSizeOfBottomPanelOfTags = fontSize;
  }
  that.html().style.fontSize = `${fontSize}px`;
}

NotebookTagsTreeNodeView.prototype.decreaseFontSize = function() {
  let that = this;
  let fontSize;
  if (that.isTopPanelTree) {
    fontSize = window.my.fontSizeOfTopPanelOfTags;
  } else {
    fontSize = window.my.fontSizeOfBottomPanelOfTags;
  }
  if (fontSize > 1) {
    fontSize--;
  }
  if (that.isTopPanelTree) {
    window.my.fontSizeOfTopPanelOfTags = fontSize;
  } else {
    window.my.fontSizeOfBottomPanelOfTags = fontSize;
  }
  that.html().style.fontSize = `${fontSize}px`;
}

NotebookTagsTreeNodeView.prototype.name2html = function() {
  let that = this;
  let a = document.createElement('a');
  a.onclick = function() {
    searchByTag(that.tagsTreeNode);
  };
  return withChildren(a, document.createTextNode(that.name))
};

function searchByTag(tagNode) {
  // window.webkit.messageHandlers.foobar.postMessage("js searchByTag tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  console.log("js searchByTag tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  for (let link of tagNode.links) {
    // window.webkit.messageHandlers.foobar.postMessage("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
    console.log("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
  }
  let resultForest = [];
  addTagNodeLinksToForest(tagNode, resultForest);
  window.my.lastOpenedNodesOfNotes = resultForest;

  // if (my.rootNodeViewOfNotesOfBottomPanel === undefined) { // TODO react to change of structure of the tree in the top panel (instead of rebuilding the bottom tree every time)
  if (true) {

    let viewBuilder = new NotesForestViewBuilder();
    viewBuilder.buildView(my.notebookTree.copy());
    my.rootNodeViewOfNotesOfBottomPanel = viewBuilder.getRootNodeViewOfNotes();
    appendNotesForestHtmlToBottomPanel(viewBuilder.getHtml());

  }
  highlightNotesInForest(window.my.rootNodeViewOfNotesOfBottomPanel, resultForest);
}
