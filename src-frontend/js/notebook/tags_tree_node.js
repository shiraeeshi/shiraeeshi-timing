
export function TagsTreeNode(name, parentNode) {
  this.name = name;
  this.parent = parentNode === undefined ? null : parentNode;
  this.tagAncestry = [];
  this.children = [];
  this.subTags = {};
  this.links = [];
}

TagsTreeNode.prototype.newSubtagWithName = function(name) {
  let that = this;
  let subtag = new TagsTreeNode(name, that);
  subtag.tagAncestry = that.tagAncestry.concat([that.name]);
  that.children.push(subtag);
  that.subTags[name] = subtag;
  return subtag;
}

TagsTreeNode.prototype.ensureSubtagWithName = function(name) {
  let that = this;
  if (that.subTags.hasOwnProperty(name)) {
    return that.subTags[name];
  } else {
    return that.newSubtagWithName(name);
  }
}

TagsTreeNode.prototype.isAffectedByChangesTo = function(tagObj) {
  let that = this;
  let tagSplitted = tagObj.tag.split('.');
  let thisPath = that.tagAncestry.concat([that.name]);
  thisPath = thisPath.slice(1);
  let idx1 = 0;
  let idx2 = 0;
  let tagSplittedLen = tagSplitted.length;
  let thisPathLen = thisPath.length;
  while (true) {
    if (tagSplitted[idx1] !== thisPath[idx2]) {
      return false;
    }
    idx1++;
    idx2++;
    if (idx1 >= tagSplittedLen || idx2 >= thisPathLen) {
      return true;
    }
  }
  return false;
}

TagsTreeNode.prototype.removeSubtagCascade = function(subtag, notifyRemoval) {
  let that = this;
  that.removeSubtag(subtag);
  if (that.children.length === 0 && that.links.length === 0) {
    if (that.parent !== null) {
      that.parent.removeSubtagCascade(that, notifyRemoval);
      if (notifyRemoval) {
        that.notifyWasRemovedFromTree();
      }
    }
  }
}

TagsTreeNode.prototype.removeSubtag = function(subtag) {
  let that = this;
  delete that.subTags[subtag.name];
  let foundIndex = that.children.indexOf(subtag);
  if (foundIndex >= 0) {
    that.children.splice(foundIndex, 1);
  }
}

TagsTreeNode.prototype.notifyWasRemovedFromTree = function(name) {
  let that = this;

  if (that.nodeView) {
    that.nodeView.handleBeingRemovedFromTree();
  }
  if (that.nodeViewOfBottomPanel) {
    that.nodeViewOfBottomPanel.handleBeingRemovedFromTree();
  }
};

TagsTreeNode.prototype.removeFromTree = function() {
  let that = this;
  if (that.parent !== null) {
    that.parent.removeSubtag(that);
  }
}

TagsTreeNode.prototype.removeFromTreeCascade = function(notifyRemoval) {
  let that = this;
  if (that.parent !== null) {
    that.parent.removeSubtagCascade(that, notifyRemoval);
  }
}

TagsTreeNode.prototype.notifyInsertedChildTag = function(childIndex) {
  let that = this;
  if (that.nodeView) {
    that.nodeView.handleInsertedChildTag(childIndex);
  }
  if (that.nodeViewOfBottomPanel) {
    that.nodeViewOfBottomPanel.handleInsertedChildTag(childIndex);
  }
};

TagsTreeNode.prototype.notifyAddedLink = function() {
  let that = this;
  if (that.handlerLinkAdded) {
    that.handlerLinkAdded();
  }
}

TagsTreeNode.prototype.notifyDeletedLink = function() {
  let that = this;
  if (that.handlerLinkDeleted) {
    that.handlerLinkDeleted();
  }
}

TagsTreeNode.prototype.notifyLinksChanged = function() {
  let that = this;
  if (that.handlerLinksChanged) {
    that.handlerLinksChanged();
  }
}
