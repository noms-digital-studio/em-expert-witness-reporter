const json2csv = require('json2csv').parse;
const fs = require('fs');
const geolib = require('geolib');
const moment = require('moment');

const CSV_DATE_FORMAT = 'DD/MM/YYYY_HH:mm:ss';
const SORTABLE_DATE_FORMAT = 'YYYYMMDDHHmmss';

const asLatLon = point => ({
  latitude: Number.parseFloat(point.lat.toFixed(5)),
  longitude: Number.parseFloat(point.lon.toFixed(5)),
  time: moment(point.point_time).toDate(),
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

let infinityCount = 0;
const toSpeedCategory = x => {
  if (x == 'null' || x < 0.1) {
    return '0';
  }
  if (x < 10) {
    return '< 10';
  }
  if (x < 20) {
    return '10 - 20';
  }
  if (x < 30) {
    return '20 - 30';
  }
  if (x < 40) {
    return '30 - 40';
  }
  if (x < 50) {
    return '40 - 50';
  }
  if (x < 60) {
    return '50 - 60';
  }
  if (x < 70) {
    return '60 - 70';
  }
  if (x < 100) {
    return '70 - 100';
  }
  if (x < 120) {
    return '100 - 120';
  }
  if (x < 300) {
    return '120+';
  }

  return 0;
};

const getStatus = (datetime, records) =>
  ((records || []).filter(x => moment(x.datetime).diff(datetime) === 0)[0] || {}).status ? 1 : 0;

const recordEvent = (record, status, json) =>
  record.push({
    offenderId: json.offender_id,
    serialNumber: json.receiver_sn,
    status,
    datetime: moment(json.event_time),
    action: (json.action_time) ? {
      datetime: moment(json.action_time),
      sequenceNo: json.action_seq_no,
      userId: json.action_user,
      status: json.action_status,
      comment: json.action_comment,
    } : undefined,
    warning: (json.warning_date) ? {
      number: json.warning_number,
      datetime: moment(json.warning_date),
      printed: json.is_warning_printed,
      sent: json.is_warning_sent,
      responseTimeMet: json.response_time_met,
      user: json.user_name,
      userId: json.user_id,
    } : undefined,
  });

const extractSubjectDetails = (model) => {
  if (model.details) {
    model.details = {
      firstName: model.details.first_name,
      middleName: model.details.middle_name,
      lastName: model.details.last_name,
      gender: model.details.gender,
      address: {
        line1: model.details.address,
        city: model.details.city_name,
        country: model.details.country_id,
        postcode: model.details.zip_code,
        phones: {
          home: model.details.home_phone,
          work: model.details.work_phone,
        },
      },

      program: {
        type: model.details.program_type,
        start: model.details.program_start,
        end: model.details.program_end,
      },

      source: model.details,
    };
  }

  return model;
}

const extractKeyEvents = opts => model => {
  model = Object.assign({}, model, {
    movementRecord: [],
    strapTamperRecord: [],
    bodyTamperRecord: [],
    exclusionZoneViolation: [],
    inclusionZoneViolation: [],
    trackerInCharger: [],
    homeCurfewViolation: [],
  });

  model.serialNumber = (model.events[0] || {}).receiver_sn;

  model.events.forEach(json => {
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

  return model;
};

const generateTrailZoneList = opts => model => {
  let data = [];

  var previous;
  model.points.forEach((json, i) => {
    let nextRecord = model.points[i + 1];
    let lastRecord = model.points[previous];

    if (lastRecord &&
        nextRecord &&
        json.point_type === lastRecord.point_type && json.point_type === nextRecord.point_type &&
        json.lon === lastRecord.lon && json.lon === nextRecord.lon &&
        json.lat === lastRecord.lat && json.lat === nextRecord.lat) {
      return;
    }

    let point_time = moment(json.point_time);

    if (lastRecord && point_time.diff(moment(lastRecord.point_time)) === 0 && calculateSpeed(lastRecord, json) > 0) {
      return;
    }

    let latLon = asLatLon(json);

    if (point_time.diff(opts.reportFrom) >= 0 &&
        point_time.diff(opts.reportTo) < 0
    ) {
      if (lastRecord) {
        data[data.length - 1]['*Duration*'] = calculateTimeSpan(lastRecord, json);
      }

      data.push({
        'Offender ID': json.offender_id,
        'Date & Time': point_time.format(CSV_DATE_FORMAT),
        //'Position id': json.position_id,
        Latitude: latLon.latitude || null,
        Longtitude: latLon.longitude || null,
        Altitude: 0,
        '*Speed*': toSpeedCategory(calculateSpeed(lastRecord, json)),
        '*Distance*': calculateDistance(lastRecord, json),
        '*Duration*': 0,
        'Number of Satellites': 0,
        'Tx Present': 0,
        'Strap Tamper': getStatus(point_time, model.strapTamperRecord),
        'Body Tamper': getStatus(point_time, model.bodyTamperRecord),
        'Exclusion Zone Violation': getStatus(point_time, model.exclusionZoneViolation),
        'Inclusion Zone Violation': getStatus(point_time, model.inclusionZoneViolation),
        'Tracker in Charger': getStatus(point_time, model.trackerInCharger),
        'Home Curfew Violation': getStatus(point_time, model.homeCurfewViolation),
        'Generated By': json.point_type || '',
        'LBS Accuracy': 0,
        'Tag Identifier': '',
        'Tracker Battery': 0,
        'Tracker Case': 0,
        'Tracker Power': 0,
      });

      previous = i;
    }
  });

  return data;
};

const readJsonData = source =>
  new Promise((resolve, reject) => {
    let filePath = `./output/${source}.json`;
    console.log(new Date(), 'READING FILE:', filePath);

    fs.readFile(filePath, 'utf8', (err, data) => {
      let json = JSON.parse(data);

      resolve(json);
    });
  });

const saveCsvData = target => data =>
  new Promise((resolve, reject) => {
    let filePath = `./output/${target}.csv`;
    console.log(new Date(), 'WRITING FILE:', filePath);

    fs.writeFile(filePath, json2csv(data), 'utf8', (err) => {
      console.log(new Date(), 'CREATED FILE:', filePath);

      resolve(data);
    });
  });

let offenderId = process.argv[2];
let reportFrom = moment(process.argv[3]);
let reportTo = moment(process.argv[4]);
if (!offenderId || !reportFrom || !reportTo) {
  console.log('***                                                                       ***');
  console.log('*   USAGE: npm run generate-trail-report 00/123456X {from date} {to date}   *');
  console.log('***                                                                       ***');

  process.exit();
}

// read in data
readJsonData(offenderId.replace('/', '-'))
  // transform into dataset
  .then(extractKeyEvents({ reportFrom, reportTo }))
  .then(generateTrailZoneList({ reportFrom, reportTo }))
  // return output
  .then(saveCsvData(`${offenderId.replace('/', '-')}-${reportFrom.format(SORTABLE_DATE_FORMAT)}-${reportTo.format(SORTABLE_DATE_FORMAT)}`))
  .catch((err) => console.error(err));
