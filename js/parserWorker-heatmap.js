
var gHeatmapConfig = null;

function uncoolSyncXHR(path) {
  var request = new XMLHttpRequest();
  request.open('GET', path, false);
  request.send(null);

  if (request.status === 200) {
    return request.responseText;
  }
  else {
    throw new Error('Nefarious sync XHR problem: ' + request.status);
  }
}

// Synchronously load our config because we're a worker so why not block on I/O?
// Well, I know why not, but we are the only thing that's going to happen until we
// return, so, meh.
function loadHeatmapMapping() {
  if (gHeatmapConfig)
    return;

  var loaded = JSON.parse(uncoolSyncXHR('heatbar/default-mappings.json'));

  var allRegexps = [];
  var categoryDefs = {};
  gHeatmapConfig = {
    categoryDefs: categoryDefs,
    regexes: allRegexps,
    pointTimeDensity: null
  };

  var curBit = 1;
  for (var categoryName in loaded) {
    var catDef = loaded[categoryName];
    // no metadata for now
    categoryDefs[categoryName] = {};
    var regexDefs = catDef.regexes;
    for (var regexStr in regexDefs) {
      var compiled = new RegExp(regexStr);
      allRegexps.push({
        priority: regexDefs[regexStr],
        regex: compiled,
        category: categoryName,
        bit: curBit,
      });
    }
    curBit *= 2;
  }
  // sort in descending priority order
  allRegexps.sort(function(a, b) {
    return b.priority - a.priority;
  });
}

function calculateHeatmapData(requestID, profileID, threadId, options) {
  if (!gHeatmapConfig)
    loadHeatmapMapping();

  var profile = gProfiles[profileID];
  var data = profile.filteredThreadSamples[threadId];
  var nBins = options.bins;
  var heatmaps = {};

  var unfilteredSampleCount = profile.threads[threadId].samples.length;

  var start = findTimelineStart(profileID);
  var end = findTimelineEnd(profileID);

  if (!gHeatmapConfig.pointTimeDensity)
    gHeatmapConfig.pointTimeDensity = unfilteredSampleCount / (end - start);

  var binTimeSize = (end - start) / nBins;
  // What is the value in the range [0.0, 1.0] that we should add to each bin
  // for each sample that falls in that bin?  We assume an equal distribution of
  // our unfiltered point count, which may not be 100% correct but suffices.
  //var datapointValue = Math.min(1.0, nBins / unfilteredSampleCount);
  var datapointValue =
        Math.min(1.0, 1.0 / (binTimeSize * gHeatmapConfig.pointTimeDensity));

  var tmplArray = new Array(nBins);
  for (var ix = 0; ix < nBins; ix++) {
    tmplArray[ix] = 0.0;
  }

  var regexes = gHeatmapConfig.regexes;

  var symbols = profile.symbols;

  // since the symbols are not pierced, we can cache the category results for
  // each symbol to speed things up.
  var catCache = {};

  // The category this frame appears to belong to.
  var usecat;
  // Bitmask of categories that have already been seen in this step so we don't
  // double-count.  (It is very likely many frames in a step will all belong to
  // the same category.)
  var usedCatBits;
  // The current data-point/sample we are investigating.
  var step;
  // The time associated with the current step.  We treat our data points like
  // a scatter plot rather than a bar/column chart (like the (current) histogram
  // implementation appears to do.  However, given that we are a heat-map, we
  // don't do anything useful like assign a magnitude to the data point.  This
  // is okay for perf, but for something like the SPS profiler where sampling
  // can have high variability, assigning more weighting might be appropriate
  // (although that should be assigned by the parser or follow-on logic, not
  // us.)
  var time;
  var foundInnermost;
  function putInBin() {
    var mapdat = heatmaps[usecat.category];
    if (!mapdat) {
      mapdat = heatmaps[usecat.category] = {
        innermost: tmplArray.concat(),
        present: tmplArray.concat(),
      };
    }
    var iBin = Math.floor((time - start) / binTimeSize);
    if (!foundInnermost) {
      mapdat.innermost[iBin] += datapointValue;
      foundInnermost = true;
      usedCatBits |= usecat.bit;
    }
    if (!(usedCatBits & usecat.bit)) {
      mapdat.present[iBin] += datapointValue;
      usedCatBits |= usecat.bit;
    }
  }

  for (var i = 0; i < data.length; i++) {
    step = data[i];
    time = step.extraInfo.time;
    // can't bin a frame that lacks timestamps
    if (!time)
      continue;


    // scan from the innermost frame out, so that in the future we can support
    // stopping once we hit a certain type of frame, like for nested event loop
    // spinning or something like that.
    var frames = step.frames;
    usedCatBits = 0;
    foundInnermost = false;
    for (var iFrame = frames.length - 1; iFrame >= 0; iFrame--) {
      var frameSym = frames[iFrame];
      usecat = catCache[frameSym];
      if (usecat === undefined) {
        var symInfo = symbols[frameSym];
        for (var iRegex = 0; iRegex < regexes.length; iRegex++) {
          var rdef = regexes[iRegex];
          if (rdef.regex.test(symInfo.symbolName)) {
            usecat = rdef;
            break;
          }
        }
        if (usecat === undefined)
          usecat = null;
        catCache[frameSym] = usecat;
      }
      if (!usecat)
        continue;

      putInBin();
    }
  }

  sendFinished(
    requestID,
    {
      threadId: threadId,
      histogramData: heatmaps,
      debugData: {
        start: start,
        end: end,
        timeSpan: end - start,
        unfilteredSampleCount: unfilteredSampleCount,
        nBins: nBins,
        datapointValue: datapointValue,
        binTimeSize: binTimeSize
      }
    });
}
