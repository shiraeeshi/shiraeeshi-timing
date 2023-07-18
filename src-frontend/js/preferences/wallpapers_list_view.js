const { WallpaperInfoView } = require('./wallpaper_info_view.js');

const { withChildren } = require('../html_utils.js');

export function WallpapersListView(wallpapersToShow) {
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
  if (Object.keys(window.my.wallpapersToAddByName).length > 0) {
    return false;
  }
  if (Object.keys(window.my.wallpapersToDeleteByName).length > 0) {
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


  let setOfDeletedNames = new Set(Object.keys(window.my.wallpapersToDeleteByName));
  for (let t of that.wallpapersToShow) {
    let wasAddedAndDeleted = t.original === undefined && window.my.wallpapersToAddByName[t.name] === undefined;
    let wasDeleted = setOfDeletedNames.has(t.name);

    if (wasAddedAndDeleted || wasDeleted) {
      t.view.html.parentNode.removeChild(t.view.html);
    }
  }
  that.wallpapersToShow = that.wallpapersToShow.filter(t => !setOfDeletedNames.has(t.name));
  that.wallpaperInfoViews = that.wallpapersToShow.map(t => t.view);

  window.my.wallpapersToAddByName = {};
  window.my.wallpapersToDeleteByName = {};
  window.my.newNamesOfWallpapersToRenameByOldName = {};
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

