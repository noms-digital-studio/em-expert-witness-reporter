const fs = require('fs');
const moment = require('moment');
const MDtoPDF = require('markdown-pdf');
const Handlebars = require('handlebars');
const request = require('superagent');

const helpers = require('./helpers');

const SORTABLE_DATE_FORMAT = 'YYYYMMDDHHmmss';
const REPORT_DATE_FORMAT = 'DD MMM YYYY';
const REPORT_TIME_FORMAT = 'HH:mm';
const EVENT_DATE_FORMAT = 'DD/MM/YYYY HH:mm';

const INCLUDE_IMAGES = true;

const extractSubjectDetails = opts => model => {
  model.details = {
    offenderId: model.details.offender_id,
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
  };

  return model;
}

const extractZoneList = opts => model => {
  let temp = {};
  model.zones.forEach(x => {
    if (
      (temp[x.zone_name] && x.version_no > temp[x.zone_name].version_no) ||
      moment(x.version_start).diff(moment(opts.reportTo)) > 0 ||
      moment(x.version_end).diff(moment(opts.reportFrom)) < 0
    ) {
      return;
    }

    temp[x.zone_name] = x;
  });

  model.zonesReport = [];
  for (var id in temp) {
    let x = temp[id];

    model.zonesReport.push({
      id: x.zone_id,
      name: x.zone_name,
      limitation: x.zone_rule,
      type: x.zone_type,
      graceTime: x.grace_time,
      curfew: model.timeFrames.filter(z => z.zone_id === x.zone_id).length > 0 ? 'V' : undefined,
      blp: x.blp                  // TODO: what is BLP?
    });
  }

  return model;
};

const extractEventList = opts => model => {
  let temp = {};
  model.events.forEach(x => {
    if (
      moment(x.event_time).diff(moment(opts.reportTo)) >= 0 ||
      moment(x.event_time).diff(moment(opts.reportFrom)) <= 0
    ) {
      return;
    }

    temp[x.event_id] = x;
  });

  model.eventsReport = [];
  for (var id in temp) {
    let x = temp[id];

    model.eventsReport.push({
      id: x.event_id,
      datetime: moment(x.event_time).format(EVENT_DATE_FORMAT),
      message: x.description,
      status: x.action_status,
      violation: undefined, // TODO: how do we determine violation?
      home: undefined, // TODO: what is H.
    });
  }

  return model;
};

const addReportDetails = opts => model => {
  model.reportDate = moment().format(REPORT_DATE_FORMAT);
  model.reportFromDate = opts.reportFrom.format(REPORT_DATE_FORMAT);
  model.reportFromTime = opts.reportFrom.format(REPORT_TIME_FORMAT);
  model.reportToDate = opts.reportTo.format(REPORT_DATE_FORMAT);
  model.reportToTime = opts.reportTo.format(REPORT_TIME_FORMAT);

  return model;
};

const generateTrailReport = template => model =>
  new Promise((resolve, reject) => {
    let filePath = `./templates/${template}.md`
    console.log(new Date(), 'READING TEMPLATE:', filePath);

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }

      var template = Handlebars.compile(data);

      resolve(template(model));
    });
  });

const retrieveMapImagery = fileName => model =>
  new Promise((resolve, reject) => {
    if (!INCLUDE_IMAGES) {
      return resolve(model);
    }

    let filePath = `.temp/${fileName}.png`;

    const stream = fs.createWriteStream(filePath);
    console.log(new Date(), 'WRITING IMAGE:', filePath);

    stream.on('finish', () => {
      model.mapTilePath = filePath;

      console.log(new Date(), 'CREATED IMAGE:', filePath);

      resolve(model);
    });

    stream.on('error', err => reject(err));

    console.log(new Date(), 'REQUESTING IMAGE DATA:', filePath);
    request.get(model.mapTileUrl).pipe(stream);
  });

const readJsonData = source =>
  new Promise((resolve, reject) => {
    let filePath = `./output/${source}.json`;
    console.log(new Date(), 'READING JSON:', filePath);

    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        return reject(err);
      }

      let json = JSON.parse(data);

      resolve(json);
    });
  });

const saveJsonData = target => data =>
  new Promise((resolve, reject) => {
    let filePath = `./output/${target}.json`;
    console.log(new Date(), 'WRITING JSON:', filePath);

    fs.writeFile(filePath, JSON.stringify(data, null, '  '), 'utf8', err => {
      if (err) {
        return reject(err);
      }

      console.log(new Date(), 'CREATED JSON:', filePath);

      resolve(data);
    });
  });

const savePdfOutput = target => data =>
  new Promise((resolve, reject) => {
    let filePath = `./output/${target}.pdf`;
    console.log(new Date(), 'WRITING PDF:', filePath);

    MDtoPDF({
      paperFormat: 'A4',
      paperOrientation: 'portrait',
      cssPath: './templates/pdf.css',
      runningsPath: './templates/runnings.js',
    })
      .from.string(data).to(filePath, () => {
        console.log(new Date(), 'CREATED PDF:', filePath);
        resolve(data);
      });
  });

let offenderId = process.argv[2];
let reportFrom = moment(process.argv[3]);
let reportTo = moment(process.argv[4]);
if (!offenderId || !reportFrom || !reportTo) {
  console.log('***                                                                                   ***');
  console.log('*   USAGE: npm run generate-expert-witness-statement 00/123456X {from date} {to date}   *');
  console.log('***                                                                                   ***');

  process.exit();
}

const includeSignatureImageUrl = opts => model => {
  model.signatureImagePath = opts.path;

  return model;
}

// read in data
readJsonData(offenderId.replace('/', '-'))
  .then(addReportDetails({ reportFrom, reportTo }))
  // transform into dataset
  .then(helpers.extractKeyEvents({ reportFrom, reportTo }))
  .then(extractSubjectDetails({ /* options */ }))
  .then(helpers.extractTrailPoints({ reportFrom, reportTo }))
  .then(helpers.extractMapBounds({ /* options */ }))
  .then(helpers.generateMapTileUrl({ /* options */ }))
  .then(includeSignatureImageUrl({ path: './templates/signatureImage.jpg' }))
  // retrieve imagery
  .then(retrieveMapImagery(`${offenderId.replace('/', '-')}-${reportFrom.format(SORTABLE_DATE_FORMAT)}-${reportTo.format(SORTABLE_DATE_FORMAT)}`))
  .then(saveJsonData(`${offenderId.replace('/', '-')}|expert-witness-statement|${reportFrom.format(SORTABLE_DATE_FORMAT)}-${reportTo.format(SORTABLE_DATE_FORMAT)}`))
  // apply template transform
  .then(generateTrailReport('expert-witness-statement'))
  // return output
  .then(savePdfOutput(`ExpertWitnessStatement|${reportFrom.format(SORTABLE_DATE_FORMAT)}-${reportTo.format(SORTABLE_DATE_FORMAT)}`/*`${offenderId.replace('/', '-')}|expert-witness-statement|${reportFrom.format(SORTABLE_DATE_FORMAT)}-${reportTo.format(SORTABLE_DATE_FORMAT)}`*/))
  .catch((err) => console.error(err));
