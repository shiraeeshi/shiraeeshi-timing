const { NotebookNodeView } = require('./notebook_node_view.js');
const { withChildren } = require('../html_utils.js');

export function NotesForestViewBuilder() {
  let that = this;
  that.html = null;
  that.view = null;
}

NotesForestViewBuilder.prototype.buildView = function(notesForest) {
  let that = this;
  let rootNode = {
    name: 'all',
    children: notesForest
  };
  let treeView = new NotebookNodeView(rootNode);
  that.view = treeView;

  // let wrapperDiv = document.createElement('div');
  // let headerElem = document.createElement('h3');
  // let headerTxt = document.createTextNode(treeView.name);

  // treeView.children.forEach(childNode => childNode.buildAsHtmlLiElement());
  // let treeHtml =
  //   withChildren(wrapperDiv,
  //     withChildren(headerElem,
  //       headerTxt),
  //     withChildren(document.createElement('ul'),
  //       ...treeView.children.map(childNode => childNode.html)
  //     )
  //   );
  // treeView.html = treeHtml;

  treeView.buildAsHtmlLiElement();
  treeView.toggleCollapse();
  that.html = treeView.html;
};

NotesForestViewBuilder.prototype.getHtml = function() {
  let that = this;
  return that.html;
};

NotesForestViewBuilder.prototype.getRootNodeViewOfNotes = function() {
  return this.view;
};

