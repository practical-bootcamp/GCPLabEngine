const { Datastore } = require('@google-cloud/datastore');

const datastore = new Datastore({ projectId: process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT, });

const suffix = process.env.SUFFIX || '';

async function getEvent(event) {
    const kind = 'calendar-event' + suffix;
    const name = event.summary + "-" + event.start + "-" + event.end;
    const key = datastore.key([kind, name]);
    const [task] = await datastore.get(key);
    return task;
}

async function saveEvent(event) {
    // The kind for the new entity
    const kind = 'calendar-event' + suffix;
    // The name/ID for the new entity
    const name = event.summary + "-" + event.start + "-" + event.end;
    // The Cloud Datastore key for the new entity
    const key = datastore.key([kind, name]);
    // Prepares the new entity
    const task = {
        key: key,
        data: event,
    };
    // Saves the entity
    await datastore.save(task);
    console.log(`Saved ${task.key.name}: ${task.data.summary}`);
}

async function deleteEvent(event) {
    await datastore.delete(event[datastore.KEY]);
    console.log(`Deleted ${event[datastore.KEY]}`);
}

async function getJustEndEvents() {
    const kind = 'calendar-event' + suffix;
    const query = datastore.createQuery(kind);
    const start = new Date();
    start.setMinutes(start.getMinutes() - 1);
    const end = new Date();
    end.setMinutes(end.getMinutes() + 1);
    query.filter('end', '>', start);
    query.filter('end', '<', end);
    const [tasks] = await datastore.runQuery(query);
    return tasks;
}

module.exports = { getEvent, saveEvent, getJustEndEvents, deleteEvent };