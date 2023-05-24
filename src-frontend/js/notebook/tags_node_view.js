const { NotebookNodeView } = require('./notebook_node_view.js');
const { NotesForestViewBuilder } = require('./notes_forest_view_builder.js');
const { appendNotesForestHtmlToBottomPanel, addTagNodeLinksToForest, highlightNotesInForest } = require('./notebook_utils.js');
const { withChildren } = require('../html_utils.js');


export function NotebookTagsTreeNodeView(notebookTagsTreeNode, parentNodeView) {
  let that = this;
  that.tagsTreeNode = notebookTagsTreeNode;
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
}

for (let propName in NotebookNodeView.prototype) {
  NotebookTagsTreeNodeView.prototype[propName] = NotebookNodeView.prototype[propName];
}

NotebookTagsTreeNodeView.prototype.initFontSize = function(htmlElement) {
  let that = this;
  htmlElement.style.fontSize = `${window.my.tagsFontSize}px`;
};

NotebookTagsTreeNodeView.prototype.increaseFontSize = function() {
  let that = this;
  let fontSize = window.my.tagsFontSize;
  fontSize++;
  window.my.tagsFontSize = fontSize;
  that.html().style.fontSize = `${fontSize}px`;
}

NotebookTagsTreeNodeView.prototype.decreaseFontSize = function() {
  let that = this;
  let fontSize = window.my.tagsFontSize;
  if (fontSize > 1) {
    fontSize--;
  }
  window.my.tagsFontSize = fontSize;
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
  window.webkit.messageHandlers.foobar.postMessage("js searchByTag tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  for (let link of tagNode.links) {
    window.webkit.messageHandlers.foobar.postMessage("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
  }
  let resultForest = [];
  addTagNodeLinksToForest(tagNode, resultForest);
  window.my.lastOpenedNodesOfNotes = resultForest;

  if (my.rootNodeViewOfNotesOfBottomPanel === undefined) {
    let forest = my.notesForest;

    let viewBuilder = new NotesForestViewBuilder();
    viewBuilder.buildView(forest);
    my.rootNodeViewOfNotesOfBottomPanel = viewBuilder.getRootNodeViewOfNotes();
    appendNotesForestHtmlToBottomPanel(viewBuilder.getHtml());

  }
  highlightNotesInForest(window.my.rootNodeViewOfNotesOfBottomPanel, resultForest);
}
