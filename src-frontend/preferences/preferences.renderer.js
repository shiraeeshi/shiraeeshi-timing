const { withChildren } = require('../js/html_utils.js');

window.webkit.messageHandlers.preferences_msgs.onMessage(handleServerMessage);

let my = {};

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

  let btnSave = document.getElementById('btn-save');
  btnSave.addEventListener('click', (eve) => {
    let hasUnsavedChanges = 
      showingTimingsHeaderWithStar ||
      showingTimingsConfigHeaderWithStar ||
      showingNotebookHeaderWithStar;
    if (!hasUnsavedChanges) {
      window.webkit.messageHandlers.preferences_msg__cancel.postMessage();
      return;
    }
    window.webkit.messageHandlers.preferences_msg__save.postMessage({
      config: config,
      changedTimings: showingTimingsHeaderWithStar,
      changedTimingsConfig: showingTimingsConfigHeaderWithStar,
      changedNotebook: showingNotebookHeaderWithStar
    });
    my.save_result_handler = (result, msg) => {
      if (result === 'error') {
        alert(`There was an error while saving a file. Error message: "${msg.error_message}"`);
        return;
      }
      if (result === 'success') {
        let label = document.getElementById('tab1-label');
        label.innerHTML = 'Timings';
        showingTimingsHeaderWithStar = false;

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

    let hadChangesInTimings = showingTimingsHeaderWithStar;
    if (hadChangesInTimings) {
      showTimings(config.timings);
    }

    let label = document.getElementById('tab1-label');
    label.innerHTML = 'Timings';
    showingTimingsHeaderWithStar = false;

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
      showingTimingsHeaderWithStar ||
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

  let showingTimingsHeaderWithStar = false;

  showTimings(config.timings);

  let btnNewTimingsFile = document.getElementById('btn-new-timings-file');
  btnNewTimingsFile.addEventListener('click', (eve) => {
    let panelOfListOfTimingsFiles = document.getElementById('list-of-timings-files-panel');
    panelOfListOfTimingsFiles.classList.remove('active');
    panelOfListOfTimingsFiles.classList.add('inactive');

    let newTimingsFileForm = document.getElementById('new-timings-file-form');
    newTimingsFileForm.classList.remove('inactive');
    newTimingsFileForm.classList.add('active');
  });

  let btnNewTimingsFileSave = document.getElementById('btn-new-timings-file-save');
  btnNewTimingsFileSave.addEventListener('click', (eve) => {
    let inputName = document.getElementById('new-timing-name');
    let inputFilepath = document.getElementById('new-timing-filepath');
    let checkboxCategoryPathIsSameAsName = document.getElementById('category-path-is-same-as-name');
    let textareaCategoryPath = document.getElementById('new-timing-category-path');
    let selectorOfFormat = document.getElementById('new-timing-format');

    let name = inputName.value;
    let filepath = inputFilepath.value;
    let format = selectorOfFormat.value;
    let categoryPathIsSameAsName = checkboxCategoryPathIsSameAsName.checked;
    let categoryPath;
    if (categoryPathIsSameAsName) {
      categoryPath = [name];
    } else {
      categoryPath = parseCategoryPath(textareaCategoryPath.value);
    }

    config.timings.push({
      name: name,
      format: format,
      filepath: filepath,
      categoryPath: categoryPath
    });

    inputName.value = '';
    inputFilepath.value = '';
    checkboxCategoryPathIsSameAsName.checked = true;
    textareaCategoryPath.value = '';
    textareaCategoryPath.disabled = true;
    selectorOfFormat.value = 'yaml';

    showTimings(config.timings);

    let panelOfListOfTimingsFiles = document.getElementById('list-of-timings-files-panel');
    panelOfListOfTimingsFiles.classList.add('active');
    panelOfListOfTimingsFiles.classList.remove('inactive');

    let newTimingsFileForm = document.getElementById('new-timings-file-form');
    newTimingsFileForm.classList.add('inactive');
    newTimingsFileForm.classList.remove('active');

    showingTimingsHeaderWithStar = true;
    let label = document.getElementById('tab1-label');
    label.innerHTML = 'Timings*';
  });
  let btnNewTimingsFileCancel = document.getElementById('btn-new-timings-file-cancel');
  btnNewTimingsFileCancel.addEventListener('click', (eve) => {
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

    let newTimingsFileForm = document.getElementById('new-timings-file-form');
    newTimingsFileForm.classList.add('inactive');
    newTimingsFileForm.classList.remove('active');
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
}

function showTimings(timings) {
  let tabContentsOfTimings = document.getElementById('list-of-timings-files');
  tabContentsOfTimings.innerHTML = '';
  withChildren(tabContentsOfTimings,
    ...timings.map(timing => withChildren(document.createElement('div'),
      withChildren(document.createElement('div'),
        document.createTextNode(`name: ${timing.name}`)
      ),
      withChildren(document.createElement('div'),
        document.createTextNode(`format: ${timing.format}`)
      ),
      withChildren(document.createElement('div'),
        document.createTextNode(`filepath: ${timing.filepath}`)
      ),
      withChildren(document.createElement('div'),
        document.createTextNode(`category path: ${categoryPathToString(timing)}`)
      ),
    ))
  );
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
