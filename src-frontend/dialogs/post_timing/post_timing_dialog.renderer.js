const { withChildren, withClass } = require('../../js/html_utils.js');

window.webkit.messageHandlers.post_timing_dialog_msgs.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  let config = msg.config;

  showTimingsFileInfos(config.timings);
}

function showTimingsFileInfos(timingsFileInfos) {

  let mainContainer = document.getElementById('post-timing-dialog-main-container');

  mainContainer.innerHTML = '';

  withChildren(mainContainer,
    ...timingsFileInfos.map(t => {
      let nameDiv =
        withChildren(document.createElement('div'),
          document.createTextNode(`name: ${t.name}`)
        );
      let filepathDiv =
        withChildren(document.createElement('div'),
          document.createTextNode(`filepath: ${t.filepath}`)
        );
      let categoryPathDiv =
        withChildren(document.createElement('div'),
          document.createTextNode(`category path: ${categoryPathToString(t)}`)
        );
      if (categoryPathIsSameAsName(t)) {
        categoryPathDiv.classList.add('category-path-is-same-as-name');
      }
      return withChildren(withClass(document.createElement('div'), 'timings-file-info'),
        nameDiv,
        filepathDiv,
        categoryPathDiv
      );
    })
  );
}

function categoryPathIsSameAsName(timingsFileInfo) {
  return timingsFileInfo.categoryPath === undefined ||
    (
      timingsFileInfo.categoryPath.length === 1 &&
      timingsFileInfo.categoryPath[0] === timingsFileInfo.name
    );
}

function categoryPathToString(timingsFileInfo) {
  let categoryPath;
  if (timingsFileInfo.categoryPath !== undefined) {
    categoryPath = timingsFileInfo.categoryPath;
  } else {
    categoryPath = [timingsFileInfo.name];
  }
  return categoryPath.join(' - ');
}
