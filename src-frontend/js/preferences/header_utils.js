
export function showOrHideStarInWallpapersHeader() {
  let isSame = window.my.wallpapersListView.dataIsSameAsOriginal();
  window.my.showingWallpapersHeaderWithStar = !isSame;
  let label = document.getElementById('tab6-label');
  if (isSame) {
    label.innerHTML = 'Wallpapers';
  } else {
    label.innerHTML = 'Wallpapers*';
  }
}

export function showOrHideStarInTimingsHeader() {
  let isSame = window.my.timingsFileInfosListView.dataIsSameAsOriginal();
  window.my.showingTimingsHeaderWithStar = !isSame;
  let label = document.getElementById('tab1-label');
  if (isSame) {
    label.innerHTML = 'Timings';
  } else {
    label.innerHTML = 'Timings*';
  }
}

