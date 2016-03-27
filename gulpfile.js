var gulp = require('gulp'),
  postcss = require('gulp-postcss'),
  sass = require('gulp-sass'),
  autoprefixer = require('autoprefixer'),
  cssnano = require('cssnano'),
  browserSync = require('browser-sync').create(),
  imagmin = require ('gulp-imagemin'),
  concat = require('gulp-concat'),
  uglify = require('gulp-uglify'),
  gutil = require('gulp-util'),
  runSequence = require('run-sequence'),
  size = require('gulp-size'),
  run = require('gulp-run'),
  del = require('del'),
  svgSprite = require('gulp-svg-sprite'),
  plumber = require('gulp-plumber');

var appDir = './_app';
var jekyllDir = './';
var siteDir = './_site';

var paths = {
  css: {
    app: appDir + '/_sass/*.scss'
  },
  image: {
    app: appDir + '/assets/**/*.{jpg,jpeg,png,gif}',
    jekyll: jekyllDir + '/assets/',
    site: siteDir + '/assets'
  },
  svg: {
    app: appDir + '/assets/**/*.svg',
    jekyll: jekyllDir + '/_includes',
    sprite: 'svg.html'
  },
  js: {
    app: appDir + '/js/**/*.js',
    jekyll: jekyllDir + '/js',
    site: jekyllDir + '/js'
  }
}

var svgConfig                  = {
  dest: "",
  mode                    : {
      inline              : true,
      symbol              : {
        dest: "",
        sprite: paths.svg.sprite
      }
  }
};


var config = {
  drafts:     !!gutil.env.drafts      // pass --drafts flag to serve drafts
};

gulp.task('build:styles', function() {
  var processors = [
    autoprefixer({browsers: ['last 1 version']}),
    cssnano
];
return gulp.src(paths.css.app)
    .pipe(sass().on('error', sass.logError))
    .pipe(postcss(processors))
    .pipe(gulp.dest(jekyllDir))
    .pipe(gulp.dest(siteDir))
    .pipe(browserSync.stream())
    .on('error', gutil.log);
});

gulp.task('build:images', function() {
  return gulp.src(paths.image.app)
    .pipe(imagmin())
    .pipe(gulp.dest(paths.image.jekyll))
    .pipe(gulp.dest(paths.image.site))
    .pipe(browserSync.stream())
    .pipe(size({showFiles: true}))
    .on('error', gutil.log);
});

gulp.task('build:svg', function(){
  return gulp.src(paths.svg.app)
    .pipe(plumber())
    .pipe(svgSprite(svgConfig)).on('error', function(error){ console.log(error); })
    .pipe(gulp.dest(paths.svg.jekyll));
});

gulp.task('build:scripts', function() {
  return gulp.src(paths.js.app)
    .pipe(concat('main.js'))
    .pipe(uglify())
    .pipe(gulp.dest(paths.js.jekyll))
    .pipe(gulp.dest(paths.js.site))
    .on('error', gutil.log);
});

gulp.task('build:jekyll', function() {
  var shellCommand = 'jekyll build --config _config.yml,_app/localhost_config.yml';
  if (config.drafts) { shellCommand += ' --drafts'; };

  return gulp.src(jekyllDir)
    .pipe(run(shellCommand))
    .on('error', gutil.log);
});

gulp.task('build:clean', function (){
  del([paths.image.jekyll, paths.image.site, jekyllDir + paths.svg.sprite])
});

gulp.task('build', function(cb) {
  runSequence(['build:svg', 'build:scripts', 'build:images', 'build:styles'],
              'build:jekyll',
              cb);
});

gulp.task('production', function(cb){
  runSequence(['build:clean', 'build'],
              'build:jekyll',
              cb);
});

gulp.task('build:jekyll:watch', ['build:jekyll'], function(cb) {
  browserSync.reload();
  cb();
});

gulp.task('build:scripts:watch', ['build:scripts'], function(cb) {
  browserSync.reload();
  cb();
});

gulp.task('serve', ['build'], function() {

  browserSync.init({
    server: siteDir,
    ghostMode: false, // do not mirror clicks, reloads, etc. (performance optimization)
    logFileChanges: true,
    open: false       // do not open the browser (annoying)
  });

  // Watch site settings
  gulp.watch(['_config.yml', '_app/localhost_config.yml'], ['build:jekyll:watch']);

  // Watch app .scss files, changes are piped to browserSync
  gulp.watch('_app/_sass/**/*.scss', ['build:styles']);

  // Watch app .js files
  gulp.watch('_app/js/**/*.js', ['build:scripts:watch']);

  // Watch Jekyll posts
  gulp.watch('_posts/**/*.+(md|markdown|MD)', ['build:jekyll:watch']);

  // Watch Jekyll drafts if --drafts flag was passed
  if (config.drafts) {
    gulp.watch('_drafts/*.+(md|markdown|MD)', ['build:jekyll:watch']);
  }

  // Watch Jekyll html files
  gulp.watch(['**/*.html', '!_site/**/*.*'], ['build:jekyll:watch']);

  // Watch Jekyll RSS feed XML file
  gulp.watch('feed.xml', ['build:jekyll:watch']);

  // Watch Jekyll data files
  gulp.watch('_data/**.*+(yml|yaml|csv|json)', ['build:jekyll:watch']);

  // Watch Jekyll favicon.ico
  gulp.watch('favicon.ico', ['build:jekyll:watch']);
});
