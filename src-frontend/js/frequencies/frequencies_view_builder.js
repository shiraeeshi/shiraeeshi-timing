const { FrequenciesView } = require('./frequencies_view.js');
const { withChildren } = require('../html_utils.js');

export function FrequenciesViewBuilder() {
  this.subtreesByName = {};
  this.html = null;
  this.views = [];
  this.viewsByName = {};
}

FrequenciesViewBuilder.prototype.buildViews = function(timingsBySubcategoriesTree) {
  console.log("FrequenciesViewBuilder.prototype.buildViews. name: " + timingsBySubcategoriesTree.name);
  let that = this;
  let views = that.views;
  let oldChild = that.viewsByName[timingsBySubcategoriesTree.name];
  if (oldChild !== undefined) {
    console.log("FrequenciesViewBuilder.prototype.buildViews. about to invoke oldChild.mergeWithNewTimings()");
    oldChild.mergeWithNewTimings(timingsBySubcategoriesTree);
    oldChild.hGraphic.refreshRanges();
    oldChild.hGraphic.redraw();
  } else {
    console.log("FrequenciesViewBuilder.prototype.buildViews. oldChild is undefined.");
    that.subtreesByName[timingsBySubcategoriesTree.name] = timingsBySubcategoriesTree;
    let treeView = new FrequenciesView(timingsBySubcategoriesTree);
    views.push(treeView);
    treeView.buildHtml();
    treeView.hGraphic.refreshRanges();
    treeView.hGraphic.redraw();
    that.html = treeView.htmlElement;
    that.viewsByName[timingsBySubcategoriesTree.name] = treeView;
  }
};

FrequenciesViewBuilder.prototype.getResultHtml = function() {
  return this.html;
};

FrequenciesViewBuilder.prototype.showView = function() {
  let that = this;
  let wrapper = document.getElementById("main-content-wrapper");
  wrapper.innerHTML = "";
  wrapper.appendChild(that.getResultHtml());
}
