const { NotebookNodeView, NotebookNodeViewOfBottomPanel } = require('./notebook_node_view.js');
const { buildInitialNotesForest, highlightNotesInForest } = require('./notebook_utils.js');
const { withChildren } = require('../html_utils.js');

export function NotesForestViewBuilder(isTopPanel) {
  let that = this;
  that.html = null;
  that.view = null;
  that.isTopPanel = isTopPanel;
  that.rootNodeClickHandler = function(eve) {
    let initialNotesForest = buildInitialNotesForest();
    let rootNodeViewOfNotes;
    if (isTopPanel) {
      rootNodeViewOfNotes = window.my.rootNodeViewOfNotes;
    } else {
      rootNodeViewOfNotes = window.my.rootNodeViewOfNotesOfBottomPanel;
    }
    highlightNotesInForest(rootNodeViewOfNotes, initialNotesForest, isTopPanel);
  };
}

NotesForestViewBuilder.prototype.buildView = function(notebookTree) {
  let that = this;
  let treeView;
  if (that.isTopPanel) {
    treeView = new NotebookNodeView(notebookTree);
  } else {
    treeView = new NotebookNodeViewOfBottomPanel(notebookTree);
  }
  that.view = treeView;

  treeView.buildAsHtmlLiElement();
  treeView.html().classList.add('root-node');
  treeView.html().querySelector(':scope > .notebook-node-title-container > span').addEventListener('click', that.rootNodeClickHandler);
  treeView.toggleCollapse();
  that.html = treeView.html();
};

NotesForestViewBuilder.prototype.getHtml = function() {
  let that = this;
  return that.html;
};

NotesForestViewBuilder.prototype.getRootNodeViewOfNotes = function() {
  return this.view;
};


export function CurrentNotesForestViewBuilder() {
  let that = this;
  that.html = null;
  that.view = null;
  that.isTopPanel = true;
  that.rootNodeClickHandler = function(eve) {
    highlightNotesInForest(window.my.rootNodeViewOfNotes, window.my.currentNotesForest, true);
  };
}

for (let propName in NotesForestViewBuilder.prototype) {
  CurrentNotesForestViewBuilder.prototype[propName] = NotesForestViewBuilder.prototype[propName];
}
