RESTRICTED (when complete)
--------------------------

WITNESS STATEMENT
=================
*(Criminal Procedure Rules, r27.2; Criminal Justice Act 1967, s.9; Magistrates' Courts Act 1980, s.5B)*

**URN:** {{ urn }}

**Statement of:** Matthew David Smith
**Age if under 18:** Over 18
**Occupation:** HMPPS Digital Technical Architect

-----------

This statement (consisting of multiple sections each signed by me) is true to the best of my knowledge and belief and I make it knowing that, if it is tendered in evidence, I shall be liable to prosecution if I have wilfully stated anything in it, which I know to be false, or do not believe to be true.

**Signature:** ![Signature of Matthew David Smith]({{ signatureImagePath }})

**Date:** Tuesday, 2nd July 2018

-----------

I am the above named person and I work as a HMPPS Digital Technical Architect for the Ministry of Justice. I have been custodian of the Archived Electronic Monitoring Dataset for the last Month.

3M
--

In the UK 3M manufacture a range of products including coated abrasives, personal safety equipment, adhesive tapes, industrial microbiology products, drug delivery systems, high-performance coatings and has more than 55,000 products involved in many aspects of business worldwide.

3M has over 20 years’ experience serving offender management requirements worldwide in 40 countries and in the UK they provided offender management tracking devices to The Metropolitan Police, Cheshire, Northumbria, Avon & Somerset, Staffordshire, Warwickshire, West Mercia Police and Dorset Police.

They previously provided GPS tracking devices for tracking the movements of subjects in the form of electronic ankle bracelets which are worn by the subjects 24 hours a day.

Ankle bracelets
---------------

The ankle bracelets give off a signal, which can be picked up by a home beacon unit, which is install at the addresses, satellites and/or phone masts that then provide us with their exact location throughout the day. The GPS tracker determines its location based on transmissions from GPS satellites. The tracker then sends this information, via the cellular network, to the 3M Monitoring System.

The subjects tracker would record its location every 60 seconds.

Data transfer
-------------

The data was delivered to the MoJ Policy team by hand on two Compact Discs as an extract from the original system on Monday, 30th April 2018 at 16.00hrs. The compact discs were then handed to me on Thursday, 10th May 2018 at 10:00hrs. The Compact Discs have been stored securely so that when needed the original transfer data can be retrieved.

When a request for information is received from the Policy Team the data is copied off the original Compact Discs and processed by scripts into a single JSON dataset for the requested tracked subject. This derived Dataset is then further processed into the various submitted artefacts which present the data held for the requested period or periods of time.

Analysing the data
------------------

The scripts I have developed allow a user to retrospectively analyse the extracted dataset so that I can derive where the subject was while wearing the tag at any time during the period of data recording. Because these scripts work on archived data it is not possible for me to monitor any of the subjects when they are tagged, but I can review the data if asked to do so by the Policy Team.

The outputs created by the scripts can show a map of an area with an overlay plotting the travel of a tracker during a set period of time. The scripts can create a summary of any tracked point on the map. The summary will show me the exact time of the GPS hit and the status of the tracker. By status I mean that I can see whether the tracker or the case had been tampered with, how many satellites the tracker was picking up at the moment in time and whether the battery needed to be re-charged or not.

The Police also had the software to 'live-time' monitor, and retrospectively look at the movements of the subject but they were unable to record this onto a playable format.

---------------

Once a tag was fitted to a subject it could only be removed by physically cutting the fibre optic strap and this would then immediately record a violation in the dataset and then would have automatically alerted the police by sending an e-mail through the original system. The tag contains a battery which needs to be charged by the subject for at least 2 hours each day and a fully charged battery can last up to a maximum of 50 hours.

Each tag has a unique serial number that is allocated to each subject so we know which tag relates to which subject.

At December 28th 2016 3M produced the literature titled as “3M One-Piece GPS/RF Offender Tracking System”. This is what is used to inform potential customers about the GPS tagging system, this is freely available on request. This literature explains how the GPS system works and how it can be monitored;

------

On *Monday, 11th June 2018* I was requested by *Naomi Jeacock* of the Policy Team to check the locations, events and movements of a GPS Tracking device, serial number *00/137986J* during 1 time period:
1. between 00:00 on 1st June 2018 & 23:59 on 31st July 2017

On *Monday, 6th July 2018* I produced a spreadsheet of tagging data and trial report from the analysed data I received from the Data Transfer, I now produce this spreadsheet as my exhibit *MDS01|TaggingData|20170601000000-20170731000000* and this trail report as my exhibit *MDS02|TrailReport|20170601000000-20170731000000*.

{{#if strapTamperObserved }}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is an indication of Strap Tampering.
{{else }}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is no indication of Strap Tampering.
{{/if}}

{{#if bodyTamperObserved }}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is an indication of Body Tampering.
{{else }}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is no indication of Body Tampering.
{{/if}}

{{#if inclusionZoneViolationObserved }}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is an indication of an inclusion zone violation.
{{else}}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is no indication of an inclusion zone violation.
{{/if}}

{{#if exclusionZoneViolationObserved }}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is an indication of an exclusion zone violation.
{{else}}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is no indication of an exclusion zone violation.
{{/if}}

{{#if homeCurfewViolationObserved }}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is an indication of a home curfew violation.
{{else}}
During the time from 00:00 on 1st June 2018 to 23:59 on 31st July 2017 there is no indication of a home curfew violation.
{{/if}}

------

Route details
-------------

During the requested period (between 1st June 2018 - 00:00 and 31st July 2017 - 23:59).

The GPS Tracking device position data can be plotted as an overlay line on a map to show all locations that the tracker was located.

![GPS Tracking device position data plotted on to a map]({{ mapTilePath }})

The GPS Tracking device events data can indicate any violations that occurred.
