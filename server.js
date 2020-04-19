require('events').EventEmitter.defaultMaxListeners = 50;
const express = require('express');
const app = express();
const http2 = require('spdy');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

const routes = require('./routes');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname)));
app.use('/', routes);

let options = {
    key: fs.readFileSync('./http2-node-server-push/server.key'),
    cert: fs.readFileSync('./http2-node-server-push/server.crt')
};
http2
    .createServer(options, app)
    .listen(3005, () => {
        console.log(`Server is listening on 3005, open https://localhost:3005 in your browser.`)
    });



