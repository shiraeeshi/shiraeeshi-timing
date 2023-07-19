const { IconInfoView } = require('./icon_info_view.js');

const { withChildren } = require('../html_utils.js');

export function IconsListView(htmlId, iconNamesAndTitles) {
  let that = this;
  that.htmlId = htmlId;
  sortIconInfosListByCheckedAndIndexInOrder(iconNamesAndTitles);
  that.items = iconNamesAndTitles.map(({iconName, iconTitle, checked, indexInOrder}) => {
    return new IconInfoView(that, iconName, iconTitle, checked, indexInOrder);
  });
}

function sortIconInfosListByCheckedAndIndexInOrder(iconInfosList) {
  iconInfosList.sort((a, b) => {
    if (a.checked) {
      if (b.checked) {
        if (a.indexInOrder === -1) {
          if (b.indexInOrder === -1) {
            return 0;
          } else {
            return -1;
          }
        } else {
          if (b.indexInOrder === -1) {
            return 1;
          } else {
            return a.indexInOrder - b.indexInOrder;
          }
        }
      } else {
        return -1;
      }
    } else {
      if (b.checked) {
        return 1;
      } else {
        return 0;
      }
    }
  });
}

IconsListView.prototype.initHtml = function() {
  let that = this;
  withChildren(document.getElementById(that.htmlId),
    ...that.items.map(item => item.initHtml()));
}

IconsListView.prototype.notifyOrderChanged = function() {
  let that = this;
  if (that.orderChangeListener) {
    that.orderChangeListener();
  }
}

IconsListView.prototype.refreshOrderInConfig = function(configObj, propName) {
  let that = this;
  configObj[propName] =
    that.items.filter(item => item.checked).map(item => item.iconName);
}

IconsListView.prototype.refreshOrderOnScreen = function() {
  let that = this;
  let listWrapper = document.getElementById(that.htmlId)
  listWrapper.innerHTML = '';
  withChildren(listWrapper,
    ...that.items.map(item => item.htmlElement));
}

IconsListView.prototype.iconsDataIsSameAsOriginal = function() {
  let that = this;
  for (let iconView of that.items) {
    if (iconView.checkbox.checked !== iconView.originalChecked ||
        (iconView.checkbox.checked && iconView.indexInOrder !== iconView.originalIndexInOrder)) {
      return false;
    }
  }
  return true;
}

IconsListView.prototype.setChangeListener = function(callback) {
  let that = this;
  that.items.forEach(item => item.setChangeListener(callback));
}

IconsListView.prototype.setOrderChangeListener = function(callback) {
  let that = this;
  that.orderChangeListener = callback;
}

IconsListView.prototype.reset = function() {
  let that = this;
  that.items.forEach(item => item.reset());
  sortIconInfosListByCheckedAndIndexInOrder(that.items);
  withChildren(document.getElementById(that.htmlId),
    ...that.items.map(item => item.htmlElement));
}

