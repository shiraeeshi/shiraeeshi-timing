const { TimingsCategoryNodeViewState } = require('../timings/categories/node_view_state.js');

const { ProcessTreeNodeView } = require('./process_tree_node_view.js');
const { TimingsHistogramsGraphic } = require('./timings_histograms_graphic.js');
const { requestTimingsForPeriod } = require('./request_timings_for_period.js');
const { handleTimings } = require('./handle_timings.js');

const { showTimingsFormatError, withChildren, withClass } = require('../html_utils.js');
const { date2TimingDateStrUnpadded } = require('../date_utils.js');

export function FrequenciesView(processNode) {
  let that = this;
  that.processNode = processNode;
  that.name = processNode.name;
  that.isCollapsed = false;
  that.isUnhighlighted = false;
  that.viewState = TimingsCategoryNodeViewState.HIGHLIGHTED_AS_CHILD;
  that.currentPeriod = createCurrentPeriodInitial();
  that.htmlSpanPeriodInfo = createHtmlSpanPeriodInfo(that.currentPeriod);
  that.hGraphic = new TimingsHistogramsGraphic(processNode);
  that.children = processNode.children.map(childNode => new ProcessTreeNodeView(childNode, that.hGraphic, undefined, that));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.htmlChildrenContainerUl = document.createElement('ul');
  that.htmlSecondaryContainerDiv = document.createElement('div');
  that.htmlSecondaryUl = document.createElement('ul');
  that.solelyDisplayedProcessViewNode = null;
}

for (let propName in ProcessTreeNodeView.prototype) {
  FrequenciesView.prototype[propName] = ProcessTreeNodeView.prototype[propName];
}

FrequenciesView.prototype.mergeWithNewTimings = function(processNode) {
  let that = this;
  that.processNode = processNode;
  processNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = new ProcessTreeNodeView(childNode, that.hGraphic, undefined, that);
      newChildView.buildAsHtmlLiElement();
      newChildView.toggleCollapse();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
      that.htmlChildrenContainerUl.appendChild(newChildView.htmlElement);
    } else {
      oldChild.mergeWithNewTimings(childNode);
    }
  });
};

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

function createHtmlSpanPeriodInfo(initialPeriod) {
  return withChildren(document.createElement('span'),
    document.createTextNode(periodInfoText(initialPeriod))
  )
}

function periodInfoText(period) {
  let that = this;
  let fromDateStr = date2TimingDateStrUnpadded(period.from)
  let toDateStr = date2TimingDateStrUnpadded(period.to)
  let periodInfoText = "period: " + fromDateStr + " - " + toDateStr;
  return periodInfoText;
}

FrequenciesView.prototype.buildHtml = function() {
  let that = this;
  // if (that.children.length == 0) {
  //   let htmlElement = withClass(withChildren(document.createElement('li'), that.name2html()), 'proc-leaf');
  //   that.htmlElement = htmlElement;
  //   return;
  // }

  if (that.htmlElement !== undefined) {
    for (let childNode of that.children) {
      if (childNode.htmlElement !== undefined) {
        continue;
      }
      childNode.buildAsHtmlLiElement();
      that.htmlChildrenContainerUl.appendChild(childNode.htmlElement);
    }
  } else {
    let hGraphic = that.hGraphic;
    hGraphic.initCanvas();
    hGraphic.redraw();

    that.children.forEach(childNode => childNode.buildAsHtmlLiElement());
    let htmlElement =
      withChildren(document.createElement('div'),
        that.buildPeriodButtonsRow(),
        withChildren(document.createElement('div'),
          hGraphic.elem
        ),
        withChildren(withClass(that.htmlChildrenContainerUl, 'processes-tree-container-ul'),
          ...that.children.map(childNode => childNode.htmlElement)
        ),
        withChildren(withClass(that.htmlSecondaryContainerDiv, 'processes-tree-secondary-container-div', 'inactive'),
          (function() {
            let elemAll = withChildren(withClass(document.createElement('button'), 'secondary-show-all-btn'),
              document.createTextNode('show all')
            );
            elemAll.addEventListener('click', eve => {
              that.goBackToAllProcesses();
            });
            return elemAll;
          })(),
          withClass(that.htmlSecondaryUl, 'processes-tree-secondary-ul')
        )
      );
    that.htmlElement = htmlElement;
  }
};

FrequenciesView.prototype.buildPeriodButtonsRow = function() {
  let that = this;
  function buttonWithText(text) {
    let btn = document.createElement('button');
    return withChildren(btn, document.createTextNode(text));
  }
  let btnPlusHalfYear = buttonWithText('+6months');
  let btnPlusMonth = buttonWithText('+month');
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
      my.timings = handleTimings(timings, my.timings);
      my.viewBuilder.buildViews(my.timings);
      my.viewBuilder.showView();
    }).catch(err => {
      showTimingsFormatError("main-content-wrapper", err);
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
      my.timings = handleTimings(timings, my.timings);
      my.viewBuilder.buildViews(my.timings);
      my.viewBuilder.showView();
    }).catch(err => {
      showTimingsFormatError("main-content-wrapper", err);
      console.log("btnPlusMonth.onclick err: " + err)
      window.webkit.messageHandlers.timings_frequencies_msgs.postMessage(
        "btnPlusMonth.onclick err: " + err);
    });
  };
  return withChildren(document.createElement('div'),
    btnPlusHalfYear,
    btnPlusMonth,
    that.htmlSpanPeriodInfo
  );
};

FrequenciesView.prototype.showThisProcessOnly = function(processViewNode) {
  let that = this;
  if (that.solelyDisplayedProcessViewNode !== null) {
    that._goBackToAllProcessesNoRedraw();
  }
  let processHtml = processViewNode.htmlElement;
  processViewNode.processNode.borrowReferences();
  processViewNode.indexToReturnTo = Array.prototype.indexOf.call(processHtml.parentNode.children, processHtml);
  processViewNode.htmlParentToReturnTo = processHtml.parentNode;
  processHtml.parentNode.removeChild(processHtml);
  that.htmlChildrenContainerUl.classList.add('inactive');
  that.htmlSecondaryUl.innerHTML = '';
  that.htmlSecondaryUl.appendChild(processHtml);
  that.htmlSecondaryContainerDiv.classList.remove('inactive');
  that.solelyDisplayedProcessViewNode = processViewNode;
  if (that.hGraphic) {
    that.hGraphic.setProcessNode(processViewNode.processNode);
    that.hGraphic.redraw();
  }
};

FrequenciesView.prototype.goBackToAllProcesses = function() {
  let that = this;
  that._goBackToAllProcessesNoRedraw();
  if (that.hGraphic) {
    that.hGraphic.redraw();
  }
};

FrequenciesView.prototype._goBackToAllProcessesNoRedraw = function() {
  let that = this;
  let processViewNode = that.solelyDisplayedProcessViewNode;
  processViewNode.processNode.unborrowReferences();
  let processHtml = processViewNode.htmlElement;
  processHtml.parentNode.removeChild(processHtml);
  let parent = processViewNode.htmlParentToReturnTo;
  parent.insertBefore(processHtml, parent.children[processViewNode.indexToReturnTo]);
  that.htmlChildrenContainerUl.classList.remove('inactive');
  that.htmlSecondaryUl.innerHTML = '';
  that.htmlSecondaryContainerDiv.classList.add('inactive');
  that.solelyDisplayedProcessViewNode = null;
  if (that.hGraphic) {
    that.hGraphic.setProcessNode(that.processNode);
  }
};

