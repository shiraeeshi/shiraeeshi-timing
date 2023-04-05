const { TimingsCategoryNodeViewState } = require('../timings/categories/node_view_state.js');

const { setMillisUntilNextForProcessNode, setMillisUntilNextForEachTimingInMergedProcess } = require('./millis_until_next.js');

const { withChildren, withClass } = require('../html_utils.js');

export function ProcessTreeNodeView(processNode, hGraphic, parentNodeView, rootNodeView) {
  let that = this;
  that.processNode = processNode;
  that.parentNodeView = parentNodeView;
  that.hGraphic = hGraphic;
  that.rootNodeView = rootNodeView;
  that.name = processNode.name;
  that.isCollapsed = true;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.children = processNode.children.map(childNode => new ProcessTreeNodeView(childNode, hGraphic, that, rootNodeView));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.hasMergedChildren = false;
  that.isMergedChild = false;
  that.hasManuallyHiddenChildren = false;
  that.htmlParentToReturnTo = undefined;
  that.indexToReturnTo = undefined;
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

ProcessTreeNodeView.prototype.getFirstTiming = function() {
  let that = this;
  let processNode = that.processNode;
  if (processNode.hasMergedChildren && processNode.firstTimingOfMergedProcess !== undefined) {
    return processNode.firstTimingOfMergedProcess;
  }
  function minTiming(a, b) {
    if (a === undefined) {
      return b;
    } else if (b === undefined) {
      return a;
    } else {
      if (a.fromdate.getTime() < b.fromdate.getTime()) {
        return a;
      } else {
        return b;
      }
    }
  }
  let firstFromChildren = that.children.map(ch => ch.getFirstTiming()).reduce(minTiming, undefined);
  if (processNode.timings.length > 0) {
    return minTiming(firstFromChildren, processNode.timings[0]);
  } else if (processNode.referencedTimings && processNode.referencedTimings.length > 0) {
    return minTiming(firstFromChildren, processNode.referencedTimings[0]);
  } else {
    return firstFromChildren;
  }
}

ProcessTreeNodeView.prototype.sortChildrenByFirstTiming = function(processNode) {
  let that = this;
  that.children.sort((a, b) => {
    let ta = a.getFirstTiming();
    let tb = b.getFirstTiming();
    if (ta === undefined || tb === undefined) {
      return 0;
    }
    return ta.fromdate.getTime() - tb.fromdate.getTime();
  });
};

ProcessTreeNodeView.prototype.mergeWithNewTimings = function(processNode) {
  let that = this;
  that.processNode = processNode;
  let lengthBefore = that.children.length;
  processNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = new ProcessTreeNodeView(childNode, that.hGraphic, that, that.rootNodeView);
      newChildView.buildAsHtmlLiElement();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
    } else {
      oldChild.mergeWithNewTimings(childNode);
    }
  });
  if (lengthBefore > 0) {
    that.sortChildrenByFirstTiming();
    that.htmlChildrenContainerUl.innerHTML = "";
    withChildren(that.htmlChildrenContainerUl, ...that.children.map(ch => ch.html()));
  }
  let currentLength = that.children.length;
  if (lengthBefore === 0 && currentLength > 0) {
    if (that.htmlElement === undefined) {
      return;
    }
    let parent = that.htmlElement.parentNode;
    if (parent === undefined) {
      that.buildAsHtmlLiElement();
      return;
    }
    let htmlChildIndex = Array.prototype.indexOf.call(parent.children, that.htmlElement);
    if (htmlChildIndex < 0) {
      return;
    }
    parent.removeChild(that.htmlElement);
    delete that.htmlElement;
    that.buildAsHtmlLiElement();
    if (htmlChildIndex === parent.children.length) {
      parent.appendChild(that.htmlElement);
    } else {
      parent.insertBefore(that.htmlElement, parent.children[htmlChildIndex]);
    }
  } else {
    if (that.processNode.isInnermostCategory && that.children.length > 0) {
      that.mergeSubprocesses();
    }
  }
};

ProcessTreeNodeView.prototype.highlightTree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED;
  that.htmlElement && that.htmlElement.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

ProcessTreeNodeView.prototype.highlightSubtree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.htmlElement && that.htmlElement.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

ProcessTreeNodeView.prototype.unhighlightTree = function() {
  let that = this;
  that.isUnhighlighted = true;
  that.viewState = TimingsCategoryNodeViewState.UNHIGHLIGHTED;
  that.htmlElement && that.htmlElement.classList.add('unhighlighted-node');
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

      that.getRoot().highlightTree();
      if (that.hGraphic) {
        that.hGraphic.highlightProcess(that.processNode);
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
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED) {
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

ProcessTreeNodeView.prototype.moveToTop = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.insertBefore(that.html(), parent.children[0]);
}

ProcessTreeNodeView.prototype.moveToBottom = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.appendChild(that.html());
}

ProcessTreeNodeView.prototype.hideThisItem = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  that.parentNodeView && that.parentNodeView.html().classList.add('has-hidden-children');
  that.hasManuallyHiddenChildren = true;
};

ProcessTreeNodeView.prototype.hideSiblingsBelow = function() {
  let that = this;
  let parent = that.html().parentNode;
  let siblings = Array.from(parent.children);
  let idx = siblings.indexOf(that.html());
  if (idx >= 0) {
    for (let i = idx + 1; i < siblings.length; i++) {
      let sibling = siblings[i];
      parent.removeChild(sibling);
    }
    if (siblings.length > idx + 1) {
      that.parentNodeView && that.parentNodeView.html().classList.add('has-hidden-children');
      that.hasManuallyHiddenChildren = true;
    }
  }
}

ProcessTreeNodeView.prototype.unhideHiddenChildren = function() {
  let that = this;
  that.children.forEach(childNode => childNode.unhide());
  let parent = that.html().parentNode;
  that.html().classList.remove('has-hidden-children');
  that.hasManuallyHiddenChildren = false;
}

ProcessTreeNodeView.prototype.showThisProcessOnly = function() {
  let that = this;
  that.rootNodeView.showThisProcessOnly(that);
  // that.moveToTop();
  // that.hideSiblingsBelow();
  // let p = that.parentNodeView;
  // while (p !== undefined) {
  //   p.moveToTop();
  //   p.hideSiblingsBelow();
  //   p = p.parentNodeView;
  // }
  // if (that.hGraphic) {
  //   that.hGraphic.setProcessNode(that.processNode);
  //   that.hGraphic.redraw();
  // }
}

ProcessTreeNodeView.prototype.html = function() {
  let that = this;
  if (that.htmlElement !== undefined) {
    return that.htmlElement;
  }
  that.buildAsHtmlLiElement();
  return that.htmlElement;
};

ProcessTreeNodeView.prototype.mergeSubprocesses = function() {
  let that = this;
  setMillisUntilNextForEachTimingInMergedProcess(that.processNode);
  that.hasMergedChildren = true;
  that.processNode.hasMergedChildren = true;
  that.htmlElement && that.htmlElement.classList.add('merged-children');
  that.children.forEach(child => child.markAsMerged());
  if (that.hGraphic) {
    that.hGraphic.redraw();
  }
}

ProcessTreeNodeView.prototype.markAsMerged = function() {
  let that = this;
  that.isMergedChild = true;
  that.processNode.isMergedChild = true;
  that.htmlElement && that.htmlElement.classList.add('merged-child');
  that.children.forEach(child => child.markAsMerged());
}

ProcessTreeNodeView.prototype.markAsUnmerged = function() {
  let that = this;
  that.isMergedChild = false;
  that.processNode.isMergedChild = false;
  that.htmlElement && that.htmlElement.classList.remove('merged-child');
  that.children.forEach(child => child.markAsUnmerged());
}

ProcessTreeNodeView.prototype.unmergeSubprocesses = function() {
  let that = this;
  if (that.isMergedChild) {
    if (that.parentNodeView === undefined) {
      throw new Error(`ProcessTreeNodeView is marked as merged child, but its parent is undefined. name: ${that.name}`);
    }
    that.parentNodeView.unmergeSubprocesses();
  } else if (that.hasMergedChildren) {

    setMillisUntilNextForProcessNode(that.processNode);

    that.hasMergedChildren = false;

    that.htmlElement && that.htmlElement.classList.remove('merged-children');
    that.children.forEach(child => child.markAsUnmerged());

    if (that.hGraphic) {
      that.hGraphic.redraw();
    }
  }
}

ProcessTreeNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;

  function createTitleDiv() {
    let nameHtml = that.name2html();
    let iconShowThisOnly =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-show-this-process-only'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('show graph for this process only')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.showThisProcessOnly();
        });
        return elem;
      })();
    let iconMergeSubprocesses =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-merge-subprocesses'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('merge subprocesses in graph')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.mergeSubprocesses();
        });
        return elem;
      })();
    let iconUnmergeSubprocesses =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-unmerge-subprocesses'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('unmerge subprocesses in graph')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.unmergeSubprocesses();
        });
        return elem;
      })();
    let iconMoveToTop =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-move-to-top'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('move to the top of the list')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.moveToTop();
        });
        return elem;
      })();
    let iconMoveToBottom =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-move-to-bottom'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('move to the bottom of the list')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.moveToBottom();
        });
        return elem;
      })();
    let iconHide =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-hide'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('hide this item')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.hideThisItem();
        });
        return elem;
      })();
    let iconHideSiblingsBelow =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-hide-siblings-below'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('hide siblings that are below this item')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.hideSiblingsBelow();
        });
        return elem;
      })();
    let iconUnhideHiddenChildren =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-unhide-hidden-children'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('show hidden children')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.unhideHiddenChildren();
        });
        return elem;
      })();
    let iconsDiv = withChildren(withClass(document.createElement('div'), 'process-node-icons'),
      iconShowThisOnly,
      iconMergeSubprocesses,
      iconUnmergeSubprocesses,
      iconMoveToTop,
      iconMoveToBottom,
      iconHide,
      iconHideSiblingsBelow,
      iconUnhideHiddenChildren
    );
    let titleDiv = withChildren(withClass(document.createElement('div'), 'process-node-title-container'),
      nameHtml,
      iconsDiv
    );
    return titleDiv;
  }

  if (that.children.length == 0) {
    let htmlElement = withClass(withChildren(document.createElement('li'), createTitleDiv()), 'proc-node', 'proc-leaf');
    that.htmlElement = htmlElement;
    return;
  }

  if (that.htmlElement !== undefined) {
    for (let childNode of that.children) {
      if (childNode.htmlElement !== undefined) {
        continue;
      } else {
        childNode.buildAsHtmlLiElement();
      }
    }
    that.sortChildrenByFirstTiming();
    that.htmlChildrenContainerUl.innerHTML = "";
    withChildren(that.htmlChildrenContainerUl, ...that.children.map(ch => ch.htmlElement));
    if (that.processNode.isInnermostCategory && that.children.length > 0) {
      that.mergeSubprocesses();
      that.collapse();
    }
  } else {
    that.children.forEach(childNode => childNode.buildAsHtmlLiElement());
    that.sortChildrenByFirstTiming();
    let htmlElement =
      withChildren(
        withChildren(withClass(document.createElement('li'), 'proc-node', 'proc-node-closed'),
          (function() {
            let elem = document.createElement('span');
            elem.classList.add('proc-node-icon');
            elem.addEventListener('click', eve => {
              that.toggleCollapse();
            });
            return elem;
          })(),
          createTitleDiv()
        ),
        (function() {
          if (that.processNode.isInnermostCategory && that.children.length > 0) {
            that.mergeSubprocesses();
            return that.htmlChildrenContainerUl;
          } else {
            return withChildren(that.htmlChildrenContainerUl,
              ...that.children.map(childNode => childNode.htmlElement)
            )
          }
        })()
      );
    that.htmlElement = htmlElement;
    if (!that.processNode.isInnermostCategory && that.children.length > 0) {
      that.toggleCollapse();
    }
  }
};

ProcessTreeNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

ProcessTreeNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    if (!that.hasManuallyHiddenChildren) {
      that._appendHtmlChildren();
    }
    that.uncollapse();
  } else {
    that.collapse();
  }
};

ProcessTreeNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (!that.htmlElement) {
    return;
  }
  if (that.htmlElement.classList.contains("proc-node-open")) {
    that.htmlElement.classList.remove("proc-node-open");
    that.htmlElement.classList.add("proc-node-closed");
  }
};

ProcessTreeNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.htmlElement && that.htmlElement.classList.contains("proc-node-closed")) {
    that.htmlElement.classList.remove("proc-node-closed");
    that.htmlElement.classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
};

ProcessTreeNodeView.prototype._appendHtmlChildren = function() {
  let that = this;
  withChildren(that.htmlChildrenContainerUl,
    ...that.children.map(childNode => childNode.html())
  )
};

ProcessTreeNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
  if (that.parentNodeView && !that.parentNodeView.hasManuallyHiddenChildren) {
    that.hasManuallyHiddenChildren = false;
    that.html().classList.remove('has-hidden-children');
  }
};

ProcessTreeNodeView.prototype.hide = function() {
  let that = this;
  that.collapse();
  if (!that.htmlElement) {
    return;
  }
  let htmlParent = that.html().parentNode;
  if (htmlParent !== null) {
    htmlParent.removeChild(that.html());
  }
  for (let child of that.children) {
    child.hide();
  }
};

ProcessTreeNodeView.prototype.unhide = function() {
  let that = this;

  function maintainParentState() {
    let htmlChildrenLen = that.parentNodeView.htmlChildrenContainerUl.children.length;
    let childrenLen = that.parentNodeView.children.length;
    if (childrenLen === htmlChildrenLen) {
      that.parentNodeView.html().classList.remove('has-hidden-children');
      that.hasManuallyHiddenChildren = false;
    } else {
      that.parentNodeView.html().classList.add('has-hidden-children');
    }
  }

  let htmlParent = that.html().parentNode;
  if (htmlParent === null) {
    if (that.parentNodeView !== undefined) {
      that.parentNodeView.htmlChildrenContainerUl.appendChild(that.html());
      maintainParentState();
    }
    return;
  }
  let htmlContains = Array.prototype.indexOf.call(htmlParent.children, that.html());
  if (!htmlContains) {
    htmlParent.appendChild(that.html());
    if (that.parentNodeView !== undefined) {
      maintainParentState();
    }
  }

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

