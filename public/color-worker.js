/* eslint-disable */
// Standalone color extraction Worker - bypasses Turbopack bundling for OpenCV.js
"use strict";

var ANALYSIS_MAX_DIMENSION = 200;
var KMEANS_K = 3;
var KMEANS_ATTEMPTS = 1;
var KMEANS_MAX_ITERATIONS = 10;
var KMEANS_EPSILON = 1.0;
var MIN_CLUSTER_RATIO = 0.05;
var KMEANS_PP_CENTERS = 2;
var ACHROMATIC_SAT_THRESHOLD = 25;
var ACHROMATIC_VALUE_THRESHOLD = 200;
var MIN_FILTERED_RATIO = 0.1;

var PRESET_COLORS = [
  "hsl(0, 0%, 10%)",
  "hsl(0, 0%, 95%)",
  "hsl(0, 70%, 55%)",
  "hsl(210, 55%, 55%)",
  "hsl(120, 40%, 45%)",
  "hsl(45, 90%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(330, 70%, 60%)",
  "hsl(25, 70%, 50%)",
  "hsl(180, 50%, 45%)",
];

function parseHsl(str) {
  var inner = str.slice(4, -1);
  var parts = inner.split(",").map(function (p) {
    return Number(p.trim().replace("%", ""));
  });
  return { h: parts[0], s: parts[1], l: parts[2] };
}

var PRESET_HSL = PRESET_COLORS.map(parseHsl);

function hslDistance(a, b) {
  var hueDiff = Math.min(Math.abs(a.h - b.h), 360 - Math.abs(a.h - b.h));
  var hue = 1.0 * Math.pow(hueDiff / 180, 2);
  var sat = 0.5 * Math.pow((a.s - b.s) / 100, 2);
  var light = 0.7 * Math.pow((a.l - b.l) / 100, 2);
  return Math.sqrt(hue + sat + light);
}

function findNearestPreset(hsl) {
  var minDist = Infinity;
  var minIdx = 0;
  for (var i = 0; i < PRESET_HSL.length; i++) {
    var d = hslDistance(hsl, PRESET_HSL[i]);
    if (d < minDist) {
      minDist = d;
      minIdx = i;
    }
  }
  return PRESET_COLORS[minIdx];
}

function opencvHsvToHsl(h, s, v) {
  var hNorm = (h * 2) % 360;
  var sNorm = s / 255;
  var vNorm = v / 255;
  var l = vNorm * (1 - sNorm / 2);
  var sHsl = l === 0 || l === 1 ? 0 : (vNorm - l) / Math.min(l, 1 - l);
  return {
    h: Math.round(hNorm),
    s: Math.round(sHsl * 100),
    l: Math.round(l * 100),
  };
}

// Load OpenCV on Worker startup.
// opencv.js has been patched to reference opencv_js.wasm as a separate file
// instead of embedding 10MB base64. This enables fast WASM streaming compilation.
// NOTE: Emscripten modules retain a .then() method after resolution,
// which causes Promise resolve() to loop infinitely (thenable adoption).
// We must wrap cv before passing to resolve().
var cvReady = new Promise(function (resolve) {
  try {
    importScripts(self.location.origin + "/opencv.js");
    if (self.cv && typeof self.cv.then === "function") {
      self.cv.then(function (readyCv) {
        resolve({ cv: readyCv });
      });
    } else {
      resolve({ cv: self.cv });
    }
  } catch (e) {
    resolve(null);
  }
});

self.addEventListener("message", function (event) {
  var file = event.data.file;

  cvReady
    .then(function (wrapped) {
      var cv = wrapped && wrapped.cv ? wrapped.cv : wrapped;
      if (!cv) {
        self.postMessage({
          type: "error",
          message: "OpenCV.js failed to load",
        });
        return;
      }
      return extractColors(cv, file);
    })
    .then(function (result) {
      if (result) {
        self.postMessage({ type: "result", presetColors: result });
      }
    })
    .catch(function (err) {
      self.postMessage({
        type: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    });
});

function extractColors(cv, file) {
  return createImageBitmap(file).then(function (bitmap) {
    var w = bitmap.width;
    var h = bitmap.height;
    if (w > ANALYSIS_MAX_DIMENSION || h > ANALYSIS_MAX_DIMENSION) {
      var ratio = Math.min(
        ANALYSIS_MAX_DIMENSION / w,
        ANALYSIS_MAX_DIMENSION / h,
      );
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }
    var canvas = new OffscreenCanvas(w, h);
    var ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    var imageData = ctx.getImageData(0, 0, w, h);
    return runKmeans(cv, imageData);
  });
}

function runKmeans(cv, imageData) {
  var mats = [];
  function reg(m) {
    mats.push(m);
    return m;
  }
  try {
    var src = reg(cv.matFromImageData(imageData));
    var rgb = reg(new cv.Mat());
    cv.cvtColor(src, rgb, cv.COLOR_RGBA2RGB);
    var hsv = reg(new cv.Mat());
    cv.cvtColor(rgb, hsv, cv.COLOR_RGB2HSV);

    var totalPixels = hsv.rows * hsv.cols;
    var hsvBytes = hsv.data;

    var chromaticIndices = [];
    for (var pi = 0; pi < totalPixels; pi++) {
      var sv = hsvBytes[pi * 3 + 1];
      var vv = hsvBytes[pi * 3 + 2];
      if (sv < ACHROMATIC_SAT_THRESHOLD && vv > ACHROMATIC_VALUE_THRESHOLD) {
        continue;
      }
      chromaticIndices.push(pi);
    }

    var useChromaticFilter =
      chromaticIndices.length / totalPixels >= MIN_FILTERED_RATIO;
    var sampleCount = useChromaticFilter ? chromaticIndices.length : totalPixels;

    var samples = reg(new cv.Mat(sampleCount, 3, cv.CV_8UC1));
    var sampleBytes = samples.data;

    if (useChromaticFilter) {
      for (var ci = 0; ci < chromaticIndices.length; ci++) {
        var srcOff = chromaticIndices[ci] * 3;
        var dstOff = ci * 3;
        sampleBytes[dstOff] = hsvBytes[srcOff];
        sampleBytes[dstOff + 1] = hsvBytes[srcOff + 1];
        sampleBytes[dstOff + 2] = hsvBytes[srcOff + 2];
      }
    } else {
      for (var p = 0; p < totalPixels * 3; p++) {
        sampleBytes[p] = hsvBytes[p];
      }
    }
    var float32 = reg(new cv.Mat());
    samples.convertTo(float32, cv.CV_32F);

    var labels = reg(new cv.Mat());
    var centers = reg(new cv.Mat());
    var criteria = new cv.TermCriteria(
      cv.TermCriteria_EPS + cv.TermCriteria_MAX_ITER,
      KMEANS_MAX_ITERATIONS,
      KMEANS_EPSILON,
    );

    cv.kmeans(
      float32,
      KMEANS_K,
      labels,
      criteria,
      KMEANS_ATTEMPTS,
      KMEANS_PP_CENTERS,
      centers,
    );

    var data32S = labels.data32S;
    var counts = new Array(KMEANS_K).fill(0);
    for (var i = 0; i < sampleCount; i++) {
      counts[data32S[i]]++;
    }

    var clusters = [];
    for (var k = 0; k < KMEANS_K; k++) {
      var ratio = counts[k] / sampleCount;
      if (ratio >= MIN_CLUSTER_RATIO) {
        clusters.push({
          hsl: opencvHsvToHsl(
            Math.round(centers.floatAt(k, 0)),
            Math.round(centers.floatAt(k, 1)),
            Math.round(centers.floatAt(k, 2)),
          ),
          ratio: ratio,
        });
      }
    }
    clusters.sort(function (a, b) {
      return b.ratio - a.ratio;
    });

    var presets = clusters.map(function (c) {
      return findNearestPreset(c.hsl);
    });
    var unique = [];
    presets.forEach(function (p) {
      if (unique.indexOf(p) === -1) unique.push(p);
    });
    return unique;
  } finally {
    mats.forEach(function (m) {
      m.delete();
    });
  }
}
