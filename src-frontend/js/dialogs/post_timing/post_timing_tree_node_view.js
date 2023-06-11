const { TimingsCategoryNodeViewState } = require('../../timings/categories/node_view_state.js');

const { withChildren, withClass } = require('../../html_utils.js');

export function PostTimingTreeNodeView(processNode, parentNodeView, rootNodeView, isToUncollapseAllInitially) {
  let that = this;
  that.processNode = processNode;
  that.parentNodeView = parentNodeView;
  that.rootNodeView = rootNodeView;
  that.name = processNode.name;
  that.isCollapsed = true;
  that.isToUncollapseAllInitially = isToUncollapseAllInitially;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.children = processNode.children.map(childNode => new PostTimingTreeNodeView(childNode, that, rootNodeView, isToUncollapseAllInitially));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.hasMergedChildren = false;
  that.isMergedChild = false;
  that.hasManuallyHiddenChildren = false;
  that.isTemporaryRoot = false;
  that.htmlParentToReturnTo = undefined;
  that.indexToReturnTo = undefined;
  that.htmlChildrenContainerUl = document.createElement('ul');
}

PostTimingTreeNodeView.prototype.getRoot = function() {
  let that = this;
  if (that.rootNodeView !== undefined) {
    return that.rootNodeView;
  } else {
    return that;
  }
};

PostTimingTreeNodeView.prototype.findSubtreeByViewState = function(viewState) {
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

PostTimingTreeNodeView.prototype.sortChildrenByFirstTiming = function(processNode) {
  let that = this;
  that.children.sort((a, b) => {
    let ta = a.processNode.getFirstTiming();
    let tb = b.processNode.getFirstTiming();
    if (ta === undefined || tb === undefined) {
      return 0;
    }
    return ta.fromdate.getTime() - tb.fromdate.getTime();
  });
};

PostTimingTreeNodeView.prototype.sortChildrenByLastTiming = function(processNode) {
  let that = this;
  that.children.sort((a, b) => {
    let ta = a.processNode.getLastTimingToHighlight();
    let tb = b.processNode.getLastTimingToHighlight();
    if (ta === undefined || tb === undefined) {
      return 0;
    }
    return ta.fromdate.getTime() - tb.fromdate.getTime();
  });
};

PostTimingTreeNodeView.prototype.mergeWithNewTimings = function(processNode) {
  let that = this;
  that.processNode = processNode;
  let lengthBefore = that.children.length;
  processNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = new PostTimingTreeNodeView(childNode, that, that.rootNodeView, that.isToUncollapseAllInitially);
      newChildView.buildAsHtmlLiElement();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
    } else {
      oldChild.mergeWithNewTimings(childNode);
    }
  });
  if (lengthBefore > 0) {
    that.sortChildrenByLastTiming();
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
  }
  that.processNode.deleteStashedValues();
};

PostTimingTreeNodeView.prototype.removeFromTree = function() {
  let that = this;
  that.processNode.removeFromTree();
  if (that.parentNodeView !== undefined) {
    let childIndex = that.parentNodeView.children.indexOf(that);
    if (childIndex >= 0) {
      that.parentNodeView.children.splice(childIndex, 1);
    }
    delete that.parentNodeView.childrenByName[that.name];
  }
  if (that.htmlElement !== undefined) {
    let parent = that.htmlElement.parentNode;
    let htmlChildIndex = Array.prototype.indexOf.call(parent.children, that.htmlElement);
    if (htmlChildIndex >= 0) {
      parent.removeChild(that.htmlElement);
    }
  }
};

PostTimingTreeNodeView.prototype.appendHtmlChildWithInput = function() {
  let that = this;
  if (that.children.length === 0) {
    if (that.htmlElement === undefined) {
      return;
    }
    let parent = that.htmlElement.parentNode;
    if (parent === undefined) {
      return;
    }
    let htmlChildIndex = Array.prototype.indexOf.call(parent.children, that.htmlElement);
    if (htmlChildIndex < 0) {
      return;
    }
    parent.removeChild(that.htmlElement);
    delete that.htmlElement;

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
          that.createTitleDiv()
        ),
        (function() {
          if (!that.isToUncollapseAllInitially && that.processNode.isInnermostCategory && that.children.length > 0) {
            return that.htmlChildrenContainerUl;
          } else {
            return withChildren(that.htmlChildrenContainerUl,
              ...that.children.map(childNode => childNode.htmlElement)
            )
          }
        })()
      );

    that.htmlElement = htmlElement;

    that.uncollapseWithoutNotifyingChildren();

    if (htmlChildIndex === parent.children.length) {
      parent.appendChild(that.htmlElement);
    } else {
      parent.insertBefore(that.htmlElement, parent.children[htmlChildIndex]);
    }
  }

  let inputElem = document.createElement('input');
  let htmlElem = withChildren(document.createElement('li'), inputElem);
  that.htmlChildrenContainerUl.appendChild(htmlElem);
  inputElem.addEventListener('change', (eve) => {
    let value = inputElem.value;
    if (value === '') {
      return;
    }
    that.htmlChildrenContainerUl.removeChild(htmlElem);
    that.processNode.ensureChildWithName(value);
    that.mergeWithNewTimings(that.processNode);
    my.viewBuilder.treeView.enableKeyboardListener();
    window.webkit.messageHandlers.post_timing_dialog_msgs__enable_shortcuts.postMessage();
  });
  inputElem.focus();
  my.viewBuilder.treeView.disableKeyboardListener();
  window.webkit.messageHandlers.post_timing_dialog_msgs__disable_shortcuts.postMessage();
};

PostTimingTreeNodeView.prototype.copyValueToClipboard = function() {
  let that = this;
  window.webkit.messageHandlers.post_timing_dialog_msgs__write_to_clipboard.postMessage(that.name);
};

PostTimingTreeNodeView.prototype.wrapInRectangle = function() {
  let that = this;
  that.htmlElement && that.htmlElement.classList.add('in-rectangle');
};

PostTimingTreeNodeView.prototype.removeRectangleWrapper = function() {
  let that = this;
  that.htmlElement && that.htmlElement.classList.remove('in-rectangle');
};

PostTimingTreeNodeView.prototype.findPreviousSibling = function() {
  let that = this;
  if (that.parentNodeView === undefined) {
    return undefined;
  }
  let parentChildren = that.parentNodeView.children;
  let idx = parentChildren.indexOf(that);
  if (idx <= 0) {
    return undefined;
  }
  return parentChildren[idx - 1];
};

PostTimingTreeNodeView.prototype.findNextSibling = function() {
  let that = this;
  if (that.parentNodeView === undefined) {
    return undefined;
  }
  let parentChildren = that.parentNodeView.children;
  let idx = parentChildren.indexOf(that);
  if (idx < 0 || idx === parentChildren.length - 1) {
    return undefined;
  }
  return parentChildren[idx + 1];
};

PostTimingTreeNodeView.prototype.highlightTree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED;
  that.htmlElement && that.htmlElement.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

PostTimingTreeNodeView.prototype.highlightSubtree = function() {
  let that = this;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.htmlElement && that.htmlElement.classList.remove('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.highlightSubtree();
  }
};

PostTimingTreeNodeView.prototype.unhighlightTree = function() {
  let that = this;
  that.isUnhighlighted = true;
  that.viewState = TimingsCategoryNodeViewState.UNHIGHLIGHTED;
  that.htmlElement && that.htmlElement.classList.add('unhighlighted-node');
  for (let subcategory of that.children) {
    subcategory.unhighlightTree();
  }
};

PostTimingTreeNodeView.prototype.name2html = function() {
  let that = this;
  let a = document.createElement('a');
  a.onclick = function() {
    let viewState = that.viewState;
    if (viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
      that.getRoot().unhighlightTree();
      that.highlightTree();
      if (that.processNode.hasReferencesToOutsideTimings &&
          !that.isTemporaryRoot) {
        that.processNode.borrowReferences();
      }

      console.log("a.onclick. categoryFullName: " + categoryFullName);

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED) {

      that.getRoot().highlightTree();
      if (that.processNode.hasReferencesToOutsideTimings &&
          !that.isTemporaryRoot) {
        that.processNode.unborrowReferences();
      }

    } else if (viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
      that.getRoot().unhighlightTree();
      that.highlightTree();
      if (that.processNode.hasReferencesToOutsideTimings &&
          !that.isTemporaryRoot) {
        that.processNode.borrowReferences();
      }
    } else {
      window.webkit.messageHandlers.timings_summary_msgs.postMessage(
        "TimingsCategoryNodeView.onclick. unexpected viewState (expected a member of TimingsCategoryNodeViewState enum): " + viewState);
    }
  };
  if (that.name.includes("\n")) {
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
    //let timingsCount = that.timingsCategoryNode.timingsCountRecursive;
    return withChildren(a,
            // document.createTextNode(that.name + " (" + timingsCount + ")")
            document.createTextNode(that.name)
          );
  }
}

PostTimingTreeNodeView.prototype._initMouseEnterListener = function(a) {
  let that = this;
  a.onmouseenter = function(eve) {
    function unhighlight() {
      console.log("TimingsCategoryNodeView.onmouseenter unhighlight");

      if (that.viewState === TimingsCategoryNodeViewState.UNHIGHLIGHTED) {
        // do nothing
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED) {
        // do nothing
      } else if (that.viewState === TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD) {
        // do nothing
      } else {
        window.webkit.messageHandlers.timings_summary_msgs.postMessage(
          "TimingsCategoryNodeView.onmousemove. unexpected viewState (expected a member of TimingsCategoryNodeViewState enum): " + that.viewState);
      }
      a.removeEventListener('mouseleave', unhighlight);
    }
    a.addEventListener('mouseleave', unhighlight)
  };
};

PostTimingTreeNodeView.prototype.moveToTop = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.insertBefore(that.html(), parent.children[0]);
}

PostTimingTreeNodeView.prototype.moveToBottom = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.appendChild(that.html());
}

PostTimingTreeNodeView.prototype.hideThisItem = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  if (that.parentNodeView !== undefined) {
    that.parentNodeView.html().classList.add('has-hidden-children');
    that.parentNodeView.hasManuallyHiddenChildren = true;
  }
};

PostTimingTreeNodeView.prototype.hideSiblingsBelow = function() {
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
      if (that.parentNodeView !== undefined) {
        that.parentNodeView.html().classList.add('has-hidden-children');
        that.parentNodeView.hasManuallyHiddenChildren = true;
      }
    }
  }
}

PostTimingTreeNodeView.prototype.unhideHiddenChildren = function() {
  let that = this;
  that.children.forEach(childNode => childNode.unhide());
  let parent = that.html().parentNode;
  that.html().classList.remove('has-hidden-children');
  that.hasManuallyHiddenChildren = false;
}

PostTimingTreeNodeView.prototype.showThisProcessOnly = function() {
  let that = this;
  that.rootNodeView.showThisProcessOnly(that);
}

PostTimingTreeNodeView.prototype.html = function() {
  let that = this;
  if (that.htmlElement !== undefined) {
    return that.htmlElement;
  }
  that.buildAsHtmlLiElement();
  return that.htmlElement;
};

PostTimingTreeNodeView.prototype.createTitleDiv = function() {
  let that = this;
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
  that._initMouseEnterListener(titleDiv);
  return titleDiv;
}

PostTimingTreeNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;

  if (that.children.length == 0) {
    let htmlElement = withClass(withChildren(document.createElement('li'), that.createTitleDiv()), 'proc-node', 'proc-leaf');
    // if (that.processNode.isProcessInfo) {
    //   htmlElement = withClass(htmlElement, 'process-info');
    // }
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
    that.sortChildrenByLastTiming();
    that.htmlChildrenContainerUl.innerHTML = "";
    withChildren(that.htmlChildrenContainerUl, ...that.children.map(ch => ch.htmlElement));
    if (!that.isToUncollapseAllInitially && that.processNode.isInnermostCategory && that.children.length > 0) {
      that.collapse();
    }
  } else {
    that.children.forEach(childNode => childNode.buildAsHtmlLiElement());
    that.sortChildrenByLastTiming();
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
          that.createTitleDiv()
        ),
        (function() {
          if (!that.isToUncollapseAllInitially && that.processNode.isInnermostCategory && that.children.length > 0) {
            return that.htmlChildrenContainerUl;
          } else {
            return withChildren(that.htmlChildrenContainerUl,
              ...that.children.map(childNode => childNode.htmlElement)
            )
          }
        })()
      );
    // if (that.processNode.isProcessInfo) {
    //   htmlElement = withClass(htmlElement, 'process-info');
    // }
    if (that.hasMergedChildren) {
      htmlElement = withClass(htmlElement, 'merged-children');
    }
    that.htmlElement = htmlElement;
    if (that.isToUncollapseAllInitially || (!that.processNode.isInnermostCategory && that.children.length > 0)) {
      that.uncollapseWithoutNotifyingChildren();
    }
  }
};

PostTimingTreeNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

PostTimingTreeNodeView.prototype.toggleCollapse = function() {
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

PostTimingTreeNodeView.prototype.collapse = function() {
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

PostTimingTreeNodeView.prototype.uncollapse = function() {
  let that = this;
  that.uncollapseWithoutNotifyingChildren();
  that.children.forEach(childView => childView.parentUncollapsed());
};

PostTimingTreeNodeView.prototype.uncollapseWithoutNotifyingChildren = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.htmlElement && that.htmlElement.classList.contains("proc-node-closed")) {
    that.htmlElement.classList.remove("proc-node-closed");
    that.htmlElement.classList.add("proc-node-open");
  }
};

PostTimingTreeNodeView.prototype._appendHtmlChildren = function() {
  let that = this;
  withChildren(that.htmlChildrenContainerUl,
    ...that.children.map(childNode => childNode.html())
  )
};

PostTimingTreeNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
  if (that.parentNodeView && !that.parentNodeView.hasManuallyHiddenChildren) {
    that.hasManuallyHiddenChildren = false;
    that.html().classList.remove('has-hidden-children');
  }
};

PostTimingTreeNodeView.prototype.hide = function() {
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

PostTimingTreeNodeView.prototype.unhide = function() {
  let that = this;

  function maintainParentState() {
    let htmlChildrenLen = that.parentNodeView.htmlChildrenContainerUl.children.length;
    let childrenLen = that.parentNodeView.children.length;
    if (childrenLen === htmlChildrenLen) {
      that.parentNodeView.html().classList.remove('has-hidden-children');
      that.parentNodeView.hasManuallyHiddenChildren = false;
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

PostTimingTreeNodeView.prototype.parentIsHighlighted = function() {
  let that = this;
  that.unhide();
  if (!that.isCollapsed) {
    that.collapse();
  }
};

