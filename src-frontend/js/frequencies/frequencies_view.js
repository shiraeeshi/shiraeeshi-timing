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
  that.children = processNode.children.map(childNode => new ProcessTreeNodeView(childNode, that.hGraphic, that));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.htmlChildrenContainerUl = document.createElement('ul');
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

FrequenciesView.prototype.buildAsHtmlLiElement = function() {
  let that = this;
  // if (that.children.length == 0) {
  //   let htmlElement = withClass(withChildren(document.createElement('li'), that.name2html()), 'proc-leaf');
  //   that.html = htmlElement;
  //   return;
  // }

  if (that.html !== undefined) {
    for (let childNode of that.children) {
      if (childNode.html !== undefined) {
        continue;
      }
      childNode.buildAsHtmlLiElement();
      that.htmlChildrenContainerUl.appendChild(childNode.html);
    }
  } else {
    let hGraphic = that.hGraphic;
    hGraphic.initCanvas();
    hGraphic.redraw();

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
          withChildren(document.createElement('div'),
            that.name2html(),
            that.buildPeriodButtonsRow(),
            withChildren(document.createElement('div'),
              hGraphic.elem
            )
          )
        ),
        withChildren(that.htmlChildrenContainerUl,
          ...that.children.map(childNode => childNode.html)
        )
      );
    that.html = htmlElement;
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

