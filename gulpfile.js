var gulp = require('gulp'),
    annotate = require('gulp-ng-annotate'),
    rename = require('gulp-rename'),
    merge = require('merge-stream'),
    beautify = require('gulp-jsbeautifier'),
    uglify = require('gulp-uglify');

var globs = {
    styles: 'assets/styles/*.scss',
    js: 'assets/js/*.js',
    main: 'dist/'
};

gulp.task('build', function () {
    var scss = gulp.src(globs.styles)
        .pipe(gulp.dest(globs.main))
    var js = gulp.src(globs.js)
        .pipe(annotate())
        .pipe(beautify())
        .pipe(gulp.dest(globs.main))
        .pipe(uglify())
        .pipe(rename('fg-modal.min.js'))
        .pipe(gulp.dest(globs.main));
    return merge(scss, js);
});
