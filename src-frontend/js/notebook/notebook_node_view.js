const { withChildren, withClass } = require('../html_utils.js');

export function NotebookNodeView(notebookNode, parentNodeView) {
  let that = this;
  that.name = notebookNode.name;
  that.isCollapsed = true;
  that.parentNodeView = parentNodeView;
  that.children = notebookNode.children.map(childNode => new NotebookNodeView(childNode, that));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.hasManuallyHiddenChildren = false;
  that.htmlContainerUl = document.createElement('ul');
}

NotebookNodeView.prototype.name2html = function() {
  let that = this;
  if (that.name.includes("\n")) {
    return withChildren(document.createElement('div'),
            ...that.name.split("\n")
                        .map(line => document.createTextNode(line))
                        .flatMap(el => [el,document.createElement("br")])
                        .slice(0, -1)
          );
  } else {
    return withChildren(document.createElement('span'),
            document.createTextNode(that.name)
          );
  }
}

NotebookNodeView.prototype.moveToTop = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.insertBefore(that.html(), parent.children[0]);
}

NotebookNodeView.prototype.moveToBottom = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.appendChild(that.html());
}

NotebookNodeView.prototype.hideThisItem = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  that.parentNodeView && that.parentNodeView.html().classList.add('has-hidden-children');
  that.hasManuallyHiddenChildren = true;
};

NotebookNodeView.prototype.hideSiblingsBelow = function() {
  let that = this;
  let parent = that.html().parentNode;
  let siblings = Array.from(parent.children);
  let idx = siblings.indexOf(that.html());
  if (idx >= 0) {
    for (let i = idx + 1; i < siblings.length; i++) {
      let sibling = siblings[i];
      parent.removeChild(sibling);
    }
    if (siblings.length > idx + 1) {
      that.parentNodeView && that.parentNodeView.html().classList.add('has-hidden-children');
      that.hasManuallyHiddenChildren = true;
    }
  }
}

NotebookNodeView.prototype.unhideHiddenChildren = function() {
  let that = this;
  that.children.forEach(childNode => childNode.unhide());
  let parent = that.html().parentNode;
  that.html().classList.remove('has-hidden-children');
  that.hasManuallyHiddenChildren = false;
}

NotebookNodeView.prototype.html = function() {
  let that = this;
  if (that.htmlElement !== undefined) {
    return that.htmlElement;
  }
  that.buildAsHtmlLiElement();
  return that.htmlElement;
};

NotebookNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;

  function createTitleDiv() {
    let nameHtml = that.name2html();
    let iconMoveToTop =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-move-to-top'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('move to the top of the list')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.moveToTop();
        });
        return elem;
      })();
    let iconMoveToBottom =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-move-to-bottom'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('move to the bottom of the list')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.moveToBottom();
        });
        return elem;
      })();
    let iconHide =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-hide'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('hide this item')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.hideThisItem();
        });
        return elem;
      })();
    let iconHideSiblingsBelow =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-hide-siblings-below'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('hide siblings that are below this item')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.hideSiblingsBelow();
        });
        return elem;
      })();
    let iconUnhideHiddenChildren =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-unhide-hidden-children'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('show hidden children')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.unhideHiddenChildren();
        });
        return elem;
      })();
    let iconsDiv = withChildren(withClass(document.createElement('div'), 'notebook-node-icons'),
      iconMoveToTop,
      iconMoveToBottom,
      iconHide,
      iconHideSiblingsBelow,
      iconUnhideHiddenChildren
    );
    let titleDiv = withChildren(withClass(document.createElement('div'), 'notebook-node-title-container'),
      nameHtml,
      iconsDiv
    );
    return titleDiv;
  }

  if (that.children.length == 0) {
    let htmlElement = withClass(withChildren(document.createElement('li'), createTitleDiv()), 'proc-node', 'proc-leaf');
    that.htmlElement = htmlElement;
    return;
  }

  let htmlElement =
    withChildren(
      withChildren(withClass(document.createElement('li'), 'proc-node', 'proc-node-closed'),
        (function() {
          let elem = document.createElement('span');
          elem.classList.add('proc-node-icon');
          elem.addEventListener('click', eve => {
            that.toggleCollapse();
          });
          return elem;
        })(),
        createTitleDiv()
      ),
      that.htmlContainerUl
    );
  that.htmlElement = htmlElement;
};

NotebookNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

NotebookNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    if (!that.hasManuallyHiddenChildren) {
      that._appendHtmlChildren();
    }
    that.uncollapse();
  } else {
    that.collapse();
  }
};

NotebookNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (!that.htmlElement) {
    return;
  }
  if (that.html().classList.contains("proc-node-open")) {
    that.html().classList.remove("proc-node-open");
    that.html().classList.add("proc-node-closed");
  }
};

NotebookNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html().classList.contains("proc-node-closed")) {
    that.html().classList.remove("proc-node-closed");
    that.html().classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
};

NotebookNodeView.prototype._appendHtmlChildren = function() {
  let that = this;
  withChildren(that.htmlContainerUl,
    ...that.children.map(childNode => childNode.html())
  )
};

NotebookNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
  if (that.parentNodeView && !that.parentNodeView.hasManuallyHiddenChildren) {
    that.hasManuallyHiddenChildren = false;
    that.html().classList.remove('has-hidden-children');
  }
};

NotebookNodeView.prototype.hide = function() {
  let that = this;
  that.collapse();
  if (!that.htmlElement) {
    return;
  }
  let htmlParent = that.html().parentNode;
  if (htmlParent !== null) {
    htmlParent.removeChild(that.html());
  }
  for (let child of that.children) {
    child.hide();
  }
};

NotebookNodeView.prototype.unhide = function() {
  let that = this;

  function maintainParentState() {
    let htmlChildrenLen = that.parentNodeView.htmlContainerUl.children.length;
    let childrenLen = that.parentNodeView.children.length;
    if (childrenLen === htmlChildrenLen) {
      that.parentNodeView.html().classList.remove('has-hidden-children');
      that.hasManuallyHiddenChildren = false;
    } else {
      that.parentNodeView.html().classList.add('has-hidden-children');
    }
  }

  let htmlParent = that.html().parentNode;
  if (htmlParent === null) {
    if (that.parentNodeView !== undefined) {
      that.parentNodeView.htmlContainerUl.appendChild(that.html());
      maintainParentState();
    }
    return;
  }
  let htmlContains = Array.prototype.indexOf.call(htmlParent.children, that.html());
  if (!htmlContains) {
    htmlParent.appendChild(that.html());
    if (that.parentNodeView !== undefined) {
      maintainParentState();
    }
  }
};

NotebookNodeView.prototype.highlightTree = function(nodeToHighlight) {
  let that = this;

  that.unhide();

  if (nodeToHighlight.children.length == 0) {
    that.html().classList.remove('has-hidden-children');
    if (!that.isLeaf()) {
      if (!that.isCollapsed) {
        that.collapse();
      }
      that.hasManuallyHiddenChildren = false;
      that.children.forEach(childView => childView.parentIsHighlighted());
    }
  } else {
    if (!that.isLeaf()) {
      if (that.isCollapsed) {
        that.uncollapse();
      }
      nodeToHighlight.children.forEach(childNodeToHighlight => {
        if (that.childrenByName.hasOwnProperty(childNodeToHighlight.name)) {
          that.childrenByName[childNodeToHighlight.name].highlightTree(childNodeToHighlight);
        }
      });
    }
  }
};

NotebookNodeView.prototype.parentIsHighlighted = function() {
  let that = this;
  // that.unhide();
  if (!that.isCollapsed) {
    that.collapse();
  }
};

