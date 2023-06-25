
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
