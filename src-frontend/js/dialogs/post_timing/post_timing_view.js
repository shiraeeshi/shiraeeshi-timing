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
  } else {
    mergeProcessBranchInto(my.rightSideTimings, branchToMerge);
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

function mergeProcessBranchInto(processesTree, branchToMerge) {
  let node = processesTree;
  let nodeFromBranchToMerge = branchToMerge;
  while (nodeFromBranchToMerge.children.length > 0) {
    nodeFromBranchToMerge = nodeFromBranchToMerge.children[0];
    node = node.ensureChildWithName(nodeFromBranchToMerge.name);
    if (nodeFromBranchToMerge.isInnermostCategory) {
      node.isInnermostCategory = true;
    }
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

  if (key === 'ArrowLeft') {
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
  } else if (key === 'ArrowRight') {
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
  } else if (key === 'ArrowUp') {
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
  } else if (key === 'ArrowDown') {
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
  } else if (key === ' ') {
    if (that.isCursorOnRightSide) {
      that.rightSideNodeInRectangle.toggleCollapse();
    } else {
      that.nodeInRectangle.toggleCollapse();
    }
  } else if (key === 'l') {
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
  } else if (key === '1') {
    that.isCursorOnRightSide = false;
    that.rightSideNodeInRectangle.removeRectangleWrapper();
    that.nodeInRectangle.wrapInRectangle();
  } else if (key === '2') {
    that.isCursorOnRightSide = true;
    that.nodeInRectangle.removeRectangleWrapper();
    that.rightSideNodeInRectangle.wrapInRectangle();
  } else if (key === 'Enter') {
    if (that.isCursorOnRightSide) {
    } else {
      let branchUntilNode = copyProcessBranchUntilNode(that.nodeInRectangle.processNode);
      that.mergeRightSideWithNewTimings(branchUntilNode);
      showPossibleFilepaths();
    }
  } else if (key === 'o') {
    if (!that.isCursorOnRightSide) {
      return;
    }
    that.rightSideNodeInRectangle.parentNodeView.appendHtmlChildWithInput();
  } else if (key === 'a') {
    if (!that.isCursorOnRightSide) {
      return;
    }
    that.rightSideNodeInRectangle.appendHtmlChildWithInput();
  } else if (key === 'c') {
    if (!that.isCursorOnRightSide) {
      return;
    }
    that.rightSideNodeInRectangle.copyValueToClipboard();
  } else if (key === 'Delete') {
    if (that.isCursorOnRightSide) {
      let newNodeInRectangle = that.rightSideNodeInRectangle.findNextSibling();
      if (newNodeInRectangle === undefined) {
        newNodeInRectangle = that.rightSideNodeInRectangle.findPreviousSibling();
      }
      if (newNodeInRectangle === undefined) {
        newNodeInRectangle = that.rightSideNodeInRectangle.parentNodeView;
      }
      if (newNodeInRectangle === undefined) {
        return;
      }
      that.rightSideNodeInRectangle.removeFromTree();
      newNodeInRectangle.wrapInRectangle();
      that.rightSideNodeInRectangle = newNodeInRectangle;

      showPossibleFilepaths();
    } else {
      let branchUntilNode = copyProcessBranchUntilNode(that.nodeInRectangle.processNode);
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

      showPossibleFilepaths();
    }
  } else if (eve.ctrlKey && key === 's') {
    save();
  }
};

function save() {
  let possibleFilepaths = getPossibleFilepaths();
  if (possibleFilepaths.length === 0) {
    alert('no filepath found');
  } else if (possibleFilepaths.length > 1) {
    alert('possible filepaths:\n' + possibleFilepaths.map(pf => pf.filepath).join('\n'));
  } else {
    let pf = possibleFilepaths[0];
    let innermostCategoryPath = findLastInnermostCategoryPath(my.rightSideTimings, pf.categoryPath);
    if (innermostCategoryPath === undefined) {
      alert("no process node found.\nmake sure that you've selected a process node or some of its descendant nodes.\na process node gets collapsed by default in the left-side tree\n(collapsed node hides its children and draws a plus sign icon in front of itself)");
      return;
    }
    if (!isPrefix(pf.categoryPath, innermostCategoryPath)) {
      alert([
        "error: categoryPathToSkip should be a prefix of innermostCategoryPath",
        `categoryPathToSkip: ${pf.categoryPath}`,
        `innermostCategoryPath: ${innermostCategoryPath}`
      ].join('\n'));
      return;
    }
    window.webkit.messageHandlers.post_timing_dialog_msgs__write_to_file.postMessage(
      pf.filepath,
      convertToWritablePreYamlJson(my.rightSideTimings, pf.categoryPath, innermostCategoryPath)
    );
  }
}

function cancel() {
}

function showPossibleFilepaths() {

  let possibleFilepaths = getPossibleFilepaths();
  let bottomRightPanel = document.getElementById('bottom-right-panel');
  bottomRightPanel.innerHTML = '';

  let pfHeader;
  let pfLen = possibleFilepaths.length;
  if (pfLen === 0) {
    pfHeader = 'no filepath';
  } else if (pfLen === 1 && possibleFilepaths[0].filepaths.length == 1) {
    pfHeader = 'filepath:'
  } else {
    pfHeader = 'select filepath:'
  }
  withChildren(bottomRightPanel,
    withChildren(document.createElement('span'),
      document.createTextNode(pfHeader)
    ),
    ...possibleFilepaths.map(pf =>
      withChildren(document.createElement('div'),
        withChildren(document.createElement('span'),
          document.createTextNode(`category path: ${pf.categoryPath.join(' - ')}`)
        ),
        ...pf.filepaths.map(fp => withChildren(document.createElement('div'),
          withChildren(document.createElement('label'),
            (function() {
              let checkbox = document.createElement('input');
              checkbox.type = "checkbox";
              return checkbox;
            })(),
            document.createTextNode(`filepath: ${fp}`)
          )
        )),
        document.createElement('br'),
      )
    )
  );
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
    if (cp2fNode.filepaths !== undefined) {
      cp2fResult.push({
        categoryPath: categoryPath,
        filepaths: cp2fNode.filepaths
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

function copyProcessBranchUntilNode(node) {
  let arr = [];
  while (node !== null) {
    arr.push(node);
    node = node.parent;
  }
  let rootNode = arr[arr.length - 1];
  let branchUntilNode = Object.assign(new ProcessNode(rootNode.name), rootNode, {children: [], childrenByName: {}});
  let rightSideNode = branchUntilNode;
  for (let idx = arr.length - 2; idx >= 0; idx--) {
    let leftSideNode = arr[idx];
    rightSideNode = rightSideNode.ensureChildWithName(leftSideNode.name);
    if (leftSideNode.isInnermostCategory) {
      rightSideNode.isInnermostCategory = true;
    }
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

function isPrefix(prefix, arr) {
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
