const { withChildren, withClass } = require('../html_utils.js');

export function NotebookNodeView(notebookNode, parentNodeView) {
  let that = this;
  that.name = notebookNode.name;
  that.isCollapsed = false;
  that.parentNodeView = parentNodeView;
  that.children = notebookNode.children.map(childNode => new NotebookNodeView(childNode, that));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
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
  let parent = that.html.parentNode;
  parent.removeChild(that.html);
  parent.insertBefore(that.html, parent.children[0]);
  if (that.parentNodeView) {
    that.parentNodeView.handleFirstAndLastVisible();
  }
}

NotebookNodeView.prototype.moveToBottom = function() {
  let that = this;
  let parent = that.html.parentNode;
  parent.removeChild(that.html);
  parent.appendChild(that.html);
  if (that.parentNodeView) {
    that.parentNodeView.handleFirstAndLastVisible();
  }
}

NotebookNodeView.prototype.hideThisItem = function() {
  let that = this;
  that.html.classList.add('made-invisible');
  if (that.html.classList.contains('first-visible')) {
    that.html.classList.remove('first-visible');
  }
  if (that.html.classList.contains('last-visible')) {
    that.html.classList.remove('last-visible');
  }
  if (that.parentNodeView) {
    that.parentNodeView.handleFirstAndLastVisible();
  }
};

NotebookNodeView.prototype.handleFirstAndLastVisible = function() {
  let that = this;
  let oldFirstVisible = that.html.querySelector(':scope > ul > .first-visible');
  if (oldFirstVisible) {
    oldFirstVisible.classList.remove('first-visible');
  }
  let oldLastVisible = that.html.querySelector(':scope > ul > .last-visible');
  if (oldLastVisible) {
    oldLastVisible.classList.remove('last-visible');
  }
  let firstVisible = undefined;
  let lastVisible = undefined;
  // for (let child of that.children) {
  for (let child of that.html.querySelectorAll(':scope > ul > li')) {
    let isVisible = !child.classList.contains('made-invisible');
    if (isVisible) {
      if (!firstVisible) {
        firstVisible = child;
      }
      lastVisible = child;
    }
  }
  if (firstVisible) {
    firstVisible.classList.add('first-visible');
  }
  if (lastVisible) {
    lastVisible.classList.add('last-visible');
  }
};

NotebookNodeView.prototype.hideSiblingsBelow = function() {
  let that = this;
  let parent = that.html.parentNode;
  let siblings = Array.from(parent.children);
  let idx = siblings.indexOf(that.html);
  if (idx >= 0) {
    for (let i = idx + 1; i < siblings.length; i++) {
      let sibling = siblings[i];
      sibling.classList.add('made-invisible');
      if (sibling.classList.contains('last-visible')) {
        sibling.classList.remove('last-visible');
      }
    }
    if (that.parentNodeView) {
      that.parentNodeView.handleFirstAndLastVisible();
    }
  }
}

NotebookNodeView.prototype.unhideHiddenChildren = function() {
  let that = this;
  let hiddenChildren = that.html.querySelectorAll(':scope > ul > .made-invisible');
  hiddenChildren.forEach(elem => elem.classList.remove('made-invisible'));
  that.handleFirstAndLastVisible();
}

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
    that.html = htmlElement;
    return;
  }

  that.children.forEach(childNode => childNode.buildAsHtmlLiElement());
  let htmlElement =
    withChildren(
      withChildren(withClass(document.createElement('li'), 'proc-node', 'proc-node-open'),
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
      withChildren(document.createElement('ul'),
        ...that.children.map(childNode => childNode.html)
      )
    );
  that.html = htmlElement;
};

NotebookNodeView.prototype.isLeaf = function() {
  return this.children.length == 0;
};

NotebookNodeView.prototype.toggleCollapse = function() {
  let that = this;
  if (that.isCollapsed) {
    that.uncollapse();
  } else {
    that.collapse();
  }
};

NotebookNodeView.prototype.collapse = function() {
  let that = this;
  that.isCollapsed = true;
  if (that.html.classList.contains("proc-node-open")) {
    that.html.classList.remove("proc-node-open");
    that.html.classList.add("proc-node-closed");
  }
};

NotebookNodeView.prototype.uncollapse = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html.classList.contains("proc-node-closed")) {
    that.html.classList.remove("proc-node-closed");
    that.html.classList.add("proc-node-open");
  }
  that.children.forEach(childView => childView.parentUncollapsed());
  that.handleFirstAndLastVisible();
};

NotebookNodeView.prototype.parentUncollapsed = function() {
  let that = this;
  if (!that.isCollapsed) {
    that.collapse();
  }
};

NotebookNodeView.prototype.hide = function() {
  let that = this;
  // if (that.html.style.display != 'none') {
  //   that.oldDisplay = that.html.style.display;
  // }
  // that.html.style.display = 'none';
  that.html.classList.add('made-invisible');
  that.children.forEach(childView => childView.hide());
};

NotebookNodeView.prototype.unhide = function() {
  let that = this;

  // if (that.html.style.display != 'none') {
  //   that.oldDisplay = that.html.style.display;
  // } else {
  //   that.html.style.display = that.oldDisplay;
  // }

  that.html.classList.remove('made-invisible');

  that.children.forEach(childView => childView.unhide());
};

NotebookNodeView.prototype.highlightTree = function(nodeToHighlight) {
  let that = this;
  that._doHighlightTree(nodeToHighlight);
  if (that.parentNodeView) {
    that.parentNodeView.handleFirstAndLastVisible();
  }
};

NotebookNodeView.prototype._doHighlightTree = function(nodeToHighlight) {
  let that = this;

  // if (that.html.style.display != 'none') {
  //   that.oldDisplay = that.html.style.display;
  // } else {
  //   that.html.style.display = that.oldDisplay;
  // }

  that.html.classList.remove('made-invisible');

  if (nodeToHighlight.children.length == 0) {
    if (!that.isLeaf()) {
      if (!that.isCollapsed) {
        that.collapse();
      }
      that.children.forEach(childView => childView.parentIsHighlighted());
      that.handleFirstAndLastVisible();
    }
  } else {
    if (!that.isLeaf()) {
      if (that.isCollapsed) {
        that.uncollapse();
      }
      nodeToHighlight.children.forEach(childNodeToHighlight => {
        if (that.childrenByName.hasOwnProperty(childNodeToHighlight.name)) {
          that.childrenByName[childNodeToHighlight.name]._doHighlightTree(childNodeToHighlight);
        }
      });
      that.handleFirstAndLastVisible();
    }
  }
};

NotebookNodeView.prototype.parentIsHighlighted = function() {
  let that = this;
  that.unhide();
  if (!that.isCollapsed) {
    that.collapse();
  }
};

