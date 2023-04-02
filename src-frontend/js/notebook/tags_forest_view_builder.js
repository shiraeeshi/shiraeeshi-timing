const { NotebookTagsTreeNodeView } = require('./tags_node_view.js');

export function NotebookTagsForestViewBuilder() {
  let that = this;
  that.html = null;
  that.view = null;
}

NotebookTagsForestViewBuilder.prototype.buildView = function(notebookTagsObj) {
  let that = this;

  let treeView = new NotebookTagsTreeNodeView(notebookTagsObj);

  treeView.buildAsHtmlLiElement();
  treeView.html().classList.add('root-node');
  treeView.toggleCollapse();

  that.view = treeView;
  that.html = treeView.html();
};

NotebookTagsForestViewBuilder.prototype.getHtml = function() {
  return this.html;
};

NotebookTagsForestViewBuilder.prototype.getNotebookTagsForestViews = function() {
  return [this.view];
};

