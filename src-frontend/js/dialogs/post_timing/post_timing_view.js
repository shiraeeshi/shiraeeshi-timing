const { TimingsCategoryNodeViewState } = require('../../timings/categories/node_view_state.js');

const { PostTimingTreeNodeView } = require('./post_timing_tree_node_view.js');
const { ProcessNode } = require('../../common/process_node.js')
// const { TimingsHistogramsGraphic } = require('./timings_histograms_graphic.js');
const { requestTimingsForPeriod } = require('../../frequencies/request_timings_for_period.js');
const { buildProcessesTree } = require('../../common/processes_tree_builder.js');

const { showTimingsFormatError, withChildren, withClass, withId } = require('../../html_utils.js');
const { date2TimingDateStr } = require('../../date_utils.js');

export function PostTimingView(processNode) {
  let that = this;
  that.processNode = processNode;
  that.name = processNode.name;
  that.isCollapsed = false;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.currentPeriod = createCurrentPeriodInitial();
  that.htmlSpanPeriodInfo = getHtmlSpanPeriodInfo(that.currentPeriod);
  // that.hGraphic = new TimingsHistogramsGraphic(processNode);
  that.children = [new PostTimingTreeNodeView(processNode, undefined, that)];
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });

  that.rightSideChildren = [];
  that.rightSideChildrenByName = {};

  that.hasInitializedHtml = false;

  that.nodeInRectangle;
  that.rightSideNodeInRectangle;

  that.isCursorOnRightSide = false;

  that.htmlChildrenContainerUl = document.getElementById('left-side-processes-tree-container-ul');
  that.htmlSecondaryContainerDiv = document.createElement('div');
  that.htmlSecondaryUl = document.getElementById('right-side-processes-tree-container-ul');
  that.solelyDisplayedProcessViewNode = null;

  that.isKeyboardListenerDisabled = false;
}

for (let propName in PostTimingTreeNodeView.prototype) {
  PostTimingView.prototype[propName] = PostTimingTreeNodeView.prototype[propName];
}

PostTimingView.prototype.mergeWithNewTimings = function(processNode) {
  let that = this;
  that.processNode = processNode;
  let oldChild = that.childrenByName[processNode.name];
  if (oldChild === undefined) {
    let newChildView = new PostTimingTreeNodeView(processNode, undefined, that);
    newChildView.buildAsHtmlLiElement();
    newChildView.toggleCollapse();
    that.children.push(newChildView);
    that.childrenByName[processNode.name] = newChildView;
    that.htmlChildrenContainerUl.appendChild(newChildView.htmlElement);
  } else {
    oldChild.mergeWithNewTimings(processNode);
  }
};

PostTimingView.prototype.mergeRightSideWithNewTimings = function(branchToMerge) {
  let that = this;
  if (my.rightSideTimings === undefined) {
    my.rightSideTimings = branchToMerge;
    handleSelectedAsInnermostCategoryProcessNode();
  } else {
    that.mergeProcessBranchIntoRightSide(branchToMerge);
  }
  let oldChild = that.rightSideChildrenByName[branchToMerge.name];
  if (oldChild === undefined) {
    let newChildView = new PostTimingTreeNodeView(my.rightSideTimings, undefined, that, true);
    newChildView.buildAsHtmlLiElement();
    newChildView.htmlElement.classList.add('root-node');
    if (newChildView.isCollapsed) {
      newChildView.toggleCollapse();
    }
    that.rightSideChildren.push(newChildView);
    that.rightSideChildrenByName[branchToMerge.name] = newChildView;
    that.rightSideNodeInRectangle = newChildView;
    that.htmlSecondaryUl.appendChild(newChildView.htmlElement);
  } else {
    oldChild.mergeWithNewTimings(my.rightSideTimings);
  }
};


PostTimingView.prototype.mergeProcessBranchIntoRightSide = function(branchToMerge) {
  let that = this;
  let node = my.rightSideTimings;
  let leftSideNode = that.processNode;
  let nodeFromBranchToMerge = branchToMerge;
  while (nodeFromBranchToMerge.children.length > 0) {
    nodeFromBranchToMerge = nodeFromBranchToMerge.children[0];
    node = node.ensureChildCopyOf(nodeFromBranchToMerge);
    node.leftSideNode = nodeFromBranchToMerge.leftSideNode;
    node.parent.children.sort((a, b) => {
      let leftSideA = leftSideNode.childrenByName[a.name];
      let leftSideB = leftSideNode.childrenByName[b.name];
      let indexA = leftSideNode.children.indexOf(leftSideA)
      let indexB = leftSideNode.children.indexOf(leftSideB)
      return indexA - indexB;
    });
    leftSideNode = leftSideNode.childrenByName[nodeFromBranchToMerge.name];
  }
  handleSelectedAsInnermostCategoryProcessNode();
}


function handleSelectedAsInnermostCategoryProcessNode() {
  if (my.selectedAsInnermostCategoryProcessNode === undefined) {
    selectFirstInnermostCategoryIfExists();
    return;
  }
  if (!isSelectedAsInnermostCategoryProcessNodeReachable()) {
    delete my.selectedAsInnermostCategoryProcessNode;
    selectFirstInnermostCategoryIfExists();
  }
}

function isSelectedAsInnermostCategoryProcessNodeReachable() {
  let processNode = my.rightSideTimings;
  while (true) {
    if (processNode === my.selectedAsInnermostCategoryProcessNode) {
      return true;
    }
    if (processNode.children.length !== 1) {
      break;
    }
    processNode = processNode.children[0];
  }
  return false;
}

function selectFirstInnermostCategoryIfExists() {
  let processNode = my.rightSideTimings;
  while (true) {
    if (processNode.isInnermostCategory) {
      my.selectedAsInnermostCategoryProcessNode = processNode;
      if (processNode.nodeView) {
        processNode.nodeView.checkIsProcessCheckbox();
      }
      return;
    }
    if (processNode.children.length !== 1) {
      break;
    }
    processNode = processNode.children[0];
  }
}

function createCurrentPeriodInitial() {
  let dateTo = new Date();

  let dateFrom = new Date();

  let millisInWeek = 7*24*60*60*1000;
  dateFrom.setTime(dateFrom.getTime() - millisInWeek);

  return {
    from: dateFrom,
    to: dateTo
  };
}

function getHtmlSpanPeriodInfo(initialPeriod) {
  return withChildren(document.getElementById('period-info'),
    document.createTextNode(periodInfoText(initialPeriod))
  )
}

function periodInfoText(period) {
  let that = this;
  let fromDateStr = date2TimingDateStr(period.from)
  let toDateStr = date2TimingDateStr(period.to)
  let periodInfoText = "period: " + fromDateStr + " - " + toDateStr;
  return periodInfoText;
}

PostTimingView.prototype.buildHtml = function() {
  let that = this;

  that.children.forEach(childNode => childNode.buildAsHtmlLiElement());

  if (that.children.length === 1) {
    let childNode = that.children[0];
    childNode.htmlElement.classList.add('root-node');
  }
  if (that.children.length > 0) {
    let childNode = that.children[0];
    childNode.wrapInRectangle();
    that.nodeInRectangle = childNode;
  }

  that.addListenersToPeriodButtons();

  withChildren(that.htmlChildrenContainerUl,
    ...that.children.map(childNode => childNode.htmlElement)
  );

  addListenersToMainButtons();

  initVerticalResizer();
  initHorizontalResizer('upper-right-panel', 'bottom-right-panel', 'resizer-vertical-right');

};

function addListenersToMainButtons() {
  let btnSave = document.getElementById('btn-save');
  btnSave.addEventListener('click', save)
  let btnCancel = document.getElementById('btn-cancel');
  btnCancel.addEventListener('click', cancel)
}

PostTimingView.prototype.addListenersToPeriodButtons = function() {
  let that = this;
  let btnPlusHalfYear = document.getElementById('btn-plus-six-months');
  let btnPlusMonth = document.getElementById('btn-plus-month');
  let btnPlusWeek = document.getElementById('btn-plus-week');
  btnPlusHalfYear.onclick = function() {
    console.log('+6months');
    let oldPeriodFrom = that.currentPeriod.from;
    let newPeriodFrom = new Date();
    let millisInMonth = 6*30*24*60*60*1000;
    newPeriodFrom.setTime(oldPeriodFrom.getTime() - millisInMonth);
    that.currentPeriod.from = newPeriodFrom;
    that.htmlSpanPeriodInfo.innerHTML = periodInfoText(that.currentPeriod);
    requestTimingsForPeriod(newPeriodFrom, oldPeriodFrom).then(timings => {
      console.log('btnPlusHalfYear.onclick timings keys:');
      console.dir(Object.keys(timings));
      my.timings = buildProcessesTree(timings, my.timings);
      my.viewBuilder.buildAndShowViews(my.timings);
      // my.viewBuilder.showView();
    }).catch(err => {
      showTimingsFormatError("post-timing-dialog-main-container", err);
      console.log("btnPlusHalfYear.onclick err: " + err)
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
        "btnPlusHalfYear.onclick err: " + err);
    });
  };
  btnPlusMonth.onclick = function() {
    console.log('+month');
    let oldPeriodFrom = that.currentPeriod.from;
    let newPeriodFrom = new Date();
    let millisInMonth = 30*24*60*60*1000;
    newPeriodFrom.setTime(oldPeriodFrom.getTime() - millisInMonth);
    that.currentPeriod.from = newPeriodFrom;
    that.htmlSpanPeriodInfo.innerHTML = periodInfoText(that.currentPeriod);
    requestTimingsForPeriod(newPeriodFrom, oldPeriodFrom).then(timings => {
      console.log('btnPlusMonth.onclick timings keys:');
      console.dir(Object.keys(timings));
      my.timings = buildProcessesTree(timings, my.timings);
      my.viewBuilder.buildAndShowViews(my.timings);
      // my.viewBuilder.showView();
    }).catch(err => {
      showTimingsFormatError("post-timing-dialog-main-container", err);
      console.log("btnPlusMonth.onclick err: " + err)
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
        "btnPlusMonth.onclick err: " + err);
    });
  };
  btnPlusWeek.onclick = function() {
    console.log('+week');
    let oldPeriodFrom = that.currentPeriod.from;
    let newPeriodFrom = new Date();
    let millisInWeek = 7*24*60*60*1000;
    newPeriodFrom.setTime(oldPeriodFrom.getTime() - millisInWeek);
    that.currentPeriod.from = newPeriodFrom;
    that.htmlSpanPeriodInfo.innerHTML = periodInfoText(that.currentPeriod);
    requestTimingsForPeriod(newPeriodFrom, oldPeriodFrom).then(timings => {
      console.log('btnPlusWeek.onclick timings keys:');
      console.dir(Object.keys(timings));
      my.timings = buildProcessesTree(timings, my.timings);
      my.viewBuilder.buildAndShowViews(my.timings);
      // my.viewBuilder.showView();
    }).catch(err => {
      showTimingsFormatError("post-timing-dialog-main-container", err);
      console.log("btnPlusWeek.onclick err: " + err)
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
        "btnPlusWeek.onclick err: " + err);
    });
  };
};


function initVerticalResizer() {
  let leftHalf = document.getElementById('left-panel');
  let resizer = document.getElementById('resizer');
  let rightHalf = document.getElementById('right-panel');

  let resizerX = 0;
  let resizerY = 0;

  let leftHalfWidth = 0;

  resizer.addEventListener('mousedown', (eve) => {
    resizerX = eve.clientX;
    resizerY = eve.clientY;

    leftHalfWidth = leftHalf.getBoundingClientRect().width;

    document.documentElement.style.cursor = 'ew-resize';

    leftHalf.style.userSelect = 'none';
    leftHalf.style.pointerEvents = 'none';

    rightHalf.style.userSelect = 'none';
    rightHalf.style.pointerEvents = 'none';

    document.documentElement.addEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.addEventListener('mouseup', resizerMouseUpListener);
  });

  function resizerMouseMoveListener(eve) {
    const dx = eve.clientX - resizerX;
    const dy = eve.clientY - resizerY;

    const newLeftHalfWidth = ((leftHalfWidth + dx) * 100) / resizer.parentNode.getBoundingClientRect().width;

    leftHalf.style.width = `${newLeftHalfWidth}%`;
  }

  function resizerMouseUpListener(eve) {
    document.documentElement.style.removeProperty('cursor');

    leftHalf.style.removeProperty('user-select');
    leftHalf.style.removeProperty('pointer-events');

    rightHalf.style.removeProperty('user-select');
    rightHalf.style.removeProperty('pointer-events');

    document.documentElement.removeEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.removeEventListener('mouseup', resizerMouseUpListener);
  }
}

function initHorizontalResizer(topPanelId, bottomPanelId, resizerId) {
  let topPanel = document.getElementById(topPanelId);
  let resizer = document.getElementById(resizerId);
  let bottomPanel = document.getElementById(bottomPanelId);

  let resizerX = 0;
  let resizerY = 0;

  let topPanelHeight = 0;

  resizer.addEventListener('mousedown', (eve) => {
    resizerX = eve.clientX;
    resizerY = eve.clientY;

    topPanelHeight = topPanel.getBoundingClientRect().height;

    document.documentElement.style.cursor = 'ns-resize';

    topPanel.style.userSelect = 'none';
    topPanel.style.pointerEvents = 'none';

    bottomPanel.style.userSelect = 'none';
    bottomPanel.style.pointerEvents = 'none';

    document.documentElement.addEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.addEventListener('mouseup', resizerMouseUpListener);
  });

  function resizerMouseMoveListener(eve) {
    const dx = eve.clientX - resizerX;
    const dy = eve.clientY - resizerY;

    const newTopPanelHeight = ((topPanelHeight + dy) * 100) / resizer.parentNode.getBoundingClientRect().height;

    topPanel.style.height = `${newTopPanelHeight}%`;
  }

  function resizerMouseUpListener(eve) {
    document.documentElement.style.removeProperty('cursor');

    topPanel.style.removeProperty('user-select');
    topPanel.style.removeProperty('pointer-events');

    bottomPanel.style.removeProperty('user-select');
    bottomPanel.style.removeProperty('pointer-events');

    document.documentElement.removeEventListener('mousemove', resizerMouseMoveListener);
    document.documentElement.removeEventListener('mouseup', resizerMouseUpListener);
  }
}

PostTimingView.prototype.disableKeyboardListener = function(key) {
  let that = this;
  that.isKeyboardListenerDisabled = true;
}

PostTimingView.prototype.enableKeyboardListener = function(key) {
  let that = this;
  that.isKeyboardListenerDisabled = false;
}

PostTimingView.prototype.handleKeyUp = function(eve) {
  let that = this;

  if (that.isKeyboardListenerDisabled) {
    return;
  }

  let key = eve.key;

  let prefix = '';

  if (eve.shiftKey) {
    prefix = 'Shift+' + prefix;
  }

  if (eve.altKey) {
    prefix = 'Alt+' + prefix;
  }

  if (eve.ctrlKey) {
    prefix = 'Ctrl+' + prefix;
  }

  key = prefix + key;

  let action;

  // if (key === 'ArrowLeft') {
  //   action = 'go-to-parent-node';
  // } else if (key === 'ArrowRight') {
  //   action = 'go-to-child-node';
  // } else if (key === 'ArrowUp') {
  //   action = 'go-to-previous-sibling';
  // } else if (key === 'ArrowDown') {
  //   action = 'go-to-next-sibling';
  // } else if (key === ' ') {
  //   action = 'toggle-collapse-node';
  // } else if (key === 'l') {
  //   action = 'go-to-the-very-last-node';
  // } else if (key === '1') {
  //   action = 'switch-to-left-side';
  // } else if (key === '2') {
  //   action = 'switch-to-right-side';
  // } else if (key === 'Enter') {
  //   action = 'copy-node-to-the-right-side';
  // } else if (key === 'o') {
  //   action = 'add-sibling-to-node';
  // } else if (key === 'a') {
  //   action = 'append-child-to-node';
  // } else if (eve.ctrlKey && key === 'x') {
  //   action = 'cut-node';
  // } else if (eve.ctrlKey && key === 'c') {
  //   action = 'copy-node';
  // } else if (eve.ctrlKey && key === 'v') {
  //   action = 'paste-into-node';
  // } else if (key === 'c') {
  //   action = 'copy-node-text-into-clipboard';
  // } else if (key === 'F2') {
  //   action = 'edit-node-text';
  // } else if (key === 'Delete') {
  //   action = 'delete-node-from-the-right-side';
  // } else if (eve.ctrlKey && key === 's') {
  //   action = 'save-result';
  // }

  if (key === 'ArrowUp' || key === 'ArrowDown' || key === ' ') {
    eve.preventDefault();
  }

  if (my.config.hotkeys === undefined || my.config.hotkeys.post_timing_dialog === undefined) {
    return;
  }

  action = my.config.hotkeys.post_timing_dialog[key];
  
  if (action === undefined) {
    return;
  }

  if (action === 'go-to-parent-node') {
    if (that.isCursorOnRightSide) {
      if (that.rightSideNodeInRectangle.parentNodeView !== undefined) {
        that.rightSideNodeInRectangle.removeRectangleWrapper();

        let newNodeInRectangle = that.rightSideNodeInRectangle.parentNodeView;
        newNodeInRectangle.wrapInRectangle();

        that.rightSideNodeInRectangle = newNodeInRectangle;
      }
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.parentNodeView !== undefined) {
        nodeInRectangle.removeRectangleWrapper();

        let newNodeInRectangle = nodeInRectangle.parentNodeView;
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
    }
    return true;
  } else if (action === 'go-to-child-node') {
    if (that.isCursorOnRightSide) {
      if (that.rightSideNodeInRectangle.children.length > 0) {
        that.rightSideNodeInRectangle.removeRectangleWrapper();

        if (that.rightSideNodeInRectangle.isCollapsed) {
          that.rightSideNodeInRectangle.toggleCollapse();
        }

        let newNodeInRectangle = that.rightSideNodeInRectangle.children[0];
        newNodeInRectangle.wrapInRectangle();

        that.rightSideNodeInRectangle = newNodeInRectangle;
      }
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.children.length > 0) {
        nodeInRectangle.removeRectangleWrapper();

        if (nodeInRectangle.isCollapsed) {
          nodeInRectangle.toggleCollapse();
        }

        let newNodeInRectangle = nodeInRectangle.children[0];
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
    }
    return true;
  } else if (action === 'go-to-previous-sibling') {
    if (that.isCursorOnRightSide) {
      if (that.rightSideNodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = that.rightSideNodeInRectangle.findPreviousSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        that.rightSideNodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        that.rightSideNodeInRectangle = newNodeInRectangle;
      }
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = nodeInRectangle.findPreviousSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        nodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
    }
    return true;
  } else if (action === 'go-to-next-sibling') {
    if (that.isCursorOnRightSide) {
      if (that.rightSideNodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = that.rightSideNodeInRectangle.findNextSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        that.rightSideNodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        that.rightSideNodeInRectangle = newNodeInRectangle;
      }
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      if (nodeInRectangle.parentNodeView !== undefined) {

        let newNodeInRectangle = nodeInRectangle.findNextSibling();
        if (newNodeInRectangle === undefined) {
          return;
        }
        nodeInRectangle.removeRectangleWrapper();
        newNodeInRectangle.wrapInRectangle();

        that.nodeInRectangle = newNodeInRectangle;
      }
    }
    return true;
  } else if (action === 'toggle-collapse-node') {
    if (that.isCursorOnRightSide) {
      that.rightSideNodeInRectangle.toggleCollapse();
    } else {
      that.nodeInRectangle.toggleCollapse();
    }
    return true;
  } else if (action === 'go-to-the-very-last-node') {
    if (that.isCursorOnRightSide) {
      let nodeInRectangle = that.rightSideNodeInRectangle;
      nodeInRectangle.removeRectangleWrapper();
      while (nodeInRectangle.children.length > 0) {
        if (nodeInRectangle.isCollapsed) {
          nodeInRectangle.toggleCollapse();
        }
        nodeInRectangle = nodeInRectangle.children[nodeInRectangle.children.length - 1];
      }
      nodeInRectangle.wrapInRectangle();
      that.rightSideNodeInRectangle = nodeInRectangle;
    } else {
      let nodeInRectangle = that.nodeInRectangle;
      nodeInRectangle.removeRectangleWrapper();
      while (nodeInRectangle.children.length > 0) {
        if (nodeInRectangle.isCollapsed) {
          nodeInRectangle.toggleCollapse();
        }
        nodeInRectangle = nodeInRectangle.children[nodeInRectangle.children.length - 1];
      }
      nodeInRectangle.wrapInRectangle();
      that.nodeInRectangle = nodeInRectangle;
    }
    return true;
  } else if (action === 'switch-to-left-side') {
    that.isCursorOnRightSide = false;
    that.rightSideNodeInRectangle.removeRectangleWrapper();
    that.nodeInRectangle.wrapInRectangle();
    return true;
  } else if (action === 'switch-to-right-side') {
    that.isCursorOnRightSide = true;
    that.nodeInRectangle.removeRectangleWrapper();
    that.rightSideNodeInRectangle.wrapInRectangle();
    return true;
  } else if (action === 'copy-node-to-the-right-side') {
    if (that.isCursorOnRightSide) {
    } else {
      let branchUntilNode = that.copyNodeToTheRightSide(that.nodeInRectangle);

      that.isCursorOnRightSide = true;
      that.nodeInRectangle.removeRectangleWrapper();

      let nodeInRectangle = that.rightSideNodeInRectangle;
      if (nodeInRectangle !== undefined) {
        nodeInRectangle.removeRectangleWrapper();
      }

      let node = my.rightSideTimings;
      while (branchUntilNode.children.length > 0) {
        branchUntilNode = branchUntilNode.children[0];
        if (node.nodeView.isCollapsed) {
          node.nodeView.toggleCollapse();
        }
        node = node.childrenByName[branchUntilNode.name];
      }
      node.nodeView.wrapInRectangle();
      that.rightSideNodeInRectangle = node.nodeView;
    }
    return true;
  } else if (action === 'add-sibling-to-node') {
    if (!that.isCursorOnRightSide) {
      return true;
    }
    that.addSiblingWithInputToTheRightSideNode(that.rightSideNodeInRectangle);
    return true;
  } else if (action === 'append-child-to-node') {
    if (!that.isCursorOnRightSide) {
      return true;
    }
    that.appendChildWithInputToTheRightSideNode(that.rightSideNodeInRectangle);
    return true;
  } else if (action === 'cut-node') {
    delete my.rightSideNodeToCopy;
    my.rightSideNodeToCut = that.rightSideNodeInRectangle.processNode;
    return true;
  } else if (action === 'copy-node') {
    delete my.rightSideNodeToCut;
    my.rightSideNodeToCopy = that.rightSideNodeInRectangle.processNode;
    return true;
  } else if (action === 'paste-into-node') {
    that.pasteRightSideNode();
    return true;
  } else if (action === 'copy-node-text-into-clipboard') {
    if (!that.isCursorOnRightSide) {
      return true;
    }
    that.rightSideNodeInRectangle.copyValueToClipboard();
    return true;
  } else if (action === 'edit-node-text') {
    if (!that.isCursorOnRightSide) {
      return true;
    }
    that.editRightSideNode(that.rightSideNodeInRectangle);
    return true;
  } else if (action === 'delete-node-from-the-right-side') {
    if (that.isCursorOnRightSide) {
      that.deleteNodeFromTheRightSide(that.rightSideNodeInRectangle);
    } else {
      that.deleteCorrespondingNodeFromTheRightSide(that.nodeInRectangle)
    }
    return true;
  } else if (action === 'save-result') {
    save();
    return true;
  }
};

function save() {
  if (my.selectedFilepath === undefined || my.selectedCategoryPath === undefined) {
    alert('please select a filepath');
    return;
  }
  // let innermostCategoryPath = findLastInnermostCategoryPath(my.rightSideTimings, my.selectedCategoryPath);
  let innermostCategoryPath = my.selectedAsInnermostCategoryProcessNode && my.selectedAsInnermostCategoryProcessNode.getPath();
  if (innermostCategoryPath === undefined || innermostCategoryPath.length === 0) {
    alert("no process node found.\nmake sure that you've selected a process node or some of its descendant nodes.\na process node gets collapsed by default in the left-side tree\n(collapsed node hides its children and draws a plus sign icon in front of itself)");
    return;
  }
  if (!isPrefix(my.selectedCategoryPath, innermostCategoryPath)) {
    alert([
      "error: categoryPathToSkip should be a prefix of innermostCategoryPath",
      `categoryPathToSkip: ${my.selectedCategoryPath}`,
      `innermostCategoryPath: ${innermostCategoryPath}`
    ].join('\n'));
    return;
  }
  my.save_result_handler = (result, msg) => {
    if (result === 'error') {
      alert(`There was an error while saving a file. Error message: "${msg.error_message}"`);
      return;
    }
    if (result === 'success') {
      alert('Saved timing successfully');
      window.webkit.messageHandlers.post_timing_dialog_msgs__close_after_successful_save.postMessage();
      return;
    }
  };
  window.webkit.messageHandlers.post_timing_dialog_msgs__write_to_file.postMessage(
    my.selectedFilepath,
    convertToWritablePreYamlJson(my.rightSideTimings, my.selectedCategoryPath, innermostCategoryPath)
  );
}

function cancel() {
  if (confirm("Please confirm cancelling by pressing OK")) {
    window.webkit.messageHandlers.post_timing_dialog_msgs__cancel.postMessage();
  }
}


PostTimingView.prototype.copyNodeToTheRightSide = function(processNodeView) {
  let that = this;
  if (!isAllowedToAddNode(processNodeView.processNode)) {
    alert("cannot add a node here.\n(a process node cannot have siblings)");
    return;
  }
  let branchUntilNode = copyProcessBranchUntilNode(processNodeView.processNode);
  that.mergeRightSideWithNewTimings(branchUntilNode);
  that.showPossibleFilepaths();
  handleVisibilityOfCheckboxIsProcess();

  let aNodeView = processNodeView;
  while (aNodeView !== undefined) {
    aNodeView.hasCopyOnTheRightSide = true;
    aNodeView.htmlElement.classList.add('has-copy-on-the-right-side');
    aNodeView = aNodeView.parentNodeView;
  }
  return branchUntilNode;
}

PostTimingView.prototype.deleteNodeFromTheRightSide = function(processNodeView) {
  let that = this;
  let path = processNodeView.processNode.getPath();
  let newNodeInRectangle = that.rightSideNodeInRectangle;
  let wasInRectangle = that.rightSideNodeInRectangle === processNodeView;
  if (wasInRectangle) {
    newNodeInRectangle = processNodeView.findNextSibling();
    if (newNodeInRectangle === undefined) {
      newNodeInRectangle = processNodeView.findPreviousSibling();
    }
    if (newNodeInRectangle === undefined) {
      newNodeInRectangle = processNodeView.parentNodeView;
    }
    if (newNodeInRectangle === undefined) {
      return;
    }
  }

  processNodeView.removeFromTree();

  if (wasInRectangle) {
    newNodeInRectangle.wrapInRectangle();
    that.rightSideNodeInRectangle = newNodeInRectangle;
  }

  that.showPossibleFilepaths();
  handleSelectedAsInnermostCategoryProcessNode();
  handleVisibilityOfCheckboxIsProcess();

  let correspondingLeftSideNode = that.children[0];
  for (let pathSegment of path) {
    correspondingLeftSideNode = correspondingLeftSideNode.childrenByName[pathSegment];
  }
  if (correspondingLeftSideNode !== undefined) {
    function func(nodeView) {
      nodeView.hasCopyOnTheRightSide = false;
      nodeView.htmlElement.classList.remove('has-copy-on-the-right-side');
      nodeView.children.forEach(func);
    }
    func(correspondingLeftSideNode);
  }
}

PostTimingView.prototype.pasteRightSideNode = function() {
  let that = this;
  let source = my.rightSideNodeToCut || my.rightSideNodeToCopy;
  if (source === undefined ||
      source === that.rightSideNodeInRectangle.processNode) {
    return;
  }
  function isAncestor(ancestor, processNode) {
    while (true) {
      if (processNode.parent === ancestor) {
        return true;
      }
      if (processNode.parent === null) {
        return false;
      }
      processNode = processNode.parent;
    }
  }
  if (isAncestor(source, that.rightSideNodeInRectangle.processNode)) {
    alert("cannot copy a branch into itself");
    return;
  }
  function func(sourceNode, destinationParentNode) {
    let copyOfSourceNode = destinationParentNode.ensureChildWithName(sourceNode.name);
    sourceNode.children.forEach(ch => func(ch, copyOfSourceNode));
  }
  func(source, that.rightSideNodeInRectangle.processNode);
  that.rightSideNodeInRectangle.mergeWithNewTimings(that.rightSideNodeInRectangle.processNode);
  that.rightSideNodeInRectangle.wrapInRectangle();
  if (my.rightSideNodeToCut !== undefined) {
    my.rightSideNodeToCut.nodeView.removeFromTree();
    delete my.rightSideNodeToCut;
  }
  that.showPossibleFilepaths();
  handleSelectedAsInnermostCategoryProcessNode();
  handleVisibilityOfCheckboxIsProcess();
}

function handleVisibilityOfCheckboxIsProcess() {
  function hideCheckboxRecursively(processNode) {
    processNode.nodeView._hideCheckboxIsProcess();
    processNode.children.forEach(hideCheckboxRecursively);
  }
  function func(processNode) {
    if (processNode.hasSiblings()) {
      hideCheckboxRecursively(processNode);
      return;
    }
    if (!processNode.isCoveredByFilepath) {
      processNode.nodeView._hideCheckboxIsProcess();
    } else if (my.selectedCategoryPath !== undefined &&
               isPrefixOrEquals(processNode.getPath(), my.selectedCategoryPath)) {
      processNode.nodeView._hideCheckboxIsProcess();
    } else {
      processNode.nodeView._showCheckboxIsProcess();
    }
    processNode.children.forEach(func);
  }
  func(my.rightSideTimings);
}

PostTimingView.prototype.deleteCorrespondingNodeFromTheRightSide = function(processNodeView) {
  let that = this;
  let branchUntilNode = copyProcessBranchUntilNode(processNodeView.processNode);
  let nodeFromPath = branchUntilNode;
  let rightSideRootNode = that.rightSideChildrenByName[branchUntilNode.name];
  let rightSideNode = rightSideRootNode;
  if (rightSideNode === undefined) {
    return;
  }
  while (nodeFromPath.children.length > 0) {
    nodeFromPath = nodeFromPath.children[0];
    rightSideNode = rightSideNode.childrenByName[nodeFromPath.name];
  }
  if (rightSideNode === undefined) {
    return;
  }

  let newNodeInRectangle = rightSideRootNode;

  if (that.rightSideNodeInRectangle !== undefined &&
      that.rightSideNodeInRectangle !== rightSideRootNode) {

    newNodeInRectangle = rightSideNode.findNextSibling();
    if (newNodeInRectangle === undefined) {
      newNodeInRectangle = rightSideNode.findPreviousSibling();
    }
    if (newNodeInRectangle === undefined) {
      newNodeInRectangle = rightSideNode.parentNodeView;
    }
    if (newNodeInRectangle !== undefined) {
      that.rightSideNodeInRectangle = newNodeInRectangle;
    }
  }

  if (newNodeInRectangle !== undefined) {
    rightSideNode.removeFromTree();
  }

  that.showPossibleFilepaths();
  handleSelectedAsInnermostCategoryProcessNode();
  handleVisibilityOfCheckboxIsProcess();

  function func(nodeView) {
    nodeView.hasCopyOnTheRightSide = false;
    nodeView.htmlElement.classList.remove('has-copy-on-the-right-side');
    nodeView.children.forEach(func);
  }
  func(processNodeView);
}

PostTimingView.prototype.addSiblingWithInputToTheRightSideNode = function(processNodeView) {
  let that = this;
  if (!processNodeView.processNode.hasSiblings() &&
      !isProcessNodeAllowedToAddSibling(processNodeView.processNode)) {
    alert("cannot add a node here.\n(a process node cannot have siblings)");
    return;
  }
  let wasInRectangle = that.rightSideNodeInRectangle === processNodeView;

  processNodeView.addHtmlSiblingWithInput(function(newProcessNode) {
    if (wasInRectangle) {
      that.rightSideNodeInRectangle.removeRectangleWrapper();

      let newNodeInRectangle = that.rightSideNodeInRectangle.findNextSibling();
      newNodeInRectangle.wrapInRectangle();

      that.rightSideNodeInRectangle = newNodeInRectangle;
    }
    if (newProcessNode.parent !== null) {
      let leftSideParent = newProcessNode.parent.leftSideNode;
      if (leftSideParent !== undefined) {
        if (leftSideParent.childrenByName.hasOwnProperty(newProcessNode.name)) {
          let leftSideNode = leftSideParent.childrenByName[newProcessNode.name];
          newProcessNode.leftSideNode = leftSideNode;
          leftSideNode.nodeView.hasCopyOnTheRightSide = true;
          leftSideNode.nodeView.htmlElement.classList.add('has-copy-on-the-right-side')
        }
      }
    }
    that.showPossibleFilepaths();
    handleVisibilityOfCheckboxIsProcess();
  });
}

PostTimingView.prototype.appendChildWithInputToTheRightSideNode = function(processNodeView) {
  let that = this;
  if (processNodeView.children.length === 1 &&
      !isProcessNodeAllowedToAddSibling(processNodeView.processNode.children[0])) {
    alert("cannot add a node here.\n(a process node cannot have siblings)");
    return;
  }
  let wasInRectangle = that.rightSideNodeInRectangle === processNodeView;
  processNodeView.appendHtmlChildWithInput(function(newProcessNode) {
    if (wasInRectangle) {
      that.rightSideNodeInRectangle.removeRectangleWrapper();

      let newNodeInRectangle = that.rightSideNodeInRectangle.children[that.rightSideNodeInRectangle.children.length - 1];
      newNodeInRectangle.wrapInRectangle();

      that.rightSideNodeInRectangle = newNodeInRectangle;
    }
    let leftSideParent = processNodeView.processNode.leftSideNode;
    if (leftSideParent !== undefined) {
      if (leftSideParent.childrenByName.hasOwnProperty(newProcessNode.name)) {
        let leftSideNode = leftSideParent.childrenByName[newProcessNode.name];
        newProcessNode.leftSideNode = leftSideNode;
        leftSideNode.nodeView.hasCopyOnTheRightSide = true;
        leftSideNode.nodeView.htmlElement.classList.add('has-copy-on-the-right-side')
      }
    }

    that.showPossibleFilepaths();
    handleVisibilityOfCheckboxIsProcess();
  });
}

PostTimingView.prototype.editRightSideNode = function(processNodeView) {
  let that = this;
  let wasInRectangle = that.rightSideNodeInRectangle === processNodeView;
  let wasSelected = processNodeView.processNode === my.selectedAsInnermostCategoryProcessNode;
  processNodeView.edit(function(newNodeView) {
    if (wasInRectangle) {
      newNodeView.wrapInRectangle();
      that.rightSideNodeInRectangle = newNodeView;
    }
    if (wasSelected) {
      my.selectedAsInnermostCategoryProcessNode = newNodeView.processNode;
      newNodeView.checkIsProcessCheckbox();
    }
    if (processNodeView.processNode.leftSideNode !== undefined) {
      processNodeView.processNode.leftSideNode.nodeView.hasCopyOnTheRightSide = false;
      processNodeView.processNode.leftSideNode.nodeView.htmlElement.classList.remove('has-copy-on-the-right-side');
    }
    if (newNodeView.processNode.parent !== null) {
      let leftSideParent = newNodeView.processNode.parent.leftSideNode;
      if (leftSideParent !== undefined) {
        if (leftSideParent.childrenByName.hasOwnProperty(newNodeView.name)) {
          let leftSideNode = leftSideParent.childrenByName[newNodeView.name];
          newNodeView.processNode.leftSideNode = leftSideNode;
          leftSideNode.nodeView.hasCopyOnTheRightSide = true;
          leftSideNode.nodeView.htmlElement.classList.add('has-copy-on-the-right-side');
        }
      }
    }
    handleVisibilityOfCheckboxIsProcess();
  });
}

PostTimingView.prototype.showPossibleFilepaths = function() {
  let that = this;

  let possibleFilepaths = getPossibleFilepaths();
  let bottomRightPanel = document.getElementById('bottom-right-panel');
  bottomRightPanel.innerHTML = '';

  if (!my.hasManuallySelectedFilepath) {
    delete my.selectedFilepath;
    delete my.selectedCategoryPath;
    if (my.selectedFilepathCheckbox !== undefined) {
      my.selectedFilepathCheckbox.checked = false;
      delete my.selectedFilepathCheckbox;
    }
  }

  let pfHeader;
  let pfLen = possibleFilepaths.length;
  if (pfLen === 0) {
    pfHeader = 'no filepath';
  } else if (pfLen === 1 && possibleFilepaths[0].filepathInfos.length == 1) {
    pfHeader = 'filepath:'
    my.selectedFilepath = possibleFilepaths[0].filepathInfos[0].filepath;
    my.selectedCategoryPath = possibleFilepaths[0].categoryPath;
  } else {
    pfHeader = 'select filepath:'
    let mostCompetitive = (function findMostCompetitiveFilepath() {
      let maxCompetitivenessLevel = Number.NEGATIVE_INFINITY;
      let singleMostCompetitive;
      for (let pf of possibleFilepaths) {
        for (let fpInfo of pf.filepathInfos) {
          if (fpInfo.competitivenessLevel > maxCompetitivenessLevel) {
            maxCompetitivenessLevel = fpInfo.competitivenessLevel;
            singleMostCompetitive = {
              categoryPath: pf.categoryPath,
              filepath: fpInfo.filepath,
            };
          } else if (fpInfo.competitivenessLevel === maxCompetitivenessLevel) {
            singleMostCompetitive = undefined;
          }
        }
      }
      return singleMostCompetitive;
    })();
    if (mostCompetitive !== undefined) {
      my.selectedFilepath = mostCompetitive.filepath;
      my.selectedCategoryPath = mostCompetitive.categoryPath;
    }
  }

  let encounteredSelectedFilepath = false;

  withChildren(bottomRightPanel,
    withChildren(document.createElement('span'),
      document.createTextNode(pfHeader)
    ),
    ...possibleFilepaths.map(pf =>
      withChildren(document.createElement('div'),
        withChildren(document.createElement('span'),
          document.createTextNode(`category path: ${pf.categoryPath.join(' - ')}`)
        ),
        ...pf.filepathInfos.map(fpInfo => withChildren(document.createElement('div'),
          withChildren(document.createElement('label'),
            (function() {
              let checkbox = document.createElement('input');
              checkbox.type = "checkbox";
              // if (possibleFilepaths.length === 1 && possibleFilepaths[0].filepaths.length === 1) {
              if (my.selectedFilepath === fpInfo.filepath && arrays_equals(my.selectedCategoryPath, pf.categoryPath)) {
                checkbox.checked = true;
                my.selectedFilepathCheckbox = checkbox;
                encounteredSelectedFilepath = true;
              }
              checkbox.addEventListener('change', (eve) => {
                let checked = checkbox.checked;
                if (checked) {
                  if (my.selectedFilepathCheckbox !== undefined) {
                    my.selectedFilepathCheckbox.checked = false;
                  }
                  my.selectedFilepath = fpInfo.filepath;
                  my.selectedCategoryPath = pf.categoryPath;
                  my.selectedFilepathCheckbox = checkbox;
                  my.hasManuallySelectedFilepath = true;
                } else {
                  if (my.selectedFilepath === fpInfo.filepath) {
                    delete my.selectedFilepath;
                    delete my.selectedCategoryPath;
                    delete my.selectedFilepathCheckbox;
                    delete my.hasManuallySelectedFilepath;
                  }
                }
                handleSelectedFilepathChange();
              });
              return checkbox;
            })(),
            document.createTextNode(`filepath: ${fpInfo.filepath}`)
          )
        )),
        document.createElement('br'),
      )
    )
  );

  if (my.hasManuallySelectedFilepath && !encounteredSelectedFilepath) {
    delete my.selectedFilepath;
    delete my.selectedCategoryPath;
    if (my.selectedFilepathCheckbox !== undefined) {
      my.selectedFilepathCheckbox.checked = false;
      delete my.selectedFilepathCheckbox;
    }
  }
}

function getPossibleFilepaths() {
  let cp2fResult = [];
  // function func(cp2fNode, processNode, categoryPath) {
  //   if (cp2fNode.filepaths !== undefined) {
  //     cp2fResult.push({
  //       categoryPath: categoryPath,
  //       filepaths: cp2fNode.filepaths
  //     });
  //   }
  //   processNode.children.forEach(ch => {
  //     if (cp2fNode.childrenByName.hasOwnProperty(ch.name)) {
  //       let nextCp2fNode = cp2fNode.childrenByName[ch.name];
  //       func(nextCp2fNode, ch, categoryPath.concat(ch.name));
  //     }
  //   });
  // }
  let cp2fNode = my.categoryPath2File;
  let processNode = my.rightSideTimings;
  let categoryPath = [];
  // func(cp2fNode, processNode, categoryPath);
  while (true) {
    if (processNode === my.selectedAsInnermostCategoryProcessNode) {
      break;
    }
    if (cp2fNode.filepathInfos !== undefined && processNode.children.length <= 1) {
      cp2fResult.push({
        categoryPath: categoryPath,
        filepathInfos: cp2fNode.filepathInfos
      });
    }
    if (processNode.children.length !== 1) {
      break;
    }
    let childProcessNode = processNode.children[0];
    if (!cp2fNode.childrenByName.hasOwnProperty(childProcessNode.name)) {
      break;
    }
    let childCp2fNode = cp2fNode.childrenByName[childProcessNode.name];

    processNode = childProcessNode;
    cp2fNode = childCp2fNode;
    categoryPath = categoryPath.concat(childProcessNode.name);
  }
  return cp2fResult;
}

function handleSelectedFilepathChange() {
  if (my.rightSideTimings) {
    handleVisibilityOfCheckboxIsProcess();
  }
}

function copyProcessBranchUntilNode(node) {
  let arr = [];
  while (node !== null) {
    arr.push(node);
    node = node.parent;
  }
  let rootNode = arr[arr.length - 1];
  let branchUntilNode = Object.assign(new ProcessNode(rootNode.name), rootNode, {children: [], childrenByName: {}});
  let rightSideNode = branchUntilNode;
  rightSideNode.leftSideNode = rootNode;
  for (let idx = arr.length - 2; idx >= 0; idx--) {
    let leftSideNode = arr[idx];
    rightSideNode = rightSideNode.ensureChildCopyOf(leftSideNode);
    rightSideNode.leftSideNode = leftSideNode;
  }
  return branchUntilNode;
}

function convertToWritablePreYamlJson(processesTree, categoryPathToSkip, innermostCategoryPath) {
  function func(processNode) {
    if (processNode.children.length === 0) {
      return processNode.name;
    } else {
      let obj = {};
      obj[processNode.name] = processNode.children.map(c => func(c))
      return obj;
    }
  }
  let node = processesTree;
  let indexInInnermostCategoryPath = 0;
  for (let cat of categoryPathToSkip) {
    node = node.childrenByName[cat];
    indexInInnermostCategoryPath++;
  }
  let result = innermostCategoryPath.slice(indexInInnermostCategoryPath);
  for (let i = indexInInnermostCategoryPath; i < innermostCategoryPath.length; i++) {
    node = node.children[0];
  }
  result[result.length - 1] = func(node);
  return result;
}

function isAllowedToAddNode(processNode) {
  let path = processNode.getPath();
  if (my.rightSideTimings === undefined || my.rightSideTimings.children.length === 0) {
    return true;
  }
  let rightSideProcessNode = my.rightSideTimings;
  let hasCategoryLikeAncestorsCoveredByPath = false;
  for (let i = 0; i < path.length - 1; i++) {
    if (rightSideProcessNode.children.length > 1) {
      break;
    }
    let pathSegment = path[i];
    rightSideProcessNode = rightSideProcessNode.childrenByName[pathSegment];
    if (rightSideProcessNode === undefined) {
      break;
    }
    if (rightSideProcessNode.isCoveredByFilepath) {
      hasCategoryLikeAncestorsCoveredByPath = true;
    }
  }
  return hasCategoryLikeAncestorsCoveredByPath;
}

function isProcessNodeAllowedToAddSibling(processNode) {
  let path = processNode.getPath();
  let rightSideProcessNode = my.rightSideTimings;
  let hasCategoryLikeAncestorsCoveredByPath = false;
  for (let i = 0; i < path.length - 1; i++) {
    if (rightSideProcessNode.children.length > 1) {
      break;
    }
    let pathSegment = path[i];
    rightSideProcessNode = rightSideProcessNode.childrenByName[pathSegment];
    if (rightSideProcessNode.isCoveredByFilepath) {
      hasCategoryLikeAncestorsCoveredByPath = true;
    }
  }
  return hasCategoryLikeAncestorsCoveredByPath;
}

function findLastInnermostCategoryPath(processesTree, categoryPath) {
  let paths = findInnermostCategoryPaths(processesTree, categoryPath);
  if (paths.length > 0) {
    return paths[paths.length - 1];
  }
}

function findInnermostCategoryPaths(processesTree, categoryPath) {
  let node = processesTree;
  let resultPaths = [];
  let currentPath = [];
  for (let cat of categoryPath) {
    node = node.childrenByName[cat];
    currentPath = currentPath.concat(cat);
    if (node.isInnermostCategory) {
      resultPaths.push(currentPath);
    }
  }
  while (true) {
    if (node.children.length === 0 || node.children.length > 1) {
      break;
    }

    node = node.children[0];
    currentPath = currentPath.concat(node.name);
    if (node.isInnermostCategory) {
      resultPaths.push(currentPath);
    }
  }
  return resultPaths;
}

function arrays_equals(first, second) {
  if (first.length !== second.length) {
    return false;
  }
  for (let idx = 0; idx < first.length; idx++) {
    if (first[idx] !== second[idx]) {
      return false;
    }
  }
  return true;
}

function isPrefix(prefix, arr) {
  if (prefix.length > arr.length) {
    return false;
  }
  for (let idx = 0; idx < prefix.length; idx++) {
    if (prefix[idx] !== arr[idx]) {
      return false;
    }
  }
  if (prefix.length === arr.length) {
    return false;
  }
  return true;
}

function isPrefixOrEquals(prefix, arr) {
  if (prefix.length > arr.length) {
    return false;
  }
  for (let idx = 0; idx < prefix.length; idx++) {
    if (prefix[idx] !== arr[idx]) {
      return false;
    }
  }
  return true;
}
