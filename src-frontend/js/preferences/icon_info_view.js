const { withChildren, withClass } = require('../html_utils.js');

export function IconInfoView(iconName, iconTitle, checked, indexInOrder) {
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

  let btnDown = withChildren(document.createElement('button'),
    document.createTextNode('v')
  );
  that.btnDown = btnDown;

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

