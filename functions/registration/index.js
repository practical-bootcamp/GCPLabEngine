const functions = require('@google-cloud/functions-framework');

functions.http('registration', async (req, res) => {

    res.send(req.baseUrl);
});