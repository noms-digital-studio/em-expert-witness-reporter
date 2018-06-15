const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const CSVtoJSON = require('csvtojson');
const moment = require('moment');
const polyline = require('polyline');
const qs = require('qs');
const MDtoPDF = require('markdown-pdf');
const Handlebars = require('handlebars');
const request = require('superagent');
const geolib = require('geolib');

const INCLUDE_IMAGES = true;
const EXTRACT_DATE_FORMAT = 'MMM D YYYY h:mmA';

const GOOGLE_STATIC_MAP_URL = 'https://maps.googleapis.com/maps/api/staticmap';
const GOOGLE_STATIC_MAP_KEY = 'AIzaSyAj8cbl551OZ6uhhVH-oXIuAI-zxWwqpHA';
const GOOGLE_STATIC_MAP_OPTIONS = {
  size:'640x640',
  scale: 2,
  format: 'png',
  maptype: 'roadmap',
};

const parseDate = (str) =>
  moment(str, 'DD/MM/YYYY_HH:mm:ss').toDate();

const recordEvent = (record, status, json) =>
  record.push({
    offenderId: json.offender_id,
    serialNumber: json.receiver_sn,
    status,
    datetime: moment(json.event_time, EXTRACT_DATE_FORMAT),
    action: (json.action_time) ? {
      datetime: moment(json.action_time, EXTRACT_DATE_FORMAT),
      sequenceNo: json.action_seq_no,
      userId: json.action_user,
      status: json.action_status,
      comment: json.action_comment,
    } : undefined,
    warning: (json.warning_date) ? {
      number: json.warning_number,
      datetime: moment(json.warning_date, EXTRACT_DATE_FORMAT),
      printed: json.is_warning_printed,
      sent: json.is_warning_sent,
      responseTimeMet: json.response_time_met,
      user: json.user_name,
      userId: json.user_id,
    } : undefined,
  });

updateViewModelFromDB = (model, data) => {
  if (data.details) {
    model.details = {
      firstName: data.details.first_name,
      middleName: data.details.middle_name,
      lastName: data.details.last_name,

      source: data.details,
    };
  }

  if (data.points && data.points.length > 0) {
    data.points.forEach(json => {
      if (model.offenderId !== json.offender_id) {
        console.log(json);
        throw new Error('multiple offenderIds encountered in POINTS extract');
      }

      let datetime = moment(json.point_time, EXTRACT_DATE_FORMAT);

      if (datetime.diff(model.reportFrom) >= 0 && datetime.diff(model.reportTo) < 0) {
        model.movementRecord.push({
          offenderId: json.offender_id,
          positionId: json.position_id,
          datetime: datetime,
          time: datetime.toDate(),
          latitude: json.lat,
          longitude: json.lon,
          altitude: '',
          speed: '',
          numberOfSatelites: 0,
          generatedBy: json.point_type,
          lbsAccuracy: '',
        });
      }
    });
    model.movementRecord.sort((a,b) => a.datetime.diff(b.datetime));
  }

  if (data.events && data.events.length > 0) {
    model.serialNumber = data.events[0].receiver_sn;

    data.events.forEach(json => {
      if (model.offenderId !== json.offender_id) {
        console.log(json);
        throw new Error(`multiple offenderIds encountered in EVENTS extract`);
      }

      switch (json.event_code) {
        // strapTamperRecord
        case 'P59':
          recordEvent(model.strapTamperRecord, true, json);
          break;
        case 'P60':
          recordEvent(model.strapTamperRecord, false, json);
          break;

        // bodyTamperRecord
        case 'P50':
          recordEvent(model.bodyTamperRecord, true, json);
          break;

        // inclusionZoneViolation
        case 'P67':
          recordEvent(model.inclusionZoneViolation, true, json);
          break;
        case 'P68':
          recordEvent(model.inclusionZoneViolation, false, json);
          break;

        // exclusionZoneViolation
        case 'P69':
          recordEvent(model.exclusionZoneViolation, true, json);
          break;
        case 'P70':
          recordEvent(model.exclusionZoneViolation, false, json);
          break;

        // trackerInCharger
        case 'P61':
          recordEvent(model.trackerInCharger, true, json);
          break;
        case 'P62':
          recordEvent(model.trackerInCharger, false, json);
          break;

        // homeCurfewViolation
        case 'P53':
          recordEvent(model.homeCurfewViolation, true, json);
          break;
        case 'P54':
          recordEvent(model.homeCurfewViolation, false, json);
          break;
      }
    });
    model.strapTamperRecord.sort((a,b) => a.datetime.diff(b.datetime));
    model.bodyTamperRecord.sort((a,b) => a.datetime.diff(b.datetime));
    model.inclusionZoneViolation.sort((a,b) => a.datetime.diff(b.datetime));
    model.exclusionZoneViolation.sort((a,b) => a.datetime.diff(b.datetime));
    model.trackerInCharger.sort((a,b) => a.datetime.diff(b.datetime));
    model.homeCurfewViolation.sort((a,b) => a.datetime.diff(b.datetime));
  }

  return model;
};

const updateViewModelFromCVS = (model) => (json) => {
  if (!model.serialNumber) {
    model.serialNumber = json.serialNumber;
  }

  if (model.serialNumber !== json.serialNumber) {
    throw new Error('multiple Serial Numbers encountered in extract');
  }

  model.movementRecord.push({
    serialNumber: json.serialNumber,
    datetime: json.datetime,
    latitude: json.latitude,
    longitude: json.longitude,
    altitude: json.altitude,
    speed: json.speed,
    numberOfSatelites: json.numberOfSatelites,
    generatedBy: json.generatedBy,
    lbsAccuracy: json.lbsAccuracy,
  });

  [
    'strapTamperRecord',
    'bodyTamperRecord',
    'exclusionZoneViolation',
    'inclusionZoneViolation',
    'trackerInCharger',
    'homeCurfewViolation',
  ].forEach((p) => {
    let val = json[p];
    if ((val === 0 && model[p].length === 0) || model[p][model[p].length - 1] === val) {
      return;
    }

    model[p].push({ serialNumber: json.serialNumber, datetime: json.datetime, status: val === 1 });
  });
}

const getDBData = opts => {
  let model = {
    offenderId: opts.offenderId,
    reportFrom: opts.reportFrom,
    reportTo: opts.reportTo,

    movementRecord: [],
    strapTamperRecord: [],
    bodyTamperRecord: [],
    exclusionZoneViolation: [],
    inclusionZoneViolation: [],
    trackerInCharger: [],
    homeCurfewViolation: [],
  };

  let db = new Database('./data/electronic_monitoring.db', { readonly: true, fileMustExist: true });

  let details = db.prepare(
    `SELECT * FROM details WHERE offender_id='${opts.offenderId}'`
  ).all()[0];
  let points = db.prepare(
    `SELECT * FROM points WHERE offender_id='${opts.offenderId}'`
  ).all();
  let zones = db.prepare(
    `SELECT * FROM zones WHERE offender_id='${opts.offenderId}'`
  ).all();
  let timeFrames = db.prepare(
    `SELECT * FROM time_frames WHERE offender_id='${opts.offenderId}'`
  ).all();
  let events = db.prepare(
    `SELECT \
      e.offender_id, \
      e.event_id, \
      e.receiver_sn, \
      e.event_code, \
      et.description, \
      e.event_time, \
      e.upload_time, \
      e.data_version, \
      e.action_time, \
      e.action_seq_no, \
      e.action_user, \
      e.action_status, \
      e.action_comment, \
      w.warning_number, \
      w.warning_date, \
      w.is_warning_printed, \
      w.is_warning_sent, \
      w.response_time_met, \
      w.user_name, \
      w.user_id \
    FROM events e \
      LEFT JOIN warnings w ON e.offender_id = w.offender_id AND e.event_id = w.event_id \
      LEFT JOIN event_types et ON e.event_code = et.code \
    WHERE e.offender_id = '${opts.offenderId}'`
  ).all();

  return Promise.resolve(updateViewModelFromDB(model, { details, points, zones, timeFrames, events }));
}

const getCSVData = (opts) => {
  let model = {
    movementRecord: [],
    strapTamperRecord: [],
    bodyTamperRecord: [],
    exclusionZoneViolation: [],
    inclusionZoneViolation: [],
    trackerInCharger: [],
    homeCurfewViolation: [],
  };

  let rs = fs.createReadStream(opts.src, 'utf8');
  let csv2json = CSVtoJSON({
    noheader: false,
    trim: true,
    ignoreEmpty: true,
    checkType: true,
    headers: [
      // required to be in order of CSV dataset
      'serialNumber',
      'datetime',
      'latitude',
      'longitude',
      'altitude',
      'speed',
      'numberOfSatelites',
      'txPresent',
      'strapTamper',
      'bodyTamper',
      'exclusionZoneViolation',
      'inclusionZoneViolation',
      'trackerInCharger',
      'homeCurfewViolation',
      'generatedBy',
      'lbsAccuracy',
      'tagIdentifier',
      'trackerBattery',
      'trackerCase',
      'trackerPower'
    ],
    colParser: {
      'serialNumber': 'String',
      'datetime': (item /*, head, resultRow, row , colIdx */) => parseDate(item),
      'latitude': 'Number',
      'longitude': 'Number',
      'altitude': 'Number',           // not captured
      'speed': 'String',              // not captured
      'numberOfSatellites': 'Number', // not captured
      'txPresent': 'Number',          // not captured
      'strapTamper': 'Number',
      'bodyTamper': 'Number',
      'exclusionZoneViolation': 'Number',
      'inclusionZoneViolation': 'Number',
      'trackerInCharger': 'Number',
      'homeCurfewViolation': 'Number',
      'generatedBy': 'String',
      'lbsAccuracy': 'Number',
      'tagIdentifier': 'Number',      // not captured
      'trackerBattery': 'Number',     // not captured
      'trackerCase': 'Number',        // not captured
      'trackerPower': 'Number'        // not captured
    }
  })
    .fromStream(rs)
    .on('json', updateViewModel(model));

  return new Promise((resolve, reject) => {
    csv2json.on('done', () => resolve(model));
    csv2json.on('error', (error) => reject(error));
  });
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

const saveRawOutput = (opts) => (data) =>
  new Promise((resolve, reject) => {
    fs.writeFile(opts.target, JSON.stringify(data, null, '  '), 'utf8', () => resolve(data));
  });

const saveOutput = (opts) =>
  (md) => new Promise((resolve, reject) => {
    MDtoPDF(opts.pdf)
      .from.string(md)
      .to(opts.target, function () {
        console.log('Created', opts.target);
        resolve();
      });
  });

const fromDB = offenderId =>
  // read in data
  getDBData({
    offenderId: offenderId,
    reportFrom: moment('2017-07-14T06:00:00.000Z'),
    reportTo: moment('2017-07-14T07:30:00.000Z'),
  })
  // return output
  .then(saveRawOutput({
    target: `./output/${offenderId.replace('/', '-')}.json`,
  }))
  .then(generateViewModel({ /* opts */ }))
  .then(generateMapImagery({
    target: `.temp/${offenderId.replace('/', '-')}.png`,
  }))
  // apply template transform
  .then(generateReport({
    source: `./templates/expert-witness-report.md`,
  }))
  // return output
  .then(saveOutput({
    target: `./output/${offenderId.replace('/', '-')}.pdf`,
    pdf: { paperFormat: 'A4', paperOrientation: 'portrait' }
  }))
  .catch((err) => console.error(err));

const fromCSV = label =>
  getCSVData({
    src: `./data/${label}.csv`
  })
  .then(updateViewModelFromCVS({ /* opts */ }))
  .then(generateMapImagery({
    target: `./.temp/${label}.png`,
  }))
// apply template transform
  .then(generateReport({
    source: `./templates/expert-witness-report.md`,
  }))
// return output
  .then(saveOutput({
    target: `./output/${label}.pdf`,
    pdf: { paperFormat: 'A4', paperOrientation: 'portrait' }
  }))
  .catch((err) => console.error(err));

let offenderId = process.argv[2];
if (!offenderId) {
  console.log('>>>');
  console.log('>>> USAGE: npm run generate 00/123456X');
  console.log('>>>');
  process.exit();
}

fromDB(offenderId);
