function unpackNestedColorArray(arr) {
  if (arr.length === 1 && Array.isArray(arr[0])) {
    return arr[0]
  } else {
    return arr
  }
};


function checkArrForWidth(arr) {
  let last = arr.slice().pop();
  if (typeof last === 'number') {
    let width = arr.pop();
    return {
      gradient: arr,
      width: width
    };
  } else {
    return {
      gradient: arr,
      width: NaN
    };
  }
}

function parseArrayToSegments(unparsedArr) {
  var parsedSegments = [];
  var segments = unparsedArr.slice();
  var collecting = [];
  // collect strings and arrays as arrays;
  segments.forEach(function (m) {
      if (typeof m === 'string') {
        collecting.push(m);
      } else if (Array.isArray(m)) {
        if (collecting.length > 0) parsedSegments.push(
          {gradient: collecting}
        );
        collecting = [];
        m = checkArrForWidth(m);
        parsedSegments.push(m);
      }
    }
  );
  if (collecting.length > 0) parsedSegments.push(
    {gradient: collecting}
  );
  return parsedSegments;
}

function parseSegments(unparsedSegments) {
  var parsedSegments = [];


  // gradient object on gradients root to single member array
  if (unparsedSegments.hasOwnProperty('gradient')) {
    unparsedSegments = [unparsedSegments.segments];
  }

  unparsedSegments.forEach(function (segment, i) {
      // [gradient] -> {gradient : [gradient]}

      if (Array.isArray(segment)) {
        segment = checkArrForWidth(segment);
      }

      if (!segment.hasOwnProperty('width')) {
        segment.width = NaN;
      }
      if (segment.hasOwnProperty('gradient')) {
        segment.gradient = unpackNestedColorArray(segment.gradient);
        // pad single colors to full width
        if (
          Array.isArray(segment.gradient) &&
          segment.gradient.length === 1 &&
          typeof segment.gradient[0] === 'string') {
          segment.gradient.push(segment.gradient[0]);
        }
        if (typeof segment.gradient === 'string') {
          segment.gradient = [segment.gradient ,segment.gradient ]
        }
      }
      parsedSegments.push(segment);
    }
  );
  return parsedSegments;
}

function parseGradientObject(obj) {
  var unparsedObj = obj;
  if (typeof unparsedObj === 'string') {
    unparsedObj = [unparsedObj];
  }

  if (Array.isArray(unparsedObj)) {
    unparsedObj.segments = parseArrayToSegments(unparsedObj);
  }
  // gradient on root to single member segments
  if (unparsedObj.hasOwnProperty('gradient')) {
    unparsedObj.segments = [{
      gradient: unparsedObj.gradient,
      width: unparsedObj.gradient.width || NaN
    }];
  }
  if (unparsedObj.hasOwnProperty('segments')) {
    return parseSegments(unparsedObj.segments);
  } else {
    console.error('unable to normalize', input)
    return false;
  }
}

export {
  parseGradientObject
};
