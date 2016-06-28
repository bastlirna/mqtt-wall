module.exports = function(grunt) {

  require('time-grunt')(grunt);
  require('jit-grunt')(grunt);

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    // copy static files
    copy: {
      main: {
        files: [
          {
            expand: true, 
            cwd: 'src/',
            src: '*.html', 
            dest: 'dist/'
          }
        ]
      }
    },

    // compile less files
    less: {
      default: {
        files: {
          'dist/style.css': 'src/style.less'
        },
        options: {
          sourceMap: true,
          sourceMapFilename: 'dist/style.css.map',
          sourceMapURL: 'style.css.map',
          sourceMapRootpath: './'
        }
      }
    },    

    // compile babel JS files
    babel: {
        options: {
            sourceMap: true,
            presets: ['es2015']
        },
        dist: {
            files: {
                'dist/wall.js': 'src/wall.js'
            }
        }
    },

    // watch changes
    watch: {
      less: {
        files: 'src/**/*.less',
        tasks: ['less']
      },
      js: {
        files: 'src/**/*.js',
        tasks: ['babel']
      },
      html: {
        files: 'src/**/*.html',
        tasks: ['copy']
      }
    },

  });

  grunt.registerTask('default', ['copy', 'less', 'babel', 'watch']);
};
