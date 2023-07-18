const { TimingsFileInfosListView } = require('../js/preferences/timings_file_infos_list_view.js');
const { WallpapersListView } = require('../js/preferences/wallpapers_list_view.js');
const { IconsListView } = require('../js/preferences/icons_list_view.js');

const { showOrHideStarInTimingsHeader, showOrHideStarInWallpapersHeader } = require('../js/preferences/header_utils.js');

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

window.my = my;

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
    my.config = config;
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

    notebookInputFontSizeOfTopPanelOfTagsOnMainWindow.value =
      config.notebook['font-size-in-px-of-top-panel-of-tags-on-main-window'];
    notebookInputFontSizeOfBottomPanelOfTagsOnMainWindow.value =
      config.notebook['font-size-in-px-of-bottom-panel-of-tags-on-main-window'];
    notebookInputFontSizeOfTopPanelOfNotesOnMainWindow.value =
      config.notebook['font-size-in-px-of-top-panel-of-notes-on-main-window'];
    notebookInputFontSizeOfBottomPanelOfNotesOnMainWindow.value =
      config.notebook['font-size-in-px-of-bottom-panel-of-notes-on-main-window'];
    notebookInputFontSizeOfTooltipsOnMainWindow.value =
      config.notebook['font-size-in-px-of-tooltips-on-main-window'];

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

      'main-window-tag-icon-open-in-tree-above',
      'main-window-tag-icon-edit',
      'main-window-tag-icon-move-to-top',
      'main-window-tag-icon-move-to-bottom',
      'main-window-tag-icon-hide',
      'main-window-tag-icon-hide-siblings-below',
      'main-window-tag-icon-unhide-hidden-children',

      'main-window-notes-icon-open-in-tree-above',
      'main-window-notes-icon-open-tag-in-tags-tree',
      'main-window-notes-icon-open-tags-of-children-in-tags-tree',
      'main-window-notes-icon-open-notes-with-the-same-tag-in-bottom-panel',
      'main-window-notes-icon-edit',
      'main-window-notes-icon-move-to-top',
      'main-window-notes-icon-move-to-bottom',
      'main-window-notes-icon-hide',
      'main-window-notes-icon-hide-siblings-below',
      'main-window-notes-icon-unhide-hidden-children',
      'main-window-notes-icon-add-sibling-node',
      'main-window-notes-icon-append-child-node',
      'main-window-notes-icon-delete',
    ];
    // for (let iconPropName of notebookIconPropNames) {
    //   let checkbox = document.getElementById(iconPropName);
    //   checkbox.checked = !!config.notebook[iconPropName];
    // }

    if (!my.notebookTagsIconsListView.iconsDataIsSameAsOriginal()) {
      my.notebookTagsIconsListView.reset();
    }

    if (!my.notebookNotesIconsListView.iconsDataIsSameAsOriginal()) {
      my.notebookNotesIconsListView.reset();
    }

    if (!my.notebookTagsIconsOfMainWindowListView.iconsDataIsSameAsOriginal()) {
      my.notebookTagsIconsOfMainWindowListView.reset();
    }

    if (!my.notebookNotesIconsOfMainWindowListView.iconsDataIsSameAsOriginal()) {
      my.notebookNotesIconsOfMainWindowListView.reset();
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

      let mainWindowCheckbox = document.getElementById('main-window-frequencies-' + iconPropName);
      mainWindowCheckbox.checked = !!config.frequencies['main-window-' + iconPropName];
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

    let isConflictingName;
    if (my.currentTimingsFileInfoBeingEdited === undefined) {
      isConflictingName = my.timingsFileInfosListView.hasInfoWithName(name);
    } else {
      if (name === my.currentTimingsFileInfoBeingEdited.name) {
        isConflictingName = false;
      } else {
        isConflictingName = my.timingsFileInfosListView.hasInfoWithName(name);
      }
    }

    if (isConflictingName) {
      alert(`name '${name}' is already taken.\ntry different name`);
      return;
    }

    let isConflictingFilepath;
    if (my.currentTimingsFileInfoBeingEdited === undefined) {
      isConflictingFilepath = my.timingsFileInfosListView.findInfoWithFilepath(filepath) !== undefined;
    } else {
      if (filepath === my.currentTimingsFileInfoBeingEdited.filepath) {
        isConflictingFilepath = false;
      } else {
        isConflictingFilepath = my.timingsFileInfosListView.findInfoWithFilepath(filepath) !== undefined;
      }
    }

    if (isConflictingFilepath) {
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

    let isConflictingFilename;
    if (my.currentWallpaperInfoBeingEdited === undefined) {
      isConflictingFilename = my.wallpapersListView.hasInfoWithFilename(filename);
    } else {
      if (filename === my.currentWallpaperInfoBeingEdited.basename) {
        isConflictingFilename = false;
      } else {
        isConflictingFilename = my.wallpapersListView.hasInfoWithFilename(filename);
      }
    }

    if (isConflictingFilename) {
      alert(`filename '${filename}' is already taken.\ntry different filename`);
      return;
    }

    let conflictingFilenameExistsInDir;
    if (my.currentWallpaperInfoBeingEdited === undefined) {
      conflictingFilenameExistsInDir = await filenameExistsInWallpapersDir(filename);
    } else {
      if (filename === my.currentWallpaperInfoBeingEdited.basename) {
        conflictingFilenameExistsInDir = false;
      } else {
        conflictingFilenameExistsInDir = await filenameExistsInWallpapersDir(filename);
      }
    }

    if (conflictingFilenameExistsInDir) {
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

  function initNotebookInput(name) {
    let inputElem = document.getElementById(name);
    inputElem.value =
      config.notebook[name];
    inputElem.addEventListener('change', (eve) => {
      let currentValue = parseInt(inputElem.value);
      if (isNaN(currentValue)) {
        alert('must be int');
        return;
      }
      inputElem.value = currentValue.toString();
      config.notebook[name] = currentValue;
      let sameAsOldValue = currentValue === originalConfig.notebook[name];
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
    disableShortcutsOnFocus(inputElem);
    return inputElem;
  }
  let notebookInputFontSizeOfTopPanelOfTags = 
    initNotebookInput('font-size-in-px-of-top-panel-of-tags');
  let notebookInputFontSizeOfBottomPanelOfTags = 
    initNotebookInput('font-size-in-px-of-bottom-panel-of-tags');
  let notebookInputFontSizeOfTopPanelOfNotes = 
    initNotebookInput('font-size-in-px-of-top-panel-of-notes');
  let notebookInputFontSizeOfBottomPanelOfNotes = 
    initNotebookInput('font-size-in-px-of-bottom-panel-of-notes');
  let notebookInputFontSizeOfTooltips = 
    initNotebookInput('font-size-in-px-of-tooltips');

  let notebookInputFontSizeOfTopPanelOfTagsOnMainWindow = 
    initNotebookInput('font-size-in-px-of-top-panel-of-tags-on-main-window');
  let notebookInputFontSizeOfBottomPanelOfTagsOnMainWindow = 
    initNotebookInput('font-size-in-px-of-bottom-panel-of-tags-on-main-window');
  let notebookInputFontSizeOfTopPanelOfNotesOnMainWindow = 
    initNotebookInput('font-size-in-px-of-top-panel-of-notes-on-main-window');
  let notebookInputFontSizeOfBottomPanelOfNotesOnMainWindow = 
    initNotebookInput('font-size-in-px-of-bottom-panel-of-notes-on-main-window');
  let notebookInputFontSizeOfTooltipsOnMainWindow = 
    initNotebookInput('font-size-in-px-of-tooltips-on-main-window');

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

  // initNotebookCheckbox('tag-icon-open-in-tree-above');
  // initNotebookCheckbox('tag-icon-edit');
  // initNotebookCheckbox('tag-icon-move-to-top');
  // initNotebookCheckbox('tag-icon-move-to-bottom');
  // initNotebookCheckbox('tag-icon-hide');
  // initNotebookCheckbox('tag-icon-hide-siblings-below');
  // initNotebookCheckbox('tag-icon-unhide-hidden-children');

  let notebookIconNamesOfTags = [
    {
      iconName: 'tag-icon-open-in-tree-above',
      iconTitle: 'Open in tree above',
    },
    {
      iconName: 'tag-icon-edit',
      iconTitle: 'Edit',
    },
    {
      iconName: 'tag-icon-move-to-top',
      iconTitle: 'Move to top',
    },
    {
      iconName: 'tag-icon-move-to-bottom',
      iconTitle: 'Move to bottom',
    },
    {
      iconName: 'tag-icon-hide',
      iconTitle: 'Hide',
    },
    {
      iconName: 'tag-icon-hide-siblings-below',
      iconTitle: 'Hide siblings below',
    },
    {
      iconName: 'tag-icon-unhide-hidden-children',
      iconTitle: 'Unhide hidden children',
    },
  ];

  let orderOfTagsIcons = config['notebook']['order-of-tags-icons'];

  notebookIconNamesOfTags.forEach(obj => {
    obj.checked = !!config['notebook'][obj.iconName];
    let idx;
    if (orderOfTagsIcons === undefined) {
      idx = -1;
    } else {
      idx = orderOfTagsIcons.indexOf(obj.iconName);
    }
    obj.indexInOrder = idx;
  });

  my.notebookTagsIconsListView = new IconsListView(notebookIconNamesOfTags);
  my.notebookTagsIconsListView.initHtml('notebook-node-icons-list-of-tags-tree');
  my.notebookTagsIconsListView.setChangeListener((iconView) => {
    let currentValue = iconView.checked;
    config['notebook'][iconView.iconName] = currentValue;
    let sameAsOldValue = currentValue === !!originalConfig['notebook'][iconView.iconName];
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

  // initNotebookCheckbox('notes-icon-open-in-tree-above');
  // initNotebookCheckbox('notes-icon-open-tag-in-tags-tree');
  // initNotebookCheckbox('notes-icon-open-tags-of-children-in-tags-tree');
  // initNotebookCheckbox('notes-icon-open-notes-with-the-same-tag-in-bottom-panel'),
  // initNotebookCheckbox('notes-icon-edit');
  // initNotebookCheckbox('notes-icon-move-to-top');
  // initNotebookCheckbox('notes-icon-move-to-bottom');
  // initNotebookCheckbox('notes-icon-hide');
  // initNotebookCheckbox('notes-icon-hide-siblings-below');
  // initNotebookCheckbox('notes-icon-unhide-hidden-children');
  // initNotebookCheckbox('notes-icon-add-sibling-node');
  // initNotebookCheckbox('notes-icon-append-child-node');
  // initNotebookCheckbox('notes-icon-delete');

  let notebookIconNamesOfNotes = [
    {
      iconName: 'notes-icon-open-in-tree-above',
      iconTitle: 'Open in tree above',
    },
    {
      iconName: 'notes-icon-open-tag-in-tags-tree',
      iconTitle: 'Open tag in tags tree',
    },
    {
      iconName: 'notes-icon-open-tags-of-children-in-tags-tree',
      iconTitle: 'Open tags of children in tags tree',
    },
    {
      iconName: 'notes-icon-open-notes-with-the-same-tag-in-bottom-panel',
      iconTitle: 'Open notes with the same tag in bottom panel',
    },
    {
      iconName: 'notes-icon-edit',
      iconTitle: 'Edit',
    },
    {
      iconName: 'notes-icon-move-to-top',
      iconTitle: 'Move to top',
    },
    {
      iconName: 'notes-icon-move-to-bottom',
      iconTitle: 'Move to bottom',
    },
    {
      iconName: 'notes-icon-hide',
      iconTitle: 'Hide',
    },
    {
      iconName: 'notes-icon-hide-siblings-below',
      iconTitle: 'Hide siblings below',
    },
    {
      iconName: 'notes-icon-unhide-hidden-children',
      iconTitle: 'Unhide hidden children',
    },
    {
      iconName: 'notes-icon-add-sibling-node',
      iconTitle: 'Add sibling node',
    },
    {
      iconName: 'notes-icon-append-child-node',
      iconTitle: 'Append child node',
    },
    {
      iconName: 'notes-icon-delete',
      iconTitle: 'Delete',
    },
  ];

  let orderOfNotesIcons = config['notebook']['order-of-notes-icons'];

  notebookIconNamesOfNotes.forEach(obj => {
    obj.checked = !!config['notebook'][obj.iconName];
    let idx;
    if (orderOfNotesIcons === undefined) {
      idx = -1;
    } else {
      idx = orderOfNotesIcons.indexOf(obj.iconName);
    }
    obj.indexInOrder = idx;
  });

  my.notebookNotesIconsListView = new IconsListView(notebookIconNamesOfNotes);
  my.notebookNotesIconsListView.initHtml('notebook-node-icons-list-of-notes-tree');
  my.notebookNotesIconsListView.setChangeListener((iconView) => {
    let currentValue = iconView.checked;
    config['notebook'][iconView.iconName] = currentValue;
    let sameAsOldValue = currentValue === !!originalConfig['notebook'][iconView.iconName];
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

  // initNotebookCheckbox('main-window-tag-icon-open-in-tree-above');
  // initNotebookCheckbox('main-window-tag-icon-edit');
  // initNotebookCheckbox('main-window-tag-icon-move-to-top');
  // initNotebookCheckbox('main-window-tag-icon-move-to-bottom');
  // initNotebookCheckbox('main-window-tag-icon-hide');
  // initNotebookCheckbox('main-window-tag-icon-hide-siblings-below');
  // initNotebookCheckbox('main-window-tag-icon-unhide-hidden-children');

  let notebookIconNamesOfTagsInMainWindow = [
    {
      iconName: 'main-window-tag-icon-open-in-tree-above',
      iconTitle: 'Open in tree above',
    },
    {
      iconName: 'main-window-tag-icon-edit',
      iconTitle: 'Edit',
    },
    {
      iconName: 'main-window-tag-icon-move-to-top',
      iconTitle: 'Move to top',
    },
    {
      iconName: 'main-window-tag-icon-move-to-bottom',
      iconTitle: 'Move to bottom',
    },
    {
      iconName: 'main-window-tag-icon-hide',
      iconTitle: 'Hide',
    },
    {
      iconName: 'main-window-tag-icon-hide-siblings-below',
      iconTitle: 'Hide siblings below',
    },
    {
      iconName: 'main-window-tag-icon-unhide-hidden-children',
      iconTitle: 'Unhide hidden children',
    },
  ];

  let orderOfTagsIconsInMainWindow = config['notebook']['order-of-tags-icons-in-main-window'];

  notebookIconNamesOfTagsInMainWindow.forEach(obj => {
    obj.checked = !!config['notebook'][obj.iconName];
    let idx;
    if (orderOfTagsIconsInMainWindow === undefined) {
      idx = -1;
    } else {
      idx = orderOfTagsIconsInMainWindow.indexOf(obj.iconName);
    }
    obj.indexInOrder = idx;
  });

  my.notebookTagsIconsOfMainWindowListView = new IconsListView(notebookIconNamesOfTagsInMainWindow);
  my.notebookTagsIconsOfMainWindowListView.initHtml('notebook-node-icons-list-of-tags-tree-in-main-window');
  my.notebookTagsIconsOfMainWindowListView.setChangeListener((iconView) => {
    let currentValue = iconView.checked;
    config['notebook'][iconView.iconName] = currentValue;
    let sameAsOldValue = currentValue === !!originalConfig['notebook'][iconView.iconName];
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

  // initNotebookCheckbox('main-window-notes-icon-open-in-tree-above');
  // initNotebookCheckbox('main-window-notes-icon-open-tag-in-tags-tree');
  // initNotebookCheckbox('main-window-notes-icon-open-tags-of-children-in-tags-tree');
  // initNotebookCheckbox('main-window-notes-icon-open-notes-with-the-same-tag-in-bottom-panel'),
  // initNotebookCheckbox('main-window-notes-icon-edit');
  // initNotebookCheckbox('main-window-notes-icon-move-to-top');
  // initNotebookCheckbox('main-window-notes-icon-move-to-bottom');
  // initNotebookCheckbox('main-window-notes-icon-hide');
  // initNotebookCheckbox('main-window-notes-icon-hide-siblings-below');
  // initNotebookCheckbox('main-window-notes-icon-unhide-hidden-children');
  // initNotebookCheckbox('main-window-notes-icon-add-sibling-node');
  // initNotebookCheckbox('main-window-notes-icon-append-child-node');
  // initNotebookCheckbox('main-window-notes-icon-delete');

  let notebookIconNamesOfNotesInMainWindow = [
    {
      iconName: 'main-window-notes-icon-open-in-tree-above',
      iconTitle: 'Open in tree above',
    },
    {
      iconName: 'main-window-notes-icon-open-tag-in-tags-tree',
      iconTitle: 'Open tag in tags tree',
    },
    {
      iconName: 'main-window-notes-icon-open-tags-of-children-in-tags-tree',
      iconTitle: 'Open tags of children in tags tree',
    },
    {
      iconName: 'main-window-notes-icon-open-notes-with-the-same-tag-in-bottom-panel',
      iconTitle: 'Open notes with the same tag in bottom panel',
    },
    {
      iconName: 'main-window-notes-icon-edit',
      iconTitle: 'Edit',
    },
    {
      iconName: 'main-window-notes-icon-move-to-top',
      iconTitle: 'Move to top',
    },
    {
      iconName: 'main-window-notes-icon-move-to-bottom',
      iconTitle: 'Move to bottom',
    },
    {
      iconName: 'main-window-notes-icon-hide',
      iconTitle: 'Hide',
    },
    {
      iconName: 'main-window-notes-icon-hide-siblings-below',
      iconTitle: 'Hide siblings below',
    },
    {
      iconName: 'main-window-notes-icon-unhide-hidden-children',
      iconTitle: 'Unhide hidden children',
    },
    {
      iconName: 'main-window-notes-icon-add-sibling-node',
      iconTitle: 'Add sibling node',
    },
    {
      iconName: 'main-window-notes-icon-append-child-node',
      iconTitle: 'Append child node',
    },
    {
      iconName: 'main-window-notes-icon-delete',
      iconTitle: 'Delete',
    },
  ];

  let orderOfNotesIconsInMainWindow = config['notebook']['order-of-notes-icons-in-main-window'];

  notebookIconNamesOfNotesInMainWindow.forEach(obj => {
    obj.checked = !!config['notebook'][obj.iconName];
    let idx;
    if (orderOfNotesIconsInMainWindow === undefined) {
      idx = -1;
    } else {
      idx = orderOfNotesIconsInMainWindow.indexOf(obj.iconName);
    }
    obj.indexInOrder = idx;
  });

  my.notebookNotesIconsOfMainWindowListView = new IconsListView(notebookIconNamesOfNotesInMainWindow);
  my.notebookNotesIconsOfMainWindowListView.initHtml('notebook-node-icons-list-of-notes-tree-in-main-window');
  my.notebookNotesIconsOfMainWindowListView.setChangeListener((iconView) => {
    let currentValue = iconView.checked;
    config['notebook'][iconView.iconName] = currentValue;
    let sameAsOldValue = currentValue === !!originalConfig['notebook'][iconView.iconName];
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

  function initMainWindowFrequenciesCheckbox(name) {
    initFrequenciesCheckbox('main-window-' + name, 'main-window-frequencies-' + name);
  }

  initMainWindowFrequenciesCheckbox('icon-show-this-only');
  initMainWindowFrequenciesCheckbox('icon-merge-subprocesses');
  initMainWindowFrequenciesCheckbox('icon-unmerge-subprocesses-as-parent');
  initMainWindowFrequenciesCheckbox('icon-unmerge-subprocesses-as-subprocess');
  initMainWindowFrequenciesCheckbox('icon-move-to-top');
  initMainWindowFrequenciesCheckbox('icon-move-to-bottom');
  initMainWindowFrequenciesCheckbox('icon-hide');
  initMainWindowFrequenciesCheckbox('icon-hide-siblings-below');
  initMainWindowFrequenciesCheckbox('icon-unhide-hidden-children');


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
         notebookConfig['font-size-in-px-of-tooltips'] === originalNotebookConfig['font-size-in-px-of-tooltips'] &&
         notebookConfig['font-size-in-px-of-top-panel-of-tags-on-main-window'] === originalNotebookConfig['font-size-in-px-of-top-panel-of-tags-on-main-window'] &&
         notebookConfig['font-size-in-px-of-bottom-panel-of-tags-on-main-window'] === originalNotebookConfig['font-size-in-px-of-bottom-panel-of-tags-on-main-window'] &&
         notebookConfig['font-size-in-px-of-top-panel-of-notes-on-main-window'] === originalNotebookConfig['font-size-in-px-of-top-panel-of-notes-on-main-window'] &&
         notebookConfig['font-size-in-px-of-bottom-panel-of-notes-on-main-window'] === originalNotebookConfig['font-size-in-px-of-bottom-panel-of-notes-on-main-window'] &&
         notebookConfig['font-size-in-px-of-tooltips-on-main-window'] === originalNotebookConfig['font-size-in-px-of-tooltips-on-main-window'] && (function() {
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

            'main-window-tag-icon-open-in-tree-above',
            'main-window-tag-icon-edit',
            'main-window-tag-icon-move-to-top',
            'main-window-tag-icon-move-to-bottom',
            'main-window-tag-icon-hide',
            'main-window-tag-icon-hide-siblings-below',
            'main-window-tag-icon-unhide-hidden-children',

            'main-window-notes-icon-open-in-tree-above',
            'main-window-notes-icon-open-tag-in-tags-tree',
            'main-window-notes-icon-open-tags-of-children-in-tags-tree',
            'main-window-notes-icon-open-notes-with-the-same-tag-in-bottom-panel',
            'main-window-notes-icon-edit',
            'main-window-notes-icon-move-to-top',
            'main-window-notes-icon-move-to-bottom',
            'main-window-notes-icon-hide',
            'main-window-notes-icon-hide-siblings-below',
            'main-window-notes-icon-unhide-hidden-children',
            'main-window-notes-icon-add-sibling-node',
            'main-window-notes-icon-append-child-node',
            'main-window-notes-icon-delete',
           ];
           for (let iconPropName of iconPropNames) {
             if (!!notebookConfig[iconPropName] !== !!originalNotebookConfig[iconPropName]) {
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
  for (let iconPropName of iconPropNames) {
    if (frequenciesConfig['main-window-' + iconPropName] !== originalFrequenciesConfig['main-window-' + iconPropName]) {
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
