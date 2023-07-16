const { withChildren, withClass } = require('../js/html_utils.js');

window.webkit.messageHandlers.preferences_msgs.onMessage(handleServerMessage);

let my = {
  timingsToAddByName: {},
  timingsToDeleteByName: {},
  currentTimingsFileInfoBeingEdited: undefined,
  timingsFileInfosListView: undefined,
  wallpapersToAddByName: {},
  wallpapersToDeleteByName: {},
  newNamesOfWallpapersToRenameByOldName: {},
  currentWallpaperInfoBeingEdited: undefined,
  wallpapersListView: undefined,
  showingTimingsHeaderWithStar: false,
  showingTimingsConfigHeaderWithStar: false,
  showingNotebookHeaderWithStar: false,
  showingFrequenciesHeaderWithStar: false,
  showingPostTimingDialogHeaderWithStar: false,
  showingWallpapersHeaderWithStar: false,
};

function handleServerMessage(msg) {
  if (msg.type === 'filepicker_result') {
    if (my.filepicker_result_handler) {
      my.filepicker_result_handler(msg.result);
      delete my.filepicker_result_handler;
    }
    return;
  }
  if (msg.type === 'result_filename_exists_in_wallpapers_dir') {
    if (my.result_handler_filename_exists_in_wallpapers_dir) {
      my.result_handler_filename_exists_in_wallpapers_dir(msg.filename, msg.exists);
      delete my.result_handler_filename_exists_in_wallpapers_dir;
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
  if (msg.type === 'confirm_quit') {
    let hasUnsavedChanges = 
      my.showingTimingsHeaderWithStar ||
      my.showingTimingsConfigHeaderWithStar ||
      my.showingNotebookHeaderWithStar ||
      my.showingFrequenciesHeaderWithStar ||
      my.showingPostTimingDialogHeaderWithStar ||
      my.showingWallpapersHeaderWithStar;
    if (!hasUnsavedChanges) {
      window.webkit.messageHandlers.preferences_msgs__confirm_quit.postMessage();
      return;
    }
    let result = confirm('confirm quit without saving by pressing OK');
    if (result) {
      window.webkit.messageHandlers.preferences_msgs__confirm_quit.postMessage();
    }
    return;
  }
  if (msg.type === 'wallpapers-errors') {
    alert([
      'error related to wallpapers: ',
      ...msg.errors
    ].join('\n'));
    return;
  }
  if (msg.type === 'wallpapers') {
    console.log(`msg type wallpapers. msg:`);
    console.dir(msg);
    my.originalWallpapersWrapper = msg;
    let wallpapersToShow = createListOfWallpapersToShow(msg);
    console.log('wallpapersToShow:');
    console.dir(wallpapersToShow);
    my.wallpapersListView = new WallpapersListView(wallpapersToShow);
    my.wallpapersListView.initHtml();
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
      my.showingTimingsConfigHeaderWithStar ||
      my.showingNotebookHeaderWithStar ||
      my.showingFrequenciesHeaderWithStar ||
      my.showingPostTimingDialogHeaderWithStar ||
      my.showingWallpapersHeaderWithStar;
    if (!hasUnsavedChanges) {
      my.timingsFileInfosListView.handleSaveSuccess();
      my.wallpapersListView.handleSaveSuccess();
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
        if (copy.competitivenessLevel === undefined) {
          copy['competitiveness-level'] = 0;
        } else {
          copy['competitiveness-level'] = copy.competitivenessLevel;
          delete copy.competitivenessLevel;
        }
        return copy;
      });
    }
    my.save_result_handler = (result, msg) => {
      if (result === 'error') {
        alert(`There was an error while saving a file. Error message: "${msg.error_message}"`);
        return;
      }
      if (result === 'success') {
        my.timingsFileInfosListView.handleSaveSuccess();
        my.wallpapersListView.handleSaveSuccess();

        let label = document.getElementById('tab1-label');
        label.innerHTML = 'Timings';
        my.showingTimingsHeaderWithStar = false;

        label = document.getElementById('tab2-label');
        label.innerHTML = 'Timings Config';
        my.showingTimingsConfigHeaderWithStar = false;

        label = document.getElementById('tab3-label');
        label.innerHTML = 'Notebook';
        my.showingNotebookHeaderWithStar = false;

        label = document.getElementById('tab4-label');
        label.innerHTML = 'Frequencies';
        my.showingFrequenciesHeaderWithStar = false;

        label = document.getElementById('tab5-label');
        label.innerHTML = 'Post-timing dialog';
        my.showingPostTimingDialogHeaderWithStar = false;

        label = document.getElementById('tab6-label');
        label.innerHTML = 'Wallpapers';
        my.showingWallpapersHeaderWithStar = false;
      }
    };
    window.webkit.messageHandlers.preferences_msg__save.postMessage({
      configWithNoTimings: Object.assign({}, config, {timings: []}),
      timings: convertToBackendFormat(my.timingsFileInfosListView.timingsToShow),
      timingsToAdd: convertToBackendFormat(Object.values(my.timingsToAddByName)),
      namesOfTimingsToDelete: Object.keys(my.timingsToDeleteByName),
      changedTimings: my.showingTimingsHeaderWithStar,
      changedTimingsConfig: my.showingTimingsConfigHeaderWithStar,
      changedNotebook: my.showingNotebookHeaderWithStar,
      wallpapers: convertWallpapersListToBackendFormat(my.wallpapersListView.wallpapersToShow),
      wallpapersToAdd: convertWallpapersToAddListToBackendFormat(Object.values(my.wallpapersToAddByName)),
      newNamesOfWallpapersToRenameByOldName: my.newNamesOfWallpapersToRenameByOldName,
      namesOfWallpapersToDelete: Object.keys(my.wallpapersToDeleteByName),
    });
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
    notebookInputFontSizeOfTooltips.value =
      config.notebook['font-size-in-px-of-tooltips'];
    let notebookIconPropNames = [
      'tag-icon-open-in-tree-above',
      'tag-icon-edit',
      'tag-icon-move-to-top',
      'tag-icon-move-to-bottom',
      'tag-icon-hide',
      'tag-icon-hide-siblings-below',
      'tag-icon-unhide-hidden-children',

      'notes-icon-open-in-tree-above',
      'notes-icon-open-tag-in-tags-tree',
      'notes-icon-open-tags-of-children-in-tags-tree',
      'notes-icon-open-notes-with-the-same-tag-in-bottom-panel',
      'notes-icon-edit',
      'notes-icon-move-to-top',
      'notes-icon-move-to-bottom',
      'notes-icon-hide',
      'notes-icon-hide-siblings-below',
      'notes-icon-unhide-hidden-children',
      'notes-icon-add-sibling-node',
      'notes-icon-append-child-node',
      'notes-icon-delete',
    ];
    for (let iconPropName of notebookIconPropNames) {
      let checkbox = document.getElementById(iconPropName);
      checkbox.checked = !!config.notebook[iconPropName];
    }

    let frequenciesIconPropNames = [
      'icon-show-this-only',
      'icon-merge-subprocesses',
      'icon-unmerge-subprocesses-as-parent',
      'icon-unmerge-subprocesses-as-subprocess',
      'icon-move-to-top',
      'icon-move-to-bottom',
      'icon-hide',
      'icon-hide-siblings-below',
      'icon-unhide-hidden-children',
    ];
    for (let iconPropName of frequenciesIconPropNames) {
      let checkbox = document.getElementById('frequencies-' + iconPropName);
      checkbox.checked = !!config.frequencies[iconPropName];
    }

    let hadChangesInTimings = my.showingTimingsHeaderWithStar;
    if (hadChangesInTimings) {
      my.timingsFileInfosListView.reset(createCopyOfTimings(config));
    }

    let hadChangesInWallpapers = my.showingWallpapersHeaderWithStar;
    if (hadChangesInWallpapers) {
      my.wallpapersListView.reset(createListOfWallpapersToShow(my.originalWallpapersWrapper));
    }

    let label = document.getElementById('tab1-label');
    label.innerHTML = 'Timings';
    my.showingTimingsHeaderWithStar = false;

    label = document.getElementById('tab2-label');
    label.innerHTML = 'Timings Config';
    my.showingTimingsConfigHeaderWithStar = false;

    label = document.getElementById('tab3-label');
    label.innerHTML = 'Notebook';
    my.showingNotebookHeaderWithStar = false;

    label = document.getElementById('tab4-label');
    label.innerHTML = 'Frequencies';
    my.showingFrequenciesHeaderWithStar = false;

    label = document.getElementById('tab5-label');
    label.innerHTML = 'Post-timing dialog';
    my.showingPostTimingDialogHeaderWithStar = false;

    label = document.getElementById('tab6-label');
    label.innerHTML = 'Wallpapers';
    my.showingWallpapersHeaderWithStar = false;
  });

  let btnCancel = document.getElementById('btn-cancel');
  btnCancel.addEventListener('click', (eve) => {
    let hasUnsavedChanges = 
      my.showingTimingsHeaderWithStar ||
      my.showingTimingsConfigHeaderWithStar ||
      my.showingNotebookHeaderWithStar ||
      my.showingFrequenciesHeaderWithStar ||
      my.showingPostTimingDialogHeaderWithStar ||
      my.showingWallpapersHeaderWithStar;

    let isToCancel = true;
    if (hasUnsavedChanges) {
      isToCancel = confirm('Please confirm cancelling unsaved changes by pressing OK.');
    }
    if (isToCancel) {
      window.webkit.messageHandlers.preferences_msg__cancel.postMessage();
    }
  });

  // showTimings(my.timingsToShow);
  my.timingsFileInfosListView.initHtml();

  let btnNewTimingsFile = document.getElementById('btn-new-timings-file');
  btnNewTimingsFile.addEventListener('click', (eve) => {
    let textareaCategoryPath = document.getElementById('new-timing-category-path');
    textareaCategoryPath.disabled = true;

    let inputCompetitivenessLevel = document.getElementById('new-timing-competitiveness-level');
    inputCompetitivenessLevel.value = '0';

    my.scrollTopOfListOfTimingsFiles = document.getElementById('tab-contents-of-timings').scrollTop;

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
  let inputCompetitivenessLevel = document.getElementById('new-timing-competitiveness-level');

  disableShortcutsOnFocus(inputName);
  disableShortcutsOnFocus(inputFilepath);
  disableShortcutsOnFocus(textareaCategoryPath);
  disableShortcutsOnFocus(inputCompetitivenessLevel);

  let btnTimingsFileInfoSave = document.getElementById('btn-timings-file-info-save');
  btnTimingsFileInfoSave.addEventListener('click', (eve) => {
    let inputName = document.getElementById('new-timing-name');
    let inputFilepath = document.getElementById('new-timing-filepath');
    let selectorOfFormat = document.getElementById('new-timing-format');
    let checkboxCategoryPathIsSameAsName = document.getElementById('category-path-is-same-as-name');
    let textareaCategoryPath = document.getElementById('new-timing-category-path');
    let inputCompetitivenessLevel = document.getElementById('new-timing-competitiveness-level');

    let name = inputName.value;
    let format = selectorOfFormat.value;
    let filepath = inputFilepath.value;
    let competitivenessLevel = parseInt(inputCompetitivenessLevel.value);
    if (isNaN(competitivenessLevel)) {
      alert('competitivenessLevel must be int');
      return;
    }

    let timingsFileInfo = {
      name,
      format,
      filepath,
      competitivenessLevel,
    }

    if (my.timingsFileInfosListView.hasInfoWithName(name)) {
      alert(`name '${name}' is already taken.\ntry different name`);
      return;
    }

    if (my.timingsFileInfosListView.findInfoWithFilepath(filepath) !== undefined) {
      alert('filepath is already in use.');
      return;
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
    selectorOfFormat.value = 'yaml';
    checkboxCategoryPathIsSameAsName.checked = true;
    textareaCategoryPath.value = '';
    textareaCategoryPath.disabled = true;
    inputCompetitivenessLevel.value = '0';

    // showTimings(my.timingsToShow);

    let panelOfListOfTimingsFiles = document.getElementById('list-of-timings-files-panel');
    panelOfListOfTimingsFiles.classList.add('active');
    panelOfListOfTimingsFiles.classList.remove('inactive');

    if (my.scrollTopOfListOfTimingsFiles !== undefined) {
      document.getElementById('tab-contents-of-timings').scrollTop = my.scrollTopOfListOfTimingsFiles;
    }

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
    let selectorOfFormat = document.getElementById('new-timing-format');
    let checkboxCategoryPathIsSameAsName = document.getElementById('category-path-is-same-as-name');
    let textareaCategoryPath = document.getElementById('new-timing-category-path');
    let inputCompetitivenessLevel = document.getElementById('new-timing-competitiveness-level');

    inputName.value = '';
    inputFilepath.value = '';
    selectorOfFormat.value = 'yaml';
    checkboxCategoryPathIsSameAsName.checked = true;
    textareaCategoryPath.value = '';
    textareaCategoryPath.disabled = true;
    inputCompetitivenessLevel.value = '0';

    let panelOfListOfTimingsFiles = document.getElementById('list-of-timings-files-panel');
    panelOfListOfTimingsFiles.classList.add('active');
    panelOfListOfTimingsFiles.classList.remove('inactive');

    if (my.scrollTopOfListOfTimingsFiles !== undefined) {
      document.getElementById('tab-contents-of-timings').scrollTop = my.scrollTopOfListOfTimingsFiles;
    }

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



  let btnNewWallpaper = document.getElementById('btn-new-wallpaper');
  btnNewWallpaper.addEventListener('click', (eve) => {

    my.scrollTopOfListOfWallpapers = document.getElementById('tab-contents-of-wallpapers').scrollTop;

    let panelOfListOfWallpapers = document.getElementById('list-of-wallpapers-panel');
    panelOfListOfWallpapers.classList.remove('active');
    panelOfListOfWallpapers.classList.add('inactive');

    let newWallpaperForm = document.getElementById('form-to-edit-wallpaper-info');
    newWallpaperForm.classList.remove('inactive');
    newWallpaperForm.classList.add('active');

    let bottomRowOfButtons = document.getElementById('bottom-buttons-row');
    bottomRowOfButtons.classList.add('hidden-behind-dialog');

    let selectorOfPosition = document.getElementById('new-wallpaper-position');
    let selectorOfLeftSideTextColor = document.getElementById('text-color-of-left-side');
    let selectorOfLeftSideIconsColor = document.getElementById('icons-color-of-left-side');
    let selectorOfRightSideTextColor = document.getElementById('text-color-of-right-side');
    let selectorOfRightSideIconsColor = document.getElementById('icons-color-of-right-side');

    selectorOfPosition.value = undefined;
    selectorOfLeftSideTextColor.value = undefined;
    selectorOfLeftSideIconsColor.value = undefined;
    selectorOfRightSideTextColor.value = undefined;
    selectorOfRightSideIconsColor.value = undefined;
  });

  let inputWallpaperFilepath = document.getElementById('new-wallpaper-filepath');
  disableShortcutsOnFocus(inputWallpaperFilepath);

  let inputWallpaperFilename = document.getElementById('new-wallpaper-filename');
  disableShortcutsOnFocus(inputWallpaperFilename);

  let btnWallpaperSave = document.getElementById('btn-wallpaper-info-save');
  btnWallpaperSave.addEventListener('click', async (eve) => {
    let inputFilepath = document.getElementById('new-wallpaper-filepath');
    let inputFilename = document.getElementById('new-wallpaper-filename');
    let selectorOfPosition = document.getElementById('new-wallpaper-position');
    let selectorOfLeftSideTextColor = document.getElementById('text-color-of-left-side');
    let selectorOfLeftSideIconsColor = document.getElementById('icons-color-of-left-side');
    let selectorOfRightSideTextColor = document.getElementById('text-color-of-right-side');
    let selectorOfRightSideIconsColor = document.getElementById('icons-color-of-right-side');

    let filepath = inputFilepath.value;
    let filename = inputFilename.value;
    // let name = my.currentFilepathBasename;
    let relativePath = my.currentFilepathRelative;
    let position = selectorOfPosition.value;
    let leftSideTextColor = selectorOfLeftSideTextColor.value;
    let leftSideIconsColor = selectorOfLeftSideIconsColor.value;
    let rightSideTextColor = selectorOfRightSideTextColor.value;
    let rightSideIconsColor = selectorOfRightSideIconsColor.value;

    let wallpaperInfo = {
      // name,
      filepath,
      basename: filename,
      relativePath,
      position,
      leftSideTextColor,
      leftSideIconsColor,
      rightSideTextColor,
      rightSideIconsColor,
    }

    if (my.wallpapersListView.hasInfoWithFilename(filename)) {
      alert(`filename '${filename}' is already taken.\ntry different filename`);
      return;
    }

    let filenameExistsInDir = await filenameExistsInWallpapersDir(filename);

    if (filenameExistsInDir) {
      alert(`a file named '${filename}' already exists in the wallpapers folder.\n` +
        'try different filename or rename the file in the wallpapers folder.'
      );
      return;
    }

    if (position === '') {
      delete wallpaperInfo.position;
    }
    if (leftSideTextColor === '') {
      delete wallpaperInfo.leftSideTextColor;
    }
    if (leftSideIconsColor === '') {
      delete wallpaperInfo.leftSideIconsColor;
    }
    if (rightSideTextColor === '') {
      delete wallpaperInfo.rightSideTextColor;
    }
    if (rightSideIconsColor === '') {
      delete wallpaperInfo.rightSideIconsColor;
    }

    if (my.currentWallpaperInfoBeingEdited) {
      if (my.currentWallpaperInfoBeingEdited.basename !== wallpaperInfo.basename &&
        my.currentWallpaperInfoBeingEdited.original !== undefined) {
        my.newNamesOfWallpapersToRenameByOldName[my.currentWallpaperInfoBeingEdited.original.basename] = wallpaperInfo.basename;
        let wallpapersDirPathLen = my.currentWallpaperInfoBeingEdited.filepath.length - my.currentWallpaperInfoBeingEdited.basename.length;
        let wallpapersDirPath = my.currentWallpaperInfoBeingEdited.filepath.slice(0, wallpapersDirPathLen);
        wallpaperInfo.filepath = wallpapersDirPath + wallpaperInfo.basename;
      }
      Object.assign(my.currentWallpaperInfoBeingEdited, wallpaperInfo);
      my.currentWallpaperInfoBeingEdited.view.refresh();
      delete my.currentWallpaperInfoBeingEdited;
    } else {
      let newWallpaperInfo = wallpaperInfo;
      my.wallpapersListView.addNewInfo(newWallpaperInfo);
      my.wallpapersToAddByName[filename] = newWallpaperInfo;
    }

    let filepathFieldContainer = document.getElementById('new-wallpaper-filepath-field-container');

    filepathFieldContainer.classList.remove('disabled-filepath-field');
    inputFilepath.disabled = false;

    inputFilepath.value = '';
    inputFilename.value = '';
    selectorOfPosition.value = undefined;
    selectorOfLeftSideTextColor.value = undefined;
    selectorOfLeftSideIconsColor.value = undefined;
    selectorOfRightSideTextColor.value = undefined;
    selectorOfRightSideIconsColor.value = undefined;

    let panelOfListOfWallpapers = document.getElementById('list-of-wallpapers-panel');
    panelOfListOfWallpapers.classList.add('active');
    panelOfListOfWallpapers.classList.remove('inactive');

    if (my.scrollTopOfListOfWallpapers !== undefined) {
      document.getElementById('tab-contents-of-wallpapers').scrollTop = my.scrollTopOfListOfWallpapers;
    }

    let newWallpaperForm = document.getElementById('form-to-edit-wallpaper-info');
    newWallpaperForm.classList.add('inactive');
    newWallpaperForm.classList.remove('active');

    let bottomRowOfButtons = document.getElementById('bottom-buttons-row');
    bottomRowOfButtons.classList.remove('hidden-behind-dialog');

    showOrHideStarInWallpapersHeader();
  });

  let btnWallpaperInfoEditCancel = document.getElementById('btn-wallpaper-info-cancel');
  btnWallpaperInfoEditCancel.addEventListener('click', (eve) => {

    delete my.currentWallpaperInfoBeingEdited;

    let inputFilepath = document.getElementById('new-wallpaper-filepath');
    let inputFilename = document.getElementById('new-wallpaper-filename');
    let selectorOfPosition = document.getElementById('new-wallpaper-position');
    let selectorOfLeftSideTextColor = document.getElementById('text-color-of-left-side');
    let selectorOfLeftSideIconsColor = document.getElementById('icons-color-of-left-side');
    let selectorOfRightSideTextColor = document.getElementById('text-color-of-right-side');
    let selectorOfRightSideIconsColor = document.getElementById('icons-color-of-right-side');

    let filepathFieldContainer = document.getElementById('new-wallpaper-filepath-field-container');

    filepathFieldContainer.classList.remove('disabled-filepath-field');
    inputFilepath.disabled = false;

    inputFilepath.value = '';
    inputFilename.value = '';
    selectorOfPosition.value = undefined;
    selectorOfLeftSideTextColor.value = undefined;
    selectorOfLeftSideIconsColor.value = undefined;
    selectorOfRightSideTextColor.value = undefined;
    selectorOfRightSideIconsColor.value = undefined;

    let panelOfListOfWallpapers = document.getElementById('list-of-wallpapers-panel');
    panelOfListOfWallpapers.classList.add('active');
    panelOfListOfWallpapers.classList.remove('inactive');

    if (my.scrollTopOfListOfWallpapers !== undefined) {
      document.getElementById('tab-contents-of-wallpapers').scrollTop = my.scrollTopOfListOfWallpapers;
    }

    let newWallpaperForm = document.getElementById('form-to-edit-wallpaper-info');
    newWallpaperForm.classList.add('inactive');
    newWallpaperForm.classList.remove('active');

    let bottomRowOfButtons = document.getElementById('bottom-buttons-row');
    bottomRowOfButtons.classList.remove('hidden-behind-dialog');
  });

  let wallpapersBtnFilepath = document.getElementById('new-wallpaper-filepath-btn');
  wallpapersBtnFilepath.addEventListener('click', async (eve) => {
    let extractBasename = true;
    let withRelativePath = true;
    let result = await pickFile(extractBasename, withRelativePath);
    if (result.canceled) {
      return;
    }
    if (result.filePaths === undefined || result.filePaths.length === 0) {
      return;
    }
    let filepath = result.filePaths[0].filepath;
    let basename = result.filePaths[0].basename;
    let relativePath = result.filePaths[0].relativePath;

    let inputFilepath = document.getElementById('new-wallpaper-filepath');
    inputFilepath.value = filepath;

    let inputFilename = document.getElementById('new-wallpaper-filename');
    inputFilename.value = basename;

    my.currentFilepathBasename = basename;
    my.currentFilepathRelative = relativePath;

    let event = new Event('change');
    inputFilepath.dispatchEvent(event);
  });


  let timingsInputTextualDisplayFormat = document.getElementById('timings-textual-display-format');
  timingsInputTextualDisplayFormat.value = config['timings-config']['display-format'];
  timingsInputTextualDisplayFormat.addEventListener('change', (eve) => {
    let currentValue = timingsInputTextualDisplayFormat.value;
    config['timings-config']['display-format'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig['timings-config']['display-format'];
    let label = document.getElementById('tab2-label');
    if (!sameAsOldValue) {
      if (!my.showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        my.showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      my.showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      my.showingTimingsConfigHeaderWithStar = true;
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
      if (!my.showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        my.showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      my.showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      my.showingTimingsConfigHeaderWithStar = true;
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
      if (!my.showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        my.showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      my.showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      my.showingTimingsConfigHeaderWithStar = true;
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
      if (!my.showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        my.showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      my.showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      my.showingTimingsConfigHeaderWithStar = true;
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
      if (!my.showingTimingsConfigHeaderWithStar) {
        label.innerHTML = 'Timings Config*';
        my.showingTimingsConfigHeaderWithStar = true;
      }
      return;
    }
    if (timingsConfigIsSameAsOriginal(config['timings-config'], originalConfig['timings-config'])) {
      label.innerHTML = 'Timings Config';
      my.showingTimingsConfigHeaderWithStar = false;
    } else {
      label.innerHTML = 'Timings Config*';
      my.showingTimingsConfigHeaderWithStar = true;
    }
  });

  let notebookInputFilepath = document.getElementById('notebook-filepath');
  notebookInputFilepath.value = config.notebook.filepath;
  notebookInputFilepath.addEventListener('change', (eve) => {
    let currentValue = notebookInputFilepath.value;
    config['notebook'].filepath = currentValue;
    let sameAsOldValue = currentValue === originalConfig.notebook.filepath;
    let label = document.getElementById('tab3-label');
    if (!sameAsOldValue) {
      if (!my.showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        my.showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      my.showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      my.showingNotebookHeaderWithStar = true;
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
      if (!my.showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        my.showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      my.showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      my.showingNotebookHeaderWithStar = true;
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
      if (!my.showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        my.showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      my.showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      my.showingNotebookHeaderWithStar = true;
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
      if (!my.showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        my.showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      my.showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      my.showingNotebookHeaderWithStar = true;
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
      if (!my.showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        my.showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      my.showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      my.showingNotebookHeaderWithStar = true;
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
      if (!my.showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        my.showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      my.showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      my.showingNotebookHeaderWithStar = true;
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
      if (!my.showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        my.showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      my.showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      my.showingNotebookHeaderWithStar = true;
    }
  });
  disableShortcutsOnFocus(notebookInputFontSizeOfBottomPanelOfNotes);

  let notebookInputFontSizeOfTooltips = 
    document.getElementById('font-size-in-px-of-tooltips');
  notebookInputFontSizeOfTooltips.value =
    config.notebook['font-size-in-px-of-tooltips'];
  notebookInputFontSizeOfTooltips.addEventListener('change', (eve) => {
    let currentValue = parseInt(notebookInputFontSizeOfTooltips.value);
    if (isNaN(currentValue)) {
      alert('must be int');
      return;
    }
    notebookInputFontSizeOfTooltips.value = currentValue.toString();
    config.notebook['font-size-in-px-of-tooltips'] = currentValue;
    let sameAsOldValue = currentValue === originalConfig.notebook['font-size-in-px-of-tooltips'];
    let label = document.getElementById('tab3-label');
    if (!sameAsOldValue) {
      if (!my.showingNotebookHeaderWithStar) {
        label.innerHTML = 'Notebook*';
        my.showingNotebookHeaderWithStar = true;
      }
      return;
    }
    if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
      label.innerHTML = 'Notebook';
      my.showingNotebookHeaderWithStar = false;
    } else {
      label.innerHTML = 'Notebook*';
      my.showingNotebookHeaderWithStar = true;
    }
  });
  disableShortcutsOnFocus(notebookInputFontSizeOfTooltips);

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
        if (!my.showingNotebookHeaderWithStar) {
          label.innerHTML = 'Notebook*';
          my.showingNotebookHeaderWithStar = true;
        }
        return;
      }
      if (notebookConfigIsSameAsOriginal(config['notebook'], originalConfig['notebook'])) {
        label.innerHTML = 'Notebook';
        my.showingNotebookHeaderWithStar = false;
      } else {
        label.innerHTML = 'Notebook*';
        my.showingNotebookHeaderWithStar = true;
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
  initNotebookCheckbox('notes-icon-open-notes-with-the-same-tag-in-bottom-panel'),
  initNotebookCheckbox('notes-icon-edit');
  initNotebookCheckbox('notes-icon-move-to-top');
  initNotebookCheckbox('notes-icon-move-to-bottom');
  initNotebookCheckbox('notes-icon-hide');
  initNotebookCheckbox('notes-icon-hide-siblings-below');
  initNotebookCheckbox('notes-icon-unhide-hidden-children');
  initNotebookCheckbox('notes-icon-add-sibling-node');
  initNotebookCheckbox('notes-icon-append-child-node');
  initNotebookCheckbox('notes-icon-delete');


  function initFrequenciesCheckbox(configName, htmlElemId) {
    if (htmlElemId === undefined) {
      htmlElemId = 'frequencies-' + configName;
    }

    let checkbox = document.getElementById(htmlElemId);
    checkbox.checked = !!config['frequencies'][configName];
    checkbox.addEventListener('change', (eve) => {
      let currentValue = checkbox.checked;
      config['frequencies'][configName] = currentValue;
      let sameAsOldValue = currentValue === !!originalConfig['frequencies'][configName];
      let label = document.getElementById('tab4-label');
      if (!sameAsOldValue) {
        if (!my.showingFrequenciesHeaderWithStar) {
          label.innerHTML = 'Frequencies*';
          my.showingFrequenciesHeaderWithStar = true;
        }
        return;
      }
      if (frequenciesConfigIsSameAsOriginal(config['frequencies'], originalConfig['frequencies'])) {
        label.innerHTML = 'Frequencies';
        my.showingFrequenciesHeaderWithStar = false;
      } else {
        label.innerHTML = 'Frequencies*';
        my.showingFrequenciesHeaderWithStar = true;
      }
    });
  }

  initFrequenciesCheckbox('icon-show-this-only');
  initFrequenciesCheckbox('icon-merge-subprocesses');
  initFrequenciesCheckbox('icon-unmerge-subprocesses-as-parent');
  initFrequenciesCheckbox('icon-unmerge-subprocesses-as-subprocess');
  initFrequenciesCheckbox('icon-move-to-top');
  initFrequenciesCheckbox('icon-move-to-bottom');
  initFrequenciesCheckbox('icon-hide');
  initFrequenciesCheckbox('icon-hide-siblings-below');
  initFrequenciesCheckbox('icon-unhide-hidden-children');


  function initPostTimingDialogCheckbox(configName, htmlElemId) {
    if (htmlElemId === undefined) {
      htmlElemId = configName;
    }

    let checkbox = document.getElementById(htmlElemId);
    checkbox.checked = !!config['post_timing_dialog'][configName];
    checkbox.addEventListener('change', (eve) => {
      let currentValue = checkbox.checked;
      config['post_timing_dialog'][configName] = currentValue;
      let sameAsOldValue = currentValue === !!originalConfig['post_timing_dialog'][configName];
      let label = document.getElementById('tab5-label');
      if (!sameAsOldValue) {
        if (!my.showingPostTimingDialogHeaderWithStar) {
          label.innerHTML = 'Post-timing dialog*';
          my.showingPostTimingDialogHeaderWithStar = true;
        }
        return;
      }
      if (postTimingDialogConfigIsSameAsOriginal(config['post_timing_dialog'], originalConfig['post_timing_dialog'])) {
        label.innerHTML = 'Post-timing dialog';
        my.showingPostTimingDialogHeaderWithStar = false;
      } else {
        label.innerHTML = 'Post-timing dialog*';
        my.showingPostTimingDialogHeaderWithStar = true;
      }
    });
  }

  initPostTimingDialogCheckbox('icon-right-side-node-move-to-top');
  initPostTimingDialogCheckbox('icon-right-side-node-move-to-bottom');
  initPostTimingDialogCheckbox('icon-right-side-node-edit');
  initPostTimingDialogCheckbox('icon-right-side-node-add-sibling');
  initPostTimingDialogCheckbox('icon-right-side-node-append-child');
  initPostTimingDialogCheckbox('icon-right-side-node-delete');

  initPostTimingDialogCheckbox('icon-left-side-node-move-to-top');
  initPostTimingDialogCheckbox('icon-left-side-node-move-to-bottom');
  initPostTimingDialogCheckbox('icon-left-side-node-hide');
  initPostTimingDialogCheckbox('icon-left-side-node-hide-siblings-below');
  initPostTimingDialogCheckbox('icon-left-side-node-unhide-hidden-children');
  initPostTimingDialogCheckbox('icon-left-side-node-copy-to-the-right-side');
  initPostTimingDialogCheckbox('icon-left-side-node-delete-corresponding-node-from-the-right-side');
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

  my.currentTimingsFileInfoBeingEdited = timingsFileInfo;

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

  my.scrollTopOfListOfTimingsFiles = document.getElementById('tab-contents-of-timings').scrollTop;

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






function WallpapersListView(wallpapersToShow) {
  this.wallpapersToShow = wallpapersToShow;
  this.wallpaperInfoViews = undefined;
  this.html = undefined;
}

WallpapersListView.prototype.initHtml = function() {
  let that = this;

  that.wallpaperInfoViews = that.wallpapersToShow.map(wallpaperInfo => new WallpaperInfoView(wallpaperInfo));
  that.wallpaperInfoViews.forEach(v => v.initHtml());

  let containerOfWallpapersList = document.getElementById('list-of-wallpapers');
  containerOfWallpapersList.innerHTML = '';

  that.html = withChildren(containerOfWallpapersList,
    ...that.wallpaperInfoViews.map(v => v.html)
  );
};

WallpapersListView.prototype.reset = function(wallpapersToShow) {
  let that = this;
  that.wallpapersToShow = wallpapersToShow;
  that.initHtml();
};

WallpapersListView.prototype.addNewInfo = function(wallpaperInfo) {
  let that = this;
  that.wallpapersToShow.push(wallpaperInfo);

  let view = new WallpaperInfoView(wallpaperInfo);
  that.wallpaperInfoViews.push(view);

  view.initHtml();

  that.html.appendChild(view.html);
};

WallpapersListView.prototype.hasInfoWithFilename = function(filename) {
  let that = this;
  return that.wallpapersToShow.find(wpInfo => wpInfo.basename === filename) !== undefined;
};

WallpapersListView.prototype.dataIsSameAsOriginal = function() {
  let that = this;
  if (Object.keys(my.wallpapersToAddByName).length > 0) {
    return false;
  }
  if (Object.keys(my.wallpapersToDeleteByName).length > 0) {
    return false;
  }
  for (let t of that.wallpapersToShow) {
    if (t.original === undefined) {
      continue;
    }
    if (!wallpaperInfoIsSameAsOriginal(t)) {
      return false;
    }
  }
  return true;
};

WallpapersListView.prototype.handleSaveSuccess = function() {
  let that = this;


  let setOfDeletedNames = new Set(Object.keys(my.wallpapersToDeleteByName));
  for (let t of that.wallpapersToShow) {
    let wasAddedAndDeleted = t.original === undefined && my.wallpapersToAddByName[t.name] === undefined;
    let wasDeleted = setOfDeletedNames.has(t.name);

    if (wasAddedAndDeleted || wasDeleted) {
      t.view.html.parentNode.removeChild(t.view.html);
    }
  }
  that.wallpapersToShow = that.wallpapersToShow.filter(t => !setOfDeletedNames.has(t.name));
  that.wallpaperInfoViews = that.wallpapersToShow.map(t => t.view);

  my.wallpapersToAddByName = {};
  my.wallpapersToDeleteByName = {};
  my.newNamesOfWallpapersToRenameByOldName = {};
};

function wallpaperInfoIsSameAsOriginal(wallpaperInfo) {
  let fieldNames = [
    'filepath',
    'basename',
    'position',
    'leftSideTextColor',
    'leftSideIconsColor',
    'rightSideTextColor',
    'rightSideIconsColor'
  ];
  let orig = wallpaperInfo.original;
  for (let fieldName of fieldNames) {
    let areEqual = wallpaperInfo[fieldName] === orig[fieldName];
    if (!areEqual) {
      return false;
    }
  }
  return true;
}

function WallpaperInfoView(wallpaperInfo) {
  let that = this;
  wallpaperInfo.view = that;
  that.wallpaperInfo = wallpaperInfo;
  that.html = undefined;
}

WallpaperInfoView.prototype.initHtml = function() {
  let that = this;
  let wallpaperInfo = that.wallpaperInfo;
  that.imageDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-image'),
      (function() {
        let img = new Image(200);
        img.src = that.wallpaperInfo.relativePath;
        return img;
      })()
    );
  that.filepathDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`filepath: ${wallpaperInfo.filepath}`)
    );
  that.positionDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`attaches to corner: ${wallpaperInfo.position}`)
    );
  that.leftSideTextColorDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`left-side text color: ${wallpaperInfo.leftSideTextColor}`)
    );
  that.leftSideIconsColorDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`left-side icons color: ${wallpaperInfo.leftSideIconsColor}`)
    );
  that.rightSideTextColorDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`right-side text color: ${wallpaperInfo.rightSideTextColor}`)
    );
  that.rightSideIconsColorDiv =
    withChildren(withClass(document.createElement('div'), 'div-with-text'),
      document.createTextNode(`right-side icons color: ${wallpaperInfo.rightSideIconsColor}`)
    );
  that.html = withChildren(withClass(document.createElement('div'), 'wallpaper-info-view'),
    that.createDivOfWallpaperInfoButtons(),
    that.imageDiv,
    that.filepathDiv,
    that.positionDiv,
    that.leftSideTextColorDiv,
    that.leftSideIconsColorDiv,
    that.rightSideTextColorDiv,
    that.rightSideIconsColorDiv,
  );
}

WallpaperInfoView.prototype.refresh = function() {
  let that = this;
  let wallpaperInfo = that.wallpaperInfo;

  that.filepathDiv.innerHTML = `filepath: ${wallpaperInfo.filepath}`;
  that.positionDiv.innerHTML = `attaches to corner: ${wallpaperInfo.position}`;
  that.leftSideTextColorDiv.innerHTML = `left-side text color: ${wallpaperInfo.leftSideTextColor}`;
  that.leftSideIconsColorDiv.innerHTML = `left-side icons color: ${wallpaperInfo.leftSideIconsColor}`;
  that.rightSideTextColorDiv.innerHTML = `right-side text color: ${wallpaperInfo.rightSideTextColor}`;
  that.rightSideIconsColorDiv.innerHTML = `right-side icons color: ${wallpaperInfo.rightSideIconsColor}`;

}

WallpaperInfoView.prototype.createDivOfWallpaperInfoButtons = function() {
  let that = this;

  let btnEdit = 
    withChildren(withClass(document.createElement('button'), 'btn-edit-wallpaper-info'),
      document.createTextNode('edit')
    );
  btnEdit.addEventListener('click', (eve) => {
    that.btnHandlerEditWallpaperInfo();
  });

  let btnDelete =
    withChildren(withClass(document.createElement('button'), 'btn-delete-wallpaper-info'),
      document.createTextNode('delete')
    );
  btnDelete.addEventListener('click', (eve) => {
    that.btnHandlerDeleteWallpaperInfo();
  });

  let btnUndoDelete =
    withChildren(withClass(document.createElement('button'), 'btn-undo-delete-of-wallpaper-info'),
      document.createTextNode('undo deletion')
    );
  btnUndoDelete.addEventListener('click', (eve) => {
    that.btnHandlerUndoDeletionOfWallpaperInfo();
  });

  return withChildren(withClass(document.createElement('div'), 'wallpaper-info-buttons'),
    btnEdit,
    btnDelete,
    btnUndoDelete
  );
}

WallpaperInfoView.prototype.btnHandlerEditWallpaperInfo = function() {
  let that = this;
  let wallpaperInfo = that.wallpaperInfo;

  my.currentWallpaperInfoBeingEdited = wallpaperInfo;

  let filepathFieldContainer = document.getElementById('new-wallpaper-filepath-field-container');

  let inputFilepath = document.getElementById('new-wallpaper-filepath');
  let inputFilename = document.getElementById('new-wallpaper-filename');
  let selectorOfPosition = document.getElementById('new-wallpaper-position');
  let selectorOfLeftSideTextColor = document.getElementById('text-color-of-left-side');
  let selectorOfLeftSideIconsColor = document.getElementById('icons-color-of-left-side');
  let selectorOfRightSideTextColor = document.getElementById('text-color-of-right-side');
  let selectorOfRightSideIconsColor = document.getElementById('icons-color-of-right-side');

  filepathFieldContainer.classList.add('disabled-filepath-field');
  inputFilepath.disabled = true;

  inputFilepath.value = wallpaperInfo.filepath;
  inputFilename.value = wallpaperInfo.basename;
  selectorOfPosition.value = wallpaperInfo.position;
  selectorOfLeftSideTextColor.value = wallpaperInfo.leftSideTextColor;
  selectorOfLeftSideIconsColor.value = wallpaperInfo.leftSideIconsColor;
  selectorOfRightSideTextColor.value = wallpaperInfo.rightSideTextColor;
  selectorOfRightSideIconsColor.value = wallpaperInfo.rightSideIconsColor;

  my.scrollTopOfListOfWallpapers = document.getElementById('tab-contents-of-wallpapers').scrollTop;

  let panelOfListOfWallpapers = document.getElementById('list-of-wallpapers-panel');
  panelOfListOfWallpapers.classList.remove('active');
  panelOfListOfWallpapers.classList.add('inactive');

  let newWallpaperForm = document.getElementById('form-to-edit-wallpaper-info');
  newWallpaperForm.classList.remove('inactive');
  newWallpaperForm.classList.add('active');

  let bottomRowOfButtons = document.getElementById('bottom-buttons-row');
  bottomRowOfButtons.classList.add('hidden-behind-dialog');
};


WallpaperInfoView.prototype.btnHandlerDeleteWallpaperInfo = function() {
  let that = this;
  let wallpaperInfo = that.wallpaperInfo;

  if (my.wallpapersToAddByName.hasOwnProperty(wallpaperInfo.name)) {
    delete my.wallpapersToAddByName[wallpaperInfo.name];
  } else {
    my.wallpapersToDeleteByName[wallpaperInfo.name] = true;
  }

  that.html.classList.add('to-be-deleted');
  showOrHideStarInWallpapersHeader();
};


WallpaperInfoView.prototype.btnHandlerUndoDeletionOfWallpaperInfo = function() {
  let that = this;
  let wallpaperInfo = that.wallpaperInfo;

  if (my.wallpapersToDeleteByName[wallpaperInfo.name]) {
    delete my.wallpapersToDeleteByName[wallpaperInfo.name];
  } else {
    my.wallpapersToAddByName[wallpaperInfo.name] = wallpaperInfo;
  }

  that.html.classList.remove('to-be-deleted');
  showOrHideStarInWallpapersHeader();
}




function showOrHideStarInWallpapersHeader() {
  let isSame = my.wallpapersListView.dataIsSameAsOriginal();
  my.showingWallpapersHeaderWithStar = !isSame;
  let label = document.getElementById('tab6-label');
  if (isSame) {
    label.innerHTML = 'Wallpapers';
  } else {
    label.innerHTML = 'Wallpapers*';
  }
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
  result.frequencies = Object.assign({}, config.frequencies);
  result.post_timing_dialog = Object.assign({}, config.post_timing_dialog);
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

function createListOfWallpapersToShow(msg) {
  return msg.wallpapers.map(wp => {
    let original = Object.assign({}, wp);
    if (msg.wallpapersConfig[wp.basename]) {
      Object.assign(original, msg.wallpapersConfig[wp.basename]);
    }
    let copy = Object.assign({}, original);
    copy.name = wp.basename;
    copy.original = original;
    return copy;
  });
}

function convertWallpapersListToBackendFormat(wallpapers) {
  return wallpapers.map(wp => {
    let copy = Object.assign({}, wp);
    delete copy.view;
    delete copy.absolutePath;
    delete copy.relativePath;
    return copy;
  });
}

function convertWallpapersToAddListToBackendFormat(wallpapers) {
  return wallpapers.map(wp => {
    let copy = Object.assign({}, wp);
    copy.basename = copy.name;
    delete copy.name;
    delete copy.view;
    delete copy.relativePath;
    return copy;
  });
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
         notebookConfig['font-size-in-px-of-bottom-panel-of-notes'] === originalNotebookConfig['font-size-in-px-of-bottom-panel-of-notes'] &&
         notebookConfig['font-size-in-px-of-tooltips'] === originalNotebookConfig['font-size-in-px-of-tooltips'] && (function() {
           let iconPropNames = [
            'tag-icon-open-in-tree-above',
            'tag-icon-edit',
            'tag-icon-move-to-top',
            'tag-icon-move-to-bottom',
            'tag-icon-hide',
            'tag-icon-hide-siblings-below',
            'tag-icon-unhide-hidden-children',

            'notes-icon-open-in-tree-above',
            'notes-icon-open-tag-in-tags-tree',
            'notes-icon-open-tags-of-children-in-tags-tree',
            'notes-icon-open-notes-with-the-same-tag-in-bottom-panel',
            'notes-icon-edit',
            'notes-icon-move-to-top',
            'notes-icon-move-to-bottom',
            'notes-icon-hide',
            'notes-icon-hide-siblings-below',
            'notes-icon-unhide-hidden-children',
            'notes-icon-add-sibling-node',
            'notes-icon-append-child-node',
            'notes-icon-delete',
           ];
           for (let iconPropName of iconPropNames) {
             if (notebookConfig[iconPropName] !== originalNotebookConfig[iconPropName]) {
               return false;
             }
           }
           return true;
         })();
}

function frequenciesConfigIsSameAsOriginal(frequenciesConfig, originalFrequenciesConfig) {
  let iconPropNames = [
    'icon-show-this-only',
    'icon-merge-subprocesses',
    'icon-unmerge-subprocesses-as-parent',
    'icon-unmerge-subprocesses-as-subprocess',
    'icon-move-to-top',
    'icon-move-to-bottom',
    'icon-hide',
    'icon-hide-siblings-below',
    'icon-unhide-hidden-children',
  ];
  for (let iconPropName of iconPropNames) {
    if (frequenciesConfig[iconPropName] !== originalFrequenciesConfig[iconPropName]) {
      return false;
    }
  }
  return true;
}

function postTimingDialogConfigIsSameAsOriginal(postTimingDialogConfig, originalPostTimingDialogConfig) {
  let iconPropNames = [
    'icon-right-side-node-move-to-top',
    'icon-right-side-node-move-to-bottom',
    'icon-right-side-node-edit',
    'icon-right-side-node-add-sibling',
    'icon-right-side-node-append-child',
    'icon-right-side-node-delete',

    'icon-left-side-node-move-to-top',
    'icon-left-side-node-move-to-bottom',
    'icon-left-side-node-hide',
    'icon-left-side-node-hide-siblings-below',
    'icon-left-side-node-unhide-hidden-children',
    'icon-left-side-node-copy-to-the-right-side',
    'icon-left-side-node-delete-corresponding-node-from-the-right-side',
  ];
  for (let iconPropName of iconPropNames) {
    if (postTimingDialogConfig[iconPropName] !== originalPostTimingDialogConfig[iconPropName]) {
      return false;
    }
  }
  return true;
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

function pickFile(extractBasename, withRelativePath) {
  return new Promise((resolve, reject) => {
    window.webkit.messageHandlers.preferences_msg__choose_file.postMessage(!!extractBasename, !!withRelativePath);
    my.filepicker_result_handler = (result) => {
      resolve(result);
    }
  });
}

function filenameExistsInWallpapersDir(filename) {
  return new Promise((resolve, reject) => {
    window.webkit.messageHandlers.preferences_msg__filename_exists_in_wallpapers_dir.postMessage(filename);
    my.result_handler_filename_exists_in_wallpapers_dir = (filename, result) => {
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
