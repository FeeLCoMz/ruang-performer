// server.js
// Express server for API testing (CommonJS)
const express = require('express');
const bodyParser = require('body-parser');
const setlistsHandler = require('./setlists/index.js').default;
const songsHandler = require('./songs/index.js').default;
const eventsHandler = require('./events/index.js').default;
const bandsHandler = require('./bands/index.js').default;
const bandMembersHandler = require('./bands/members.js').default;

const app = express();
app.use(bodyParser.json());

// Unified events endpoint
app.all('/api/events/:type/:id?', (req, res) => eventsHandler(req, res));

app.all('/api/setlists', (req, res) => setlistsHandler(req, res));
app.all('/api/songs', (req, res) => songsHandler(req, res));
// Remove old gigs endpoint
// Route khusus untuk anggota band
app.all('/api/bands/:id/members/:userId?', (req, res) => {
	console.log('[SERVER] /api/bands/:id/members/:userId?', {
		method: req.method,
		path: req.path,
		params: req.params,
		query: req.query,
		body: req.body
	});
	bandMembersHandler(req, res);
});
app.all('/api/bands', (req, res) => {
	console.log('[SERVER] /api/bands', {
		method: req.method,
		path: req.path,
		params: req.params,
		query: req.query,
		body: req.body
	});
	bandsHandler(req, res);
});

module.exports = app;
