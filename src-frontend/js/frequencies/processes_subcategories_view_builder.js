const { ProcessCategoryNodeView } = require('./process_category_node_view.js');
const { withChildren } = require('../html_utils.js');

export function ProcessesSubcategoriesViewBuilder() {
  this.subtreesByName = {};
  this.htmls = [];
  this.views = [];
  this.viewsByName = {};
  this.htmlChildrenContainerUl = document.createElement('ul');
}

ProcessesSubcategoriesViewBuilder.prototype.buildViews = function(timingsBySubcategoriesTree) {
  let that = this;
  that.addSubtree(timingsBySubcategoriesTree);
  for (let subtree of timingsBySubcategoriesTree.children) {
    that.addSubtree(subtree);
  }
};

ProcessesSubcategoriesViewBuilder.prototype.addSubtree = function(timingsBySubcategoriesSubtree) {
  console.log("ProcessesSubcategoriesViewBuilder.prototype.addSubtree. name: " + timingsBySubcategoriesSubtree.name);
  let that = this;
  let htmls = that.htmls;
  let views = that.views;
  let oldChild = that.viewsByName[timingsBySubcategoriesSubtree.name];
  if (oldChild !== undefined) {
    console.log("ProcessesSubcategoriesViewBuilder.prototype.addSubtree. about to invoke oldChild.mergeWithNewTimings()");
    oldChild.mergeWithNewTimings(timingsBySubcategoriesSubtree);
    oldChild.hGraphic.redraw();
  } else {
    console.log("ProcessesSubcategoriesViewBuilder.prototype.addSubtree. oldChild is undefined.");
    that.subtreesByName[timingsBySubcategoriesSubtree.name] = timingsBySubcategoriesSubtree;
    let treeView = new ProcessCategoryNodeView(timingsBySubcategoriesSubtree);
    views.push(treeView);
    treeView.buildAsHtmlLiElement();
    treeView.hGraphic.redraw();
    htmls.push(treeView.html);
    that.viewsByName[timingsBySubcategoriesSubtree.name] = treeView;

    that.htmlChildrenContainerUl.appendChild(treeView.html);
  }
};

ProcessesSubcategoriesViewBuilder.prototype.getResultHtml = function() {
  let that = this;
  return withChildren(that.htmlChildrenContainerUl,
    ...that.htmls
  );
};

ProcessesSubcategoriesViewBuilder.prototype.getHtmlElements = function() {
  return this.htmls;
};

ProcessesSubcategoriesViewBuilder.prototype.getProcessesForestViews = function() {
  return this.views;
};

