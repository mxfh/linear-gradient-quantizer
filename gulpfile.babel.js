import gulp  from 'gulp';
import loadPlugins from 'gulp-load-plugins';
import del  from 'del';
import path  from 'path';
import webpackStream from 'webpack-stream';
import manifest  from './package.json';

// Load all of our Gulp plugins
const $ = loadPlugins();

// Gather the library data from `package.json`
const config = manifest.babelBoilerplateOptions;
const mainFile = manifest.main;
const destinationFolder = path.dirname(mainFile);
const exportFileName = path.basename(mainFile, path.extname(mainFile));

function cleanDist(done) {
    del([destinationFolder]).then(() => done());
}

function build() {
    return gulp.src(path.join('src', config.entryFileName + '.js'))
        .pipe($.plumber())
        .pipe(webpackStream({
            output: {
                filename: exportFileName + '.js',
                libraryTarget: 'umd',
                library: config.mainVarName
            },
            module: {
                loaders: [
                    { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
                ]
            },
            devtool: 'source-map'
        }))
        .pipe(gulp.dest(destinationFolder))
        .pipe($.filter(['*', '!**/*.js.map']))
        .pipe($.rename(exportFileName + '.min.js'))
        .pipe($.sourcemaps.init({ loadMaps: true }))
        .pipe($.uglify())
        .pipe($.sourcemaps.write('./'))
        .pipe(gulp.dest(destinationFolder));
}


// Remove the built files
gulp.task('clean', cleanDist);

// Build two versions of the library
gulp.task('build', ['clean'], build);

// An alias of test
gulp.task('default', ['build']);
