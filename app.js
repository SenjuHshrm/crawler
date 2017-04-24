/**
 * Module dependencies.
 */
const express = require('express');
const compression = require('compression');
const session = require('express-session');
const bodyParser = require('body-parser');
const logger = require('morgan');
const chalk = require('chalk');
const errorHandler = require('errorhandler');
const lusca = require('lusca');
const dotenv = require('dotenv');
const MongoStore = require('connect-mongo')(session);
const flash = require('express-flash');
const path = require('path');
const mongoose = require('mongoose');
const expressValidator = require('express-validator');
const expressStatusMonitor = require('express-status-monitor');
const sass = require('node-sass-middleware');
const multer = require('multer');

/**
 * Custom module dependencies.
 */
const osmosis = require('osmosis');
const Xray = require('x-ray');

const upload = multer({
    dest: path.join(__dirname, 'uploads')
});

/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.load({
    path: '.env.example'
});

/**
 * Controllers (route handlers).
 */
const homeController = require('./controllers/home');

/**
 * App-specific Controllers (route handlers).
 */
const USController = require('./controllers/US_Crawler');
const UKController = require('./controllers/UK_Crawler');

/**
 * Create Express server.
 */
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

/**
 * Connect to MongoDB.
 */
mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGOLAB_URI || process.env.MONGODB_URI);
mongoose.connection.on('error', () => {
    console.log('%s MongoDB connection error. Please make sure MongoDB is running.', chalk.red('✗'));
    process.exit();
});

/**
 * Express configuration.
 */
app.set('port', process.env.PORT);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(expressStatusMonitor());
app.use(compression());
app.use(sass({
    src: path.join(__dirname, 'public'),
    dest: path.join(__dirname, 'public')
}));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(expressValidator());

app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: 31557600000
}));

/**
 * Primary app routes.
 */
app.get('/', homeController.index);

/**
 * Crawler routes.
 */
app.route('/US-Crawler')
    .get(USController.getCrawler)
app.route('/search-US')
    .get(USController.getData)
    .post(USController.postData)

app.route('/UK-Crawler')
    .get(UKController.getCrawler)
app.route('/search-UK')
    .get(UKController.getData)
    .post(UKController.postData)

/**
 * Error Handler.
 */
app.use(errorHandler());

/**
 * Start Express server.
 */
server.listen(app.get('port'), () => {
    console.log('%s App is running at http://localhost:%d in %s mode', chalk.green('✓'), app.get('port'), app.get('env')); 
    console.log('  Press CTRL-C to stop\n');
});

io.on('connection', (socket) => {
    socket.emit('greet', {
        hello: 'Hey there browser!'
    });
    socket.on('respond', (data) => {
    });
    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
});

module.exports = app;
