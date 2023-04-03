const functions = require('@google-cloud/functions-framework');
const fs = require('fs');
const path = require('path');
const { saveKey } = require('./datastore');

functions.http('registration', async (req, res) => {
    if (req.method === 'GET') {
        res.status(200).send(fs.readFileSync(path.join(__dirname, "html", "registrationForm.html"), 'utf8'));
        return;
    } else if (req.method === 'POST') {
        const data = req.body;
        const spakey = JSON.parse(data.spakey);
        spakey.email = data.email;
        spakey.course = data.course;        
        await saveKey(spakey);
        res.status(200).send("Your key has been saved!");
        return;
    } else {
        res.status(405).send("Method not allowed");
        return;
    }

});