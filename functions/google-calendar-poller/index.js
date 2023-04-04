const functions = require('@google-cloud/functions-framework');
const { getNewEvents } = require('./calendar');
const { getEvent, saveEvent, getJustEndEvents, deleteEvent } = require('./datastore');
const { publishMessageWithAttributes } = require('./pubsub');

const icalUrl = process.env.ICALURL;
const EVENT_TOPIC_ID = process.env.EVENT_TOPIC_ID;

functions.http('google-calendar-poller', async (req, res) => {
  const newEvents = await getNewEvents(icalUrl);
  console.log(newEvents);
  for (const event of newEvents) {
    const savedEvent = await getEvent(event);
    if (savedEvent) {
      continue;
    }
    await saveEvent(event);
    await publishMessageWithAttributes(EVENT_TOPIC_ID, event, "START");
  }
  const justEndEvents = await getJustEndEvents();
  console.log(justEndEvents);
  for (const event of justEndEvents) {
    await publishMessageWithAttributes(EVENT_TOPIC_ID, event, "END");
    await deleteEvent(event);
  }
  res.send({ newEvents, justEndEvents });
});


// (async () => {
//   const newEvents = await getNewEvents(icalUrl);
//   console.log(newEvents);
//   for (const event of newEvents) {
//     const savedEvent = await getEvent(event);
//     if (savedEvent) {
//       continue;
//     }
//     await saveEvent(event);
//     await publishMessageWithAttributes(EVENT_TOPIC_ID, event, "START");
//   }
//   const justEndEvents = await getJustEndEvents();
//   console.log(justEndEvents);
//   for (const event of justEndEvents) {
//     await publishMessageWithAttributes(EVENT_TOPIC_ID, event, "END");
//     await deleteEvent(event);
//   }
// })();

