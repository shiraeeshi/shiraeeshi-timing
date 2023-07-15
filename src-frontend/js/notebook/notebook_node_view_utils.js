const { parseTagFromNodeIfExists } = require('./parse_tags.js');
const { TagsTreeNode } = require('./tags_tree_node.js');

function getTagFromNodeIfExists(notebookNode) {
  if (notebookNode.tag !== undefined) {
    return notebookNode.tag;
  } else {
    return parseTagFromNodeIfExists(notebookNode, notebookNode.getAncestry());
  }
}

export function addSiblingWithInputToTheRightSideNode(notebookNodeView) {
  let wasInRectangle = my.rightSideNodeInRectangle === notebookNodeView;

  notebookNodeView.addHtmlSiblingWithInput(function(newNotebookNode) {
    my.hasChangesInNotebook = true;
    let tagFromNewNode = getTagFromNodeIfExists(newNotebookNode);
    if (tagFromNewNode !== undefined) {
      let tagPath = tagFromNewNode.tag.split(".");
      let obj = window.my.rootTagsTreeNode;
      tagPath.forEach(tagPathSegment => {
        obj = obj.ensureSubtagWithName(tagPathSegment);
      });
      obj.links.push(tagFromNewNode);
      tagFromNewNode.tagsTreeNode = obj;
      obj.notifyAddedLink();
      window.my.rootNodeViewOfTags.mergeWithNewTags(window.my.rootTagsTreeNode);
    }
    if (wasInRectangle) {

      let newNodeInRectangle = my.rightSideNodeInRectangle.findNextSibling();
      if (newNodeInRectangle.isHidden) {
        return;
      }
      newNodeInRectangle.wrapInRectangle();

      my.rightSideNodeInRectangle.removeRectangleWrapper();
      my.rightSideNodeInRectangle = newNodeInRectangle;

      if (my.isCursorOnTopRightPanel) {
        my.rightTopNodeInRectangle = my.rightSideNodeInRectangle;
      } else {
        my.rightBottomNodeInRectangle = my.rightSideNodeInRectangle;
      }
    }
  });
}

export function appendChildWithInputToTheRightSideNode(notebookNodeView) {
  let wasInRectangle = my.rightSideNodeInRectangle === notebookNodeView;
  notebookNodeView.appendHtmlChildWithInput(function(newNotebookNode) {
    my.hasChangesInNotebook = true;
    let tagFromNewNode = getTagFromNodeIfExists(newNotebookNode);
    if (tagFromNewNode !== undefined) {
      let tagPath = tagFromNewNode.tag.split(".");
      let obj = window.my.rootTagsTreeNode;
      tagPath.forEach(tagPathSegment => {
        obj = obj.ensureSubtagWithName(tagPathSegment);
      });
      obj.links.push(tagFromNewNode);
      tagFromNewNode.tagsTreeNode = obj;
      obj.notifyAddedLink();
      window.my.rootNodeViewOfTags.mergeWithNewTags(window.my.rootTagsTreeNode);
    }
    if (wasInRectangle) {
      my.rightSideNodeInRectangle.removeRectangleWrapper();

      let newNodeInRectangle = my.rightSideNodeInRectangle.children[my.rightSideNodeInRectangle.children.length - 1];
      newNodeInRectangle.wrapInRectangle();

      my.rightSideNodeInRectangle = newNodeInRectangle;

      if (my.isCursorOnTopRightPanel) {
        my.rightTopNodeInRectangle = my.rightSideNodeInRectangle;
      } else {
        my.rightBottomNodeInRectangle = my.rightSideNodeInRectangle;
      }
    }
  });
}

export function editRightSideNode(notebookNodeView) {
  let wasInRectangle = my.rightSideNodeInRectangle === notebookNodeView;
  let editedNotebookNode = notebookNodeView.notebookNode;
  let oldTagFromNode = getTagFromNodeIfExists(editedNotebookNode);
  if (oldTagFromNode !== undefined) {
    oldTagFromNode = Object.assign({}, oldTagFromNode);
  }
  notebookNodeView.edit(function(newNodeView) {
    my.hasChangesInNotebook = true;
    editedNotebookNode = newNodeView.notebookNode;
    let tagFromNewNode = getTagFromNodeIfExists(editedNotebookNode);
    if (window.my.lastOpenedTagsTreeNode !== undefined) {
      let oldTagAffectsLastOpened = oldTagFromNode !== undefined && window.my.lastOpenedTagsTreeNode.isAffectedByChangesTo(oldTagFromNode);
      let newTagAffectsLastOpened = tagFromNewNode !== undefined && window.my.lastOpenedTagsTreeNode.isAffectedByChangesTo(tagFromNewNode);
      if (oldTagAffectsLastOpened || newTagAffectsLastOpened) {
        window.my.lastOpenedTagsTreeNode.notifyLinksChanged();
      }
    }
    if (window.my.rootNodeViewOfTags !== undefined) {
      window.my.rootNodeViewOfTags.mergeWithNewTags(window.my.rootTagsTreeNode);
    }
    if (wasInRectangle) {
      newNodeView.wrapInRectangle();
      my.rightSideNodeInRectangle = newNodeView;
    }
  });
}

export function deleteNodeFromTheRightSide(notebookNodeView) {
  my.hasChangesInNotebook = true;

  let newNodeInRectangle = my.rightSideNodeInRectangle;
  let wasInRectangle = my.rightSideNodeInRectangle === notebookNodeView;
  if (wasInRectangle) {
    newNodeInRectangle = notebookNodeView.findNextVisibleSibling();
    if (newNodeInRectangle === undefined) {
      newNodeInRectangle = notebookNodeView.findPreviousVisibleSibling();
    }
    if (newNodeInRectangle === undefined) {
      newNodeInRectangle = notebookNodeView.parentNodeView;
    }
    if (newNodeInRectangle === undefined) {
      return;
    }
  }

  let oldTagFromNode = getTagFromNodeIfExists(notebookNodeView.notebookNode);

  notebookNodeView.removeFromTree();

  if (wasInRectangle) {
    newNodeInRectangle.wrapInRectangle();
    my.rightSideNodeInRectangle = newNodeInRectangle;
  }

  if (oldTagFromNode !== undefined) {
    let changedStructureOfTagsTree = false;

    let oldTagPath = oldTagFromNode.tag.split(".");
    let obj = window.my.rootTagsTreeNode;
    oldTagPath.forEach(tagPathSegment => {
      obj = obj.subTags[tagPathSegment];
    });
    let foundIndex = undefined;
    let foundLink;
    outer: for (let idx = 0; idx < obj.links.length; idx++) {
      let link = obj.links[idx];
      if (link.tag !== oldTagFromNode.tag) continue;
      if (link.name !== oldTagFromNode.name) continue;
      if (link.ancestry.length !== oldTagFromNode.ancestry.length) continue;
      for (let i = 0; i < link.ancestry.length; i++) {
        if (link.ancestry[i] !== oldTagFromNode.ancestry[i]) continue outer;
      }
      foundIndex = idx;
      foundLink = link;
      break;
    }
    if (foundIndex !== undefined) {
      obj.links.splice(foundIndex, 1);
      obj.notifyDeletedLink(foundLink);
    }
    if (obj.links.length === 0 && obj.children.length === 0) {
      if (obj.parent !== null) {
        obj.parent.removeSubtagCascade(obj);
      }
      changedStructureOfTagsTree = true;
    }
    if (changedStructureOfTagsTree) {
      window.my.rootNodeViewOfTags.mergeWithNewTags(window.my.rootTagsTreeNode);
    }
  }

}

export function pasteNodeInto(notebookNode) {
  my.hasChangesInNotebook = true;

  let source = my.notebookNodeToCut || my.notebookNodeToCopy;
  if (source === undefined ||
      source === notebookNode) {
    return;
  }

  let isCutAndPaste = source === my.notebookNodeToCut;

  function isAncestor(ancestor, processNode) {
    while (true) {
      if (processNode.parent === ancestor) {
        return true;
      }
      if (processNode.parent === null) {
        return false;
      }
      processNode = processNode.parent;
    }
  }
  if (isAncestor(source, notebookNode)) {
    alert("cannot copy a branch into itself");
    return;
  }
  function ensureCopyAndNotify(sourceNode, destinationParentNode) {
    let copyOfSourceNode = destinationParentNode.childrenByName[sourceNode.name];
    if (copyOfSourceNode === undefined) {
      copyOfSourceNode = destinationParentNode.ensureChildWithName(sourceNode.name);
      let idxOfNewChild;
      let lastIdx = destinationParentNode.children.length - 1;
      if (copyOfSourceNode === destinationParentNode.children[lastIdx]) {
        idxOfNewChild = lastIdx;
      } else {
        idxOfNewChild = destinationParentNode.children.indexOf(copyOfSourceNode);
      }
      destinationParentNode.notifyInsertedChild(idxOfNewChild);
    }
    return copyOfSourceNode;
  }
  function cutAndPaste(sourceNode, destinationParentNode) {
    let copyOfSourceNode = ensureCopyAndNotify(sourceNode, destinationParentNode);
    sourceNode.children.forEach(ch => cutAndPaste(ch, copyOfSourceNode));

    if (sourceNode.tag) {
      let tag = sourceNode.tag;
      tag.ancestry = copyOfSourceNode.getAncestry();
      tag.notebookNode = copyOfSourceNode;

      copyOfSourceNode.tag = tag;

      if (!affectsCurrentlyOpenedTagsTreeNode) {
        if (tag.tagsTreeNode === my.lastOpenedTagsTreeNode) {
          affectsCurrentlyOpenedTagsTreeNode = true;
        }
      }
    }

    if (sourceNode.tagsOfChildren !== undefined && sourceNode.tagsOfChildren.length > 0) {
      copyOfSourceNode.tagsOfChildren = sourceNode.tagsOfChildren;
    }
  }
  function copyAndPaste(sourceNode, destinationParentNode) {
    let copyOfSourceNode = ensureCopyAndNotify(sourceNode, destinationParentNode);
    sourceNode.children.forEach(ch => copyAndPaste(ch, copyOfSourceNode));

    if (sourceNode.tag) {
      let tag = sourceNode.tag;
      let copyOfTag = {
        tag: tag.tag,
        name: tag.name,
        ancestry: copyOfSourceNode.getAncestry(),
        notebookNode: copyOfSourceNode,
      };

      copyOfSourceNode.tag = copyOfTag;
      tag.copy = copyOfTag;

      if (tag.tagsTreeNode) {
        tag.tagsTreeNode.links.push(copyOfTag);
        if (!affectsCurrentlyOpenedTagsTreeNode) {
          if (tag.tagsTreeNode === my.lastOpenedTagsTreeNode) {
            affectsCurrentlyOpenedTagsTreeNode = true;
          }
        }
      }
    }

    if (sourceNode.tagsOfChildren !== undefined && sourceNode.tagsOfChildren.length > 0) {
      copyOfSourceNode.tagsOfChildren = sourceNode.tagsOfChildren.map(t => t.copy);
    }
  }
  let affectsCurrentlyOpenedTagsTreeNode = false;
  if (isCutAndPaste) {
    cutAndPaste(source, notebookNode);
  } else {
    copyAndPaste(source, notebookNode);
  }
  if (my.lastOpenedTagsTreeNode && affectsCurrentlyOpenedTagsTreeNode) {
    my.lastOpenedTagsTreeNode.notifyLinksChanged();
  }
  if (notebookNode.nodeView) {
    // notebookNode.nodeView.mergeWithNewNodes(notebookNode);

    if (my.rightSideNodeInRectangle === notebookNode.nodeView) {
      my.rightSideNodeInRectangle.wrapInRectangle();
    }
  }
  if (notebookNode.nodeViewOfBottomPanel) {
    // notebookNode.nodeViewOfBottomPanel.mergeWithNewNodes(notebookNode);

    if (my.rightSideNodeInRectangle === notebookNode.nodeViewOfBottomPanel) {
      my.rightSideNodeInRectangle.wrapInRectangle();
    }
  }
  if (my.notebookNodeToCut !== undefined) {
    if (my.notebookNodeToCut.nodeView) {
      my.notebookNodeToCut.nodeView.removeFromTree();
    }
    delete my.notebookNodeToCut;
  }
}


export function isNotebookNodeInViewport(notebookNode) {
  let elem = notebookNode.htmlElement;
  // let rect = elem.getBoundingClientRect();
  let container;

  if (my.isCursorOnTopRightPanel) {
    container = document.getElementById('notes-content-top-wrapper');
  } else {
    container = document.getElementById('notes-content-bottom-wrapper');
  }
  return (
            elem.offsetTop >= container.scrollTop &&
            // elem.offsetLeft <= container.scrollLeft &&
            elem.offsetTop <= container.scrollTop + Math.round(container.clientHeight * 0.95)
        );
}


export function bringNotebookNodeToViewport(htmlElem) {
  let offset = htmlElem.offsetTop;
  let container;
  if (my.isCursorOnTopRightPanel) {
    container = document.getElementById('notes-content-top-wrapper');
  } else {
    container = document.getElementById('notes-content-bottom-wrapper');
  }
  if (offset < container.scrollTop) {
    container.scrollTop = offset;
  } else {
    container.scrollTop = offset - Math.round(container.clientHeight * 0.9);
  }
}
