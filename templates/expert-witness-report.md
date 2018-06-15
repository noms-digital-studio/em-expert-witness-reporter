WITNESS STATEMENT
=================

*(Criminal Procedure Rules, r27.2; Criminal Justice Act 1967, s.9; Magistrates' Courts Act 1980, s.5B)*

**URN: {{ urn }}**

This statement (consisting of 6 page(s) each signed by me) is true to the best of my knowledge and belief and I make it knowing that, if it is tendered in evidence, I shall be liable to prosecution if I have wilfully stated anything in it, which I know to be false, or do not believe to be true.

----------

Signature:

Date: {{date}}

-----------

I am the above named person and I work as a Technical Business development manager for 3M which is a large multinational company with over 88,000 employees worldwide and 3000 employees in the UK.I am working with Electronic Monitoring for the last 13 years.

In the UK 3M manufacture a range of products including coated abrasives, personal safety equipment, adhesive tapes, industrial microbiology products, drug delivery systems, high-performance coatings and has more than 55,000 products involved in many aspects of business worldwide.

3M has over 20 years’ experience serving offender management requirements worldwide in 40 countries and in the UK we provided offender management tracking devices to The Metropolitan Police, Cheshire, Northumbria, Avon & Somerset, Staffordshire, Warwickshire, West Mercia Police and Dorset Police.

We currently provide GPS tracking devices to *{{ policeForce }}* for tracking the movements of subjects in the form of electronic ankle bracelets which are worn by the subjects 24 hours a day.

The ankle bracelets give off a signal, which can be picked up by a home beacon unit, which is install at the addresses, satellites and/or phone masts that then provide us with their exact location throughout the day. The GPS tracker determines its location based on transmissions from GPS satellites. The tracker then sends this information, via the cellular network, to the 3M Monitoring System.

The subject tracker recording its location every 60 seconds.

The software we use can then be looked at retrospectively so that we can see where the subject has been while wearing the tag at any time during the past three years. We do not monitor any of the subjects when they are tagged but we will review the date if asked to do so by the Police.

Our software will show a map of the area with green arrows appearing on the map to show the location of the tracker and the person wearing it. While I run the software I can speed up or slow down the footage so I can see the movements of the subject in a form of a trail. If I move my mouse curser over any of the arrows and click on them I can then see a summary of that point on the map. The summary will show me the exact time of the GPS hit and the status of the tracker. By status I mean that I can see whether the tracker or the case has been tampered, with, how many satellites the tracker is picking up at the moment in time and whether the battery needs to be re-charged or not.

The Police also have the software to 'live-time' monitor, and retrospectively look at the movements of the subject but they are unable to record this onto a playable format.

Once a tag is fitted to a subject it can only be removed by physically cutting the fibre optic strap and this would then alert us immediately by a violation signal to the system and then will automatically alert the police by sending an e-mail through our system. The tag contains a battery which needs to be charged by the subject for at least 2 hours each day and fully charged battery can last up to a maximum of 50 hours.

Each tag has a unique serial number that is allocated to each subject so we know which tag relates to which person.

At December 28th 2016 I produced the literature titled as “3M One-Piece GPS/RF Offender Tracking System”

I exhibit this as AM/1. This is what we use to inform potential customers of how our GPS tagging system, this is freely available on request.

This literature explains how the GPS system works and how it can be monitored;

At *{{ sentDate }}* I sent this exhibit to *{{ policeOfficer }}*.

------

On Friday July 1st 2016 I’ve been requested by *{{ policeOfficer }}* of *{{ policeForce }}* to check the locations, events and movements of a GPS Tracking device, serial number *{{ serialNumber }}* during 1 time period:
1. between {{ reportStartTime }} on {{ reportStartDate }} & {{ reportEndTime }} on {{ reportEndDate }}

{{#unless strapTamperObserved }}
During the time from {{ reportStartTime }} on {{ reportStartDate }} to {{ reportEndTime }} on {{ reportEndDate }} there is no indication of Strap Tampering.
{{/unless}}

------

Route details
-------------

On the 1st time period requested to check (between {{ reportStartDate }} - {{ reportStartTime }} & {{ reportEndDate }} - {{ reportEndTime }})

The GPS Tracking device position data show that the subject was in or within the boundary of location: 11 XX Rd. XX  XX from XX on XX until XX on XX.

![GPS Tracking device position data on a map]({{ mapTilePath }})

| location | distance | time | speed | journey distance | journey time |
| -------- | -------- | ---- | ----- | ---------------- | ------------ |
{{#each routeDetails}}
| {{ location }} | {{ distanceSinceLastUpdate }} | {{ timeSinceLastUpdate }} | {{ speed }} | {{ journeyDistance }} | {{ journeyTime }} |
{{/each}}
