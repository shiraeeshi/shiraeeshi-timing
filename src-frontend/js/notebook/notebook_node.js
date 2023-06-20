
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

NotebookNode.prototype.notifyChange = function() {
  let that = this;
  if (that.nodeView) {
    that.nodeView.mergeWithNewNodes(that);
  }
  if (that.nodeViewOfBottomPanel) {
    that.nodeViewOfBottomPanel.mergeWithNewNodes(that);
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
