const { NotebookNodeView } = require('./notebook_node_view.js');
const {
  appendNotesForestHtmlToBottomPanel,
  addTagNodeLinksToForest,
  highlightNotesInForest,
  openPathInTagsForest,
  searchByTag,
} = require('./notebook_utils.js');
const { withChildren, withClass } = require('../html_utils.js');


export function NotebookTagsTreeNodeView(notebookTagsTreeNode, parentNodeView) {
  let that = this;
  that.tagsTreeNode = notebookTagsTreeNode;
  notebookTagsTreeNode.nodeView = that;
  that.name = notebookTagsTreeNode.name;
  that.isCollapsed = true;
  that.parentNodeView = parentNodeView;
  that.children = notebookTagsTreeNode.children.map(childNode => new NotebookTagsTreeNodeView(childNode, that));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.hasManuallyHiddenChildren = false;
  that.htmlContainerUl = document.createElement('ul');
  that.isTopPanelTree = true;
}

export function NotebookTagsTreeNodeViewOfBottomPanel(notebookTagsTreeNode, parentNodeView) {
  let that = this;
  that.tagsTreeNode = notebookTagsTreeNode;
  notebookTagsTreeNode.nodeViewOfBottomPanel = that;
  that.name = notebookTagsTreeNode.name;
  that.isCollapsed = true;
  that.parentNodeView = parentNodeView;
  that.children = notebookTagsTreeNode.children.map(childNode => new NotebookTagsTreeNodeViewOfBottomPanel(childNode, that));
  that.childrenByName = {};
  that.children.forEach(childView => {
    that.childrenByName[childView.name] = childView;
  });
  that.hasManuallyHiddenChildren = false;
  that.htmlContainerUl = document.createElement('ul');
  that.isTopPanelTree = false;
}

for (let propName in NotebookNodeView.prototype) {
  console.log(`tags_node_view.js NotebookNodeView.prototype.${propName}`);
  NotebookTagsTreeNodeView.prototype[propName] = NotebookNodeView.prototype[propName];
}

NotebookTagsTreeNodeView.prototype.instantiateNewChild = function(node) {
  let that = this;
  return new NotebookTagsTreeNodeView(node, that);
}

NotebookTagsTreeNodeView.prototype.refreshOrderOfChildren = function() {
  let that = this;
  that.children = that.tagsTreeNode.children.map(ch => ch.nodeView);
}

NotebookTagsTreeNodeView.prototype.mergeWithNewTags = function(tagsTreeNode) {
  let that = this;
  that.tagsTreeNode = tagsTreeNode;
  let lengthBefore = that.children.length;
  tagsTreeNode.children.forEach(childNode => {
    let oldChild = that.childrenByName[childNode.name];
    if (oldChild === undefined) {
      let newChildView = that.instantiateNewChild(childNode);
      newChildView.buildAsHtmlLiElement();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
    } else {
      oldChild.mergeWithNewTags(childNode);
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

NotebookTagsTreeNodeView.prototype.initFontSize = function(htmlElement) {
  let that = this;
  let fontSize;
  if (that.isTopPanelTree) {
    fontSize = window.my.fontSizeOfTopPanelOfTags;
  } else {
    fontSize = window.my.fontSizeOfBottomPanelOfTags;
  }
  htmlElement.style.fontSize = `${fontSize}px`;
};

NotebookTagsTreeNodeView.prototype.increaseFontSize = function() {
  let that = this;
  let fontSize;
  if (that.isTopPanelTree) {
    fontSize = window.my.fontSizeOfTopPanelOfTags;
  } else {
    fontSize = window.my.fontSizeOfBottomPanelOfTags;
  }
  fontSize++;
  if (that.isTopPanelTree) {
    window.my.fontSizeOfTopPanelOfTags = fontSize;
  } else {
    window.my.fontSizeOfBottomPanelOfTags = fontSize;
  }
  that.html().style.fontSize = `${fontSize}px`;
}

NotebookTagsTreeNodeView.prototype.decreaseFontSize = function() {
  let that = this;
  let fontSize;
  if (that.isTopPanelTree) {
    fontSize = window.my.fontSizeOfTopPanelOfTags;
  } else {
    fontSize = window.my.fontSizeOfBottomPanelOfTags;
  }
  if (fontSize > 1) {
    fontSize--;
  }
  if (that.isTopPanelTree) {
    window.my.fontSizeOfTopPanelOfTags = fontSize;
  } else {
    window.my.fontSizeOfBottomPanelOfTags = fontSize;
  }
  that.html().style.fontSize = `${fontSize}px`;
}

NotebookTagsTreeNodeView.prototype.moveToTop = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.insertBefore(that.html(), parent.children[0]);

  let nodeViewIndex = that.parentNodeView.children.indexOf(that);
  if (nodeViewIndex >= 0) {
    that.parentNodeView.children.splice(nodeViewIndex, 1);
    that.parentNodeView.children.splice(0, 0, that);
  }

  let parentTagsTreeNode = that.tagsTreeNode.parent;
  let index = parentTagsTreeNode.children.indexOf(that.tagsTreeNode);
  if (index < 0) {
    return;
  }
  parentTagsTreeNode.children.splice(index, 1);
  parentTagsTreeNode.children.splice(0, 0, that.tagsTreeNode);
}

NotebookTagsTreeNodeView.prototype.moveToBottom = function() {
  let that = this;
  let parent = that.html().parentNode;
  parent.removeChild(that.html());
  parent.appendChild(that.html());

  let nodeViewIndex = that.parentNodeView.children.indexOf(that);
  if (nodeViewIndex >= 0) {
    that.parentNodeView.children.splice(nodeViewIndex, 1);
    that.parentNodeView.children.push(that);
  }

  let parentTagsTreeNode = that.tagsTreeNode.parent;
  let index = parentTagsTreeNode.children.indexOf(that.tagsTreeNode);
  if (index < 0) {
    return;
  }
  parentTagsTreeNode.children.splice(index, 1);
  parentTagsTreeNode.children.push(that.tagsTreeNode);
}

NotebookTagsTreeNodeView.prototype.name2html = function() {
  let that = this;
  let a = document.createElement('a');
  a.onclick = function() {
    searchByTag(that.tagsTreeNode);
  };
  return withChildren(a, document.createTextNode(that.name))
};

NotebookTagsTreeNodeView.prototype._createIconsList = function() {
  let that = this;
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
        editTagSegment(that);
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
        let path = that.tagsTreeNode.tagAncestry.concat([that.name]);
        openPathInTagsForest(window.my.rootNodeViewOfTags, path);
      });
      return elem;
    })();
  let icons = [];
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
  if (!that.isTopPanelTree) {
    addIconIfConfigAllows(iconOpenNodeInTopPanel, 'tag-icon-open-in-tree-above');
  }
  addIconIfConfigAllows(iconEdit, 'tag-icon-edit');
  addIconIfConfigAllows(iconMoveToTop, 'tag-icon-move-to-top');
  addIconIfConfigAllows(iconMoveToBottom, 'tag-icon-move-to-bottom');
  addIconIfConfigAllows(iconHide, 'tag-icon-hide');
  addIconIfConfigAllows(iconHideSiblingsBelow, 'tag-icon-hide-siblings-below');
  addIconIfConfigAllows(iconUnhideHiddenChildren, 'tag-icon-unhide-hidden-children');
  return icons;
};

NotebookTagsTreeNodeView.prototype._addContextMenuListener = function(htmlElem) {
  let that = this;
  htmlElem.addEventListener('contextmenu', (eve) => {
    eve.preventDefault();
    eve.stopPropagation();
    my.contextMenuHandler = function(commandName) {
      if (commandName === 'copy-full-path') {
        that.copyFullPath();
      } else if (commandName === 'edit-full-path') {
        editFullPathOfTag(that);
      } else if (commandName === 'edit') {
        editTagSegment(that);
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
      } else if (commandName === 'open-node-in-top-panel') {
        let path = that.tagsTreeNode.tagAncestry.concat([that.name]);
        openPathInTagsForest(window.my.rootNodeViewOfTags, path);
      }
    }
    window.webkit.messageHandlers.show_notebook_context_menu.postMessage('tags-tree-node', {
      isTopPanelTree: that.isTopPanelTree,
      hasHiddenChildren: that.html().classList.contains('has-hidden-children'),
    });
    return false;
  });
}

NotebookTagsTreeNodeView.prototype.copyFullPath = function() {
  let that = this;
  let fullPath = that.tagsTreeNode.tagAncestry.slice(1).concat(that.name);
  let fullPathStr = fullPath.join('.');
  window.webkit.messageHandlers.notebook_msgs__copy_full_path_of_tag.postMessage(fullPathStr);
}

NotebookTagsTreeNodeView.prototype.handleInsertedChildTag = function(newChildIndex) {
  let that = this;

  let lengthBefore = that.children.length;

  let newChildNode = that.tagsTreeNode.children[newChildIndex];
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

NotebookTagsTreeNodeView.prototype.removeFromTree = function() {
  let that = this;
  that.tagsTreeNode.removeFromTree();
  that.tagsTreeNode.notifyWasRemovedFromTree();
}

NotebookTagsTreeNodeView.prototype.removeFromTreeCascade = function() {
  let that = this;
  that.tagsTreeNode.removeFromTreeCascade(true);
  that.tagsTreeNode.notifyWasRemovedFromTree();
}

function handleTagAncestryOfDescendantsAfterRename(renamedTagsTreeNode, oldName) {
  function func(descendant) {
    renameAncestorTagSegmentInLinksOfNode(descendant, renamedTagsTreeNode, oldName);
    descendant.children.forEach(func);
  }
  renamedTagsTreeNode.children.forEach(func);
}

NotebookTagsTreeNodeView.prototype.edit = function(changeHandler) {
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
    let tagsTreeNodeParent = that.tagsTreeNode.parent;
    let newTagsTreeNode = tagsTreeNodeParent.ensureSubtagWithName(value);
    mergeSubtagsAndLinks(that.tagsTreeNode, newTagsTreeNode);
    handleTagAncestryOfDescendantsAfterRename(newTagsTreeNode, that.tagsTreeNode.name);
    let index = tagsTreeNodeParent.children.indexOf(that.tagsTreeNode);
    if (value === that.name) {
      that._rebuildHtmlElement();
    } else {
      that.removeFromTree();
      tagsTreeNodeParent.children.splice(index, 0, newTagsTreeNode);
      tagsTreeNodeParent.children.pop();
      tagsTreeNodeParent.notifyInsertedChildTag(index);
    }
    changeHandler(newTagsTreeNode.nodeView);
    isHandlingChange = false;
    enableKeyboardListener();
    window.webkit.messageHandlers.enable_shortcuts.postMessage();
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
  window.webkit.messageHandlers.disable_shortcuts.postMessage();
};

function disableKeyboardListener() {
  my.isKeyboardListenerDisabled = true;
}

function enableKeyboardListener() {
  my.isKeyboardListenerDisabled = false;
}

function editTagSegment(tagNodeView) {
  let oldName = tagNodeView.tagsTreeNode.name;
  tagNodeView.edit(function(newTagNodeView) {
    let tagsTreeNode = newTagNodeView.tagsTreeNode;
    renameTagSegmentInLinksOfNode(tagsTreeNode, oldName);
  });
}

function editFullPathOfTag(tagNodeView) {
  tagNodeView.editFullPath();
}

function renameTagSegmentInLinksOfNode(tagsTreeNode, oldName) {
  let tagAncestry = tagsTreeNode.tagAncestry.slice(1);
  let links = tagsTreeNode.links;
  links.forEach(link => {
    let linkTagSplitted = link.tag.split(".");
    if (linkTagSplitted.length <= tagAncestry.length) {
      console.log(`expected link tag length to be greater than tag ancestry length.\n  link tag: ${link.tag}\n  link to: ${link.ancestry.concat(link.name).join(" -> ")}\ntag ancestry + tag name: ${tagAncestry.concat(tagsTreeNode.name).join(".")}`);
      return;
    }
    for (let i = 0; i < tagAncestry.length; i++) {
      if (linkTagSplitted[i] !== tagAncestry[i]) {
        console.log(`expected link tag segment to be equals to tag ancestry segment. index: ${i}, link tag segment: ${linkTagSplitted[i]}, tag ancestry segment: ${tagAncestry[i]}, link tag: ${link.tag}, link to: ${link.ancestry.concat(link.name).join(" -> ")}`);
        continue;
      }
    }
    if (linkTagSplitted[tagAncestry.length] !== oldName) {
      console.log(`expected link tag segment to be equals to old name tags tree node. old name: ${oldName}, link tag: ${link.tag}, link to: ${link.ancestry.concat(link.name).join(" -> ")}`);
      return;
    }
    linkTagSplitted[tagAncestry.length] = tagsTreeNode.name;
    link.tag = linkTagSplitted.join(".");
    let indexOfWhitespace = link.name.indexOf(' ');
    if (indexOfWhitespace < 0) {
      link.name = '>>' + link.tag;
    } else {
      link.name = '>>' + link.tag + ' ' + link.name.slice(indexOfWhitespace);
    }
    link.notebookNode.notifyTagSegmentNameChange();
  });
}

function renameAncestorTagSegmentInLinksOfNode(tagsTreeNode, renamedAncestorNode, oldName) {
  let positionInAncestry = renamedAncestorNode.tagAncestry.length;
  tagsTreeNode.tagAncestry[positionInAncestry] = renamedAncestorNode.name;
  let tagAncestry = renamedAncestorNode.tagAncestry.slice(1);
  let links = tagsTreeNode.links;
  links.forEach(link => {
    let linkTagSplitted = link.tag.split(".");
    if (linkTagSplitted.length <= tagAncestry.length) {
      console.log(`expected link tag length to be greater than tag ancestry length.\n  link tag: ${link.tag}\n  link to: ${link.ancestry.concat(link.name).join(" -> ")}\ntag ancestry + tag name: ${tagAncestry.concat(renamedAncestorNode.name).join(".")}`);
      return;
    }
    for (let i = 0; i < tagAncestry.length; i++) {
      if (linkTagSplitted[i] !== tagAncestry[i]) {
        console.log(`expected link tag segment to be equals to tag ancestry segment. index: ${i}, link tag segment: ${linkTagSplitted[i]}, tag ancestry segment: ${tagAncestry[i]}, link tag: ${link.tag}, link to: ${link.ancestry.concat(link.name).join(" -> ")}`);
        continue;
      }
    }
    if (linkTagSplitted[tagAncestry.length] !== oldName) {
      console.log(`expected link tag segment to be equals to old name tags tree node. old name: ${oldName}, link tag: ${link.tag}, link to: ${link.ancestry.concat(link.name).join(" -> ")}`);
      return;
    }
    linkTagSplitted[tagAncestry.length] = renamedAncestorNode.name;
    link.tag = linkTagSplitted.join(".");
    let indexOfWhitespace = link.name.indexOf(' ');
    if (indexOfWhitespace < 0) {
      link.name = '>>' + link.tag;
    } else {
      link.name = '>>' + link.tag + ' ' + link.name.slice(indexOfWhitespace);
    }
    link.notebookNode.notifyTagSegmentNameChange();
  });
}

NotebookTagsTreeNodeView.prototype.editFullPath = function(changeHandler) {
  let that = this;
  if (that.htmlElement === undefined) {
    return;
  }
  let titleContainer = that.htmlElement.querySelector('.notebook-node-title-container');
  titleContainer.innerHTML = '';
  let inputElem = document.createElement('input');
  inputElem.value = that.tagsTreeNode.tagAncestry.slice(1).concat(that.name).join('.');
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
    let oldPath = that.tagsTreeNode.tagAncestry.slice(1).concat(that.name);
    let oldPathStr = oldPath.join('.');
    if (value === oldPathStr) {
      that._rebuildHtmlElement();
      return;
    }
    if (value.indexOf(' ') >= 0) {
      alert('tags cannot contain whitespaces');
      return;
    }
    let newPath = value.split('.');

    renameTagFullPathInLinksOfNode(that.tagsTreeNode, newPath);
    that.tagsTreeNode.children.forEach(function func(descendantNode) {
      renameAncestorTagFullPathInLinksOfNode(descendantNode, oldPath, newPath);
      descendantNode.children.forEach(func);
    });

    that.removeFromTreeCascade();

    let newTagsTreeNode = (function() {
      let aNode = my.tagsTree;
      for (let newPathSegment of newPath) {
        aNode = aNode.ensureSubtagWithName(newPathSegment);
      }
      return aNode;
    })();
    mergeSubtagsAndLinks(that.tagsTreeNode, newTagsTreeNode);

    if (my.tagsTree.nodeView) {
      my.tagsTree.nodeView.mergeWithNewTags(my.tagsTree);
    }
    if (my.tagsTree.nodeViewOfBottomPanel) {
      my.tagsTree.nodeViewOfBottomPanel.mergeWithNewTags(my.tagsTree);
    }

    isHandlingChange = false;
    enableKeyboardListener();
    window.webkit.messageHandlers.enable_shortcuts.postMessage();
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
      inputElem.value = that.tagsTreeNode.tagAncestry.slice(1).concat(that.name).join('.');
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
  window.webkit.messageHandlers.disable_shortcuts.postMessage();
};

function mergeSubtagsAndLinks(srcNode, dstNode) {
  dstNode.links = dstNode.links.concat(srcNode.links);
  for (let subtagName in srcNode.subTags) {
    let sourceSubtag = srcNode.subTags[subtagName];
    let destinationSubtag = dstNode.subTags[subtagName];
    if (destinationSubtag !== undefined) {
      mergeSubtagsAndLinks(sourceSubtag, destinationSubtag);
    } else {
      dstNode.subTags[subtagName] = sourceSubtag;
      dstNode.children.push(sourceSubtag);
    }
    dstNode.subTags[subtagName].parent = dstNode;
  }
}

function renameTagFullPathInLinksOfNode(tagsTreeNode, newFullPath) {
  let tagAncestry = tagsTreeNode.tagAncestry.slice(1);
  let links = tagsTreeNode.links;
  links.forEach(link => {
    let linkTagSplitted = link.tag.split(".");
    if (linkTagSplitted.length <= tagAncestry.length) {
      console.log(`expected link tag length to be greater than tag ancestry length.\n  link tag: ${link.tag}\n  link to: ${link.ancestry.concat(link.name).join(" -> ")}\ntag ancestry + tag name: ${tagAncestry.concat(tagsTreeNode.name).join(".")}`);
      return;
    }
    for (let i = 0; i < tagAncestry.length; i++) {
      if (linkTagSplitted[i] !== tagAncestry[i]) {
        console.log(`expected link tag segment to be equals to tag ancestry segment. index: ${i}, link tag segment: ${linkTagSplitted[i]}, tag ancestry segment: ${tagAncestry[i]}, link tag: ${link.tag}, link to: ${link.ancestry.concat(link.name).join(" -> ")}`);
        continue;
      }
    }
    if (linkTagSplitted[tagAncestry.length] !== tagsTreeNode.name) {
      console.log(`expected link tag segment to be equals to old name tags tree node. old name: ${tagsTreeNode.name}, link tag: ${link.tag}, link to: ${link.ancestry.concat(link.name).join(" -> ")}`);
      return;
    }
    // linkTagSplitted[tagAncestry.length] = tagsTreeNode.name;
    // link.tag = linkTagSplitted.join(".");
    let newPathOfLink = newFullPath.concat(linkTagSplitted.slice(tagAncestry.length + 1));
    link.tag = newPathOfLink.join(".");
    let indexOfWhitespace = link.name.indexOf(' ');
    if (indexOfWhitespace < 0) {
      link.name = '>>' + link.tag;
    } else {
      link.name = '>>' + link.tag + ' ' + link.name.slice(indexOfWhitespace);
    }
    link.notebookNode.notifyTagPathChange();
  });
}

function renameAncestorTagFullPathInLinksOfNode(tagsTreeNode, oldFullPath, newFullPath) {
  tagsTreeNode.tagAncestry = [my.tagsTree.name].concat(newFullPath.concat(tagsTreeNode.tagAncestry.slice(newFullPath.length + 1)));
  let links = tagsTreeNode.links;
  links.forEach(link => {
    let linkTagSplitted = link.tag.split(".");
    if (linkTagSplitted.length <= oldFullPath.length) {
      console.log(`expected link tag length to be greater than length of old full path.\n  link tag: ${link.tag}\n  link to: ${link.ancestry.concat(link.name).join(" -> ")}\n  old full path: ${oldFullPath.join(".")}`);
      return;
    }
    for (let i = 0; i < oldFullPath.length; i++) {
      if (linkTagSplitted[i] !== oldFullPath[i]) {
        console.log(`expected link tag segment to be equals to old full path segment. index: ${i}, link tag segment: ${linkTagSplitted[i]}, old full path segment: ${oldFullPath[i]}, link tag: ${link.tag}, link to: ${link.ancestry.concat(link.name).join(" -> ")}`);
        continue;
      }
    }
    // linkTagSplitted[tagAncestry.length] = renamedAncestorNode.name;
    // link.tag = linkTagSplitted.join(".");
    let newPathOfLink = newFullPath.concat(linkTagSplitted.slice(oldFullPath.length));
    link.tag = newPathOfLink.join(".");
    let indexOfWhitespace = link.name.indexOf(' ');
    if (indexOfWhitespace < 0) {
      link.name = '>>' + link.tag;
    } else {
      link.name = '>>' + link.tag + ' ' + link.name.slice(indexOfWhitespace);
    }
    link.notebookNode.notifyTagPathChange();
  });
}

for (let propName in NotebookTagsTreeNodeView.prototype) {
  NotebookTagsTreeNodeViewOfBottomPanel.prototype[propName] = NotebookTagsTreeNodeView.prototype[propName];
}

NotebookTagsTreeNodeViewOfBottomPanel.prototype.instantiateNewChild = function(node) {
  let that = this;
  return new NotebookTagsTreeNodeViewOfBottomPanel(node, that);
}

NotebookTagsTreeNodeViewOfBottomPanel.prototype.refreshOrderOfChildren = function() {
  let that = this;
  that.children = that.tagsTreeNode.children.map(ch => ch.nodeViewOfBottomPanel);
}
