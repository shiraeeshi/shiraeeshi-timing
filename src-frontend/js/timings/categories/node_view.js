const { TimingsCategoryNodeViewState } = require('./node_view_state.js');
const { withChildren, withClass } = require('../../html_utils.js');
const { displayTimingsAsImage } = require('../display.js');

export function TimingsCategoryNodeView(timingsCategoryNode) {
  let that = this;
  that.timingsCategoryNode = timingsCategoryNode;
  that.name = timingsCategoryNode.name;
  that.isCollapsed = false;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.children = timingsCategoryNode.subcategories.map(childNode => new TimingsCategoryNodeView(childNode));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.timingTextViews = [];
}

TimingsCategoryNodeView.prototype.subcategoryView = function(subCategoryName) {
  let that = this;
  let hasSubcategory = Object.hasOwnProperty.call(that.childrenByName, subCategoryName);
  if (!hasSubcategory) {
    throw Error("TimingsCategoryNodeView.subcategoryView: no child found with name: " + subCategoryName);
  }
  return that.childrenByName[subCategoryName];
}

TimingsCategoryNodeView.prototype.appendTimingTextView = function(timingTextView) {
  this.timingTextViews[this.timingTextViews.length] = timingTextView;
}

TimingsCategoryNodeView.prototype.getTimingTextViewsRecursively = function(timingTextView) {
  let that = this;
  let result = that.timingTextViews;
  for (let subcategory of that.children) {
    result = result.concat(subcategory.getTimingTextViewsRecursively());
  }
  return result;
}

TimingsCategoryNodeView.prototype.isHighlighted = function() {
  return !this.isUnhighlighted;
};

TimingsCategoryNodeView.prototype.highlightTree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED;
  that.html.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

TimingsCategoryNodeView.prototype.highlightSubtree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.html.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

TimingsCategoryNodeView.prototype.unhighlightTree = function() {
  let that = this;
  that.isUnhighlighted = true;
  that.viewState = TimingsCategoryNodeViewState.UNHIGHLIGHTED;
  that.html.classList.add('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.unhighlightTree();
  }
};

TimingsCategoryNodeView.prototype.name2html = function() {
  let that = this;
  let a = document.createElement('a');
  a.onclick = function() {
    let viewState = that.viewState;
    if (viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
      window.my.timingsCategoryNodeViewRoot.unhighlightTree();
      that.highlightTree();
      let categoryFullName = that.timingsCategoryNode.fullName();
      window.my.highlightedCategory = categoryFullName;
      displayTimingsAsImage(window.my.currentFilteredTimings, categoryFullName);

      console.log("a.onclick. categoryFullName: " + categoryFullName);

      let trs = document.getElementsByClassName("timing-row-parent-li");
      for (let i=0; i < trs.length; i++) {
        trs[i].classList.add('greyed-out');
        trs[i].classList.remove('extra-unhighlighted');
      }
      let timingTextViews = that.getTimingTextViewsRecursively();
      for (let i=0; i < timingTextViews.length; i++) {
        timingTextViews[i].classList.remove('greyed-out');
        timingTextViews[i].classList.remove('extra-unhighlighted');
      }
      function unhighlight() {
        // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was UNHIGHLIGHTED)");
        if (window.my.highlightedCategory !== undefined
          && window.my.highlightedCategory.length > 0
          && !that.isHighlighted()) {
          a.removeEventListener('mouseleave', unhighlight);
          return;
        }
        displayTimingsAsImage(window.my.currentFilteredTimings, window.my.highlightedCategory);
        a.removeEventListener('mouseleave', unhighlight);
      }
      a.addEventListener('mouseleave', unhighlight)

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED) {

      that.viewState = TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED;
      let trs = document.getElementsByClassName("timing-row-parent-li");
      for (let i=0; i < trs.length; i++) {
        trs[i].classList.add('extra-unhighlighted');
      }
      let timingTextViews = that.getTimingTextViewsRecursively();
      console.log("a.onlick. timingTextViews.length: " + timingTextViews.length);
      for (let i=0; i < timingTextViews.length; i++) {
        timingTextViews[i].classList.remove('greyed-out');
        timingTextViews[i].classList.remove('extra-unhighlighted');
      }

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
      window.my.timingsCategoryNodeViewRoot.unhighlightTree();
      that.highlightTree();
      let categoryFullName = that.timingsCategoryNode.fullName();
      window.my.highlightedCategory = categoryFullName;
      displayTimingsAsImage(window.my.currentFilteredTimings, categoryFullName);

      console.log("a.onclick. categoryFullName: " + categoryFullName);

      let trs = document.querySelectorAll(".timing-row-parent-li:not(.greyed-out)");
      for (let i=0; i < trs.length; i++) {
        trs[i].classList.add('greyed-out');
      }
      let timingTextViews = that.getTimingTextViewsRecursively();
      for (let i=0; i < timingTextViews.length; i++) {
        timingTextViews[i].classList.remove('greyed-out');
      }
      function unhighlight() {
        // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was HIGHLIGHTED_AS_CHILD)");
        if (window.my.highlightedCategory !== undefined
          && window.my.highlightedCategory.length > 0
          && !that.isHighlighted()) {
          a.removeEventListener('mouseleave', unhighlight);
          return;
        }
        // window.my.highlightedCategory = [];
        displayTimingsAsImage(window.my.currentFilteredTimings, window.my.highlightedCategory);
        for (let i=0; i < trs.length; i++) {
          trs[i].classList.remove('greyed-out');
        }
        a.removeEventListener('mouseleave', unhighlight);
      }
      a.addEventListener('mouseleave', unhighlight)
    } else if (viewState === TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED) {
      window.my.timingsCategoryNodeViewRoot.highlightTree();
      window.my.highlightedCategory = [];
      let categoryFullName = that.timingsCategoryNode.fullName();
      displayTimingsAsImage(window.my.currentFilteredTimings, categoryFullName);

      let allTimingTextViews = window.my.timingsCategoryNodeViewRoot.getTimingTextViewsRecursively();
      for (let i=0; i < allTimingTextViews.length; i++) {
        allTimingTextViews[i].classList.add('greyed-out');
        allTimingTextViews[i].classList.remove('extra-unhighlighted');
      }
      let timingTextViews = that.getTimingTextViewsRecursively();
      for (let i=0; i < timingTextViews.length; i++) {
        timingTextViews[i].classList.remove('greyed-out');
      }
      function unhighlight() {
        // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was EXTRA_HIGHLIGHTED)");
        if (window.my.highlightedCategory !== undefined
          && window.my.highlightedCategory.length > 0
          && !that.isHighlighted()) {
          a.removeEventListener('mouseleave', unhighlight);
          return;
        }
        // window.my.highlightedCategory = [];
        displayTimingsAsImage(window.my.currentFilteredTimings, window.my.highlightedCategory);
        for (let i=0; i < allTimingTextViews.length; i++) {
          allTimingTextViews[i].classList.remove('greyed-out')
        }
        a.removeEventListener('mouseleave', unhighlight);
      }
      a.addEventListener('mouseleave', unhighlight)
    } else {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "TimingsCategoryNodeView.onclick. unexpected viewState (expected a member of TimingsCategoryNodeViewState enum): " + viewState);
    }
  };
  a.onmouseenter = function(eve) {
    if (window.my.highlightedCategory !== undefined
       && window.my.highlightedCategory.length > 0
       && !that.isHighlighted()) {
      return;
    }
    let categoryFullName = that.timingsCategoryNode.fullName();
    // window.my.highlightedCategory = categoryFullName;
    displayTimingsAsImage(window.my.currentFilteredTimings, categoryFullName);

    console.log("a.onmouseenter. categoryFullName: " + categoryFullName);

    let trs = document.getElementsByClassName("timing-row-parent-li");
    let trsHighlighted = document.querySelectorAll(".timing-row-parent-li:not(.greyed-out)");
    for (let i=0; i < trs.length; i++) {
      trs[i].classList.add('greyed-out');
    }
    let timingTextViews = that.getTimingTextViewsRecursively();
    for (let i=0; i < timingTextViews.length; i++) {
      timingTextViews[i].classList.remove('greyed-out');
    }
    function unhighlight() {
      console.log("TimingsCategoryNodeView.onmouseenter unhighlight");

      let noCategoryIsHighlighted =
        window.my.highlightedCategory === undefined ||
        window.my.highlightedCategory.length === 0;

      if (noCategoryIsHighlighted) {
        displayTimingsAsImage(window.my.currentFilteredTimings, window.my.highlightedCategory);
        for (let i=0; i < trs.length; i++) {
          trs[i].classList.remove('greyed-out');
          trs[i].classList.remove('extra-unhighlighted');
        }
      } else if (that.viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
        for (let i=0; i < timingTextViews.length; i++) {
          timingTextViews[i].classList.add('greyed-out');
        }
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED ||
                 that.viewState === TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED) {
        // do nothing
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
        displayTimingsAsImage(window.my.currentFilteredTimings, window.my.highlightedCategory);
        for (let i=0; i < trsHighlighted.length; i++) {
          trsHighlighted[i].classList.remove('greyed-out');
        }
      } else {
        window.webkit.messageHandlers.timings_summary_msgs.postMessage(
          "TimingsCategoryNodeView.onmousemove. unexpected viewState (expected a member of TimingsCategoryNodeViewState enum): " + that.viewState);
      }
      a.removeEventListener('mouseleave', unhighlight);
    }
    a.addEventListener('mouseleave', unhighlight)
  };
  if (that.name.includes("\n")) {
    let timingsCount = that.timingsCategoryNode.timingsCountRecursive;
    return
      withChildren(a,
        withChildren(document.createElement('div'),
          ...that.name.split("\n")
                      .map(line => document.createTextNode(line))
                      .flatMap(el => [el,document.createElement("br")])
                      .slice(0, -1)
                      .concat(document.createTextNode(" (" + timingsCount + ")"))
        )
      );
  } else {
    let timingsCount = that.timingsCategoryNode.timingsCountRecursive;
    return withChildren(a,
            document.createTextNode(that.name + " (" + timingsCount + ")")
          );
  }
}

TimingsCategoryNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;
  if (that.children.length == 0) {
    let htmlElement = withClass(withChildren(document.createElement('li'), that.name2html()), 'proc-leaf');
    that.html = htmlElement;
    return;
  }

  that.children.forEach(childNode => childNode.buildAsHtmlLiElement());
  let htmlElement =
    withChildren(
      withChildren(withClass(document.createElement('li'), 'proc-node', 'proc-node-open'),
        (function() {
          let elem = document.createElement('span');
          elem.classList.add('proc-node-icon');
          elem.addEventListener('click', eve => {
            that.toggleCollapse();
          });
          return elem;
        })(),
        that.name2html()
      ),
      withChildren(document.createElement('ul'),
        ...that.children.map(childNode => childNode.html)
      )
    );
  that.html = htmlElement;
};

TimingsCategoryNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

TimingsCategoryNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    that.uncollapse();
  } else {
    that.collapse();
  }
};

TimingsCategoryNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (that.html.classList.contains("proc-node-open")) {
    that.html.classList.remove("proc-node-open");
    that.html.classList.add("proc-node-closed");
  }
};

TimingsCategoryNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html.classList.contains("proc-node-closed")) {
    that.html.classList.remove("proc-node-closed");
    that.html.classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
};

TimingsCategoryNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
};
