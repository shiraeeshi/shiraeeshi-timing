const { showOrHideStarInWallpapersHeader } = require('./header_utils.js');

const { withChildren, withClass } = require('../html_utils.js');

export function WallpaperInfoView(wallpaperInfo) {
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

  window.my.currentWallpaperInfoBeingEdited = wallpaperInfo;

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

  window.my.scrollTopOfListOfWallpapers = document.getElementById('tab-contents-of-wallpapers').scrollTop;

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

  if (window.my.wallpapersToAddByName.hasOwnProperty(wallpaperInfo.name)) {
    delete window.my.wallpapersToAddByName[wallpaperInfo.name];
  } else {
    window.my.wallpapersToDeleteByName[wallpaperInfo.name] = true;
  }

  that.html.classList.add('to-be-deleted');
  showOrHideStarInWallpapersHeader();
};


WallpaperInfoView.prototype.btnHandlerUndoDeletionOfWallpaperInfo = function() {
  let that = this;
  let wallpaperInfo = that.wallpaperInfo;

  if (window.my.wallpapersToDeleteByName[wallpaperInfo.name]) {
    delete window.my.wallpapersToDeleteByName[wallpaperInfo.name];
  } else {
    window.my.wallpapersToAddByName[wallpaperInfo.name] = wallpaperInfo;
  }

  that.html.classList.remove('to-be-deleted');
  showOrHideStarInWallpapersHeader();
}

