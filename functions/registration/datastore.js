const { Datastore } = require('@google-cloud/datastore');

const datastore = new Datastore({ projectId: process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT, });
const suffix = process.env.SUFFIX || '';

async function saveKey(studentKey) {
    // The kind for the new entity
    const kind = 'course-service-account-key' + suffix;
    // The name/ID for the new entity
    const name = studentKey.course + "-" + studentKey.email;
    // The Cloud Datastore key for the new entity
    const key = datastore.key([kind, name]);
    // Prepares the new entity
    const task = {
        key: key,
        data: studentKey,
        excludeFromIndexes: ['private_key']
    };
    // Saves the entity
    await datastore.save(task);
    console.log(`Saved ${task.key.name}`);
}
module.exports = { saveKey };