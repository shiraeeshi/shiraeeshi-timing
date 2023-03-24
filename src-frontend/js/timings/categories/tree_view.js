const { TimingsCategoryNodeView } = require('./node_view.js');
const { withChildren, withClass } = require('../../html_utils.js');
const { dateArray2str, timeArray2str } = require('../../date_utils.js');

export function createAndAppendFilterByCategory(timingsByDates) {
  let categoriesTreeRoot = TimingsCategoryTreeNode.createRootCategory();
  timingsByDates.forEach(dt => {
    dt.timings.forEach(t => {
      console.log("about to call subcategory function. t.category: " + t.category)
      let currentCategoryNode = categoriesTreeRoot.subcategory(t.category);
      if (t.value.constructor !== Array) {
        let err = Error("wrong format: timing's categories should be list-typed");
        err.source_timing = t.category;
        err.fromdateStr = `${dateArray2str(dt.date)} ${timeArray2str(t.from)}`;
        throw err;
      }
      for (let ind=0; ind<t.value.length; ind++) {
        let timingValueOuterListItem = t.value[ind];
        let type = typeof(timingValueOuterListItem)
        if (type == "string") {
          let subcategoryName = timingValueOuterListItem;
          console.log("about to call currentCategoryNode.subcategory. 1. subcategoryName: " + subcategoryName)
          currentCategoryNode = currentCategoryNode.subcategory(subcategoryName);
        } else if (type == "object") {
          let timingValueObject = timingValueOuterListItem;
          let subcategoryName = Object.keys(timingValueObject)[0];
          console.log("about to call currentCategoryNode.subcategory. 2. subcategoryName: " + subcategoryName)
          currentCategoryNode = currentCategoryNode.subcategory(subcategoryName);
          break; // should be last item
        } else {
          let err = new Error("createAndAppendFilterByCategory: unexpected type of timingItem.value[index] (expected 'string' or 'object'). index: " + ind + ", type: " + type);
          err.source_timing = t.category;
          err.fromdateStr = `${dateArray2str(dt.date)} ${timeArray2str(t.from)}`;
          throw err;
        }
      }
      currentCategoryNode.appendTiming(t);
    });
  });
  let btnsContainer = document.getElementById('timing-category-btns-container');
  btnsContainer.innerHTML = "";

  let timingsCategoryNodeViewRoot = new TimingsCategoryNodeView(categoriesTreeRoot);
  timingsCategoryNodeViewRoot.buildAsHtmlLiElement();
  btnsContainer.appendChild(
    withChildren(
      withClass(document.createElement("ul"), "timings-categories-tree"),
      timingsCategoryNodeViewRoot.html
    )
  );
  return timingsCategoryNodeViewRoot;
}


let TimingsCategoryTreeNode = (function() {
  function InitFunction(name, parentCategory) {
    this.name = name;
    this.parentCategory = parentCategory;
    this.subcategories = [];
    this.subcategoriesByName = {};
    this.timings = [];
    this.timingsCountRecursive = 0;
  }
  InitFunction.prototype.subcategory = function(name) {
    let childExists = Object.hasOwnProperty.call(this.subcategoriesByName, name);
    if (childExists) {
      return this.subcategoriesByName[name];
    } else {
      let newSubcategory = new TimingsCategoryTreeNode(name, this);
      this.subcategoriesByName[name] = newSubcategory;
      this.subcategories[this.subcategories.length] = newSubcategory;
      return newSubcategory;
    }
  }
  InitFunction.prototype.appendTiming = function(timing) {
    this.timings[this.timings.length] = timing;
    incrementTimingsCountRecursive(this);
  }
  InitFunction.prototype.fullName = function() {
    if (this.parentCategory === undefined) {
      return [];
    } else {
      let parentFullName = this.parentCategory.fullName();
      return parentFullName.concat(this.name)
    }
  }
  let incrementTimingsCountRecursive = function(categoryNode) {
    categoryNode.timingsCountRecursive++;
    if (categoryNode.parentCategory !== undefined) {
      incrementTimingsCountRecursive(categoryNode.parentCategory);
    }
  }
  return InitFunction;
})();

TimingsCategoryTreeNode.createRootCategory = function() {
  return new TimingsCategoryTreeNode("all");
}
