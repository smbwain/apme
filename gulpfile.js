const gulp = require('gulp');
// const babel = require('gulp-babel');
const ts = require('gulp-typescript');
const tsProject = ts.createProject('tsconfig.json');
const sourcemaps = require('gulp-sourcemaps');

gulp.task('build', function() {
    // return gulp.src('src/**/*.es6')
    //     .pipe(sourcemaps.init())
    //     .pipe(babel({
    //         presets: ['es2016-node5'],
    //         plugins: ['transform-object-rest-spread']
    //     }))
    //     .pipe(sourcemaps.write('.', {
    //         sourceRoot: '/src'
    //     }))
    //     .pipe(gulp.dest('./dist'));


    return gulp.src('src/**/*.ts')
        .pipe(sourcemaps.init())
        .pipe(tsProject())
        .pipe(sourcemaps.write('.', {
            sourceRoot: '/src'
        }))
        .pipe(gulp.dest('dist'));
});