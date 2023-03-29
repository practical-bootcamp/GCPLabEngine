const functions = require('@google-cloud/functions-framework');
const { getEvents } = require('./calendar');
const { getEvent, saveEvent } = require('./datastore');

const icalUrl = process.env.ICALURL ?? "https://calendar.google.com/calendar/ical/spe8ehlqjkv8hd7mdjs3d2g80c%40group.calendar.google.com/public/basic.ics";

functions.http('http_handler', async (req, res) => {
  const events = await getEvents(icalUrl);  
  for (const event of events) {
    const savedEvent = await getEvent(event);
    if (savedEvent) continue;
    await saveEvent(event);
  }
  res.send(events);
});


(async () => {
  const events = await getEvents(icalUrl);
  console.log(events);
  for (const event of events) {
    const savedEvent = await getEvent(event);
    if (savedEvent) continue;
    await saveEvent(event);
  }
})();

