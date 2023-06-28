const { withChildren, withClass } = require('../js/html_utils.js');

window.webkit.messageHandlers.preferences_msgs.onMessage(handleServerMessage);

let my = {
  timingsToAddByName: {},
  timingsToDeleteByName: {},
  currentTimingsFileInfoBeingEdited: undefined,
  timingsFileInfosListView: undefined,
};

function handleServerMessage(msg) {
  if (msg.type === 'filepicker_result') {
    if (my.filepicker_result_handler) {
      my.filepicker_result_handler(msg.result);
      delete my.filepicker_result_handler;
    }
    return;
  }
  if (msg.type === 'save_result') {
    if (my.save_result_handler) {
      my.save_result_handler(msg.result, msg);
      delete my.save_result_handler;
    }
    return;
  }
  let originalConfig = msg.config;
  let config = createCopyOfConfig(originalConfig);
  my.originalConfig = originalConfig;
  my.config = config;

  let timingsToShow = createCopyOfTimings(msg.config);
  my.timingsFileInfosListView = new TimingsFileInfosListView(timingsToShow);

  let btnSave = document.getElementById('btn-save');
  btnSave.addEventListener('click', (eve) => {
    let hasUnsavedChanges = 
      my.showingTimingsHeaderWithStar ||
      showingTimingsConfigHeaderWithStar ||
      showingNotebookHeaderWithStar;
    if (!hasUnsavedChanges) {
      my.timingsFileInfosListView.handleSaveSuccess();
      return;
    }
    function convertToBackendFormat(timingsFileInfos) {
      return timingsFileInfos.map(t => {
        let copy = Object.assign({}, t);
        delete copy.view;
        if (copy.categoryPath !== undefined) {
          copy['category-path'] = copy.categoryPath;
          delete copy.categoryPath;
        }
        return copy;
      });
    }
    window.webkit.messageHandlers.preferences_msg__save.postMessage({
      configWithNoTimings: Object.assign({}, config, {timings: []}),
      timings: convertToBackendFormat(my.timingsFileInfosListView.timingsToShow),
      timingsToAdd: convertToBackendFormat(Object.values(my.timingsToAddByName)),
      namesOfTimingsToDelete: Object.keys(my.timingsToDeleteByName),
      changedTimings: my.showingTimingsHeaderWithStar,
      changedTimingsConfig: showingTimingsConfigHeaderWithStar,
      changedNotebook: showingNotebookHeaderWithStar
    });
    my.save_result_handler = (result, msg) => {
      if (result === 'error') {
        alert(`There was an error while saving a file. Error message: "${msg.error_message}"`);
        return;
      }
      if (result === 'success') {
        my.timingsFileInfosListView.handleSaveSuccess();

        let label = document.getElementById('tab1-label');
        label.innerHTML = 'Timings';
        my.showingTimingsHeaderWithStar = false;

        label = document.getElementById('tab2-label');
        label.innerHTML = 'Timings Config';
        showingTimingsConfigHeaderWithStar = false;

        label = document.getElementById('tab3-label');
        label.innerHTML = 'Notebook';
        showingNotebookHeaderWithStar = false;
      }
    };
  });

  let btnReset = document.getElementById('btn-reset');
  btnReset.addEventListener('click', (eve) => {
    config = createCopyOfConfig(originalConfig);
    timingsInputTextualDisplayFormat.value = config['timings-config']['display-format'];
    timingsRadioBtnUnderlineCanvas.checked = !!config['timings-config']['underline-canvas'];
    timingsRadioBtnFlexibleWidth.checked = !!config['timings-config']['canvas-with-flexible-width'];
    timingsInputCanvasWidth.disabled = !!config['timings-config']['canvas-with-flexible-width'];
    timingsInputCanvasWidth.value = config['timings-config']['canvas-width-in-px'];
    timingsSelectDefaultSummary.value = config['timings-config']['default-summary'];
    notebookInputFilepath.value = config.notebook.filepath;
    notebookInputBackgroundColor.value = config.notebook['background-color'];
    notebookRadioBtnStartWithBottomPanelOfNotesMaximized.checked = !!config.notebook['start-with-bottom-panel-of-notes-maximized'];
    notebookInputFontSizeOfTopPanelOfTags.value =
      config.notebook['font-size-in-px-of-top-panel-of-tags'];
    notebookInputFontSizeOfBottomPanelOfTags.value =
      config.notebook['font-size-in-px-of-bottom-panel-of-tags'];
    notebookInputFontSizeOfTopPanelOfNotes.value =
      config.notebook['font-size-in-px-of-top-panel-of-notes'];
    notebookInputFontSizeOfBottomPanelOfNotes.value =
      config.notebook['font-size-in-px-of-bottom-panel-of-notes'];

    let hadChangesInTimings = my.showingTimingsHeaderWithStar;
    if (hadChangesInTimings) {
      my.timingsFileInfosListView.reset(createCopyOfTimings(config));
    }

    let label = document.getElementById('tab1-label');
    label.innerHTML = 'Timings';
    my.showingTimingsHeaderWithStar = false;

    label = document.getElementById('tab2-label');
    label.innerHTML = 'Timings Config';
    showingTimingsConfigHeaderWithStar = false;

    label = document.getElementById('tab3-label');
    label.innerHTML = 'Notebook';
    showingNotebookHeaderWithStar = false;
  });

  let btnCancel = document.getElementById('btn-cancel');
  btnCancel.addEventListener('click', (eve) => {
    let hasUnsavedChanges = 
      my.showingTimingsHeaderWithStar ||
      showingTimingsConfigHeaderWithStar ||
      showingNotebookHeaderWithStar;

    let isToCancel = true;
    if (hasUnsavedChanges) {
      isToCancel = confirm('Please confirm cancelling unsaved changes by pressing OK.');
    }
    if (isToCancel) {
      window.webkit.messageHandlers.preferences_msg__cancel.postMessage();
    }
  });

  my.showingTimingsHeaderWithStar = false;

  // showTimings(my.timingsToShow);
  my.timingsFileInfosListView.initHtml();

  let btnNewTimingsFile = document.getElementById('btn-new-timings-file');
  btnNewTimingsFile.addEventListener('click', (eve) => {
    let textareaCategoryPath = document.getElementById('new-timing-category-path');
    textareaCategoryPath.disabled = true;

    let panelOfListOfTimingsFiles = document.getElementById('list-of-timings-files-panel');
    panelOfListOfTimingsFiles.classList.remove('active');
    panelOfListOfTimingsFiles.classList.add('inactive');

    let newTimingsFileForm = document.getElementById('form-to-edit-timings-file-info');
    newTimingsFileForm.classList.remove('inactive');
    newTimingsFileForm.classList.add('active');

    let bottomRowOfButtons = document.getElementById('bottom-buttons-row');
    bottomRowOfButtons.classList.add('hidden-behind-dialog');
  });

  let inputName = document.getElementById('new-timing-name');
  let inputFilepath = document.getElementById('new-timing-filepath');
  let textareaCategoryPath = document.getElementById('new-timing-category-path');

  disableShortcutsOnFocus(inputName);
  disableShortcutsOnFocus(inputFilepath);
  disableShortcutsOnFocus(textareaCategoryPath);

  let btnTimingsFileInfoSave = document.getElementById('btn-timings-file-info-save');
  btnTimingsFileInfoSave.addEventListener('click', (eve) => {
    let inputName = document.getElementById('new-timing-name');
    let inputFilepath = document.getElementById('new-timing-filepath');
    let checkboxCategoryPathIsSameAsName = document.getElementById('category-path-is-same-as-name');
    let textareaCategoryPath = document.getElementById('new-timing-category-path');
    let selectorOfFormat = document.getElementById('new-timing-format');

    let name = inputName.value;
    let filepath = inputFilepath.value;
    let format = selectorOfFormat.value;

    let timingsFileInfo = {
      name: name,
      format: format,
      filepath: filepath,
    }
    let categoryPathIsSameAsName = checkboxCategoryPathIsSameAsName.checked;
    if (!categoryPathIsSameAsName) {
      let categoryPath = parseCategoryPath(textareaCategoryPath.value);
      timingsFileInfo.categoryPath = categoryPath;
    }

    if (my.currentTimingsFileInfoBeingEdited) {
      Object.assign(my.currentTimingsFileInfoBeingEdited, timingsFileInfo, {categoryPath: timingsFileInfo.categoryPath});
      my.currentTimingsFileInfoBeingEdited.view.refresh();
      delete my.currentTimingsFileInfoBeingEdited;
    } else {
      let newTimingsFileInfo = timingsFileInfo;

      // config.timings.push(newTimingsFileInfo);
      // my.timingsToShow.push(newTimingsFileInfo);
      my.timingsFileInfosListView.addNewInfo(newTimingsFileInfo);

      my.timingsToAddByName[name] = newTimingsFileInfo;
    }

    inputName.value = '';
    inputFilepath.value = '';
    checkboxCategoryPathIsSameAsName.checked = true;
    textareaCategoryPath.value = '';
    textareaCategoryPath.disabled = true;
    selectorOfFormat.value = 'yaml';

    // showTimings(my.timingsToShow);

    let panelOfListOfTimingsFiles = document.getElementById('list-of-timings-files-panel');
    panelOfListOfTimingsFiles.classList.add('active');
    panelOfListOfTimingsFiles.classList.remove('inactive');

    let newTimingsFileForm = document.getElementById('form-to-edit-timings-file-info');
    newTimingsFileForm.classList.add('inactive');
    newTimingsFileForm.classList.remove('active');

    let bottomRowOfButtons = document.getElementById('bottom-buttons-row');
    bottomRowOfButtons.classList.remove('hidden-behind-dialog');

    showOrHideStarInTimingsHeader();
  });
  let btnTimingsFileInfoEditCancel = document.getElementById('btn-timings-file-info-cancel');
  btnTimingsFileInfoEditCancel.addEventListener('click', (eve) => {

    delete my.currentTimingsFileInfoBeingEdited;

    let inputName = document.getElementById('new-timing-name');
    let inputFilepath = document.getElementById('new-timing-filepath');
    let checkboxCategoryPathIsSameAsName = document.getElementById('category-path-is-same-as-name');
    let textareaCategoryPath = document.getElementById('new-timing-category-path');
    let selectorOfFormat = document.getElementById('new-timing-format');

    inputName.value = '';
    inputFilepath.value = '';
    checkboxCategoryPathIsSameAsName.checked = true;
    textareaCategoryPath.value = '';
    textareaCategoryPath.disabled = true;
    selectorOfFormat.value = 'yaml';

    let panelOfListOfTimingsFiles = document.getElementById('list-of-timings-files-panel');
    panelOfListOfTimingsFiles.classList.add('active');
    panelOfListOfTimingsFiles.classList.remove('inactive');

    let newTimingsFileForm = document.getElementById('form-to-edit-timings-file-info');
    newTimingsFileForm.classList.add('inactive');
    newTimingsFileForm.classList.remove('active');

    let bottomRowOfButtons = document.getElementById('bottom-buttons-row');
    bottomRowOfButtons.classList.remove('hidden-behind-dialog');
  });

  let checkboxCategoryPathIsSameAsName = document.getElementById('category-path-is-same-as-name');
  checkboxCategoryPathIsSameAsName.addEventListener('change', (eve) => {
    let checked = checkboxCategoryPathIsSameAsName.checked;
    let textareaCategoryPath = document.getElementById('new-timing-category-path');
    textareaCategoryPath.value = '';
    if (checked) {
      textareaCategoryPath.disabled = true;
    } else {
      textareaCategoryPath.disabled = false;
    }
  });

  let timingsBtnFilepath = document.getElementById('new-timing-filepath-btn');
  timingsBtnFilepath.addEventListener('click', async (eve) => {
    let result = await pickFile();
    if (result.canceled) {
      return;
    }
    if (result.filePaths === undefined || result.filePaths.length === 0) {
      return;
    }
    let filepath = result.filePaths[0];
    let inputFilepath = document.getElementById('new-timing-filepath');
    inputFilepath.value = filepath;

    let event = new Event('change');
    inputFilepath.dispatchEvent(event);
  });

  let showingTimingsConfigHeaderWithStar = false;

  let timingsInputTextualDisplayFormat = document.getElementById('timings-textual-display-format');
  timingsInputTextualDisplayFormat.value = config['timings-config']['display-format'];
  timingsInputTextualDisplayFormat.addEventListener('change', (eve) => {
    let currentValue = timingsInputTextualDisplayFormat.value;
    config['timings-config']['display-format'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig['timings-config']['display-format'];
    let label = document.getElementById('tab2-label');
    if (!sameAsOldValue) {
      if (!showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      showingTimingsConfigHeaderWithStar = true;
    }
  });

  let timingsRadioBtnUnderlineCanvas = document.getElementById('underline-canvas');
  timingsRadioBtnUnderlineCanvas.checked = !!config['timings-config']['underline-canvas'];
  timingsRadioBtnUnderlineCanvas.addEventListener('change', (eve) => {
    let currentValue = timingsRadioBtnUnderlineCanvas.checked;
    config['timings-config']['underline-canvas'] = currentValue;
    let sameAsOldValue = currentValue === !!originalConfig['timings-config']['underline-canvas'];
    let label = document.getElementById('tab2-label');
    if (!sameAsOldValue) {
      if (!showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      showingTimingsConfigHeaderWithStar = true;
    }
  });

  let timingsRadioBtnFlexibleWidth = document.getElementById('canvas-with-flexible-width');
  timingsRadioBtnFlexibleWidth.checked = !!config['timings-config']['canvas-with-flexible-width'];
  timingsRadioBtnFlexibleWidth.addEventListener('change', (eve) => {
    let currentValue = timingsRadioBtnFlexibleWidth.checked;
    config['timings-config']['canvas-with-flexible-width'] = currentValue;
    timingsInputCanvasWidth.disabled = currentValue;
    let sameAsOldValue = currentValue === !!originalConfig['timings-config']['canvas-with-flexible-width'];
    let label = document.getElementById('tab2-label');
    if (!sameAsOldValue) {
      if (!showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      showingTimingsConfigHeaderWithStar = true;
    }
  });

  let timingsInputCanvasWidth = document.getElementById('canvas-width-in-px');
  timingsInputCanvasWidth.disabled = !!config['timings-config']['canvas-with-flexible-width'];
  timingsInputCanvasWidth.value = config['timings-config']['canvas-width-in-px'];
  timingsInputCanvasWidth.addEventListener('change', (eve) => {
    let currentValue = parseInt(timingsInputCanvasWidth.value);
    if (isNaN(currentValue)) {
      alert('must be int');
      return;
    }
    timingsInputCanvasWidth.value = currentValue.toString();
    config['timings-config']['canvas-width-in-px'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig['timings-config']['canvas-width-in-px'];
    let label = document.getElementById('tab2-label');
    if (!sameAsOldValue) {
      if (!showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      showingTimingsConfigHeaderWithStar = true;
    }
  });

  let timingsSelectDefaultSummary = document.getElementById('timings-default-summary');
  timingsSelectDefaultSummary.value = config['timings-config']['default-summary'];
  timingsSelectDefaultSummary.addEventListener('change', (eve) => {
    let currentValue = timingsSelectDefaultSummary.value;
    config['timings-config']['default-summary'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig['timings-config']['default-summary'];
    let label = document.getElementById('tab2-label');
    if (!sameAsOldValue) {
      if (!showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      showingTimingsConfigHeaderWithStar = true;
    }
  });

  let showingNotebookHeaderWithStar = false;

  let notebookInputFilepath = document.getElementById('notebook-filepath');
  notebookInputFilepath.value = config.notebook.filepath;
  notebookInputFilepath.addEventListener('change', (eve) => {
    let currentValue = notebookInputFilepath.value;
    config['notebook'].filepath = currentValue;
    let sameAsOldValue = currentValue === originalConfig.notebook.filepath;
    let label = document.getElementById('tab3-label');
    if (!sameAsOldValue) {
      if (!showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      showingNotebookHeaderWithStar = true;
    }
  });
  disableShortcutsOnFocus(notebookInputFilepath);

  let notebookFilepathBtn = document.getElementById('notebook-filepath-btn');
  notebookFilepathBtn.addEventListener('click', async (eve) => {
    let result = await pickFile();
    if (result.canceled) {
      return;
    }
    if (result.filePaths === undefined || result.filePaths.length === 0) {
      return;
    }
    let filepath = result.filePaths[0];
    notebookInputFilepath.value = filepath;

    let event = new Event('change');
    notebookInputFilepath.dispatchEvent(event);
  });

  let notebookInputBackgroundColor = document.getElementById('notebook-background-color');
  notebookInputBackgroundColor.value = config.notebook['background-color'];
  notebookInputBackgroundColor.addEventListener('change', (eve) => {
    let currentValue = notebookInputBackgroundColor.value;
    config['notebook']['background-color'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig.notebook['background-color'];
    let label = document.getElementById('tab3-label');
    if (!sameAsOldValue) {
      if (!showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      showingNotebookHeaderWithStar = true;
    }
  });
  disableShortcutsOnFocus(notebookInputBackgroundColor);

  let notebookRadioBtnStartWithBottomPanelOfNotesMaximized =
    document.getElementById('start-notebook-with-bottom-panel-of-notes-maximized');
  notebookRadioBtnStartWithBottomPanelOfNotesMaximized.checked = !!config.notebook['start-with-bottom-panel-of-notes-maximized'];
  notebookRadioBtnStartWithBottomPanelOfNotesMaximized.addEventListener('change', (eve) => {
    let currentValue = notebookRadioBtnStartWithBottomPanelOfNotesMaximized.checked;
    config['notebook']['start-with-bottom-panel-of-notes-maximized'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig.notebook['start-with-bottom-panel-of-notes-maximized'];
    let label = document.getElementById('tab3-label');
    if (!sameAsOldValue) {
      if (!showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      showingNotebookHeaderWithStar = true;
    }
  });

  let notebookInputFontSizeOfTopPanelOfTags = 
    document.getElementById('font-size-in-px-of-top-panel-of-tags');
  notebookInputFontSizeOfTopPanelOfTags.value =
    config.notebook['font-size-in-px-of-top-panel-of-tags'];
  notebookInputFontSizeOfTopPanelOfTags.addEventListener('change', (eve) => {
    let currentValue = parseInt(notebookInputFontSizeOfTopPanelOfTags.value);
    if (isNaN(currentValue)) {
      alert('must be int');
      return;
    }
    notebookInputFontSizeOfTopPanelOfTags.value = currentValue.toString();
    config.notebook['font-size-in-px-of-top-panel-of-tags'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig.notebook['font-size-in-px-of-top-panel-of-tags'];
    let label = document.getElementById('tab3-label');
    if (!sameAsOldValue) {
      if (!showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      showingNotebookHeaderWithStar = true;
    }
  });
  disableShortcutsOnFocus(notebookInputFontSizeOfTopPanelOfTags);

  let notebookInputFontSizeOfBottomPanelOfTags = 
    document.getElementById('font-size-in-px-of-bottom-panel-of-tags');
  notebookInputFontSizeOfBottomPanelOfTags.value =
    config.notebook['font-size-in-px-of-bottom-panel-of-tags'];
  notebookInputFontSizeOfBottomPanelOfTags.addEventListener('change', (eve) => {
    let currentValue = parseInt(notebookInputFontSizeOfBottomPanelOfTags.value);
    if (isNaN(currentValue)) {
      alert('must be int');
      return;
    }
    notebookInputFontSizeOfBottomPanelOfTags.value = currentValue.toString();
    config.notebook['font-size-in-px-of-bottom-panel-of-tags'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig.notebook['font-size-in-px-of-bottom-panel-of-tags'];
    let label = document.getElementById('tab3-label');
    if (!sameAsOldValue) {
      if (!showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      showingNotebookHeaderWithStar = true;
    }
  });
  disableShortcutsOnFocus(notebookInputFontSizeOfBottomPanelOfTags);

  let notebookInputFontSizeOfTopPanelOfNotes = 
    document.getElementById('font-size-in-px-of-top-panel-of-notes');
  notebookInputFontSizeOfTopPanelOfNotes.value =
    config.notebook['font-size-in-px-of-top-panel-of-notes'];
  notebookInputFontSizeOfTopPanelOfNotes.addEventListener('change', (eve) => {
    let currentValue = parseInt(notebookInputFontSizeOfTopPanelOfNotes.value);
    if (isNaN(currentValue)) {
      alert('must be int');
      return;
    }
    notebookInputFontSizeOfTopPanelOfNotes.value = currentValue.toString();
    config.notebook['font-size-in-px-of-top-panel-of-notes'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig.notebook['font-size-in-px-of-top-panel-of-notes'];
    let label = document.getElementById('tab3-label');
    if (!sameAsOldValue) {
      if (!showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      showingNotebookHeaderWithStar = true;
    }
  });
  disableShortcutsOnFocus(notebookInputFontSizeOfTopPanelOfNotes);

  let notebookInputFontSizeOfBottomPanelOfNotes = 
    document.getElementById('font-size-in-px-of-bottom-panel-of-notes');
  notebookInputFontSizeOfBottomPanelOfNotes.value =
    config.notebook['font-size-in-px-of-bottom-panel-of-notes'];
  notebookInputFontSizeOfBottomPanelOfNotes.addEventListener('change', (eve) => {
    let currentValue = parseInt(notebookInputFontSizeOfBottomPanelOfNotes.value);
    if (isNaN(currentValue)) {
      alert('must be int');
      return;
    }
    notebookInputFontSizeOfBottomPanelOfNotes.value = currentValue.toString();
    config.notebook['font-size-in-px-of-bottom-panel-of-notes'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig.notebook['font-size-in-px-of-bottom-panel-of-notes'];
    let label = document.getElementById('tab3-label');
    if (!sameAsOldValue) {
      if (!showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      showingNotebookHeaderWithStar = true;
    }
  });
  disableShortcutsOnFocus(notebookInputFontSizeOfBottomPanelOfNotes);

  function initNotebookCheckbox(htmlElemId, configName) {
    if (configName === undefined) {
      configName = htmlElemId;
    }

    let notebookCheckbox = document.getElementById(htmlElemId);
    notebookCheckbox.checked = !!config['notebook'][configName];
    notebookCheckbox.addEventListener('change', (eve) => {
      let currentValue = notebookCheckbox.checked;
      config['notebook'][configName] = currentValue;
      let sameAsOldValue = currentValue === !!originalConfig['notebook'][configName];
      let label = document.getElementById('tab3-label');
      if (!sameAsOldValue) {
        if (!showingNotebookHeaderWithStar) {
          label.innerHTML = 'Notebook*';
          showingNotebookHeaderWithStar = true;
        }
        return;
      }
      if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
        label.innerHTML = 'Notebook';
        showingNotebookHeaderWithStar = false;
      } else {
        label.innerHTML = 'Notebook*';
        showingNotebookHeaderWithStar = true;
      }
    });
  }

  initNotebookCheckbox('tag-icon-open-in-tree-above');
  initNotebookCheckbox('tag-icon-edit');
  initNotebookCheckbox('tag-icon-move-to-top');
  initNotebookCheckbox('tag-icon-move-to-bottom');
  initNotebookCheckbox('tag-icon-hide');
  initNotebookCheckbox('tag-icon-hide-siblings-below');
  initNotebookCheckbox('tag-icon-unhide-hidden-children');

  initNotebookCheckbox('notes-icon-open-in-tree-above');
  initNotebookCheckbox('notes-icon-open-tag-in-tags-tree');
  initNotebookCheckbox('notes-icon-open-tags-of-children-in-tags-tree');
  initNotebookCheckbox('notes-icon-edit');
  initNotebookCheckbox('notes-icon-move-to-top');
  initNotebookCheckbox('notes-icon-move-to-bottom');
  initNotebookCheckbox('notes-icon-hide');
  initNotebookCheckbox('notes-icon-hide-siblings-below');
  initNotebookCheckbox('notes-icon-unhide-hidden-children');
  initNotebookCheckbox('notes-icon-add-sibling-node');
  initNotebookCheckbox('notes-icon-append-child-node');
  initNotebookCheckbox('notes-icon-delete');
}


function TimingsFileInfosListView(timingsToShow) {
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

TimingsFileInfosListView.prototype.dataIsSameAsOriginal = function() {
  let that = this;
  if (Object.keys(my.timingsToAddByName).length > 0) {
    return false;
  }
  if (Object.keys(my.timingsToDeleteByName).length > 0) {
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


  let setOfDeletedNames = new Set(Object.keys(my.timingsToDeleteByName));
  for (let t of that.timingsToShow) {
    let wasAddedAndDeleted = t.original === undefined && my.timingsToAddByName[t.name] === undefined;
    let wasDeleted = setOfDeletedNames.has(t.name);

    if (wasAddedAndDeleted || wasDeleted) {
      t.view.html.parentNode.removeChild(t.view.html);
    }
  }
  that.timingsToShow = that.timingsToShow.filter(t => !setOfDeletedNames.has(t.name));
  that.timingsFileInfoViews = that.timingsToShow.map(t => t.view);

  my.timingsToAddByName = {};
  my.timingsToDeleteByName = {};
};

function timingsFileInfoIsSameAsOriginal(timingsFileInfo) {
  let fieldNames = ['name', 'filepath', 'format', 'categoryPath'];
  let orig = timingsFileInfo.original;
  for (let fieldName of fieldNames) {
    let areEqual = timingsFileInfo[fieldName] === orig[fieldName];
    if (!areEqual) {
      return false;
    }
  }
  return true;
}

function TimingsFileInfoView(timingsFileInfo) {
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
  that.html = withChildren(withClass(document.createElement('div'), 'timings-file-info-view'),
    that.createDivOfTimingsFileButtons(),
    that.nameDiv,
    that.formatDiv,
    that.filepathDiv,
    that.categoryPathDiv
  );
}

TimingsFileInfoView.prototype.refresh = function() {
  let that = this;
  let timingsFileInfo = that.timingsFileInfo;

  that.nameDiv.innerHTML = `name: ${timingsFileInfo.name}`;
  that.formatDiv.innerHTML = `format: ${timingsFileInfo.format}`;
  that.filepathDiv.innerHTML = `filepath: ${timingsFileInfo.filepath}`;
  that.categoryPathDiv.innerHTML = `category path: ${categoryPathToString(timingsFileInfo)}`;

  let categoryPathIsSameAsName = timingsFileInfo.categoryPath === undefined || (timingsFileInfo.categoryPath.length === 1 && timingsFileInfo.categoryPath[0] === timingsFileInfo.name);
  if (categoryPathIsSameAsName) {
    that.categoryPathDiv.classList.add('category-path-is-same-as-name');
  } else {
    that.categoryPathDiv.classList.remove('category-path-is-same-as-name');
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

  my.currentTimingsFileInfoBeingEdited = timingsFileInfo;

  let inputName = document.getElementById('new-timing-name');
  let inputFilepath = document.getElementById('new-timing-filepath');
  let checkboxCategoryPathIsSameAsName = document.getElementById('category-path-is-same-as-name');
  let textareaCategoryPath = document.getElementById('new-timing-category-path');
  let selectorOfFormat = document.getElementById('new-timing-format');

  inputName.value = timingsFileInfo.name;
  inputFilepath.value = timingsFileInfo.filepath;
  let categoryPathIsSameAsName = timingsFileInfo.categoryPath === undefined || (timingsFileInfo.categoryPath.length === 1 && timingsFileInfo.categoryPath[0] === timingsFileInfo.name);
  checkboxCategoryPathIsSameAsName.checked = categoryPathIsSameAsName;
  textareaCategoryPath.disabled = categoryPathIsSameAsName;
  if (!categoryPathIsSameAsName) {
    textareaCategoryPath.value = timingsFileInfo.categoryPath.join('\n');
  }
  selectorOfFormat.value = timingsFileInfo.format;

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

  if (my.timingsToAddByName.hasOwnProperty(timingsFileInfo.name)) {
    delete my.timingsToAddByName[timingsFileInfo.name];
  } else {
    my.timingsToDeleteByName[timingsFileInfo.name] = true;
  }

  that.html.classList.add('to-be-deleted');
  showOrHideStarInTimingsHeader();
};


TimingsFileInfoView.prototype.btnHandlerUndoDeletionOfTimingsFileInfo = function() {
  let that = this;
  let timingsFileInfo = that.timingsFileInfo;

  if (my.timingsToDeleteByName[timingsFileInfo.name]) {
    delete my.timingsToDeleteByName[timingsFileInfo.name];
  } else {
    my.timingsToAddByName[timingsFileInfo.name] = timingsFileInfo;
  }

  that.html.classList.remove('to-be-deleted');
  showOrHideStarInTimingsHeader();
}

function showOrHideStarInTimingsHeader() {
  let isSame = my.timingsFileInfosListView.dataIsSameAsOriginal();
  my.showingTimingsHeaderWithStar = !isSame;
  let label = document.getElementById('tab1-label');
  if (isSame) {
    label.innerHTML = 'Timings';
  } else {
    label.innerHTML = 'Timings*';
  }
}

function createCopyOfConfig(config) {
  let result = {};
  result.timings = [];
  for (let i = 0; i < config.timings.length; i++) {
    result.timings.push(Object.assign({}, config.timings[i]));
  }
  result['timings-config'] = Object.assign({}, config['timings-config']);
  result.notebook = Object.assign({}, config.notebook);
  return result;
}

function createCopyOfTimings(config) {
  return config.timings.map(t => createCopyOfTiming(t));
}

function createCopyOfTiming(t) {
  let copy = Object.assign({}, t);
  copy.original = t;
  return copy;
}

function timingsConfigIsSameAsOriginal(timingsConfig, originalTimingsConfig) {
  return timingsConfig['display-format'] === originalTimingsConfig['display-format'] &&
         timingsConfig['underline-canvas'] === originalTimingsConfig['underline-canvas'] &&
         timingsConfig['canvas-with-flexible-width'] === originalTimingsConfig['canvas-with-flexible-width'] &&
         timingsConfig['canvas-width-in-px'] === originalTimingsConfig['canvas-width-in-px'] &&
         timingsConfig['default-summary'] === originalTimingsConfig['default-summary'];
}

function notebookConfigIsSameAsOriginal(notebookConfig, originalNotebookConfig) {
  return notebookConfig['filepath'] === originalNotebookConfig['filepath'] &&
         notebookConfig['background-color'] === originalNotebookConfig['background-color'] &&
         notebookConfig['start-with-bottom-panel-of-notes-maximized'] === originalNotebookConfig['start-with-bottom-panel-of-notes-maximized'] &&
         notebookConfig['font-size-in-px-of-top-panel-of-tags'] === originalNotebookConfig['font-size-in-px-of-top-panel-of-tags'] &&
         notebookConfig['font-size-in-px-of-bottom-panel-of-tags'] === originalNotebookConfig['font-size-in-px-of-bottom-panel-of-tags'] &&
         notebookConfig['font-size-in-px-of-top-panel-of-notes'] === originalNotebookConfig['font-size-in-px-of-top-panel-of-notes'] &&
         notebookConfig['font-size-in-px-of-bottom-panel-of-notes'] === originalNotebookConfig['font-size-in-px-of-bottom-panel-of-notes'];
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

function parseCategoryPath(textareaContents) {
  let splittedByNewline = textareaContents.split('\n');
  let noEmptyStrings = splittedByNewline.filter(line => line.length > 0);
  return noEmptyStrings;
}

function pickFile() {
  return new Promise((resolve, reject) => {
    window.webkit.messageHandlers.preferences_msg__choose_file.postMessage();
    my.filepicker_result_handler = (result) => {
      resolve(result);
    }
  });
}

function disableShortcutsOnFocus(inputElem) {
  inputElem.addEventListener('focus', (eve) => {
    window.webkit.messageHandlers.preferences_msg__disable_shortcuts.postMessage();
  });
  inputElem.addEventListener('blur', (eve) => {
    window.webkit.messageHandlers.preferences_msg__enable_shortcuts.postMessage();
  });
}
