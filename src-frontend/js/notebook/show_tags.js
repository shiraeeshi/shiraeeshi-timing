const { extractTagsFromRootForest } = require('./extract_tags.js');
const { NotebookTagsForestViewBuilder } = require('./tags_forest_view_builder.js');
const { highlightNotesInForest, buildTagsAndLinksForest } = require('./notebook_utils.js');
const { withChildren } = require('../html_utils.js');

export function showTagsAndLinks(forest) {
  try {
    let mainWrapper = document.getElementById("tags-and-links-content-wrapper");
    let taggedNodes = extractTagsFromRootForest(forest);
    let tagsAndLinksObj = buildTagsAndLinksForest(taggedNodes);

    let viewBuilder = new NotebookTagsForestViewBuilder();
    viewBuilder.buildView(tagsAndLinksObj);

    window.my.notebookTagsForestViews = viewBuilder.getNotebookTagsForestViews();
    // withChildren(mainWrapper,
    //   withChildren(document.createElement('div'),
    //     // (function() {
    //     //         let btnShowAll = document.createElement('button');
    //     //         btnShowAll.addEventListener('click', eve => {
    //     //                   showAllNotes();
    //     //                 });
    //     //         return withChildren(btnShowAll, document.createTextNode('all'))
    //     //       })(),
    //     withChildren(document.createElement('ul'),
    //       viewBuilder.getHtml()
    //     )
    //   )
    // );
    withChildren(mainWrapper,
      withChildren(document.createElement('ul'),
        viewBuilder.getHtml()
      )
    );
    viewBuilder.getNotebookTagsForestViews().forEach(v => v.children.forEach(c => c.collapse()));
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js showTagsAndLinks error msg: " + err.message);
    throw err;
  }
}

function showAllNotes() {
  try {
    let resultForest = window.my.notesForest.map(tree => {
      return {name: tree.name, children: tree.children.map(ch => { return { name: ch.name, children: [] }; }) };
    });
    highlightNotesInForest(window.my.rootNodeViewOfNotes, resultForest);
  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js showAllNotes error msg: " + err.message);
    throw err;
  }
}

// function withClass(elem, cls) {
//   elem.classList.add(cls);
//   return elem;
// }

// function string2li(value) {
//   let li = document.createElement('li');
//   let span = document.createElement('span');
//   let txt = document.createTextNode(value);
//   return withChildren(li,
//     withChildren(span, txt)
//   );
// }

// function tmpLi() {
//   return document.createElement('li');
// }


