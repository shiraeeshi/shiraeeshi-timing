const { TimingsCategoryNodeView } = require('./node_view.js');
const { withChildren, withClass } = require('../../html_utils.js');
const { dateArray2str, timeArray2str } = require('../../date_utils.js');
const { buildProcessesTree } = require('../../common/processes_tree_builder.js');

export function createAndAppendFilterByCategory(processesTree, btnsContanerId) {
  let btnsContainer = document.getElementById(btnsContanerId || 'timing-category-btns-container');
  btnsContainer.innerHTML = "";

  let timingsCategoryNodeViewRoot = new TimingsCategoryNodeView(processesTree);
  timingsCategoryNodeViewRoot.buildAsHtmlLiElement();
  btnsContainer.appendChild(
    withChildren(
      withClass(document.createElement("ul"), "timings-categories-tree"),
      timingsCategoryNodeViewRoot.html
    )
  );
  return timingsCategoryNodeViewRoot;
}

export function createAndAppendFilterByCategory1(timingsByDates) {
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
      for (let ind=0; ind<t.value.length - 1; ind++) {
        let timingValueOuterListItem = t.value[ind];
        let type = typeof(timingValueOuterListItem)
        if (type !== "string") {
          let err = Error("wrong format: encountered a non-string category that is not last item in the categories list. all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}).");
          err.source_timing = t.category;
          err.fromdateStr = `${dateArray2str(dt.date)} ${timeArray2str(t.from)}`;
          throw err;
        }
        let subcategoryName = timingValueOuterListItem;
        console.log("about to call currentCategoryNode.subcategory. 1. subcategoryName: " + subcategoryName)
        currentCategoryNode = currentCategoryNode.subcategory(subcategoryName);
      }
      let lastItem = t.value[t.value.length - 1];
      if (lastItem.constructor === String) {
        let subcategoryName = lastItem;
        currentCategoryNode = currentCategoryNode.subcategory(subcategoryName);
      } else if (lastItem.constructor === Object) {
        let subcategoryName = Object.keys(lastItem)[0];
        console.log("about to call currentCategoryNode.subcategory. 2. subcategoryName: " + subcategoryName)
        currentCategoryNode = currentCategoryNode.subcategory(subcategoryName);
      } else {
        let err = Error("wrong format: the last item in the categories is neither string nor an object. all timing's categories except last should be strings. timing's last category should be either of two: a string (e.g 'a string') or an object with single list-typed property (e.g. {'someProperty': []}). day: " + eachTimingDay.date);
        err.source_timing = t.category;
        err.fromdateStr = `${dateArray2str(dt.date)} ${timeArray2str(t.from)}`;
        throw err;
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
