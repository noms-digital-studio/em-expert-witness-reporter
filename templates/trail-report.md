#TRAIL REPORT

Report Date: {{date}}

Offender Details: {{details.firstName}} {{details.lastName}} ({{offenderId}}), Offender Program: {{details.source.program_type}}

##Trailing Map:
![GPS Tracking device position data on a map]({{ mapTilePath }})

From: {{reportFrom}} To: {{reportTo}}  
Range Selected: Custom

##Zones:

##Events:
| # | Event Time | Message | Status | Vio. | H. |
| - | ---------- | ------- | ------ | ---- | -- |
{{#each events}}
| {{ event_id }} | {{ datetime }} | {{ description }} | {{ speed }} | {{ journeyDistance }} | {{ journeyTime }} |
{{/each}}
