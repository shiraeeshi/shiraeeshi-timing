
export function NotebookNode(name, parentNode) {
  this.name = name;
  this.parent = parentNode !== undefined ? parentNode : null;
  this.childrenByName = {};
  this.children = [];
}

NotebookNode.prototype.newChildWithName = function(name) {
  let that = this;
  let child = new NotebookNode(name, that);
  that.childrenByName[name] = child;
  that.children.push(child);
  return child;
};

NotebookNode.prototype.ensureChildWithName = function(name) {
  let that = this;
  let child = that.childrenByName[name];
  if (child === undefined) {
    child = that.newChildWithName(name, that);
  }
  return child;
};

NotebookNode.prototype.notifyTagSegmentNameChange = function() {
  let that = this;
  let oldName = that.name;
  let newName = that.tag.name;
  that.name = newName;
  if (that.parent !== null) {
    delete that.parent.childrenByName[oldName];
    that.parent.childrenByName[newName] = that;
  }
  if (that.nodeView) {
    that.nodeView.handleTagSegmentNameChange();
  }
  if (that.nodeViewOfBottomPanel) {
    that.nodeViewOfBottomPanel.handleTagSegmentNameChange();
  }
};

NotebookNode.prototype.notifyTagPathChange = function() {
  let that = this;
  let oldName = that.name;
  let newName = that.tag.name;
  that.name = newName;
  if (that.parent !== null) {
    delete that.parent.childrenByName[oldName];
    that.parent.childrenByName[newName] = that;
  }
  if (that.nodeView) {
    that.nodeView.handleTagSegmentNameChange();
  }
  if (that.nodeViewOfBottomPanel) {
    that.nodeViewOfBottomPanel.handleTagSegmentNameChange();
  }
};

// NotebookNode.prototype.notifyChange = function() {
//   let that = this;
//   if (that.nodeView) {
//     that.nodeView.mergeWithNewNodes(that);
//   }
//   if (that.nodeViewOfBottomPanel) {
//     that.nodeViewOfBottomPanel.mergeWithNewNodes(that);
//   }
// };

NotebookNode.prototype.notifyInsertedChild = function(childIndex) {
  let that = this;
  if (that.nodeView) {
    that.nodeView.handleInsertedChild(childIndex);
  }
  if (that.nodeViewOfBottomPanel) {
    that.nodeViewOfBottomPanel.handleInsertedChild(childIndex);
  }
};

NotebookNode.prototype.notifyWasRemovedFromTree = function(name) {
  let that = this;

  if (that.nodeView) {
    that.nodeView.handleBeingRemovedFromTree();
  }
  if (that.nodeViewOfBottomPanel) {
    that.nodeViewOfBottomPanel.handleBeingRemovedFromTree();
  }
};

NotebookNode.prototype.removeFromTree = function(name) {
  let that = this;
  if (that.parent === null) {
    return;
  }
  let idx = that.parent.children.indexOf(that);
  if (idx >= 0) {
    that.parent.children.splice(idx, 1);
  }
  delete that.parent.childrenByName[that.name];
};

NotebookNode.prototype.getAncestry = function() {
  let that = this;
  if (that.parent === null) {
    return [];
  } else if (that.parent.parent === null) {
    return [];
  } else {
    return that.parent.getAncestry().concat([that.parent.name]);
  }
};
