// server.js
// Express server for API testing (CommonJS)
const express = require('express');
const bodyParser = require('body-parser');
const setlistsHandler = require('./setlists/index.js').default;
const songsHandler = require('./songs/index.js').default;
const gigsHandler = require('./gigs/index.js').default;
const bandsHandler = require('./bands/index.js').default;

const app = express();
app.use(bodyParser.json());

const gigsIdHandler = require('./gigs/[id].js').default;
app.all('/api/gigs/:id', (req, res) => gigsIdHandler(req, res));

app.all('/api/setlists', (req, res) => setlistsHandler(req, res));
app.all('/api/songs', (req, res) => songsHandler(req, res));
app.all('/api/gigs', (req, res) => gigsHandler(req, res));
app.all('/api/bands', (req, res) => bandsHandler(req, res));

module.exports = app;
