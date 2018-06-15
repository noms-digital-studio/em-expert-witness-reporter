const fs = require('fs');
const moment = require('moment');
const polyline = require('polyline');
const qs = require('qs');
const MDtoPDF = require('markdown-pdf');
const Handlebars = require('handlebars');
const request = require('superagent');
const geolib = require('geolib');

const EXTRACT_DATE_FORMAT = 'DD/MM/YYYY_HH:mm:ss';

const INCLUDE_IMAGES = true;

const GOOGLE_STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';
const GOOGLE_STATIC_MAP_KEY = 'AIzaSyAj8cbl551OZ6uhhVH-oXIuAI-zxWwqpHA';
const GOOGLE_STATIC_MAP_OPTIONS = {
  size:'640x640',
  scale: 2,
  format: 'png',
  maptype: 'roadmap',
};

const setMapBoundaries = (prop, mr) => (viewmodel) => {
  let first = mr[0];
  let mapBoundaries = mr.reduce((output, input) => {
    if (input.longitude > output.top) {
      output.top = input.longitude;
    }
    if (input.longitude < output.bottom) {
      output.bottom = input.longitude;
    }
    if (input.latitude > output.right) {
      output.right = input.latitude;
    }
    if (input.latitude < output.left) {
      output.left = input.latitude;
    }

    return output;
  }, { top: first.longitude, left: first.latitude, bottom: first.longitude, right: first.latitude });

  viewmodel[`${prop}`] =  {
    top: mapBoundaries.top,
    bottom: mapBoundaries.bottom,
    left: mapBoundaries.left,
    right: mapBoundaries.right,
    center: {
      latitude: mapBoundaries.bottom + (mapBoundaries.top - mapBoundaries.bottom),
      longitude: mapBoundaries.left + (mapBoundaries.right - mapBoundaries.left),
    }
  };

  return viewmodel;
};

const recordObservation = (prop, record) => (viewmodel) => {
  if (record.length > 0) {
    viewmodel[`${prop}Observed`] = {
      start: record[0].datetime,
      finish: record[record.length - 1].datetime
    };

    viewmodel[`${prop}Evidence`] = record.map((x) => ({ datetime: x.datetime, status: x.status }));
  }

  return viewmodel;
};

const setMapTileUrl = (prop, record) => (viewmodel) => {
  let route = polyline.encode(viewmodel.routeDetails.map((x) => x.location), 5);
  let query = qs.stringify(Object.assign({}, GOOGLE_STATIC_MAP_OPTIONS, {
    path: `color:blue|weight:5|enc:${route}`,
    key: GOOGLE_STATIC_MAP_KEY
  }));

  viewmodel[prop] = `${GOOGLE_STATIC_MAP_URL}?${query}`;

  return viewmodel;
};

const calculateDistance = (a, b) => a && b ? geolib.getDistance(a, b) : 0; //geolib.convertUnit('mi',  + ' miles';
const calculateDirection = (a, b) => a && b ? geolib.getBearing(a, b) : undefined;
const calculateSpeed = (a, b) => a && b ? geolib.getSpeed(a, b, {unit: 'mph'}) : 0;
const calculateTimeSpan = (a, b) => moment.duration(a && b ? (b - a) : 0).humanize();

const setLog = (prop, record) => (viewmodel) => {
  let records = record.filter((x, i) => {
      let lastRecord = record[i - 1];
      let nextRecord = record[i + 1];

      let lastRecordSame = lastRecord && lastRecord.latitude === x.latitude && lastRecord.longitude === x.longitude || false;
      let nextRecordSame = nextRecord && nextRecord.latitude === x.latitude && nextRecord.longitude === x.longitude || false;

      return !(lastRecordSame && nextRecordSame);
  });

  let firstRecord = records[0];
  viewmodel[prop] = records.map((x, i) => {
      let lastRecord = records[i - 1];
      let nextRecord = records[i + 1];

      return {
        datetime: moment(x.datetime).format('DD/MM/YYYY HH:mm:ss'),
        location: [ x.latitude, x.longitude ],
        altitude: x.altitude,
        speed: calculateSpeed(lastRecord, x),
        numberOfSatelites: x.numberOfSatelites || 0,
        generatedBy: x.generatedBy,
        lbsAccuracy: x.lbsAccuracy,
        to: {
          distance: calculateDistance(lastRecord, x),
          direction: calculateDirection(lastRecord, x),
        },
        from: {
          distance: calculateDistance(x, nextRecord),
          direction: calculateDirection(x, nextRecord),
        },
        journeyTime: calculateTimeSpan(firstRecord.datetime, x.datetime),
        timeSinceLastUpdate: calculateTimeSpan(lastRecord ? lastRecord.datetime : undefined, x.datetime),
        journeyDistance: calculateDistance(firstRecord, x),
        distanceSinceLastUpdate: calculateDistance(lastRecord, x),
      };
    }).filter((x) => !(x.distanceSinceLastUpdate > 9999)).slice(0, records.length - 28);

  return viewmodel;
};

const generateViewModel = (opts) =>
  (model) => [
      recordObservation('strapTamper', model.strapTamperRecord ),
      recordObservation('bodyTamper', model.bodyTamperRecord ),
      recordObservation('exclusionZoneViolation', model.exclusionZoneViolation ),
      recordObservation('inclusionZoneViolation', model.inclusionZoneViolation ),
      recordObservation('trackerInCharger', model.trackerInCharger ),
      recordObservation('homeCurfewViolation', model.homeCurfewViolation ),

      setMapBoundaries('mapBoundaries', model.movementRecord),

      setLog('routeDetails', model.movementRecord),

      setMapTileUrl('mapTileUrl'),
    ]
    .reduce((viewmodel, fn) => fn(viewmodel), {
      urn: model.offenderId,
      serialNumber: model.serialNumber,
      date: moment().format('Do MMM YYYY'),
      policeForce: 'A Police Force',
      policeOfficer: 'DC 1007 SMITHS',
      sentDate: moment().format('Do MMM YYYY'),
      reportStartDate: moment(model.movementRecord[0].datetime).format('Do MMM'),
      reportStartTime: moment(model.movementRecord[0].datetime).format('HHmm[hrs]'),
      reportEndDate: moment(model.movementRecord[model.movementRecord.length-1].datetime).format('Do MMM'),
      reportEndTime: moment(model.movementRecord[model.movementRecord.length-1].datetime).format('HHmm[hrs]'),
    });

const generateReport = (opts) => (viewmodel) =>
  new Promise((resolve, reject) => {
    fs.readFile(opts.source, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }

      var template = Handlebars.compile(data);

      resolve(template(viewmodel));
    });
  });

const generateMapImagery = (opts) => (viewmodel) => {
  const stream = fs.createWriteStream(opts.target);

  console.log(`MAP TILE URL: ${viewmodel.mapTileUrl}`);
  const req = request.get(viewmodel.mapTileUrl);

  return new Promise((resolve, reject) => {
    if (!INCLUDE_IMAGES) {
      return resolve(viewmodel);
    }

    stream.on('finish', () => {
      viewmodel.mapTilePath = opts.target;

      resolve(viewmodel);
    });

    stream.on('error', (err) => reject(err));

    req.pipe(stream);
  });
};

const saveOutput = (opts) =>
  (md) => new Promise((resolve, reject) => {
    MDtoPDF(opts.pdf)
      .from.string(md)
      .to(opts.target, function () {
        console.log('Created', opts.target);
        resolve();
      });
  });

const fromJSON = opts =>
  // read in data
  getJsonData({
    source: `./output/${opts.offenderId.replace('/', '-')}-${opts.reportFrom.format()}-${opts.reportTo.format()}.json`,
  })
  .then(generateViewModel({ /* opts */ }))
  .then(generateMapImagery({
    target: `.temp/${opts.offenderId.replace('/', '-')}-${opts.reportFrom.format()}-${opts.reportTo.format()}.png`,
  }))
  // apply template transform
  .then(generateReport({
    source: `./templates/trail-report.md`,
  }))
  // return output
  .then(saveOutput({
    target: `./output/${opts.offenderId.replace('/', '-')}-${opts.reportFrom.format()}-${opts.reportTo.format()}.pdf`,
    pdf: { paperFormat: 'A4', paperOrientation: 'portrait' }
  }))
  .catch((err) => console.error(err));

let offenderId = process.argv[2];
let reportFrom = process.argv[3];
let reportTo = process.argv[4];
if (!offenderId || !reportFrom || !reportTo) {
  console.log('***                                                                            ***');
  console.log('*   USAGE: npm run generate-witness-statement 00/123456X {from date} {to date}   *');
  console.log('***                                                                            ***');

  process.exit();
}

fromJSON({ offenderId, reportFrom: moment(reportFrom), reportTo: moment(reportTo) });
