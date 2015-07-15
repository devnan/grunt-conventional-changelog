'use strict';
var chalk = require('chalk');
var concat = require('concat-stream');
var conventionalChangelog = require('conventional-changelog');
var plur = require('plur');
var promiseFromStreams = require('./lib/promise-from-streams.js');

var DESC = 'Generate a changelog from git metadata';

module.exports = function(grunt) {
  grunt.registerMultiTask('conventionalChangelog', DESC, function() {
    var streams = [];
    var tally = 0;

    var done = this.async();
    var files = this.files;
    var opts = this.options();

    var changelogOpts = opts.changelogOpts;
    var context = opts.context;
    var gitRawCommitsOpts = opts.gitRawCommitsOpts;
    var parserOpts = opts.parserOpts;
    var writerOpts = opts.writerOpts;

    function generate(src, dest) {
      return conventionalChangelog(changelogOpts, context, gitRawCommitsOpts, parserOpts, writerOpts)
        .pipe(concat(function(data) {
          if (changelogOpts.allBlocks) {
            grunt.file.write(dest, data);
          } else {
            var contents = grunt.file.read(src, {
              encoding: null
            });

            if (changelogOpts.append) {
              grunt.file.write(dest, Buffer.concat([contents, data]));
            } else {
              grunt.file.write(dest, Buffer.concat([data, contents]));
            }
          }

          tally++;
        }));
    }

    files.forEach(function(file) {
      var fileSrc = file.src;

      if (fileSrc) {
        if (file.dest) {
          if (fileSrc.length > 1) {
            grunt.log.warn('Only one src per dest is supported. The first file is used');
          }

          streams.push(generate(fileSrc[0], file.dest));
        } else {
          fileSrc.forEach(function(src) {
            streams.push(generate(src, src));
          });
        }
      } else {
        if (!changelogOpts.allBlocks) {
          grunt.fail.fatal('With `changelogOpts.allBlocks === false` you need to specify a `file.src`');
        }

        streams.push(generate(null, file.dest));
      }
    });

    promiseFromStreams(streams)
      .then(function() {
        if (tally) {
          grunt.log.write('Generated ' + chalk.cyan(tally.toString()) + plur(' file', tally));
        }
        grunt.log.writeln();

        done();
      }, done);
  });
};
