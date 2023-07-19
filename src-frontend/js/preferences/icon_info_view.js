const { withChildren, withClass } = require('../html_utils.js');

export function IconInfoView(listView, iconName, iconTitle, checked, indexInOrder) {
  this.listView = listView;
  this.iconName = iconName;
  this.iconTitle = iconTitle;
  this.originalChecked = checked;
  this.originalIndexInOrder = indexInOrder;
  this.checked = checked;
  this.indexInOrder = indexInOrder;
}

IconInfoView.prototype.setChangeListener = function(callback) {
  let that = this;
  that.changeListenerCallback = callback;
}

IconInfoView.prototype.initHtml = function() {
  let that = this;

  let checkbox = document.createElement('input');
  checkbox.setAttribute('type', 'checkbox');
  checkbox.checked = that.checked;
  that.checkbox = checkbox;

  checkbox.addEventListener('change', (eve) => {
    that.checked = checkbox.checked;
    if (that.changeListenerCallback !== undefined) {
      that.changeListenerCallback(that);
    }
  });

  let btnUp = withChildren(document.createElement('button'),
    document.createTextNode('^')
  );
  that.btnUp = btnUp;
  btnUp.addEventListener('click', (eve) => {
    if (!that.checked) {
      return;
    }
    let idx = that.listView.items.indexOf(that);
    if (idx > 0) {
      let prev = that.listView.items[idx - 1];
      while (true) {
        that.listView.items[idx - 1] = that;
        that.listView.items[idx] = prev;
        that.indexInOrder = idx - 1;
        prev.indexInOrder = idx;
        idx--;
        if (idx < 1) {
          break;
        }
        prev = that.listView.items[idx - 1];
        if (prev.checked) {
          break;
        }
      }
      that.listView.notifyOrderChanged();
    }
  });

  let btnDown = withChildren(document.createElement('button'),
    document.createTextNode('v')
  );
  that.btnDown = btnDown;
  btnDown.addEventListener('click', (eve) => {
    let idx = that.listView.items.indexOf(that);
    let len = that.listView.items.length;
    if (idx < len - 1) {
      let next = that.listView.items[idx + 1];
      if (!next.checked) {
        return;
      }
      that.listView.items[idx] = next;
      that.listView.items[idx + 1] = that;
      next.indexInOrder = idx;
      that.indexInOrder = idx + 1;
      that.listView.notifyOrderChanged();
    }
  });

  let result =
  withChildren(withClass(document.createElement('div'), 'icons-list-item'),
    withChildren(withClass(document.createElement('div'), 'input-with-label-div'),
      checkbox,
      withChildren(document.createElement('label'),
        document.createTextNode(that.iconTitle)
      ),
    ),
    withChildren(withClass(document.createElement('div'), 'right-side-buttons-of-icons-list-item'),
      btnUp,
      btnDown
    ),
  );
  that.htmlElement = result;
  return result;
}

IconInfoView.prototype.reset = function() {
  let that = this;
  that.checked = that.originalChecked;
  that.indexInOrder = that.originalIndexInOrder;
  that.checkbox.checked = that.checked;
}

