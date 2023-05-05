const { NotebookNodeView } = require('./notebook_node_view.js');
const { buildInitialNotesForest, highlightNotesInForest } = require('./notebook_utils.js');
const { withChildren } = require('../html_utils.js');

export function NotesForestViewBuilder() {
  let that = this;
  that.html = null;
  that.view = null;
  that.rootNodeClickHandler = function(eve) {
    let initialNotesForest = buildInitialNotesForest();
    highlightNotesInForest(window.my.rootNodeViewOfNotes, initialNotesForest, true);
  };
}

NotesForestViewBuilder.prototype.buildView = function(notesForest) {
  let that = this;
  let rootNode = {
    name: 'all',
    children: notesForest
  };
  let treeView = new NotebookNodeView(rootNode);
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
  that.rootNodeClickHandler = function(eve) {
    highlightNotesInForest(window.my.rootNodeViewOfNotes, window.my.currentNotesForest, true);
  };
}

for (let propName in NotesForestViewBuilder.prototype) {
  CurrentNotesForestViewBuilder.prototype[propName] = NotesForestViewBuilder.prototype[propName];
}
