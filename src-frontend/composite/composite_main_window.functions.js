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
        document.body.style.backgroundImage = "url(" + my.wallpapers.lst[my.wallpapers.idx] + ")";
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
    if (msg.type == "error_message") {
      if (msg.error_source == "timings") {
        let innerContentWrapper = document.getElementById("inner-content-wrapper");
        let errorMessage = msg.message;
        if (msg.source_timing) {
          errorMessage = `(source timing: ${msg.source_timing})\n${errorMessage}`;
        }
        innerContentWrapper.innerHTML = "";
        let errorMessageHtml = turnMultilineTextIntoHtml(errorMessage);
        innerContentWrapper.appendChild(errorMessageHtml);
        return;
      } else if (msg.error_source == "notebook") {
        let notebookContentWrapper = document.getElementById("processes-content-wrapper");
        notebookContentWrapper.innerHTML = "";
        let errorMessageHtml = turnMultilineTextIntoHtml(msg.message);
        notebookContentWrapper.appendChild(errorMessageHtml);
        return;
      }
    }
    if (msg.type == "timings") {
      initPeriodButtonsRow();
      my.imageInfo = new ImageInfo();
      my.timings = msg.timings;
      return;
    }

    if (msg.type == "notebook") {
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
      return;
    }
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
