const { NotebookNodeView } = require('./notebook_node_view.js');
const { NotesForestViewBuilder } = require('./notes_forest_view_builder.js');
const { appendNotesForestHtmlToBottomPanel, addTagNodeLinksToForest, highlightNotesInForest } = require('./notebook_utils.js');
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
      let newChildView = new NotebookTagsTreeNodeView(childNode, that);
      newChildView.buildAsHtmlLiElement();
      that.children.push(newChildView);
      that.childrenByName[childNode.name] = newChildView;
    } else {
      oldChild.mergeWithNewTags(childNode);
    }
  });
  if (lengthBefore > 0) {
    that.children = that.tagsTreeNode.children.map(ch => ch.nodeView);
    that.htmlContainerUl.innerHTML = "";
    withChildren(that.htmlContainerUl, ...that.children.map(ch => ch.html()));
  }
  let currentLength = that.children.length;
  if (lengthBefore === 0 && currentLength > 0) {
    if (that.htmlElement === undefined) {
      return;
    }
    that._rebuildHtmlElement();
    if (!that.isCollapsed) {
      that.children = that.tagsTreeNode.children.map(ch => ch.nodeView);
      that.htmlContainerUl.innerHTML = "";
      withChildren(that.htmlContainerUl, ...that.children.map(ch => ch.html()));
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

NotebookTagsTreeNodeView.prototype.name2html = function() {
  let that = this;
  let a = document.createElement('a');
  a.onclick = function() {
    searchByTag(that.tagsTreeNode);
  };
  return withChildren(a, document.createTextNode(that.name))
};

NotebookTagsTreeNodeView.prototype.createTitleDiv = function() {
  let that = this;
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
        openNodeInTopPanel(that);
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
  icons = icons.concat([
    iconOpenNodeInTopPanel,
    iconEdit,
    iconMoveToTop,
    iconMoveToBottom,
    iconHide,
    iconHideSiblingsBelow,
    iconUnhideHiddenChildren,
  ]);
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
    newTagsTreeNode.children = that.tagsTreeNode.children;
    newTagsTreeNode.subTags = that.tagsTreeNode.subTags;
    newTagsTreeNode.links = that.tagsTreeNode.links;
    handleTagAncestryOfDescendantsAfterRename(newTagsTreeNode, that.tagsTreeNode.name);
    let index = tagsTreeNodeParent.children.indexOf(that.tagsTreeNode);
    if (value === that.name) {
      that._removeHtmlElementFromTree();
      that.buildAsHtmlLiElement();
    } else {
      that.removeFromTree();
      tagsTreeNodeParent.children.splice(index, 0, newTagsTreeNode);
      tagsTreeNodeParent.children.pop();
      tagsTreeNodeParent.notifyInsertedChildTag(index);
    }
    changeHandler(newTagsTreeNode.nodeView);
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
    link.name = '>>' + link.tag + ' ' + link.name.slice(link.name.indexOf(' '));
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
    link.name = '>>' + link.tag + ' ' + link.name.slice(link.name.indexOf(' '));
    link.notebookNode.notifyTagSegmentNameChange();
  });
}

function searchByTag(tagNode) {
  // window.webkit.messageHandlers.foobar.postMessage("js searchByTag tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  console.log("js searchByTag tag: " + (tagNode.tagAncestry.concat([tagNode.name]).join(".")));
  for (let link of tagNode.links) {
    // window.webkit.messageHandlers.foobar.postMessage("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
    console.log("  link: " + (link.ancestry.concat([link.name])).join(" -> "));
  }
  if (window.my.lastOpenedTagsTreeNode) {
    delete window.my.lastOpenedTagsTreeNode.handlerLinkAdded;
    delete window.my.lastOpenedTagsTreeNode.handlerLinkDeleted;
  }
  window.my.lastOpenedTagsTreeNode = tagNode;

  tagNode.handlerLinkAdded = function() {
    showLinksOfTag(tagNode); // TODO optimize: get the notebookNode from the new link, build its html, unhide it, unhide its ancestors
  };

  tagNode.handlerLinkDeleted = function() {
    showLinksOfTag(tagNode); // TODO optimize: get the notebookNode from the deleted link, remove its html, handle visibility of ancestors
  };

  showLinksOfTag(tagNode);
}

function showLinksOfTag(tagNode) {

  let resultForest = [];
  addTagNodeLinksToForest(tagNode, resultForest);

  window.my.lastOpenedNodesOfNotes = resultForest;

  if (my.rootNodeViewOfNotesOfBottomPanel === undefined) {

    let viewBuilder = new NotesForestViewBuilder();
    viewBuilder.buildView(my.notebookTree);
    my.rootNodeViewOfNotesOfBottomPanel = viewBuilder.getRootNodeViewOfNotes();
    appendNotesForestHtmlToBottomPanel(viewBuilder.getHtml());

  }
  highlightNotesInForest(window.my.rootNodeViewOfNotesOfBottomPanel, resultForest);
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
