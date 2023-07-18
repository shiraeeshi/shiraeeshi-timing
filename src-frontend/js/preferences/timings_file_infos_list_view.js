const { TimingsFileInfoView } = require('./timings_file_info_view.js');

const { withChildren } = require('../html_utils.js');

export function TimingsFileInfosListView(timingsToShow) {
  this.timingsToShow = timingsToShow;
  this.timingsFileInfoViews = undefined;
  this.html = undefined;
}

TimingsFileInfosListView.prototype.initHtml = function() {
  let that = this;

  that.timingsFileInfoViews = that.timingsToShow.map(timingsFileInfo => new TimingsFileInfoView(timingsFileInfo));
  that.timingsFileInfoViews.forEach(v => v.initHtml());

  let tabContentsOfTimings = document.getElementById('list-of-timings-files');
  tabContentsOfTimings.innerHTML = '';

  that.html = withChildren(tabContentsOfTimings,
    ...that.timingsFileInfoViews.map(v => v.html)
  );
};

TimingsFileInfosListView.prototype.reset = function(timingsToShow) {
  let that = this;
  that.timingsToShow = timingsToShow;
  that.initHtml();
};

TimingsFileInfosListView.prototype.addNewInfo = function(timingsFileInfo) {
  let that = this;
  that.timingsToShow.push(timingsFileInfo);

  let view = new TimingsFileInfoView(timingsFileInfo);
  that.timingsFileInfoViews.push(view);

  view.initHtml();

  that.html.appendChild(view.html);
};

TimingsFileInfosListView.prototype.hasInfoWithName = function(name) {
  let that = this;
  return that.timingsToShow.find(timingsFileInfo => timingsFileInfo.name === name) !== undefined;
};

TimingsFileInfosListView.prototype.findInfoWithFilepath = function(filepath) {
  let that = this;
  return that.timingsToShow.find(timingsFileInfo => timingsFileInfo.filepath === filepath);
};

TimingsFileInfosListView.prototype.dataIsSameAsOriginal = function() {
  let that = this;
  if (Object.keys(window.my.timingsToAddByName).length > 0) {
    return false;
  }
  if (Object.keys(window.my.timingsToDeleteByName).length > 0) {
    return false;
  }
  for (let t of that.timingsToShow) {
    if (t.original === undefined) {
      continue;
    }
    if (!timingsFileInfoIsSameAsOriginal(t)) {
      return false;
    }
  }
  return true;
};

TimingsFileInfosListView.prototype.handleSaveSuccess = function() {
  let that = this;


  let setOfDeletedNames = new Set(Object.keys(window.my.timingsToDeleteByName));
  for (let t of that.timingsToShow) {
    let wasAddedAndDeleted = t.original === undefined && window.my.timingsToAddByName[t.name] === undefined;
    let wasDeleted = setOfDeletedNames.has(t.name);

    if (wasAddedAndDeleted || wasDeleted) {
      t.view.html.parentNode.removeChild(t.view.html);
    }
  }
  that.timingsToShow = that.timingsToShow.filter(t => !setOfDeletedNames.has(t.name));
  that.timingsFileInfoViews = that.timingsToShow.map(t => t.view);

  window.my.timingsToAddByName = {};
  window.my.timingsToDeleteByName = {};
};

function timingsFileInfoIsSameAsOriginal(timingsFileInfo) {
  let fieldNames = ['name', 'filepath', 'format', 'categoryPath', 'competitivenessLevel'];
  let orig = timingsFileInfo.original;
  for (let fieldName of fieldNames) {
    let areEqual = timingsFileInfo[fieldName] === orig[fieldName];
    if (!areEqual) {
      return false;
    }
  }
  return true;
}

