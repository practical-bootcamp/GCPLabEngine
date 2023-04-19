const { Datastore } = require('@google-cloud/datastore');

const datastore = new Datastore({ projectId: process.env.GCP_PROJECT || process.env.GCLOUD_PROJECT, });
const suffix = process.env.SUFFIX || '';


async function getCourseServiceAccountKeys(course) {
    const kind = 'course-service-account-key' + suffix;
    const query = datastore.createQuery(kind);
    query.filter('course', '=', course);
    const [tasks] = await datastore.runQuery(query);
    return tasks;
}

module.exports = { getCourseServiceAccountKeys };