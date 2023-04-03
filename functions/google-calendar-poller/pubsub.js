const { PubSub } = require('@google-cloud/pubsub');
const pubSubClient = new PubSub();

async function publishMessageWithAttributes(topic, event, eventType) {
    const messageId = await pubSubClient.topic(topic).publishMessage({
        data: Buffer.from(JSON.stringify(event)), attributes: {
            summery: event.summary,
            recurrence: "" + event.recurrence,
            location: event.location,
            type: eventType
        }
    });
    console.log(`Message ${messageId} published.`);
}

module.exports = { publishMessageWithAttributes };