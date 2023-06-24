const { NotebookTagsTreeNodeView, NotebookTagsTreeNodeViewOfBottomPanel } = require('./tags_node_view.js');

export function NotebookTagsForestViewBuilder(isTopPanel) {
  let that = this;
  that.html = null;
  that.view = null;
  that.isTopPanel = isTopPanel;
}

NotebookTagsForestViewBuilder.prototype.buildView = function(notebookTagsObj) {
  let that = this;

  let treeView;
  if (that.isTopPanel) {
    treeView = new NotebookTagsTreeNodeView(notebookTagsObj);
  } else {
    treeView = new NotebookTagsTreeNodeViewOfBottomPanel(notebookTagsObj);
  }

  treeView.buildAsHtmlLiElement();
  treeView.html().classList.add('root-node');
  treeView.toggleCollapse();

  that.view = treeView;
  that.html = treeView.html();
};

NotebookTagsForestViewBuilder.prototype.getHtml = function() {
  return this.html;
};

NotebookTagsForestViewBuilder.prototype.getRootNodeViewOfTags = function() {
  return this.view;
};

