const { showOrHideStarInTimingsHeader } = require('./header_utils.js');

const { withChildren, withClass } = require('../html_utils.js');

export function TimingsFileInfoView(timingsFileInfo) {
  let that = this;
  timingsFileInfo.view = that;
  that.timingsFileInfo = timingsFileInfo;
  that.html = undefined;
}

TimingsFileInfoView.prototype.initHtml = function() {
  let that = this;
  let timingsFileInfo = that.timingsFileInfo;
  that.nameDiv = 
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`name: ${timingsFileInfo.name}`)
    );
  that.formatDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`format: ${timingsFileInfo.format}`)
    );
  that.filepathDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`filepath: ${timingsFileInfo.filepath}`)
    );
  that.categoryPathDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-text', 'category-path-div'),
      document.createTextNode(`category path: ${categoryPathToString(timingsFileInfo)}`)
    );
  let categoryPathIsSameAsName = timingsFileInfo.categoryPath === undefined || (timingsFileInfo.categoryPath.length === 1 && timingsFileInfo.categoryPath[0] === timingsFileInfo.name);
  if (categoryPathIsSameAsName) {
    that.categoryPathDiv.classList.add('category-path-is-same-as-name');
  }
  that.competitivenessLevelDiv = 
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`competitiveness level: ${timingsFileInfo.competitivenessLevel}`)
    );
  if (timingsFileInfo.competitivenessLevel === 0) {
    that.competitivenessLevelDiv.classList.add('default-competitiveness-level');
  }
  that.html = withChildren(withClass(document.createElement('div'), 'timings-file-info-view'),
    that.createDivOfTimingsFileButtons(),
    that.nameDiv,
    that.formatDiv,
    that.filepathDiv,
    that.categoryPathDiv,
    that.competitivenessLevelDiv,
  );
}

TimingsFileInfoView.prototype.refresh = function() {
  let that = this;
  let timingsFileInfo = that.timingsFileInfo;

  that.nameDiv.innerHTML = `name: ${timingsFileInfo.name}`;
  that.formatDiv.innerHTML = `format: ${timingsFileInfo.format}`;
  that.filepathDiv.innerHTML = `filepath: ${timingsFileInfo.filepath}`;
  that.categoryPathDiv.innerHTML = `category path: ${categoryPathToString(timingsFileInfo)}`;
  that.competitivenessLevelDiv.innerHTML = `competitiveness level: ${timingsFileInfo.competitivenessLevel}`;

  let categoryPathIsSameAsName = timingsFileInfo.categoryPath === undefined || (timingsFileInfo.categoryPath.length === 1 && timingsFileInfo.categoryPath[0] === timingsFileInfo.name);
  if (categoryPathIsSameAsName) {
    that.categoryPathDiv.classList.add('category-path-is-same-as-name');
  } else {
    that.categoryPathDiv.classList.remove('category-path-is-same-as-name');
  }

  if (timingsFileInfo.competitivenessLevel === 0) {
    that.competitivenessLevelDiv.classList.add('default-competitiveness-level');
  } else {
    that.competitivenessLevelDiv.classList.remove('default-competitiveness-level');
  }
}

TimingsFileInfoView.prototype.createDivOfTimingsFileButtons = function() {
  let that = this;
  let timingsFileInfo = that.timingsFileInfo;

  let btnEdit = 
    withChildren(withClass(document.createElement('button'), 'btn-edit-timings-file-info'),
      document.createTextNode('edit')
    );
  btnEdit.addEventListener('click', (eve) => {
    that.btnHandlerEditTimingsFileInfo();
  });

  let btnDelete =
    withChildren(withClass(document.createElement('button'), 'btn-delete-timings-file-info'),
      document.createTextNode('delete')
    );
  btnDelete.addEventListener('click', (eve) => {
    that.btnHandlerDeleteTimingsFileInfo();
  });

  let btnUndoDelete =
    withChildren(withClass(document.createElement('button'), 'btn-undo-delete-of-timings-file-info'),
      document.createTextNode('undo deletion')
    );
  btnUndoDelete.addEventListener('click', (eve) => {
    that.btnHandlerUndoDeletionOfTimingsFileInfo();
  });

  return withChildren(withClass(document.createElement('div'), 'timings-file-info-buttons'),
    btnEdit,
    btnDelete,
    btnUndoDelete
  );
}

TimingsFileInfoView.prototype.btnHandlerEditTimingsFileInfo = function() {
  let that = this;
  let timingsFileInfo = that.timingsFileInfo;

  window.my.currentTimingsFileInfoBeingEdited = timingsFileInfo;

  let inputName = document.getElementById('new-timing-name');
  let inputFilepath = document.getElementById('new-timing-filepath');
  let selectorOfFormat = document.getElementById('new-timing-format');
  let checkboxCategoryPathIsSameAsName = document.getElementById('category-path-is-same-as-name');
  let textareaCategoryPath = document.getElementById('new-timing-category-path');
  let inputCompetitivenessLevel = document.getElementById('new-timing-competitiveness-level');

  inputName.value = timingsFileInfo.name;
  inputFilepath.value = timingsFileInfo.filepath;
  selectorOfFormat.value = timingsFileInfo.format;
  let categoryPathIsSameAsName = timingsFileInfo.categoryPath === undefined || (timingsFileInfo.categoryPath.length === 1 && timingsFileInfo.categoryPath[0] === timingsFileInfo.name);
  checkboxCategoryPathIsSameAsName.checked = categoryPathIsSameAsName;
  textareaCategoryPath.disabled = categoryPathIsSameAsName;
  if (!categoryPathIsSameAsName) {
    textareaCategoryPath.value = timingsFileInfo.categoryPath.join('\n');
  }
  inputCompetitivenessLevel.value = timingsFileInfo.competitivenessLevel;

  window.my.scrollTopOfListOfTimingsFiles = document.getElementById('tab-contents-of-timings').scrollTop;

  let panelOfListOfTimingsFiles = document.getElementById('list-of-timings-files-panel');
  panelOfListOfTimingsFiles.classList.remove('active');
  panelOfListOfTimingsFiles.classList.add('inactive');

  let newTimingsFileForm = document.getElementById('form-to-edit-timings-file-info');
  newTimingsFileForm.classList.remove('inactive');
  newTimingsFileForm.classList.add('active');

  let bottomRowOfButtons = document.getElementById('bottom-buttons-row');
  bottomRowOfButtons.classList.add('hidden-behind-dialog');
};


TimingsFileInfoView.prototype.btnHandlerDeleteTimingsFileInfo = function() {
  let that = this;
  let timingsFileInfo = that.timingsFileInfo;

  if (window.my.timingsToAddByName.hasOwnProperty(timingsFileInfo.name)) {
    delete window.my.timingsToAddByName[timingsFileInfo.name];
  } else {
    window.my.timingsToDeleteByName[timingsFileInfo.name] = true;
  }

  that.html.classList.add('to-be-deleted');
  showOrHideStarInTimingsHeader();
};


TimingsFileInfoView.prototype.btnHandlerUndoDeletionOfTimingsFileInfo = function() {
  let that = this;
  let timingsFileInfo = that.timingsFileInfo;

  if (window.my.timingsToDeleteByName[timingsFileInfo.name]) {
    delete window.my.timingsToDeleteByName[timingsFileInfo.name];
  } else {
    window.my.timingsToAddByName[timingsFileInfo.name] = timingsFileInfo;
  }

  that.html.classList.remove('to-be-deleted');
  showOrHideStarInTimingsHeader();
}


function categoryPathToString(timing) {
  let categoryPath;
  if (timing.categoryPath !== undefined) {
    categoryPath = timing.categoryPath;
  } else {
    categoryPath = [timing.name];
  }
  return categoryPath.join(' - ');
}
