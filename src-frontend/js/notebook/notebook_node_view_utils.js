const { parseTagFromNodeIfExists } = require('./parse_tags.js');

export function addSiblingWithInputToTheRightSideNode(notebookNodeView) {
  let wasInRectangle = my.rightSideNodeInRectangle === notebookNodeView;

  notebookNodeView.addHtmlSiblingWithInput(function(newNotebookNode) {
    let tagFromNewNode = parseTagFromNodeIfExists(newNotebookNode, newNotebookNode.getAncestry());
    if (tagFromNewNode !== undefined) {
      let tagPath = tagFromNewNode.tag.split(".");
      let obj = window.my.rootTagsTreeNode;
      tagPath.forEach(tagPathSegment => {
        obj = obj.ensureSubtagWithName(tagPathSegment);
      });
      obj.links.push(tagFromNewNode);
      obj.notifyAddedLink();
      window.my.rootNodeViewOfTags.mergeWithNewTags(window.my.rootTagsTreeNode);
    }
    if (wasInRectangle) {
      my.rightSideNodeInRectangle.removeRectangleWrapper();

      let newNodeInRectangle = my.rightSideNodeInRectangle.findNextSibling();
      newNodeInRectangle.wrapInRectangle();

      my.rightSideNodeInRectangle = newNodeInRectangle;
    }
  });
}

export function appendChildWithInputToTheRightSideNode(notebookNodeView) {
  let wasInRectangle = my.rightSideNodeInRectangle === notebookNodeView;
  notebookNodeView.appendHtmlChildWithInput(function(newNotebookNode) {
    let tagFromNewNode = parseTagFromNodeIfExists(newNotebookNode, newNotebookNode.getAncestry());
    if (tagFromNewNode !== undefined) {
      let tagPath = tagFromNewNode.tag.split(".");
      let obj = window.my.rootTagsTreeNode;
      tagPath.forEach(tagPathSegment => {
        obj = obj.ensureSubtagWithName(tagPathSegment);
      });
      obj.links.push(tagFromNewNode);
      obj.notifyAddedLink();
      window.my.rootNodeViewOfTags.mergeWithNewTags(window.my.rootTagsTreeNode);
    }
    if (wasInRectangle) {
      my.rightSideNodeInRectangle.removeRectangleWrapper();

      let newNodeInRectangle = my.rightSideNodeInRectangle.children[my.rightSideNodeInRectangle.children.length - 1];
      newNodeInRectangle.wrapInRectangle();

      my.rightSideNodeInRectangle = newNodeInRectangle;
    }
  });
}

export function editRightSideNode(notebookNodeView) {
  let wasInRectangle = my.rightSideNodeInRectangle === notebookNodeView;
  let editedNotebookNode = notebookNodeView.notebookNode;
  let oldTagFromNode = parseTagFromNodeIfExists(editedNotebookNode, editedNotebookNode.getAncestry());
  notebookNodeView.edit(function(newNodeView) {
    editedNotebookNode = newNodeView.notebookNode;
    let tagFromNewNode = parseTagFromNodeIfExists(editedNotebookNode, editedNotebookNode.getAncestry());
    let changedStructureOfTagsTree = false;
    if (tagFromNewNode !== undefined) {
      let tagPath = tagFromNewNode.tag.split(".");
      let obj = window.my.rootTagsTreeNode;
      tagPath.forEach(tagPathSegment => {
        obj = obj.ensureSubtagWithName(tagPathSegment);
      });
      obj.links.push(tagFromNewNode);
      obj.notifyAddedLink();
      changedStructureOfTagsTree = true;
    }
    if (oldTagFromNode !== undefined) {
      if (tagFromNewNode === undefined ||
          (oldTagFromNode.tag !== tagFromNewNode.tag)) {
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
      }
    }
    if (changedStructureOfTagsTree) {
      window.my.rootNodeViewOfTags.mergeWithNewTags(window.my.rootTagsTreeNode);
    }
    if (wasInRectangle) {
      newNodeView.wrapInRectangle();
      my.rightSideNodeInRectangle = newNodeView;
    }
  });
}

export function deleteNodeFromTheRightSide(notebookNodeView) {

  let newNodeInRectangle = my.rightSideNodeInRectangle;
  let wasInRectangle = my.rightSideNodeInRectangle === notebookNodeView;
  if (wasInRectangle) {
    newNodeInRectangle = notebookNodeView.findNextSibling();
    if (newNodeInRectangle === undefined) {
      newNodeInRectangle = notebookNodeView.findPreviousSibling();
    }
    if (newNodeInRectangle === undefined) {
      newNodeInRectangle = notebookNodeView.parentNodeView;
    }
    if (newNodeInRectangle === undefined) {
      return;
    }
  }

  let oldTagFromNode = parseTagFromNodeIfExists(notebookNodeView.notebookNode, notebookNodeView.notebookNode.getAncestry());

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

