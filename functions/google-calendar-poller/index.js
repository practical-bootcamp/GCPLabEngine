const functions = require('@google-cloud/functions-framework');
const { getEvents } = require('./calendar');
const { getEvent, saveEvent } = require('./datastore');

const icalUrl = process.env.ICALURL;

functions.http('http_handler', async (req, res) => {
  const events = await getEvents(icalUrl);  
  console.log(events);
  for (const event of events) {
    console.log("getEvent");
    const savedEvent = await getEvent(event);
    console.log("done getEvent");
    if (savedEvent) continue;
    await saveEvent(event);
  }
  res.send(events);
});


// (async () => {
//   const events = await getEvents(icalUrl);
//   console.log(events);
//   for (const event of events) {
//     const savedEvent = await getEvent(event);
//     if (savedEvent) continue;
//     await saveEvent(event);
//   }
// })();

