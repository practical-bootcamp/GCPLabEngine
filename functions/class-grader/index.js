const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const fetch = require('node-fetch');
const { getCourseServiceAccountKeys } = require('./datastore');

const storage = new Storage();

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('class-grader', async cloudEvent => {
    // The Pub/Sub message is passed as the CloudEvent's data payload.
    const base64name = cloudEvent.data.message.data;

    const dataString = Buffer.from(base64name, 'base64').toString()

    console.log(dataString);
    const data = JSON.parse(dataString);
    console.log(data);
    console.log(data.summary);

    const students = await getCourseServiceAccountKeys(data.summary);

    const now = new Date();
    for (const student of students) {
        console.log(student);
        const url = process.env.GRADER_FUNCTION_URL + "?trace=" + student.email; // URL to send the request to
        const key = { ...student };
        delete key.email;
        delete key.course;
        const body = JSON.stringify(key);
        console.log(body);
        const externalRes = await fetch(url, {
            method: 'post',
            body: body,
            headers: { 'Content-Type': 'application/json' }
        });
        const content = await externalRes.text();
        console.log(content);
        const destFileName = `results/${student.email}/${now.toDateString()}test.xml`;
        await storage.bucket(process.env.TEST_RESULT_BUCKET).file(destFileName).save(content);
    }  
 
});


// (async () => {
//     const students = await getCourseServiceAccountKeys("IT114115");
//     console.log(students);
// })();

