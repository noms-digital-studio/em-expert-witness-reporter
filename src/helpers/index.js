const moment = require('moment');
const geolib = require('geolib');
const polyline = require('@mapbox/polyline');
const qs = require('qs');

const GOOGLE_STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';
const GOOGLE_STATIC_MAP_KEY = 'AIzaSyAj8cbl551OZ6uhhVH-oXIuAI-zxWwqpHA';
const GOOGLE_STATIC_MAP_OPTIONS = {
  size:'640x640',
  scale: 2,
  format: 'png',
  maptype: 'roadmap',
};

const asLatLon = point => ({
  latitude: Number.parseFloat((point.lat || point.latitude).toFixed(5)),
  longitude: Number.parseFloat((point.lon || point.longitude).toFixed(5)),
  time: moment(point.point_time || point.time).toDate(),
})

const calculateDistance = (a, b) => {
  if (!a || !b) {
    return 0;
  }

  let x = geolib.getDistance(asLatLon(a), asLatLon(b));

  return !x ? 0 : x;
};
const calculateSpeed = (a, b) => {
  if (!a || !b) {
    return 0;
  }

  let x = geolib.getSpeed(asLatLon(a), asLatLon(b), { unit: 'mph' });

  return !x ? 0 : x;
};
const calculateTimeSpan = (a, b) => {
  if (!a || !b) {
    return 0;
  }

  return moment.duration(asLatLon(a).time - asLatLon(b).time).humanize();
}

const extractTrailZoneList = opts => model => {
  let data = [];

  var previous;
  model.points.forEach((json, i) => {
    let nextRecord = model.points[i + 1];
    let lastRecord = model.points[previous];
    let speed = 0;

    if (json.lon === 0 && json.lat === 0) {
      return;
    }

    if (lastRecord &&
        nextRecord &&
        json.point_type === lastRecord.point_type && json.point_type === nextRecord.point_type &&
        json.lon === lastRecord.lon && json.lon === nextRecord.lon &&
        json.lat === lastRecord.lat && json.lat === nextRecord.lat) {
      return;
    }

    let point_time = moment(json.point_time);

    if (lastRecord) {
      speed = calculateSpeed(lastRecord, json);

      if ( speed > 300 || (point_time.diff(moment(lastRecord.point_time)) === 0 && speed > 0)) {
        return;
      }
    }

    if (point_time.diff(opts.reportFrom) >= 0 &&
        point_time.diff(opts.reportTo) < 0
    ) {
      if (lastRecord) {
        data[data.length - 1].duration = calculateTimeSpan(lastRecord, json);
      }

      let latLon = asLatLon(json);

      data.push(Object.assign({}, json, {
        point_time: moment(json.point_time),
        speed: speed,
        distance: calculateDistance(lastRecord, json),
        duration: 0,
      }));

      previous = i;
    }
  });

  model.trailZoneList = data;

  return model;
};

const extractTrailPoints = opts => model => {
  let data = [];

  var previous;
  model.points.forEach((json, i) => {
    let nextRecord = model.points[i + 1];
    let lastRecord = model.points[previous];

    if (json.lon === 0 && json.lat === 0) {
      return;
    }

    if (lastRecord &&
        nextRecord &&
        json.point_type === lastRecord.point_type && json.point_type === nextRecord.point_type &&
        json.lon === lastRecord.lon && json.lon === nextRecord.lon &&
        json.lat === lastRecord.lat && json.lat === nextRecord.lat) {
      return;
    }

    let point_time = moment(json.point_time);

    if (lastRecord) {
      let speed = calculateSpeed(lastRecord, json);

      if ( speed > 300 || (point_time.diff(moment(lastRecord.point_time)) === 0 && speed > 0)) {
        return;
      }
    }

    if (point_time.diff(opts.reportFrom) >= 0 &&
        point_time.diff(opts.reportTo) < 0
    ) {
      let latLon = asLatLon(json);

      if (latLon.latitude === 0) {
        console.log(json);
      }

      data.push(latLon);

      previous = i;
    }
  });

  model.trailPoints = data;

  return model;
};

const extractMapBounds = opts => model => {
  let x = geolib.getBounds(model.trailPoints);

  x.width = calculateDistance({ lat: x.maxLat, lon: x.minLng }, { lat: x.maxLat, lon: x.maxLng });
  x.height = calculateDistance({ lat: x.maxLat, lon: x.maxLng }, { lat: x.minLat, lon: x.maxLng });

  x.scale = Math.max(x.width / 640, x.height / 640);

  model.mapBounds = x;

  return model;
};

const generateMapTileUrl = opts => (model, factor = 0) => {
  let data = [];

  var previous;
  model.trailPoints.forEach((json, i) => {
    let lastRecord = model.trailPoints[previous];

    if (lastRecord) {
      let distance = calculateDistance(lastRecord, json);

      if (distance < model.mapBounds.scale * factor) {
        return;
      }
    }

    data.push([ json.latitude, json.longitude ]);
    previous = i;
  })

  let route = polyline.encode(data, 5);
  let query = qs.stringify(Object.assign({}, GOOGLE_STATIC_MAP_OPTIONS, {
    path: `color:blue|weight:5|enc:${route}`,
    key: GOOGLE_STATIC_MAP_KEY
  }));

  model.mapTileUrl = `${GOOGLE_STATIC_MAP_URL}?${query}`;

  if (model.mapTileUrl.length > 8192) {
    console.log(new Date(), 'MAP TILE URL TOO LONG', model.mapTileUrl.length);
    return generateMapTileUrl(opts)(model, factor + 1);
  }

  return model;
};

module.exports = {
  extractTrailZoneList,
  extractTrailPoints,
  extractMapBounds,
  generateMapTileUrl,
};
