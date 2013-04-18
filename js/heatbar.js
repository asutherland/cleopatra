/**
 * Display density of: 1) time spent with the given category of code on the
 * stack at all, and 2) as the most specific known categorization.
 */
function HeatbarView(debugName) {
  this._container = document.createElement("div");
  this._container.className = "heatbar";
  this._debugName = debugName || "NoName";

  this._canvas = this._createCanvas();
  this._container.appendChild(this._canvas);

  this._rangeSelector = new RangeSelector(this._canvas, this);
  this._rangeSelector.enableRangeSelectionOnHistogram();
  this._container.appendChild(this._rangeSelector.getContainer());

  this._busyCover = document.createElement("div");
  this._busyCover.className = "busyCover";
  this._container.appendChild(this._busyCover);

  this._data = [];
}
HeatbarView.prototype = {
  dataIsOutdated: function HistogramView_dataIsOutdated() {
    this._busyCover.classList.add("busy");
  },
  _createCanvas: function HistogramView__createCanvas() {
    var canvas = document.createElement("canvas");
    canvas.height = 10;
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    return canvas;
  },
  getContainer: function HistogramView_getContainer() {
    return this._container;
  },
  selectRange: function HistogramView_selectRange(start, end) {
    this._rangeSelector._finishSelection(start, end);
  },
  histogramClick: function HistogramView_histogramClick(index) {
    // XXX mouse interaction needs to be hooked up; would just be for time range
  },
  display: function HistogramView_display(histogramData, frameStart, widthSum, highlightedCallstack) {
    this._data = histogramData;
    this._frameStart = frameStart;
    this._widthSum = widthSum;
    this._canvas.width = this._width = this._container.clientWidth;
    this._render(highlightedCallstack);
    this._busyCover.classList.remove("busy");
  },
  _scheduleRender: function HistogramView__scheduleRender(highlightedCallstack) {
    var self = this;
    if (self._pendingAnimationFrame != null) {
      // We have to cancel the old draw request because the
      // highlightedCallstack is newer so this request overrules.
      cancelAnimationFrame(this._pendingAnimationFrame);
    }
    self._pendingAnimationFrame = requestAnimationFrame(function anim_frame() {
      self._render(highlightedCallstack);
    });
  },
  _render: function HistogramView__render(highlightedCallstack) {
    if (this._pendingAnimationFrame != null) {
      cancelAnimationFrame(this._pendingAnimationFrame);
      this._pendingAnimationFrame = null;
    }

    var data = this._data, cy = 0, height = 10, spacing = 12;
    var categoryName;
    var catCount = 0;
    for (categoryName in data) {
      catCount++;
    }
    this._canvas.height = catCount * spacing;
    var ctx = this._canvas.getContext("2d");
    ctx.font = "10px Georgia";

    for (categoryName in data) {
      var heatmapInfo = data[categoryName];
      var innermost = heatmapInfo.innermost;
      var present = heatmapInfo.present;

      // clear the row
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, cy, this._width, height);

      // write the category name
      ctx.fillStyle = '#000';
      ctx.fillText(categoryName, 0, cy - 2);

      // now, to the drawing!
      var lx = 40;
      for (var iBin = 0; iBin < innermost.length; iBin++) {
        ctx.fillStyle = 'rgb(' + Math.floor(innermost[iBin] * 255) + ',0,' +
                        Math.floor(present[iBin] * 255) + ')';
        ctx.fillRect(lx + iBin, cy, 1, height);
      }

      cy += spacing;
    }

    this._finishedRendering = true;
  },
  highlightedCallstackChanged: function HistogramView_highlightedCallstackChanged(highlightedCallstack) {
    this._scheduleRender(highlightedCallstack);
  },
  _isInRangeSelector: function HistogramView_isInRangeSelector(index) {
    return false;
  },
  _isStepSelected: function HistogramView__isStepSelected(step, highlightedCallstack) {
    if ("marker" in step)
      return false;

    search_frames: for (var i = 0; i < step.frames.length; i++) {
      var frames = step.frames[i];

      if (frames.length < highlightedCallstack.length ||
          highlightedCallstack.length <= (gInvertCallstack ? 0 : 1))
        continue;

      var compareFrames = frames;
      if (gInvertCallstack) {
        for (var j = 0; j < highlightedCallstack.length; j++) {
          var compareFrameIndex = compareFrames.length - 1 - j;
          if (highlightedCallstack[j] != compareFrames[compareFrameIndex]) {
            continue search_frames;
          }
        }
      } else {
        for (var j = 0; j < highlightedCallstack.length; j++) {
          var compareFrameIndex = j;
          if (highlightedCallstack[j] != compareFrames[compareFrameIndex]) {
            continue search_frames;
          }
        }
      }
      return true;
    };
    return false;
  },
};

function MarkerView(debugName) {
}
MarkerView.prototype = {

};
