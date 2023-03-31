const { NotebookNodeView } = require('./notebook_node_view.js');
const { withChildren } = require('../html_utils.js');

export function NotesForestViewBuilder() {
  let that = this;
  that.htmls = [];
  that.views = [];
}

NotesForestViewBuilder.prototype.buildView = function(notesForest) {
  let that = this;
  notesForest.forEach(notesTree => {
    that.addTree(notesTree);
  });
}

NotesForestViewBuilder.prototype.addTree = function(notesTree) {
  let that = this;
  let htmls = that.htmls;
  let views = that.views;
  let treeView = new NotebookNodeView(notesTree);
  views[views.length] = treeView;

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
  htmls[htmls.length] = treeView.html;
};

NotesForestViewBuilder.prototype.getHtmlElements = function() {
  let that = this;
  let elem = withChildren(document.createElement('ul'),
    ...that.htmls
  );
  return [elem];
};

NotesForestViewBuilder.prototype.getNotesForestViews = function() {
  return this.views;
};

