
function handleServerMessage(msg) {
  try {
    window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage start ");

    /*
    let processes_object = msg.processes;
    let forest = yamlRootObject2forest(msg.processes);
    my.processesForest = forest;
    showTagsAndLinks(forest);
    let viewBuilder = new ProcessesForestViewBuilder();
    viewBuilder.buildView(forest);
    my.processesForestViews = viewBuilder.getProcessesForestViews();
    appendProcessesForestHtml(viewBuilder.getHtmlElements());
    */





    if (msg.type == "wallpapers") {
      my.wallpapers.lst = msg.wallpapers;
      let randomIndex = getRandomInt(my.wallpapers.lst.length);
      document.body.style.backgroundImage = "url(wallpapers/" + my.wallpapers.lst[randomIndex] + ")";
      return;
    }
    if (msg.type == "key_pressed") {
      if (msg.keyval == "w") {
        my.wallpapers.idx++;
        if (my.wallpapers.idx >= my.wallpapers.lst.length) {
          my.wallpapers.idx = 0;
        }
        window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage current wallpaper: " +
          my.wallpapers.lst[my.wallpapers.idx]);
        document.body.style.backgroundImage = "url(wallpapers/" + my.wallpapers.lst[my.wallpapers.idx] + ")";
      }
      return;
    }
    addListenersToButtons();
    my.timings = msg.timings;
    let mainContentWrapper = document.getElementById("main-content-wrapper");
    let keys = Object.keys(msg);
    window.webkit.messageHandlers.timings_summary_msgs.postMessage("handleServerMessage end ");


  } catch (err) {
    window.webkit.messageHandlers.foobar.postMessage("js handleServerMessage error msg: " + err.message);
  }
}

