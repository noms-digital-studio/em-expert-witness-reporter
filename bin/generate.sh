#!/bin/sh

OFFENDER_ID="$1";
REPORT_FROM="$2";
REPORT_TO="$3";

npm run extract-data "$OFFENDER_ID";
npm run generate-trail-report "$OFFENDER_ID" "$REPORT_FROM" "$REPORT_TO";
npm run generate-trail-zone-list "$OFFENDER_ID" "$REPORT_FROM" "$REPORT_TO";
npm run generate-expert-witness-statement "$OFFENDER_ID" "$REPORT_FROM" "$REPORT_TO";
