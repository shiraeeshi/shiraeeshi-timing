const { NotebookTagsTreeNodeView } = require('./tags_node_view.js');

export function NotebookTagsForestViewBuilder() {
  let that = this;
  that.htmls = [];
  that.views = [];
}

NotebookTagsForestViewBuilder.prototype.buildView = function(notebookTagsForest) {
  let that = this;
  Object.keys(notebookTagsForest).forEach(propName => {
    let notebookTagsTreeNode = notebookTagsForest[propName];
    that.addTree(notebookTagsTreeNode);
  });
}

NotebookTagsForestViewBuilder.prototype.addTree = function(notebookTagsTree) {
  let that = this;

  let htmls = that.htmls;
  let views = that.views;

  let treeView = new NotebookTagsTreeNodeView(notebookTagsTree);
  treeView.buildAsHtmlLiElement();

  views[views.length] = treeView;
  htmls[htmls.length] = treeView.html();
};

NotebookTagsForestViewBuilder.prototype.getHtmlElements = function() {
  return this.htmls;
};

NotebookTagsForestViewBuilder.prototype.getNotebookTagsForestViews = function() {
  return this.views;
};

