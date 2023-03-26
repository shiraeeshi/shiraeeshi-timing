const { TimingsCategoryNodeViewState } = require('../timings/categories/node_view_state.js');

const { setMillisUntilNextForProcessNode } = require('./millis_until_next.js');

const { withChildren, withClass } = require('../html_utils.js');

export function ProcessTreeNodeView(processNode, hGraphic, rootNodeView) {
  let that = this;
  that.processNode = processNode;
  that.hGraphic = hGraphic;
  that.rootNodeView = rootNodeView;
  that.name = processNode.name;
  that.isCollapsed = false;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.children = processNode.children.map(childNode => new ProcessTreeNodeView(childNode, hGraphic, rootNodeView));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.htmlChildrenContainerUl = document.createElement('ul');
}

ProcessTreeNodeView.prototype.getRoot = function() {
  let that = this;
  if (that.rootNodeView !== undefined) {
    return that.rootNodeView;
  } else {
    return that;
  }
};

ProcessTreeNodeView.prototype.findSubtreeByViewState = function(viewState) {
  let that = this;
  if (that.viewState === viewState) {
    return that;
  }
  for (let child of that.children) {
    let foundInChild = child.findSubtreeByViewState(viewState);
    if (foundInChild !== undefined) {
      return foundInChild;
    }
  }
  return undefined;
};

ProcessTreeNodeView.prototype.mergeWithNewTimings = function(processNode) {
  let that = this;
  that.processNode = processNode;
  processNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = new ProcessTreeNodeView(childNode, that.hGraphic);
      newChildView.buildAsHtmlLiElement();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
      that.htmlChildrenContainerUl.appendChild(newChildView.html);
    } else {
      oldChild.mergeWithNewTimings(childNode);
    }
  });
};

ProcessTreeNodeView.prototype.highlightTree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED;
  that.html.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

ProcessTreeNodeView.prototype.highlightSubtree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.html.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

ProcessTreeNodeView.prototype.unhighlightTree = function() {
  let that = this;
  that.isUnhighlighted = true;
  that.viewState = TimingsCategoryNodeViewState.UNHIGHLIGHTED;
  that.html.classList.add('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.unhighlightTree();
  }
};

ProcessTreeNodeView.prototype.name2html = function() {
  let that = this;
  let a = document.createElement('a');
  a.onclick = function() {
    let viewState = that.viewState;
    if (viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
      that.getRoot().unhighlightTree();
      that.highlightTree();
      // let categoryFullName = that.timingsCategoryNode.fullName();
      // my.highlightedCategory = categoryFullName;
      // displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);
      if (that.hGraphic) {
        that.hGraphic.highlightProcess(that.processNode);
      }

      console.log("a.onclick. categoryFullName: " + categoryFullName);

      // let trs = document.getElementsByClassName("timing-row-parent-li");
      // for (let i=0; i < trs.length; i++) {
      //   trs[i].classList.add('greyed-out');
      //   trs[i].classList.remove('extra-unhighlighted');
      // }
      // let timingTextViews = that.getTimingTextViewsRecursively();
      // for (let i=0; i < timingTextViews.length; i++) {
      //   timingTextViews[i].classList.remove('greyed-out');
      //   timingTextViews[i].classList.remove('extra-unhighlighted');
      // }

      // function unhighlight() {
      //   // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was UNHIGHLIGHTED)");
      //   if (my.highlightedCategory !== undefined
      //     && my.highlightedCategory.length > 0
      //     && !that.isHighlighted()) {
      //     a.removeEventListener('mouseleave', unhighlight);
      //     return;
      //   }
      //   // displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
      //   
      //   if (that.hGraphic) {
      //     that.hGraphic.redraw();
      //   }
      //   a.removeEventListener('mouseleave', unhighlight);
      // }
      // a.addEventListener('mouseleave', unhighlight)

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED) {

      that.viewState = TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED;
      if (that.hGraphic) {
        that.hGraphic.selectProcess(that.processNode);
      }
      // let trs = document.getElementsByClassName("timing-row-parent-li");
      // for (let i=0; i < trs.length; i++) {
      //   trs[i].classList.add('extra-unhighlighted');
      // }
      // let timingTextViews = that.getTimingTextViewsRecursively();
      // console.log("a.onlick. timingTextViews.length: " + timingTextViews.length);
      // for (let i=0; i < timingTextViews.length; i++) {
      //   timingTextViews[i].classList.remove('greyed-out');
      //   timingTextViews[i].classList.remove('extra-unhighlighted');
      // }

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
      that.getRoot().unhighlightTree();
      that.highlightTree();
      if (that.hGraphic) {
        that.hGraphic.highlightProcess(that.processNode);
      }
      // let categoryFullName = that.timingsCategoryNode.fullName();
      // my.highlightedCategory = categoryFullName;
      // displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

      // console.log("a.onclick. categoryFullName: " + categoryFullName);

      // let trs = document.querySelectorAll(".timing-row-parent-li:not(.greyed-out)");
      // for (let i=0; i < trs.length; i++) {
      //   trs[i].classList.add('greyed-out');
      // }
      // let timingTextViews = that.getTimingTextViewsRecursively();
      // for (let i=0; i < timingTextViews.length; i++) {
      //   timingTextViews[i].classList.remove('greyed-out');
      // }

      // function unhighlight() {
      //   // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was HIGHLIGHTED_AS_CHILD)");
      //   if (my.highlightedCategory !== undefined
      //     && my.highlightedCategory.length > 0
      //     && !that.isHighlighted()) {
      //     a.removeEventListener('mouseleave', unhighlight);
      //     return;
      //   }
      //   // // my.highlightedCategory = [];
      //   // displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
      //   if (that.hGraphic) {
      //     that.hGraphic.redraw();
      //   }
      //   // for (let i=0; i < trs.length; i++) {
      //   //   trs[i].classList.remove('greyed-out');
      //   // }
      //   a.removeEventListener('mouseleave', unhighlight);
      // }
      // a.addEventListener('mouseleave', unhighlight)
    } else if (viewState === TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED) {
      that.getRoot().highlightTree();
      if (that.hGraphic) {
        setMillisUntilNextForProcessNode(that.processNode);
        that.hGraphic.highlightProcess(that.processNode);
      }
      // my.highlightedCategory = [];
      // let categoryFullName = that.timingsCategoryNode.fullName();
      // displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

      // let allTimingTextViews = that.getRoot().getTimingTextViewsRecursively();
      // for (let i=0; i < allTimingTextViews.length; i++) {
      //   allTimingTextViews[i].classList.add('greyed-out');
      //   allTimingTextViews[i].classList.remove('extra-unhighlighted');
      // }
      // let timingTextViews = that.getTimingTextViewsRecursively();
      // for (let i=0; i < timingTextViews.length; i++) {
      //   timingTextViews[i].classList.remove('greyed-out');
      // }
      function unhighlight() {
        // console.log("TimingsCategoryNodeView.onclick unhighlight (set when viewState was EXTRA_HIGHLIGHTED)");
        // if (my.highlightedCategory !== undefined
        //   && my.highlightedCategory.length > 0
        //   && !that.isHighlighted()) {
        //   a.removeEventListener('mouseleave', unhighlight);
        //   return;
        // }
        // // my.highlightedCategory = [];
        // displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
        // for (let i=0; i < allTimingTextViews.length; i++) {
        //   allTimingTextViews[i].classList.remove('greyed-out')
        // }
        if (that.hGraphic) {
          delete that.hGraphic.highlightedProcessNode;
          that.hGraphic.redraw();
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
    if (that.hGraphic) {
      if (that.hGraphic.highlightedProcessNode !== undefined
         && that.viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
        return;
      }
      that.hGraphic.highlightProcess(that.processNode);
    }
    // if (my.highlightedCategory !== undefined
    //    && my.highlightedCategory.length > 0
    //    && !that.isHighlighted()) {
    //   return;
    // }
    // let categoryFullName = that.timingsCategoryNode.fullName();
    // // my.highlightedCategory = categoryFullName;
    // displayTimingsAsImage(my.currentFilteredTimings, categoryFullName);

    // console.log("a.onmouseenter. categoryFullName: " + categoryFullName);

    // let trs = document.getElementsByClassName("timing-row-parent-li");
    // let trsHighlighted = document.querySelectorAll(".timing-row-parent-li:not(.greyed-out)");
    // for (let i=0; i < trs.length; i++) {
    //   trs[i].classList.add('greyed-out');
    // }
    // let timingTextViews = that.getTimingTextViewsRecursively();
    // for (let i=0; i < timingTextViews.length; i++) {
    //   timingTextViews[i].classList.remove('greyed-out');
    // }
    function unhighlight() {
      console.log("TimingsCategoryNodeView.onmouseenter unhighlight");

      // let noCategoryIsHighlighted =
      //   my.highlightedCategory === undefined ||
      //   my.highlightedCategory.length === 0;

      // if (noCategoryIsHighlighted) {
      //   displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
      //   for (let i=0; i < trs.length; i++) {
      //     trs[i].classList.remove('greyed-out');
      //     trs[i].classList.remove('extra-unhighlighted');
      //   }
      // } else
      if (that.viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
        // for (let i=0; i < timingTextViews.length; i++) {
        //   timingTextViews[i].classList.add('greyed-out');
        // }
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED ||
                 that.viewState === TimingsCategoryNodeViewState.EXTRA_HIGHLIGHTED) {
        // do nothing
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
        if (that.hGraphic) {
          let highlightedViewNode = that.getRoot().findSubtreeByViewState(TimingsCategoryNodeViewState.HIGHLIGHTED);
          if (highlightedViewNode === undefined || highlightedViewNode === that.getRoot()) {
            delete that.hGraphic.highlightedProcessNode;
            that.hGraphic.redraw();
          } else {
            that.hGraphic.highlightProcess(highlightedViewNode.processNode);
          }
          // that.hGraphic.redraw();
        }
        // displayTimingsAsImage(my.currentFilteredTimings, my.highlightedCategory);
        // for (let i=0; i < trsHighlighted.length; i++) {
        //   trsHighlighted[i].classList.remove('greyed-out');
        // }
      } else {
        window.webkit.messageHandlers.timings_summary_msgs.postMessage(
          "TimingsCategoryNodeView.onmousemove. unexpected viewState (expected a member of TimingsCategoryNodeViewState enum): " + that.viewState);
      }
      a.removeEventListener('mouseleave', unhighlight);
    }
    a.addEventListener('mouseleave', unhighlight)
  };
  if (that.name.includes("\n")) {
    // let elem = withChildren(document.createElement('div'),
    //              ...that.name.split("\n")
    //                          .map(line => document.createTextNode(line))
    //                          .flatMap(el => [el,document.createElement("br")])
    //                          .slice(0, -1)
    //            );
    // elem.onclick = clickHandler;
    // elem.onmouseover = hoverHandler;
    // return elem;

    // let timingsCount = that.timingsCategoryNode.timingsCountRecursive;
    return
      withChildren(a,
        withChildren(document.createElement('div'),
          ...that.name.split("\n")
                      .map(line => document.createTextNode(line))
                      .flatMap(el => [el,document.createElement("br")])
                      .slice(0, -1)
                      //.concat(document.createTextNode(" (" + timingsCount + ")"))
        )
      );
  } else {
    // let elem = withChildren(document.createElement('span'),
    //              document.createTextNode(that.name)
    //            );
    // elem.onclick = clickHandler;
    // elem.onmouseover = hoverHandler;
    // return elem;

    //let timingsCount = that.timingsCategoryNode.timingsCountRecursive;
    return withChildren(a,
            // document.createTextNode(that.name + " (" + timingsCount + ")")
            document.createTextNode(that.name)
          );
  }
}

ProcessTreeNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;
  if (that.children.length == 0) {
    let htmlElement = withClass(withChildren(document.createElement('li'), that.name2html()), 'proc-leaf');
    that.html = htmlElement;
    return;
  }

  if (that.html !== undefined) {
    for (let childNode of that.children) {
      if (childNode.html !== undefined) {
        continue;
      } else {
        childNode.buildAsHtmlLiElement();
        that.htmlChildrenContainerUl.appendChild(childNode.html);
      }
    }
  } else {
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
        withChildren(that.htmlChildrenContainerUl,
          ...that.children.map(childNode => childNode.html)
        )
      );
    that.html = htmlElement;
  }
};

ProcessTreeNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

ProcessTreeNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    that.uncollapse();
  } else {
    that.collapse();
  }
};

ProcessTreeNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (that.html.classList.contains("proc-node-open")) {
    that.html.classList.remove("proc-node-open");
    that.html.classList.add("proc-node-closed");
  }
};

ProcessTreeNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html.classList.contains("proc-node-closed")) {
    that.html.classList.remove("proc-node-closed");
    that.html.classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
};

ProcessTreeNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
};

ProcessTreeNodeView.prototype.hide = function() {
  let that = this;
  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  }
  that.html.style.display = 'none';
  that.children.forEach(childView => childView.hide());
};

ProcessTreeNodeView.prototype.unhide = function() {
  let that = this;

  if (that.html.style.display != 'none') {
    that.oldDisplay = that.html.style.display;
  } else {
    that.html.style.display = that.oldDisplay;
  }
  that.children.forEach(childView => childView.unhide());
};

// ProcessTreeNodeView.prototype.highlightTree = function(nodeToHighlight) {
//   let that = this;
// 
//   if (that.html.style.display != 'none') {
//     that.oldDisplay = that.html.style.display;
//   } else {
//     that.html.style.display = that.oldDisplay;
//   }
// 
//   if (nodeToHighlight.children.length == 0) {
//     if (!that.isLeaf()) {
//       if (!that.isCollapsed) {
//         that.collapse();
//       }
//       that.children.forEach(childView => childView.parentIsHighlighted());
//     }
//   } else {
//     if (!that.isLeaf()) {
//       if (that.isCollapsed) {
//         that.uncollapse();
//       }
//       nodeToHighlight.children.forEach(childNodeToHighlight => {
//         if (that.childrenByName.hasOwnProperty(childNodeToHighlight.name)) {
//           that.childrenByName[childNodeToHighlight.name].highlightTree(childNodeToHighlight);
//         }
//       });
//     }
//   }
// };

ProcessTreeNodeView.prototype.parentIsHighlighted = function() {
  let that = this;
  that.unhide();
  if (!that.isCollapsed) {
    that.collapse();
  }
};

