const path = require('path');
const express = require('express');
var busboy = require('connect-busboy');
const layout = require('express-layout');
const bodyParser = require('body-parser');

const routes = require('./routes');
const app = express();

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

const middlewares = [
  layout(),
  express.static(path.join(__dirname, 'public')),
  bodyParser.urlencoded({ extended: true }),
];
app.use(middlewares);

app.use(busboy());

app.use('/', routes);

app.use((req, res, next) => {
  res.status(404).send("Sorry can't find that!");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, err => {
    if(err) throw err;
    console.log("%c Server running", "color: green");
});

server.timeout = 240000;