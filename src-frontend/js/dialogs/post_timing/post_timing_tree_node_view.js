const { TimingsCategoryNodeViewState } = require('../../timings/categories/node_view_state.js');

const { withChildren, withClass } = require('../../html_utils.js');

export function PostTimingTreeNodeView(processNode, parentNodeView, rootNodeView, isRightSideTreeNode) {
  let that = this;
  that.processNode = processNode;
  processNode.nodeView = that;
  that.parentNodeView = parentNodeView;
  that.rootNodeView = rootNodeView;
  that.name = processNode.name;
  that.isCollapsed = true;
  that.isRightSideTreeNode = isRightSideTreeNode;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.children = processNode.children.map(childNode => new PostTimingTreeNodeView(childNode, that, rootNodeView, isRightSideTreeNode));
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
  // that.hasCopyOnTheRightSide = undefined;
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

PostTimingTreeNodeView.prototype.refreshOrderOfChildrenOnScreen = function() {
  let that = this;
  that.refreshOrderOfChildren();
  that.htmlChildrenContainerUl.innerHTML = "";
  withChildren(that.htmlChildrenContainerUl, ...that.children.map(ch => ch.html()));
}

PostTimingTreeNodeView.prototype.refreshOrderOfChildren = function() {
  let that = this;
  that.children = that.processNode.children.map(ch => ch.nodeView);
}

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
  that.processNode.children.sort((a, b) => {
    let ta = a.getLastTimingToHighlight();
    let tb = b.getLastTimingToHighlight();
    if (ta === undefined) {
      if (tb === undefined) {
        return 0;
      }
      return -1;
    }
    if (tb === undefined) {
      return 1;
    }
    return ta.fromdate.getTime() - tb.fromdate.getTime();
  });
  that.refreshOrderOfChildren();
};

PostTimingTreeNodeView.prototype.mergeWithNewTimings = function(processNode) {
  let that = this;

  that._mergeWithNewTimings(processNode);

  that.processNode.deleteStashedValues();
  // that.handleVisibilityOfCheckboxIsProcess();
};

PostTimingTreeNodeView.prototype._mergeWithNewTimings = function(processNode) {
  let that = this;
  that.processNode = processNode;
  let lengthBefore = that.children.length;
  processNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = new PostTimingTreeNodeView(childNode, that, that.rootNodeView, that.isRightSideTreeNode);
      newChildView._buildAsHtmlLiElement();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
    } else {
      oldChild._mergeWithNewTimings(childNode);
    }
  });
  if (lengthBefore > 0) {
    if (!that.isRightSideTreeNode) {
      that.sortChildrenByLastTiming();
    } else {
      that.children = that.processNode.children.map(ch => ch.nodeView);
    }
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
      that._buildAsHtmlLiElement();
      return;
    }
    let htmlChildIndex = Array.prototype.indexOf.call(parent.children, that.htmlElement);
    if (htmlChildIndex < 0) {
      return;
    }
    parent.removeChild(that.htmlElement);
    delete that.htmlElement;
    that._buildAsHtmlLiElement();
    if (htmlChildIndex === parent.children.length) {
      parent.appendChild(that.htmlElement);
    } else {
      parent.insertBefore(that.htmlElement, parent.children[htmlChildIndex]);
    }
  }
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
  that._removeHtmlElementFromTree();
  // if (that.parentNodeView !== undefined) {
  //   that.parentNodeView.handleVisibilityOfCheckboxIsProcess();
  // }
};

PostTimingTreeNodeView.prototype._removeHtmlElementFromTree = function() {
  let that = this;
  if (that.htmlElement === undefined) {
    return;
  }
  let parent = that.htmlElement.parentNode;
  let htmlChildIndex = Array.prototype.indexOf.call(parent.children, that.htmlElement);
  if (htmlChildIndex >= 0) {
    try {
      parent.removeChild(that.htmlElement);
    } catch (err) {
      console.log(`error while removing html child: ${err.message}`);
    }
  }
};

// PostTimingTreeNodeView.prototype.handleVisibilityOfCheckboxIsProcess = function() {
//   let that = this;
//   if (that.processNode.hasSiblings()) {
//     that._hideCheckboxIsProcessRecursively();
//     return;
//   }
//   if (!that.processNode.isCoveredByFilepath) {
//     that._hideCheckboxIsProcess();
//   } else if (my.selectedCategoryPath !== undefined &&
//              isPrefixOrEquals(that.processNode.getPath(), my.selectedCategoryPath)) {
//     that._hideCheckboxIsProcess();
//   } else {
//     that._showCheckboxIsProcess();
//   }
//   that.children.forEach(ch => ch.handleVisibilityOfCheckboxIsProcess());
// };

PostTimingTreeNodeView.prototype._hideCheckboxIsProcess = function() {
  let that = this;
  that.htmlElement && that.htmlElement.classList.add('no-checkbox-is-process');
};

// PostTimingTreeNodeView.prototype._hideCheckboxIsProcessRecursively = function() {
//   let that = this;
//   that._hideCheckboxIsProcess();
//   that.children.forEach(ch => ch._hideCheckboxIsProcessRecursively());
// };

PostTimingTreeNodeView.prototype._showCheckboxIsProcess = function() {
  let that = this;
  that.htmlElement && that.htmlElement.classList.remove('no-checkbox-is-process');
};

PostTimingTreeNodeView.prototype.addHtmlSiblingWithInput = function(changeHandler) {
  let that = this;
  if (that.parentNodeView === undefined) {
    return;
  }
  let idx = that.parentNodeView.children.indexOf(that);
  that.parentNodeView._insertHtmlChildWithInputAtIndex(idx + 1, changeHandler);
};

PostTimingTreeNodeView.prototype.appendHtmlChildWithInput = function(changeHandler) {
  let that = this;
  let idx = that.children.length;
  that._insertHtmlChildWithInputAtIndex(idx, changeHandler);
};

PostTimingTreeNodeView.prototype._insertHtmlChildWithInputAtIndex = function(index, changeHandler) {
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
    let hadHiddenCheckboxIsProcess = that.htmlElement && that.htmlElement.classList.contains('no-checkbox-is-process');

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
        // (function() {
        //   if (!that.isRightSideTreeNode && that.processNode.isInnermostCategory && that.children.length > 0) {
        //     return that.htmlChildrenContainerUl;
        //   } else {
        //     return withChildren(that.htmlChildrenContainerUl,
        //       ...that.children.map(childNode => childNode.htmlElement)
        //     )
        //   }
        // })()
        that.htmlChildrenContainerUl
      );

    if (hadHiddenCheckboxIsProcess) {
      htmlElement.classList.add('no-checkbox-is-process');
    }

    that.htmlElement = htmlElement;

    that.uncollapseWithoutNotifyingChildren();

    if (htmlChildIndex === parent.children.length) {
      parent.appendChild(that.htmlElement);
    } else {
      parent.insertBefore(that.htmlElement, parent.children[htmlChildIndex]);
    }
  }

  let inputElem = document.createElement('textarea');
  inputElem.setAttribute('rows', 1);
  let htmlElem = withChildren(document.createElement('li'), inputElem);
  if (index < that.htmlChildrenContainerUl.children.length) {
    that.htmlChildrenContainerUl.insertBefore(htmlElem, that.htmlChildrenContainerUl.children[index]);
  } else {
    that.htmlChildrenContainerUl.appendChild(htmlElem);
  }
  inputElem.addEventListener('change', (eve) => {
    let value = inputElem.value;
    if (value === '') {
      return;
    }
    that.htmlChildrenContainerUl.removeChild(htmlElem);
    let newProcessNode = that.processNode.ensureChildWithName(value);
    that.processNode.children.splice(index, 0, newProcessNode);
    that.processNode.children.pop();
    that.mergeWithNewTimings(that.processNode);
    changeHandler(newProcessNode);
    my.viewBuilder.treeView.enableKeyboardListener();
    window.webkit.messageHandlers.post_timing_dialog_msgs__enable_shortcuts.postMessage();
  });
  inputElem.addEventListener('keypress', (eve) => {
    if (eve.key === 'Enter') {
      eve.preventDefault();
    }
  });
  inputElem.addEventListener('keyup', (eve) => {
    if (eve.key === 'Enter') {
      eve.preventDefault();
      eve.stopPropagation();
      let event = new Event('change');
      inputElem.dispatchEvent(event);
    }
  });
  inputElem.focus();
  my.viewBuilder.treeView.disableKeyboardListener();
  window.webkit.messageHandlers.post_timing_dialog_msgs__disable_shortcuts.postMessage();
};

PostTimingTreeNodeView.prototype.edit = function(changeHandler) {
  let that = this;
  if (that.htmlElement === undefined) {
    return;
  }
  let titleContainer = that.htmlElement.querySelector('.process-node-title-container');
  titleContainer.innerHTML = '';
  let inputElem = document.createElement('textarea');
  inputElem.value = that.name;
  let linesCount = that.name.split('\n').length;
  let minRowsCount = 5;
  let maxRowsCount = 10;
  let rowsCount = Math.max(minRowsCount, Math.min(linesCount, maxRowsCount));
  inputElem.setAttribute('rows', rowsCount);
  titleContainer.appendChild(inputElem);
  inputElem.addEventListener('change', (eve) => {
    let value = inputElem.value;
    if (value === '') {
      return;
    }
    let processNodeParent = that.processNode.parent;
    let newProcessNode = processNodeParent.ensureChildWithName(value);
    newProcessNode.children = that.processNode.children;
    newProcessNode.childrenByName = that.processNode.childrenByName;
    let index = processNodeParent.children.indexOf(that.processNode);
    if (value === that.name) {
      that._removeHtmlElementFromTree();
      that.buildAsHtmlLiElement();
    } else {
      that.removeFromTree();
      processNodeParent.children.splice(index, 0, newProcessNode);
      processNodeParent.children.pop();
    }
    that.parentNodeView.mergeWithNewTimings(processNodeParent);
    changeHandler(newProcessNode.nodeView);
    my.viewBuilder.treeView.enableKeyboardListener();
    window.webkit.messageHandlers.post_timing_dialog_msgs__enable_shortcuts.postMessage();
  });
  inputElem.addEventListener('keypress', (eve) => {
    if (eve.key === 'Enter') {
      eve.preventDefault();
    }
  });
  inputElem.addEventListener('keyup', (eve) => {
    if (eve.key === 'Escape') {
      eve.preventDefault();
      eve.stopPropagation();
      inputElem.value = that.name;
      let event = new Event('change');
      inputElem.dispatchEvent(event);
    }
    if (eve.key === 'Enter') {
      eve.preventDefault();
      eve.stopPropagation();
      let event = new Event('change');
      inputElem.dispatchEvent(event);
    }
  });
  inputElem.focus();
  my.viewBuilder.treeView.disableKeyboardListener();
  window.webkit.messageHandlers.post_timing_dialog_msgs__disable_shortcuts.postMessage();
};

PostTimingTreeNodeView.prototype.deleteFromTheRightSide = function() {
  let that = this;
  my.viewBuilder.treeView.deleteNodeFromTheRightSide(that);
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

  let nodeViewIndex = that.parentNodeView.children.indexOf(that);
  if (nodeViewIndex >= 0) {
    that.parentNodeView.children.splice(nodeViewIndex, 1);
    that.parentNodeView.children.splice(0, 0, that);
  }

  let parentProcessNode = that.processNode.parent;
  let index = parentProcessNode.children.indexOf(that.processNode);
  if (index < 0) {
    return;
  }
  parentProcessNode.children.splice(index, 1);
  parentProcessNode.children.splice(0, 0, that.processNode);
}

PostTimingTreeNodeView.prototype.moveToBottom = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.appendChild(that.html());

  let nodeViewIndex = that.parentNodeView.children.indexOf(that);
  if (nodeViewIndex >= 0) {
    that.parentNodeView.children.splice(nodeViewIndex, 1);
    that.parentNodeView.children.push(that);
  }

  let parentProcessNode = that.processNode.parent;
  let index = parentProcessNode.children.indexOf(that.processNode);
  if (index < 0) {
    return;
  }
  parentProcessNode.children.splice(index, 1);
  parentProcessNode.children.push(that.processNode);
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
  // that.children.forEach(childNode => childNode.unhide());
  that.refreshOrderOfChildrenOnScreen();
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
  that._buildAsHtmlLiElement();
  return that.htmlElement;
};

PostTimingTreeNodeView.prototype.checkIsProcessCheckbox = function() {
  let that = this;
  if (that.htmlElement === undefined) {
    return;
  }
  let checkboxIsProcess = that.htmlElement.querySelector('input.checkbox-is-process');
  if (checkboxIsProcess === undefined) {
    return;
  }
  checkboxIsProcess.checked = true;

  let event = new Event('change');
  checkboxIsProcess.dispatchEvent(event);
};

PostTimingTreeNodeView.prototype.copyToTheRightSide = function() {
  let that = this;
  my.viewBuilder.treeView.copyNodeToTheRightSide(that);
};

PostTimingTreeNodeView.prototype.deleteCorrespondingNodeFromTheRightSide = function() {
  let that = this;
  my.viewBuilder.treeView.deleteCorrespondingNodeFromTheRightSide(that);
};

PostTimingTreeNodeView.prototype._createIconsList = function() {
  let that = this;
  let iconCopyToTheRightSide =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-copy-to-the-right-side'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('copy this node to the right side')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        that.copyToTheRightSide();
      });
      return elem;
    })();
  let iconDeleteCorrespondingNodeFromTheRightSide =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-delete-corresponding-node-from-the-right-side'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('delete this node from the right side')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        my.viewBuilder.treeView.deleteCorrespondingNodeFromTheRightSide(that);
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
  let iconEdit =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-edit'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('rename this node')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        my.viewBuilder.treeView.editRightSideNode(that);
      });
      return elem;
    })();
  let iconDeleteFromTheRightSide =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-delete-from-the-right-side'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('delete this node')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        that.deleteFromTheRightSide();
      });
      return elem;
    })();
  let iconAppendChildWithInput =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-append-child-with-input'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('append child to this node')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        my.viewBuilder.treeView.appendChildWithInputToTheRightSideNode(that);
      });
      return elem;
    })();
  let iconAddSiblingWithInput =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'process-node-icon', 'icon-add-sibling-with-input'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('add sibling node')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        my.viewBuilder.treeView.addSiblingWithInputToTheRightSideNode(that);
      });
      return elem;
    })();
  let icons = [];
  function addIconIfConfigAllows(icon, configName) {
    if (my.config.post_timing_dialog[configName]) {
      icons.push(icon);
    }
  }
  if (that.isRightSideTreeNode) {
    addIconIfConfigAllows(iconMoveToTop, 'icon-right-side-node-move-to-top');
    addIconIfConfigAllows(iconMoveToBottom, 'icon-right-side-node-move-to-bottom');
    addIconIfConfigAllows(iconEdit, 'icon-right-side-node-edit');
    addIconIfConfigAllows(iconAddSiblingWithInput, 'icon-right-side-node-add-sibling');
    addIconIfConfigAllows(iconAppendChildWithInput, 'icon-right-side-node-append-child');
    addIconIfConfigAllows(iconDeleteFromTheRightSide, 'icon-right-side-node-delete');
  } else {
    addIconIfConfigAllows(iconMoveToTop, 'icon-left-side-node-move-to-top');
    addIconIfConfigAllows(iconMoveToBottom, 'icon-left-side-node-move-to-bottom');
    addIconIfConfigAllows(iconHide, 'icon-left-side-node-hide');
    addIconIfConfigAllows(iconHideSiblingsBelow, 'icon-left-side-node-hide-siblings-below');
    addIconIfConfigAllows(iconUnhideHiddenChildren, 'icon-left-side-node-unhide-hidden-children');
    addIconIfConfigAllows(iconCopyToTheRightSide, 'icon-left-side-node-copy-to-the-right-side');
    addIconIfConfigAllows(iconDeleteCorrespondingNodeFromTheRightSide, 'icon-left-side-node-delete-corresponding-node-from-the-right-side');
  }
  return icons;
};

PostTimingTreeNodeView.prototype.createTitleDiv = function() {
  let that = this;
  let nameHtml = that.name2html();
  if (that.isRightSideTreeNode) {
    let checkboxIsProcess = document.createElement('input');
    checkboxIsProcess.type = 'checkbox';
    checkboxIsProcess.classList.add('checkbox-is-process');
    if (my.selectedAsInnermostCategoryProcessNode === that.processNode) {
      checkboxIsProcess.checked = true;
      my.selectedAsInnermostCategoryCheckbox = checkboxIsProcess;
    }
    checkboxIsProcess.addEventListener('change', (eve) => {
      if (checkboxIsProcess.checked) {
        my.selectedAsInnermostCategoryProcessNode = that.processNode;
        if (my.selectedAsInnermostCategoryCheckbox &&
            my.selectedAsInnermostCategoryCheckbox !== checkboxIsProcess) {
          my.selectedAsInnermostCategoryCheckbox.checked = false;
        }
        my.selectedAsInnermostCategoryCheckbox = checkboxIsProcess;
        my.viewBuilder.treeView.showPossibleFilepaths();
      } else {
        if (my.selectedAsInnermostCategoryProcessNode === that.processNode) {
          delete my.selectedAsInnermostCategoryProcessNode;
          delete my.selectedAsInnermostCategoryCheckbox;
          my.viewBuilder.treeView.showPossibleFilepaths();
        }
      }
    });
    nameHtml = withChildren(document.createElement('div'),
      checkboxIsProcess,
      nameHtml
    );
  }
  let icons = that._createIconsList();
  let iconsDiv = withChildren(withClass(document.createElement('div'), 'process-node-icons'),
    ...icons
  );
  let titleDiv = withChildren(withClass(document.createElement('div'), 'process-node-title-container'),
    nameHtml,
    iconsDiv
  );
  that._initMouseEnterListener(titleDiv);
  that._addContextMenuListener(nameHtml);
  return titleDiv;
}

PostTimingTreeNodeView.prototype._addContextMenuListener = function(htmlElem) {
  let that = this;
  htmlElem.addEventListener('contextmenu', (eve) => {
    eve.preventDefault();
    my.contextMenuHandler = function(commandName) {
      if (commandName === 'right-side-node-edit') {
        my.viewBuilder.treeView.editRightSideNode(that);
      } else if (commandName === 'right-side-node-add-sibling-with-input') {
        my.viewBuilder.treeView.addSiblingWithInputToTheRightSideNode(that);
      } else if (commandName === 'right-side-node-append-child-with-input') {
        my.viewBuilder.treeView.appendChildWithInputToTheRightSideNode(that);
      } else if (commandName === 'right-side-node-delete') {
        that.deleteFromTheRightSide();
      } else if (commandName === 'right-side-node-move-to-top') {
        that.moveToTop();
      } else if (commandName === 'right-side-node-move-to-bottom') {
        that.moveToBottom();
      } else if (commandName === 'left-side-node-move-to-top') {
        that.moveToTop();
      } else if (commandName === 'left-side-node-move-to-bottom') {
        that.moveToBottom();
      } else if (commandName === 'left-side-node-hide') {
        that.hideThisItem();
      } else if (commandName === 'left-side-node-hide-siblings-below') {
        that.hideSiblingsBelow();
      } else if (commandName === 'left-side-node-unhide-hidden-children') {
        that.unhideHiddenChildren();
      } else if (commandName === 'left-side-node-copy-to-the-right-side') {
        that.copyToTheRightSide();
      } else if (commandName === 'left-side-node-delete-corresponding-node-from-the-right-side') {
        my.viewBuilder.treeView.deleteCorrespondingNodeFromTheRightSide(that);
      }
    }
    window.webkit.messageHandlers.post_timing_dialog_msgs__show_context_menu.postMessage({
      isRightSideTreeNode: that.isRightSideTreeNode,
      hasCopyOnTheRightSide: !!that.hasCopyOnTheRightSide,
      hasHiddenChildren: that.html().classList.contains('has-hidden-children'),
    });
    return false;
  });
}

PostTimingTreeNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;
  that._buildAsHtmlLiElement();
  // if (that.isRightSideTreeNode) {
  //   that.handleVisibilityOfCheckboxIsProcess();
  // }
}

PostTimingTreeNodeView.prototype._buildAsHtmlLiElement = function() {
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
        childNode._buildAsHtmlLiElement();
      }
    }
    that.sortChildrenByLastTiming();
    that.htmlChildrenContainerUl.innerHTML = "";
    withChildren(that.htmlChildrenContainerUl, ...that.children.map(ch => ch.htmlElement));
    if (!that.isRightSideTreeNode && that.processNode.isInnermostCategory && that.children.length > 0) {
      that.collapse();
    }
  } else {
    that.children.forEach(childNode => childNode._buildAsHtmlLiElement());
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
          if (!that.isRightSideTreeNode && that.processNode.isInnermostCategory && that.children.length > 0) {
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
    if (that.isRightSideTreeNode || (!that.processNode.isInnermostCategory && that.children.length > 0)) {
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

