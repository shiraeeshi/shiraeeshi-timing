const { FrequenciesView } = require('./frequencies_view.js');
const { withChildren } = require('../html_utils.js');

export function FrequenciesViewBuilder() {
  this.subtreesByName = {};
  this.htmls = [];
  this.views = [];
  this.viewsByName = {};
  this.htmlChildrenContainerUl = document.createElement('ul');
}

FrequenciesViewBuilder.prototype.buildViews = function(timingsBySubcategoriesTree) {
  let that = this;
  that.addSubtree(timingsBySubcategoriesTree);
  for (let subtree of timingsBySubcategoriesTree.children) {
    that.addSubtree(subtree);
  }
};

FrequenciesViewBuilder.prototype.addSubtree = function(timingsBySubcategoriesSubtree) {
  console.log("FrequenciesViewBuilder.prototype.addSubtree. name: " + timingsBySubcategoriesSubtree.name);
  let that = this;
  let htmls = that.htmls;
  let views = that.views;
  let oldChild = that.viewsByName[timingsBySubcategoriesSubtree.name];
  if (oldChild !== undefined) {
    console.log("FrequenciesViewBuilder.prototype.addSubtree. about to invoke oldChild.mergeWithNewTimings()");
    oldChild.mergeWithNewTimings(timingsBySubcategoriesSubtree);
    oldChild.hGraphic.redraw();
  } else {
    console.log("FrequenciesViewBuilder.prototype.addSubtree. oldChild is undefined.");
    that.subtreesByName[timingsBySubcategoriesSubtree.name] = timingsBySubcategoriesSubtree;
    let treeView = new FrequenciesView(timingsBySubcategoriesSubtree);
    views.push(treeView);
    treeView.buildAsHtmlLiElement();
    treeView.hGraphic.redraw();
    htmls.push(treeView.html);
    that.viewsByName[timingsBySubcategoriesSubtree.name] = treeView;

    that.htmlChildrenContainerUl.appendChild(treeView.html);
  }
};

FrequenciesViewBuilder.prototype.getResultHtml = function() {
  let that = this;
  return withChildren(that.htmlChildrenContainerUl,
    ...that.htmls
  );
};

FrequenciesViewBuilder.prototype.getHtmlElements = function() {
  return this.htmls;
};

FrequenciesViewBuilder.prototype.getProcessesForestViews = function() {
  return this.views;
};

