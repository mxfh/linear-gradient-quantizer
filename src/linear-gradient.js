import {interpolateLab} from 'd3-interpolate';
import {scaleLinear} from 'd3-scale';
import {rgb} from 'd3-color';
import bigRat from 'big-rational';
import {parseGradientObject} from './linear-gradient-parser';
import _ from 'lodash';

const HARDSTEPLIMIT = 65535;

var LinearGradient = function (obj, options) {
  this.segments = setWidths(parseGradientObject(obj));
  options = options || {};
  this.name = options.name || obj.name;
  this.selected = options.selected || obj.selected;
  this.optimize = options.optimize || obj.optimize;
  this.steps = (options.steps || obj.steps) || {};
  this.widths = {};
  this.debug = options.debug || obj.debug;
};

LinearGradient.prototype.name = 'Unnamed Linear Gradient';
LinearGradient.prototype.selected = false;
LinearGradient.prototype.optimize = false;
LinearGradient.prototype.debug = false;

function setWidths(segments) {
  if (segments) {
    return distributeUndeclaredWidths(
      collectDeclaredWidths(segments)
    )
  }
  else {
    return false;
  }
}

function collectDeclaredWidths(segments) {
  var sum = 0;
  var count = 0;
  segments.forEach(function (r) {
    if (!isNaN(r.width)) {
      sum += r.width;
      count += 1;
    }
  });
  return {
    segments: segments,
    sum: sum,
    count: count
  };
}

function distributeUndeclaredWidths(o) {
  var segments = o.segments;
  let l = segments.length - o.count;
  let width = (1 - o.sum) / l;
  segments.forEach(function (r, i) {
    if (isNaN(r.width) || r.width === undefined) {
      segments[i].width = width;
    }
  });
  //console.log('distribute',o,segments);
  return segments;
}

function fillColorScale(range, steps) {
  if (range.length >= 2) {
    let colors = [];
    let stops = [];
    let l = range.length;
    let s = steps - 1;
    for (let i = 0; i < l; i++) {
      stops.push((s) * i / (l - 1));
    }
    let colorScale = scaleLinear()
      .domain(stops)
      .range(range)
      .interpolate(interpolateLab);
    for (let i = 0; i < steps; ++i) {
      colors.push(rgb(colorScale(i)));
    }
    return colors;
  } else {
    return false;
  }
}

function ggt(m, n) {
  if (n == 0)
    return m;
  else
    return ggt(n, m % n);
}

function kgv(m, n) {
  let o = ggt(m, n);
  let p = (m * n) / o;
  return p;
}

function rationalize(rational, epsilon) {
  var denominator = 0;
  var numerator;
  var error;

  do {
    denominator++;
    numerator = Math.round((rational.numerator * denominator) / rational.denominator);
    error = Math.abs(rational.minus(numerator / denominator));
  } while (error > epsilon);
  return bigRat(numerator, denominator);
}

function calculateStepSizes(gradient, steps) {
  var sum = 0;
  var totalSteps = 0;
  var totalIntSteps = 0;
  var totalL = 0;
  var minSteps = 1;
  var smallestWidth = steps;
  gradient.segments.forEach(function (segment, i) {
      let s = segment.width * steps;
      let l = segment.gradient.length;
      let fs = s / l;
      segment.steps = s;
      if (l === 2 && segment.gradient[0] === segment.gradient[1]) {
        segment.finesteps = s;
        segment.finewidth = segment.width;
        segment.isFlat = true;
      } else {
        segment.finesteps = fs;
        segment.finewidth = segment.width / segment.gradient.length;
      }
      if (gradient.optimize) {
        fs = segment.finesteps;
        let fw = segment.finewidth;
        let rat = rationalize(bigRat(fw), 1 / (fw * HARDSTEPLIMIT));
        let int = fs * rat.denom.value;
        totalIntSteps += int;
        minSteps = kgv(minSteps, rat.denom.value);
        sum += s;
        totalSteps += fs;
        totalL += l;
        smallestWidth = Math.min(segment.width / l, smallestWidth);

      }
      gradient.segments[i] = segment;
    }
  );
  gradient.steps.min = minSteps;
  gradient.steps.initial = gradient.steps.initial || steps;
  gradient.steps.total = totalSteps;
  gradient.steps.unique = totalL;
  gradient.widths.smallest = smallestWidth;
  gradient.widths.sum = sum;
  return gradient;
}

function segmentedColorScale(segments, steps) {
  var fullSteps;
  //steps = Math.max(gradient.minSteps, steps);
  steps = Math.ceil(steps);
  let stepsAvailable = steps;
  var usedSteps = 0;
  let colorSteps = [];
  var availableRange = 1;
  segments.forEach(function (segment) {
    fullSteps = Math.round(
      stepsAvailable * segment.width / availableRange
    );
    availableRange -= segment.width;
    if (fullSteps >= 1 && stepsAvailable >= 1) {
      stepsAvailable -= fullSteps;
      usedSteps += fullSteps;
      colorSteps = colorSteps.concat(
        fillColorScale(segment.gradient, fullSteps)
      );
    }
  });

  if (usedSteps !== steps) {
    console.error(
      'calculated color steps dont match up', usedSteps, steps, segments);
  }
  return colorSteps;
}

function collectNormalizedRanges(gradient, steps) {
  gradient = calculateStepSizes(gradient, steps);
  return gradient;
}

function optimize(gradient, steps) {
  var newSteps;
  if (gradient.steps.min !== undefined && gradient.optimize) {
    let min = Math.floor(steps / gradient.steps.min);
    newSteps = ((min >= 1) ? min : 1) * gradient.steps.min;
    gradient.steps.optimum = newSteps;
    if (gradient.debug > 1)
    console.info(gradient.name, gradient.steps, 'optimized');
  }
  return gradient;
}

function makeColorScale(range, steps, options) {
  options = options || {};
  var gradient = new LinearGradient(_.cloneDeep(range), options);
  if (!gradient.segments) {
    return false;
  }
  gradient = collectNormalizedRanges(gradient, steps);
  if (gradient.optimize) gradient = optimize(gradient, steps);
  if (gradient.debug > 1) console.log('_____', gradient);
  steps = Math.min(gradient.steps.optimum || steps, HARDSTEPLIMIT);
  return segmentedColorScale(gradient.segments, gradient.steps.optimum || steps);
}

export {
  makeColorScale
};
