const functions = require('@google-cloud/functions-framework');
const { Storage } = require('@google-cloud/storage');
const fetch = require('node-fetch');
const { getCourseServiceAccountKeys } = require('./datastore');

const storage = new Storage();

const pad = (v) => {
    return (v < 10) ? '0' + v : v
}

const getDateString = (d) => {
    let year = d.getFullYear()
    let month = pad(d.getMonth() + 1)
    let day = pad(d.getDate())
    let hour = pad(d.getHours())
    let min = pad(d.getMinutes())
    let sec = pad(d.getSeconds())
    //YYYY-MM-DD hh:mm:ss
    return year + "-" + month + "-" + day + "-" + hour + "-" + min + "-" + sec;
}

// Register a CloudEvent callback with the Functions Framework that will
// be executed when the Pub/Sub trigger topic receives a message.
functions.cloudEvent('class-grader', async cloudEvent => {
    // The Pub/Sub message is passed as the CloudEvent's data payload.
    const base64name = cloudEvent.data.message.data;

    const dataString = Buffer.from(base64name, 'base64').toString();
    const data = JSON.parse(dataString);
    console.log(data);

    const students = await getCourseServiceAccountKeys(data.summary);

    const now = new Date();


    // for (const student of students) {
    //     await getTestResult(student);
    // }

    async function getTestResult(student) {
        // console.log(student);
        try {
            const url = process.env.GRADER_FUNCTION_URL + "?trace=" + student.email; // URL to send the request to
            const key = { ...student };
            delete key.email;
            delete key.course;
            const body = JSON.stringify(key);
            const externalRes = await fetch(url, {
                method: 'post',
                body: body,
                headers: { 'Content-Type': 'application/json' }
            });
            const content = await externalRes.text();
            const destFileName = `${data.summary}/${student.email}/${getDateString(now)}.xml`;
            await storage.bucket(process.env.TEST_RESULT_BUCKET).file(destFileName).save(content);
            return { email: student.email, result: "OK" };
        } catch (e) {
            console.log(e);
            return { email: student.email, result: "ERROR" };
        }
    }
    const results = await Promise.all(students.map(getTestResult));
    console.log(results);
});


// (async () => {
//     const students = await getCourseServiceAccountKeys("IT114115");
//     console.log(students);
// })();

