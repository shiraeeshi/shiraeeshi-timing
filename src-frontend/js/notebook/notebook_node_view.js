const { buildTagsAndLinksForest, highlightTagsInForest } = require('./notebook_utils.js');
const {
  addSiblingWithInputToTheRightSideNode,
  appendChildWithInputToTheRightSideNode,
  editRightSideNode,
  deleteNodeFromTheRightSide,
  pasteNodeInto,
} = require('./notebook_node_view_utils.js');
const { withChildren, withClass } = require('../html_utils.js');

export function NotebookNodeView(notebookNode, parentNodeView) {
  let that = this;
  that.notebookNode = notebookNode;
  notebookNode.nodeView = that;
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
  that.isTopPanelTree = true;
}

export function NotebookNodeViewOfBottomPanel(notebookNode, parentNodeView) {
  let that = this;
  that.notebookNode = notebookNode;
  notebookNode.nodeViewOfBottomPanel = that;
  that.name = notebookNode.name;
  that.isCollapsed = true;
  that.parentNodeView = parentNodeView;
  that.children = notebookNode.children.map(childNode => new NotebookNodeViewOfBottomPanel(childNode, that));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.hasManuallyHiddenChildren = false;
  that.htmlContainerUl = document.createElement('ul');
  that.isTopPanelTree = false;
}

NotebookNodeView.prototype.newChildFromNode = function(node) {
  let that = this;
  let newChildView = that.instantiateNewChild(node);
  that.children.push(newChildView);
  that.childrenByName[node.name] = newChildView;
  return newChildView;
}

NotebookNodeView.prototype.instantiateNewChild = function(node) {
  let that = this;
  return new NotebookNodeView(node, that);
}

NotebookNodeView.prototype.refreshOrderOfChildrenOnScreen = function() {
  let that = this;
  that.refreshOrderOfChildren();
  that.htmlContainerUl.innerHTML = "";
  withChildren(that.htmlContainerUl, ...that.children.map(ch => ch.html()));
}

NotebookNodeView.prototype.refreshOrderOfChildren = function() {
  let that = this;
  that.children = that.notebookNode.children.map(ch => ch.nodeView);
}

NotebookNodeView.prototype.mergeWithNewNodes = function(notebookNode) {
  let that = this;
  that.notebookNode = notebookNode;
  let lengthBefore = that.children.length;
  notebookNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = that.newChildFromNode(childNode);
      newChildView.buildAsHtmlLiElement();
    } else {
      oldChild.mergeWithNewNodes(childNode);
    }
  });
  if (lengthBefore > 0) {
    that.refreshOrderOfChildrenOnScreen();
  }
  let currentLength = that.children.length;
  if (lengthBefore === 0 && currentLength > 0) {
    if (that.htmlElement === undefined) {
      return;
    }
    that._rebuildHtmlElement();
    if (!that.isCollapsed) {
      that.refreshOrderOfChildrenOnScreen();
    }
  }
};

NotebookNodeView.prototype.handleInsertedChild = function(newChildIndex) {
  let that = this;

  let lengthBefore = that.children.length;

  let newChildNode = that.notebookNode.children[newChildIndex];
  let newChildView = that.newChildFromNode(newChildNode);
  newChildView.buildAsHtmlLiElement();

  if (lengthBefore > 0 && that.isTopPanelTree) {
    that.refreshOrderOfChildrenOnScreen();
  }
  if (lengthBefore === 0) {
    if (that.htmlElement === undefined) {
      return;
    }
    that._rebuildHtmlElement();
    if (!that.isCollapsed && that.isTopPanelTree) {
      that.refreshOrderOfChildrenOnScreen();
    }
  }
};

NotebookNodeView.prototype._rebuildHtmlElement = function() {
  let that = this;
  function buildAndUncollapse() {
    that.buildAsHtmlLiElement();
    if (!that.isCollapsed) {
      that.uncollapseWithoutNotifyingChildren();
    }
  }
  if (that.htmlElement === undefined) {
    buildAndUncollapse();
    return;
  }
  let parent = that.htmlElement.parentNode;
  if (parent === null) {
    buildAndUncollapse();
    return;
  }
  let htmlChildIndex = Array.prototype.indexOf.call(parent.children, that.htmlElement);
  if (htmlChildIndex < 0) {
    buildAndUncollapse();
    return;
  }
  parent.removeChild(that.htmlElement);
  delete that.htmlElement;
  buildAndUncollapse();
  if (htmlChildIndex === parent.children.length) {
    parent.appendChild(that.htmlElement);
  } else {
    parent.insertBefore(that.htmlElement, parent.children[htmlChildIndex]);
  }
};

NotebookNodeView.prototype.removeFromTree = function() {
  let that = this;
  that.notebookNode.removeFromTree();
  that.notebookNode.notifyWasRemovedFromTree();
};

NotebookNodeView.prototype.handleBeingRemovedFromTree = function() {
  let that = this;
  if (that.parentNodeView !== undefined) {
    let childIndex = that.parentNodeView.children.indexOf(that);
    if (childIndex >= 0) {
      that.parentNodeView.children.splice(childIndex, 1);
    }
    delete that.parentNodeView.childrenByName[that.name];
  }
  that._removeHtmlElementFromTree();
  if (that.parentNodeView.children.length === 0) {
    that.parentNodeView._rebuildHtmlElement();
  }
};

NotebookNodeView.prototype.handleTagSegmentNameChange = function() {
  let that = this;
  let oldName = that.name;
  let newName = that.notebookNode.name;
  that.name = newName;
  if (that.parentNodeView !== undefined) {
    delete that.parentNodeView.childrenByName[oldName];
    that.parentNodeView.childrenByName[newName] = that;
  }
  if (that.htmlElement === undefined) {
    return;
  }
  that._rebuildHtmlElement();
};

NotebookNodeView.prototype._removeHtmlElementFromTree = function() {
  let that = this;
  if (that.htmlElement === undefined) {
    return;
  }
  let parent = that.htmlElement.parentNode;
  if (parent === null) {
    return;
  }
  let htmlChildIndex = Array.prototype.indexOf.call(parent.children, that.htmlElement);
  if (htmlChildIndex >= 0) {
    try {
      parent.removeChild(that.htmlElement);
    } catch (err) {
      console.log(`error while removing html child: ${err.message}`);
    }
  }
};

NotebookNodeView.prototype.addHtmlSiblingWithInput = function(changeHandler) {
  let that = this;
  if (that.parentNodeView === undefined) {
    return;
  }
  let idx = that.parentNodeView.children.indexOf(that);
  that.parentNodeView._insertHtmlChildWithInputAtIndex(idx + 1, changeHandler);
};

NotebookNodeView.prototype.appendHtmlChildWithInput = function(changeHandler) {
  let that = this;
  if (that.isCollapsed) {
    that.toggleCollapse();
  }
  let idx = that.children.length;
  that._insertHtmlChildWithInputAtIndex(idx, changeHandler);
};

NotebookNodeView.prototype._insertHtmlChildWithInputAtIndex = function(index, changeHandler) {
  let that = this;
  if (that.children.length === 0) {
    if (that.htmlElement === undefined) {
      return;
    }
    let parent = that.htmlElement.parentNode;
    if (parent === undefined) {
      return;
    }
    let htmlChildIndex = Array.prototype.indexOf.call(parent.children, that.htmlElement);
    if (htmlChildIndex < 0) {
      return;
    }

    parent.removeChild(that.htmlElement);
    delete that.htmlElement;

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
          that.createTitleDiv()
        ),
        that.htmlContainerUl
      );

    that.htmlElement = htmlElement;

    that.uncollapseWithoutNotifyingChildren();

    if (htmlChildIndex === parent.children.length) {
      parent.appendChild(that.htmlElement);
    } else {
      parent.insertBefore(that.htmlElement, parent.children[htmlChildIndex]);
    }
  }

  let inputElem = document.createElement('input');
  let htmlElem = withChildren(document.createElement('li'), inputElem);
  if (index < that.htmlContainerUl.children.length) {
    that.htmlContainerUl.insertBefore(htmlElem, that.htmlContainerUl.children[index]);
  } else {
    that.htmlContainerUl.appendChild(htmlElem);
  }
  inputElem.addEventListener('change', (eve) => {
    let value = inputElem.value;
    if (value === '') {
      return;
    }
    that.htmlContainerUl.removeChild(htmlElem);
    let newNotebookNode = that.notebookNode.ensureChildWithName(value);
    that.notebookNode.children.splice(index, 0, newNotebookNode);
    that.notebookNode.children.pop();
    that.notebookNode.notifyInsertedChild(index);
    // that.notebookNode.notifyChange();
    // // that.mergeWithNewNodes(that.notebookNode);
    that.uncollapseWithoutNotifyingChildren();
    changeHandler(newNotebookNode);
    enableKeyboardListener();
    window.webkit.messageHandlers.notebook_msgs__enable_shortcuts.postMessage();
  });
  inputElem.addEventListener('keypress', (eve) => {
    if (eve.key === 'Enter') {
      eve.preventDefault();
    }
  });
  inputElem.addEventListener('keyup', (eve) => {
    if (eve.key === 'Enter') {
      eve.preventDefault();
      eve.stopPropagation();
      let event = new Event('change');
      inputElem.dispatchEvent(event);
    }
  });
  inputElem.focus();
  disableKeyboardListener();
  window.webkit.messageHandlers.notebook_msgs__disable_shortcuts.postMessage();
};

NotebookNodeView.prototype.edit = function(changeHandler) {
  let that = this;
  if (that.htmlElement === undefined) {
    return;
  }
  let titleContainer = that.htmlElement.querySelector('.notebook-node-title-container');
  titleContainer.innerHTML = '';
  let inputElem = document.createElement('input');
  inputElem.value = that.name;
  titleContainer.appendChild(inputElem);
  let isHandlingChange = false;
  inputElem.addEventListener('change', (eve) => {
    let value = inputElem.value;
    if (isHandlingChange) {
      return;
    } else {
      isHandlingChange = true;
    }
    if (value === '') {
      return;
    }
    let notebookNodeParent = that.notebookNode.parent;
    let newNotebookNode = notebookNodeParent.ensureChildWithName(value);
    newNotebookNode.children = that.notebookNode.children;
    newNotebookNode.childrenByName = that.notebookNode.childrenByName;
    let index = notebookNodeParent.children.indexOf(that.notebookNode);
    if (value === that.name) {
      that._removeHtmlElementFromTree();
      that.buildAsHtmlLiElement();
    } else {
      that.removeFromTree();
      notebookNodeParent.children.splice(index, 0, newNotebookNode);
      notebookNodeParent.children.pop();
      notebookNodeParent.notifyInsertedChild(index);
      // notebookNodeParent.notifyChange();
      // // that.parentNodeView.mergeWithNewNodes(notebookNodeParent);
    }
    changeHandler(newNotebookNode.nodeView);
    isHandlingChange = false;
    enableKeyboardListener();
    window.webkit.messageHandlers.notebook_msgs__enable_shortcuts.postMessage();
  });
  inputElem.addEventListener('keypress', (eve) => {
    if (eve.key === 'Enter') {
      eve.preventDefault();
    }
  });
  inputElem.addEventListener('keyup', (eve) => {
    if (eve.key === 'Escape') {
      eve.preventDefault();
      eve.stopPropagation();
      inputElem.value = that.name;
      let event = new Event('change');
      inputElem.dispatchEvent(event);
    }
    if (eve.key === 'Enter') {
      eve.preventDefault();
      eve.stopPropagation();
      let event = new Event('change');
      inputElem.dispatchEvent(event);
    }
  });
  inputElem.focus();
  disableKeyboardListener();
  window.webkit.messageHandlers.notebook_msgs__disable_shortcuts.postMessage();
};

NotebookNodeView.prototype.wrapInRectangle = function() {
  let that = this;
  that.htmlElement && that.htmlElement.classList.add('in-rectangle');
};

NotebookNodeView.prototype.removeRectangleWrapper = function() {
  let that = this;
  that.htmlElement && that.htmlElement.classList.remove('in-rectangle');
};

NotebookNodeView.prototype.findPreviousSibling = function() {
  let that = this;
  if (that.parentNodeView === undefined) {
    return undefined;
  }
  let parentChildren = that.parentNodeView.children;
  let idx = parentChildren.indexOf(that);
  if (idx <= 0) {
    return undefined;
  }
  return parentChildren[idx - 1];
};

NotebookNodeView.prototype.findNextSibling = function() {
  let that = this;
  if (that.parentNodeView === undefined) {
    return undefined;
  }
  let parentChildren = that.parentNodeView.children;
  let idx = parentChildren.indexOf(that);
  if (idx < 0 || idx === parentChildren.length - 1) {
    return undefined;
  }
  return parentChildren[idx + 1];
};

NotebookNodeView.prototype._isTaggedNode = function() {
  let that = this;
  if (that.notebookNode === undefined) {
    return false;
  }
  return that.notebookNode.tag !== undefined;
}

NotebookNodeView.prototype._hasTaggedChildren = function() {
  let that = this;
  if (that.notebookNode === undefined) {
    return false;
  }
  return !!that.notebookNode.hasChildrenWithTags;
}

NotebookNodeView.prototype.openTagInTagsTree = function() {
  let that = this;
  let tag = that.notebookNode.tag;
  let tagsAndLinksForestObj = buildTagsAndLinksForest([tag]);
  window.my.lastOpenedTags = tagsAndLinksForestObj;
  highlightTagsInForest(window.my.rootNodeViewOfTagsOfBottomPanel, tagsAndLinksForestObj);
}

NotebookNodeView.prototype.openTagsOfChildrenInTagsTree = function() {
  let that = this;
  let tagsOfChildren = that.notebookNode.tagsOfChildren;
  let tagsAndLinksForestObj = buildTagsAndLinksForest(tagsOfChildren);
  window.my.lastOpenedTags = tagsAndLinksForestObj;
  highlightTagsInForest(window.my.rootNodeViewOfTagsOfBottomPanel, tagsAndLinksForestObj);
}

NotebookNodeView.prototype.moveToTop = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.insertBefore(that.html(), parent.children[0]);

  let nodeViewIndex = that.parentNodeView.children.indexOf(that);
  if (nodeViewIndex >= 0) {
    that.parentNodeView.children.splice(nodeViewIndex, 1);
    that.parentNodeView.children.splice(0, 0, that);
  }

  let parentNotebookNode = that.notebookNode.parent;
  let index = parentNotebookNode.children.indexOf(that.notebookNode);
  if (index < 0) {
    return;
  }
  parentNotebookNode.children.splice(index, 1);
  parentNotebookNode.children.splice(0, 0, that.notebookNode);
}

NotebookNodeView.prototype.moveToBottom = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.appendChild(that.html());

  let nodeViewIndex = that.parentNodeView.children.indexOf(that);
  if (nodeViewIndex >= 0) {
    that.parentNodeView.children.splice(nodeViewIndex, 1);
    that.parentNodeView.children.push(that);
  }

  let parentNotebookNode = that.notebookNode.parent;
  let index = parentNotebookNode.children.indexOf(that.notebookNode);
  if (index < 0) {
    return;
  }
  parentNotebookNode.children.splice(index, 1);
  parentNotebookNode.children.push(that.notebookNode);
}

NotebookNodeView.prototype.hideThisItem = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  if (that.parentNodeView !== undefined) {
    that.parentNodeView.html().classList.add('has-hidden-children');
    that.parentNodeView.hasManuallyHiddenChildren = true;
  }
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
      if (that.parentNodeView !== undefined) {
        that.parentNodeView.html().classList.add('has-hidden-children');
        that.parentNodeView.hasManuallyHiddenChildren = true;
      }
    }
  }
}

NotebookNodeView.prototype.unhideHiddenChildren = function() {
  let that = this;
  that.children.forEach(childNode => childNode.unhide());
  that.refreshOrderOfChildrenOnScreen();
  let parent = that.html().parentNode;
  that.html().classList.remove('has-hidden-children');
  that.hasManuallyHiddenChildren = false;
}

NotebookNodeView.prototype.increaseFontSize = function() {
  let that = this;
  let fontSize;
  if (that.isTopPanelTree) {
    fontSize = window.my.fontSizeOfTopPanelOfNotes;
  } else {
    fontSize = window.my.fontSizeOfBottomPanelOfNotes;
  }
  fontSize++;
  if (that.isTopPanelTree) {
    window.my.fontSizeOfTopPanelOfNotes = fontSize;
  } else {
    window.my.fontSizeOfBottomPanelOfNotes = fontSize;
  }
  that.html().style.fontSize = `${fontSize}px`;
}

NotebookNodeView.prototype.decreaseFontSize = function() {
  let that = this;
  let fontSize;
  if (that.isTopPanelTree) {
    fontSize = window.my.fontSizeOfTopPanelOfNotes;
  } else {
    fontSize = window.my.fontSizeOfBottomPanelOfNotes;
  }
  if (fontSize > 1) {
    fontSize--;
  }
  if (that.isTopPanelTree) {
    window.my.fontSizeOfTopPanelOfNotes = fontSize;
  } else {
    window.my.fontSizeOfBottomPanelOfNotes = fontSize;
  }
  that.html().style.fontSize = `${fontSize}px`;
}

NotebookNodeView.prototype.html = function() {
  let that = this;
  if (that.htmlElement !== undefined) {
    return that.htmlElement;
  }
  that.buildAsHtmlLiElement();
  return that.htmlElement;
};

NotebookNodeView.prototype.name2html = function() {
  let that = this;
  if (that.name.includes("\n")) {
    return withChildren(withClass(document.createElement('div'), 'title-container-div'),
            ...that.name.split("\n")
                        .map(line => document.createTextNode(line))
                        .flatMap(el => [el,document.createElement("br")])
                        .slice(0, -1)
          );
  } else {
    return withChildren(withClass(document.createElement('span'), 'title-container-span'),
            document.createTextNode(that.name)
          );
  }
}

NotebookNodeView.prototype._createIconsList = function() {
  let that = this;
  let iconOpenTagInTagsTree =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-open-tag-in-tags-tree'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('open the tag in tags tree')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        that.openTagInTagsTree();
      });
      return elem;
    })();
  let iconOpenTagsOfChildrenInTagsTree =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-open-tags-of-children-in-tags-tree'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('open tags of children in tags tree')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        that.openTagsOfChildrenInTagsTree();
      });
      return elem;
    })();
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
  let iconEdit =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-edit'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('rename this node')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        editRightSideNode(that);
      });
      return elem;
    })();
  let iconDeleteFromTheRightSide =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-delete-from-the-right-side'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('delete this node')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        deleteNodeFromTheRightSide(that);
      });
      return elem;
    })();
  let iconAppendChildWithInput =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-append-child-with-input'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('append child to this node')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        appendChildWithInputToTheRightSideNode(that)
      });
      return elem;
    })();
  let iconAddSiblingWithInput =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-add-sibling-with-input'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('add sibling node')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        addSiblingWithInputToTheRightSideNode(that);
      });
      return elem;
    })();
  let iconOpenNodeInTopPanel =
    (function() {
      let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-open-node-in-top-panel'),
        withClass(
          withChildren(document.createElement('span'),
            document.createTextNode('open node in top panel')
          ),
          'tooltip')
      );
      elem.addEventListener('click', eve => {
        openNodeInTopPanel(that);
      });
      return elem;
    })();
  let icons = [];
  if (that._isTaggedNode() && my.config.notebook['notes-icon-open-tag-in-tags-tree']) {
    icons.push(iconOpenTagInTagsTree);
  }
  if (that._hasTaggedChildren() && my.config.notebook['notes-icon-open-tags-of-children-in-tags-tree']) {
    icons.push(iconOpenTagsOfChildrenInTagsTree);
  }
  if (that.parentNodeView === undefined) {
    let iconIncreaseFontSize =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-increase-font-size'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('increase font size')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.increaseFontSize();
        });
        return elem;
      })();
    let iconDecreaseFontSize =
      (function() {
        let elem = withChildren(withClass(document.createElement('span'), 'notebook-node-icon', 'icon-decrease-font-size'),
          withClass(
            withChildren(document.createElement('span'),
              document.createTextNode('decrease font size')
            ),
            'tooltip')
        );
        elem.addEventListener('click', eve => {
          that.decreaseFontSize();
        });
        return elem;
      })();
    icons.push(iconIncreaseFontSize);
    icons.push(iconDecreaseFontSize);
  }
  function addIconIfConfigAllows(icon, configName) {
    if (my.config.notebook[configName]) {
      icons.push(icon);
    }
  }
  addIconIfConfigAllows(iconMoveToTop, 'notes-icon-move-to-top');
  addIconIfConfigAllows(iconMoveToBottom, 'notes-icon-move-to-bottom');
  addIconIfConfigAllows(iconHide, 'notes-icon-hide');
  addIconIfConfigAllows(iconHideSiblingsBelow, 'notes-icon-hide-siblings-below');
  addIconIfConfigAllows(iconUnhideHiddenChildren, 'notes-icon-unhide-hidden-children');
  if (!that.isTopPanelTree) {
    addIconIfConfigAllows(iconOpenNodeInTopPanel, 'notes-icon-open-in-tree-above');
  }
  addIconIfConfigAllows(iconEdit, 'notes-icon-edit');
  addIconIfConfigAllows(iconAddSiblingWithInput, 'notes-icon-add-sibling-node');
  addIconIfConfigAllows(iconAppendChildWithInput, 'notes-icon-append-child-node');
  addIconIfConfigAllows(iconDeleteFromTheRightSide, 'notes-icon-delete');
  return icons;
}

NotebookNodeView.prototype.createTitleDiv = function() {
  let that = this;
  let nameHtml = that.name2html();
  let icons = that._createIconsList();
  let iconsDiv = withChildren(withClass(document.createElement('div'), 'notebook-node-icons'),
    ...icons
  );
  let titleDiv = withChildren(withClass(document.createElement('div'), 'notebook-node-title-container'),
    nameHtml,
    iconsDiv
  );
  that._addContextMenuListener(nameHtml);
  return titleDiv;
}

NotebookNodeView.prototype._addContextMenuListener = function(htmlElem) {
  let that = this;
  htmlElem.addEventListener('contextmenu', (eve) => {
    eve.preventDefault();
    my.contextMenuHandler = function(commandName) {
      if (commandName === 'edit') {
        editRightSideNode(that);
      } else if (commandName === 'add-sibling-with-input') {
        addSiblingWithInputToTheRightSideNode(that);
      } else if (commandName === 'append-child-with-input') {
        appendChildWithInputToTheRightSideNode(that)
      } else if (commandName === 'delete') {
        deleteNodeFromTheRightSide(that);
      } else if (commandName === 'cut-node') {
        delete my.notebookNodeToCopy;
        my.notebookNodeToCut = that.notebookNode;
      } else if (commandName === 'copy-node') {
        delete my.notebookNodeToCut;
        my.notebookNodeToCopy = that.notebookNode;
      } else if (commandName === 'paste-node') {
        pasteNodeInto(that.notebookNode);
      } else if (commandName === 'move-to-top') {
        that.moveToTop();
      } else if (commandName === 'move-to-bottom') {
        that.moveToBottom();
      } else if (commandName === 'hide') {
        that.hideThisItem();
      } else if (commandName === 'hide-siblings-below') {
        that.hideSiblingsBelow();
      } else if (commandName === 'unhide-hidden-children') {
        that.unhideHiddenChildren();
      } else if (commandName === 'increase-font-size') {
        let rootNodeView = that._getRootNodeView();
        rootNodeView.increaseFontSize();
      } else if (commandName === 'decrease-font-size') {
        let rootNodeView = that._getRootNodeView();
        rootNodeView.decreaseFontSize();
      } else if (commandName === 'open-tag-in-tags-tree') {
        that.openTagInTagsTree();
      } else if (commandName === 'open-tags-of-children-in-tags-tree') {
        that.openTagsOfChildrenInTagsTree();
      } else if (commandName === 'open-node-in-top-panel') {
        openNodeInTopPanel(that);
      }
    }
    window.webkit.messageHandlers.show_notebook_context_menu.postMessage('notebook-node', {
      isTopPanelTree: that.isTopPanelTree,
      isTaggedNode: that._isTaggedNode(),
      hasTaggedChildren: that._hasTaggedChildren(),
      hasHiddenChildren: that.html().classList.contains('has-hidden-children'),
    });
    return false;
  });
}

function openNodeInTopPanel(nodeView) {
  let topPanelNodeView = nodeView.notebookNode.nodeView;
  if (topPanelNodeView === undefined) {
    return;
  }
  let ancestry = [];
  let ancestor = topPanelNodeView.parentNodeView;
  while (ancestor !== undefined) {
    ancestry.push(ancestor);
    ancestor = ancestor.parentNodeView;
  }
  for (let i = ancestry.length - 1; i >= 0; i--) {
    ancestor = ancestry[i];
    ancestor.unhide();
    if (ancestor.isCollapsed) {
      ancestor.uncollapse();
    }
  }
  topPanelNodeView.unhide();
  let wrapper = document.getElementById('notes-content-top-wrapper');
  let offsetTop = topPanelNodeView.htmlElement.offsetTop;
  wrapper.scrollTo({top: offsetTop, behavior: 'smooth'});
}

NotebookNodeView.prototype.buildAsHtmlLiElement = function() {
  let that = this;


  if (that.children.length == 0) {
    let htmlElement = withClass(withChildren(document.createElement('li'), that.createTitleDiv()), 'proc-node', 'proc-leaf');
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
        that.createTitleDiv()
      ),
      that.htmlContainerUl
    );
  if (that.parentNodeView === undefined) {
    that.initFontSize(htmlElement);
  }
  that.htmlElement = htmlElement;
};

NotebookNodeView.prototype.initFontSize = function(htmlElement) {
  let that = this;
  let fontSize;
  if (that.isTopPanelTree) {
    fontSize = window.my.fontSizeOfTopPanelOfNotes;
  } else {
    fontSize = window.my.fontSizeOfBottomPanelOfNotes;
  }
  htmlElement.style.fontSize = `${fontSize}px`;
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
  that.uncollapseWithoutNotifyingChildren();
  that.children.forEach(childView => childView.parentUncollapsed());
};

NotebookNodeView.prototype.uncollapseWithoutNotifyingChildren = function() {
  let that = this;
  that.isCollapsed = false;
  if (that.html().classList.contains("proc-node-closed")) {
    that.html().classList.remove("proc-node-closed");
    that.html().classList.add("proc-node-open");
  }
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
      that.parentNodeView.hasManuallyHiddenChildren = false;
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
  let htmlIndex = Array.prototype.indexOf.call(htmlParent.children, that.html());
  let htmlContains = htmlIndex >= 0;
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

NotebookNodeView.prototype._getRootNodeView = function() {
  let that = this;
  let nodeView = that;
  while (true) {
    if (nodeView.parentNodeView === undefined) {
      return nodeView;
    }
    nodeView = nodeView.parentNodeView;
  }
}


function disableKeyboardListener() {
  my.isKeyboardListenerDisabled = true;
}

function enableKeyboardListener() {
  my.isKeyboardListenerDisabled = false;
}

for (let propName in NotebookNodeView.prototype) {
  NotebookNodeViewOfBottomPanel.prototype[propName] = NotebookNodeView.prototype[propName];
}

NotebookNodeViewOfBottomPanel.prototype.instantiateNewChild = function(node) {
  let that = this;
  return new NotebookNodeViewOfBottomPanel(node, that);
}

NotebookNodeViewOfBottomPanel.prototype.refreshOrderOfChildren = function() {
  let that = this;
  that.children = that.notebookNode.children.map(ch => ch.nodeViewOfBottomPanel);
}
