window.webkit.messageHandlers.composite_main_window.onMessage(handleServerMessage);

function handleServerMessage(msg) {
  try {
    window.webkit.messageHandlers.composite_main_window.postMessage("handleServerMessage start ");



    if (msg.type == "wallpapers") {
      my.wallpapers.lst = msg.wallpapers;
      let randomIndex = getRandomInt(my.wallpapers.lst.length);
      document.body.style.backgroundImage = "url(" + my.wallpapers.lst[randomIndex] + ")";
      return;
    }
    if (msg.type == "key_pressed") {
      if (msg.keyval == "w") {
        my.wallpapers.idx++;
        if (my.wallpapers.idx >= my.wallpapers.lst.length) {
          my.wallpapers.idx = 0;
        }
        window.webkit.messageHandlers.composite_main_window.postMessage("handleServerMessage current wallpaper: " +
          my.wallpapers.lst[my.wallpapers.idx]);
        document.body.style.backgroundImage = "url(wallpapers/" + my.wallpapers.lst[my.wallpapers.idx] + ")";
      } else if (msg.keyval == "m") {
        my.minimalTextForTimings = !my.minimalTextForTimings;
        if (my.minimalTextForTimings) {
          clearTimingsTextWrapper();
        } else {
          makeTimingsTextElementsUnminimized();
        }
      }
      return;
    }
    initPeriodButtonsRow();
    my.imageInfo = new ImageInfo();
    my.timings = msg.timings;

    let processes_object = msg.processes;
    let forest = yamlRootObject2forest(msg.processes);
    my.processesForest = forest;

    // showTagsAndLinks(forest);
    let taggedNodes = extractTagsFromRootForest(forest);
    let tagsAndLinksForest = buildTagsAndLinksForest(taggedNodes);

    let viewBuilder = new ProcessesForestViewBuilder();
    viewBuilder.buildView(forest);
    my.processesForestViews = viewBuilder.getProcessesForestViews();
    appendProcessesForestHtml(viewBuilder.getHtmlElements());

    let currentProcessesForest = buildCurrentProcessesForest(tagsAndLinksForest);
    highlightProcessesInForest(my.processesForestViews, currentProcessesForest);

    let mainContentWrapper = document.getElementById("main-content-wrapper");
    let keys = Object.keys(msg);
    window.webkit.messageHandlers.composite_main_window.postMessage("handleServerMessage end ");


  } catch (err) {
    window.webkit.messageHandlers.composite_main_window.postMessage("js handleServerMessage error msg: " + err.message);
  }
}

function buildCurrentProcessesForest(tagsAndLinksForest) {
  let resultForest = [];
  let currentTags = findCurrentTags(tagsAndLinksForest);
  for (let tag of currentTags) {
    window.webkit.messageHandlers.composite_main_window.postMessage("js buildCurrentProcessesForest current tag ancestry: " +
      tag.tagAncestry.join(" "));
    addTagNodeLinksToForest(tag, resultForest);
  }
  return resultForest;
}

function findCurrentTags(tagsAndLinksForest) {
  try {
    let currentTags = [];
    function addTag(tag) {
      currentTags[currentTags.length] = tag;
      for (let subTag of tag.children) {
        addTag(subTag);
      }
    }
    function inner(tag) {
      if (tag.name === "current") {
        addTag(tag);
      } else {
        for (let subTag of tag.children) {
          inner(subTag);
        }
      }
    }
    for (let rootTagName in tagsAndLinksForest) {
      let rootTag = tagsAndLinksForest[rootTagName];
      inner(rootTag);
    }
    return currentTags;
  } catch (err) {
    window.webkit.messageHandlers.composite_main_window.postMessage("js findCurrentTags error msg: " + err.message);
  }
}
