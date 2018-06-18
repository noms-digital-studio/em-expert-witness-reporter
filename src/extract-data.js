const Database = require('better-sqlite3');
const fs = require('fs');
const moment = require('moment');

const EXTRACT_DATE_FORMAT = 'MMM D YYYY h:mmA';
const FRAME_DATE_FORMAT = 'dddd   h:mmA';

const getFirst = (x) => (x || [])[0] || {};

const getDetails = (db, id) =>
  getFirst(db.prepare(
    `SELECT * FROM details WHERE offender_id='${id}'`
  ).all()
    .map(d => {
      d.creation_date = moment(d.creation_date, EXTRACT_DATE_FORMAT);
      d.program_start = moment(d.program_start, EXTRACT_DATE_FORMAT);

      return d;
    }));

const getPoints = (db, id) => {
  let points = db.prepare(
    `SELECT * FROM points WHERE offender_id='${id}'`
  ).all()
    .map(p => {
      p.point_time = moment(p.point_time, EXTRACT_DATE_FORMAT);

      return p;
    });

  points.sort((a,b) => {
    let diff = a.point_time.diff(b.point_time);

    return (diff === 0) ? a.position_id - b.position_id : diff;
  });

  return points;
};

let zone_types = [];
const getZones = (db, id) => {
  let temp = {};

  db.prepare(
    `SELECT * FROM zones WHERE offender_id='${id}'`
  ).all()
    .forEach(z => {
      z.version_start = moment(z.version_start, EXTRACT_DATE_FORMAT);
      z.version_end = moment(z.version_end, EXTRACT_DATE_FORMAT);
      z.lon = z.lon1;
      z.lat = z.lat1;

      delete z.lon1;
      delete z.lat1;
      delete z.lon2;
      delete z.lat2;
      delete z.lon3;
      delete z.lat3;
      delete z.lon4;
      delete z.lat4;

      if (z.zone_type === 'N') {
        if (!temp[z.zone_id + '_' + z.version_no]) {
          z.points = [{ latitude: z.lat, longitude: z.lon }];

          delete z.lat;
          delete z.lon;

          temp[z.zone_id + '_' + z.version_no] = z;
          return;
        }

        temp[z.zone_id + '_' + z.version_no].points.push({ latitude: z.lat, longitude: z.lon });
        return;
      }

      if (!temp[z.zone_id + '_' + z.version_no]) {
        temp[z.zone_id + '_' + z.version_no] = z;
        return;
      }

      console.log(z);
    });

  let zones = [];
  for (var zone_id in temp) {
    zones.push(temp[zone_id]);
  }

  zones.sort((a,b) => a.version_start.diff(b.version_start));

  return zones;
};

const getTimeFrames = (db, id) => {
  let timeFrames = db.prepare(
    `SELECT * FROM time_frames WHERE offender_id='${id}'`
  ).all()
    .map(t => {
      t.version_start = moment(t.version_start, EXTRACT_DATE_FORMAT);
      t.version_end = moment(t.version_end, EXTRACT_DATE_FORMAT);

      if (t.frame_type === 'Recurring') {
        let frameStartTime = moment(t.frame_start_time, FRAME_DATE_FORMAT);
        t.frame_start_time = {
          dayOfWeek: frameStartTime.format('E'),
          time: frameStartTime.format('HH:mm:ss'),
        };
        let frameEndTime = moment(t.frame_end_time, FRAME_DATE_FORMAT);
        t.frame_end_time = {
          dayOfWeek: frameEndTime.format('E'),
          time: frameEndTime.format('HH:mm:ss'),
        };
      }

      if (t.frame_type === 'Calendary') {
        t.frame_start_time = moment(t.frame_start_time, EXTRACT_DATE_FORMAT).format();
        t.frame_end_time = moment(t.frame_end_time, EXTRACT_DATE_FORMAT).format();
      }

      return t;
    });

  timeFrames.sort((a,b) => a.version_start.diff(b.version_start));

  return timeFrames;
};

const getEvents = (db, id) => {
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
    WHERE e.offender_id = '${id}'`
  ).all()
    .map(e => {
      e.event_time = moment(e.event_time, EXTRACT_DATE_FORMAT);
      e.upload_time = moment(e.upload_time, EXTRACT_DATE_FORMAT);
      e.action_time = moment(e.action_time, EXTRACT_DATE_FORMAT);
      e.warning_date = moment(e.warning_date, EXTRACT_DATE_FORMAT);

      return e;
    });

  events.sort((a,b) => a.event_time.diff(b.event_time));

  return events;
};

const getDB = dbPath =>
  Promise.resolve(new Database(dbPath, { readonly: true, fileMustExist: true }));

const getModel = id => db =>
  Promise.resolve({
    details: getDetails(db, id),
    points: getPoints(db, id),
    zones: getZones(db, id),
    timeFrames: getTimeFrames(db, id),
    events: getEvents(db, id),
  });

const saveJsonData = target => data =>
  new Promise((resolve, reject) => {
    let filePath = `./output/${target}.json`;
    console.log(new Date(), 'WRITING JSON:', filePath);

    fs.writeFile(filePath, JSON.stringify(data, null, '  '), 'utf8', () => {
      console.log(new Date(), 'CREATED JSON:', filePath);

      resolve(data);
    });
  });

let offenderId = process.argv[2];
if (!offenderId) {
  console.log('***                                    ***');
  console.log('*   USAGE: npm run generate 00/123456X   *');
  console.log('***                                    ***');

  process.exit();
}

getDB('./data/electronic_monitoring.db')
  .then(getModel(offenderId))
  .then(saveJsonData(`${offenderId.replace('/', '-')}`))
  .catch((err) => console.error(err));
