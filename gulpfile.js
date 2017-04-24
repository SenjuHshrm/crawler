// Dependencies
var gulp = require('gulp');
var nodemon = require('gulp-nodemon');
var notify = require('gulp-notify');
var livereload = require('gulp-livereload');
var exec = require('child_process').exec;

function runCommand(command) {
  return function(callback) {
    exec(command, function(err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
      callback(err);
    });
  };
}

gulp.task('mongo', runCommand('mongo'));

gulp.task('start', function() {
    // listen for changes
    livereload.listen();
    // configure nodemon
    var stream = nodemon({
        // the script to run the app
        script: 'app.js',
        ext: 'js html pug',
        legacyWatch: 'true',
        env: {
          'NODE_ENV': 'development'
        }
    })

    stream
        .on('restart', function() {
            // when the app has restarted, run livereload.
            gulp.src('app.js')
                .pipe(livereload())
                .pipe(notify('Reloading page, please wait...'));
        })
				.on('crash', function() {
					gulp.src('app.js')
							.pipe(livereload())
							.pipe(notify('Application has crashed, please wait...'));
					stream.emit('restart', 10)
				})
})

gulp.task('default', [ 'mongo', 'start' ], function() {

});
