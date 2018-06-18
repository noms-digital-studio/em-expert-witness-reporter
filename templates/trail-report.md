TRAIL REPORT
============
**Report Date:** {{reportDate}}

**Offender Details:** {{details.firstName}} {{details.lastName}} ({{details.offenderId}})
**Offender Program:** {{details.program.type}}

Trailing Map
------------
![GPS Tracking device position data on a map]({{ mapTilePath }})

**From:** {{reportFromDate}} **To:** {{reportToDate}}  
**Range Selected:** Custom

Zones
-----
| # | Name | Limitation | Type | Grace Time | Curfew | BLP |
| - | ---- | ---------- | ---- | ---------- | ------ | --- |
{{#each zonesReport}}
| {{ id }} | {{ name }} | {{ limitation }} | {{ type }} | {{ graceTime }} | {{ curfew }} | {{ blp }} |
{{/each}}

Events
------
| # | Event Time | Message | Status | Vio. | H. |
| - | ---------- | ------- | ------ | ---- | -- |
{{#each eventsReport}}
| {{ id }} | {{ datetime }} | {{ message }} | {{ status }} | {{ violation }} | {{ home }} |
{{/each}}
