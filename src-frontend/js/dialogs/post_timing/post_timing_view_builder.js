const { PostTimingView } = require('./post_timing_view.js');
const { withChildren } = require('../../html_utils.js');

export function PostTimingViewBuilder() {
  // this.html = null;
  this.treeView = null;
}

PostTimingViewBuilder.prototype.buildAndShowViews = function(timingsBySubcategoriesTree) {
  console.log("PostTimingViewBuilder.prototype.buildAndShowViews. name: " + timingsBySubcategoriesTree.name);
  let that = this;
  console.log("PostTimingViewBuilder.prototype.buildAndShowViews. oldChild is undefined.");
  if (that.treeView !== null) {
    that.treeView.mergeWithNewTimings(timingsBySubcategoriesTree);
  } else {
    let treeView = new PostTimingView(timingsBySubcategoriesTree);
    that.treeView = treeView;
    treeView.buildHtml();
    that.html = treeView.htmlElement;
  }
};

// PostTimingViewBuilder.prototype.getResultHtml = function() {
//   return this.html;
// };
// 
// PostTimingViewBuilder.prototype.showView = function() {
//   let that = this;
//   let wrapper = document.getElementById("post-timing-dialog-main-container");
//   wrapper.innerHTML = "";
//   wrapper.appendChild(that.getResultHtml());
// }

