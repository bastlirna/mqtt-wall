module.exports = function (grunt) {

  require('time-grunt')(grunt);
  require('jit-grunt')(grunt);

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    // get GIT hash 
    githash: {
      main: {
        options: {},
      }
    },

    // minify js file
    uglify: {
      options: {
        mangle: {
          except: ['$', 'jQuery', 'config']
        },
        ASCIIOnly: true,
        report: 'min',
        beautify: false,
        compress: true
      },
      build: {
        src: 'dist/wall.js',
        dest: 'dist/wall.js'
      }
    },

    // copy static files
    copy: {
      main: {
        files: [
          {
            expand: true,
            cwd: 'src/',
            src: '*.html',
            dest: 'dist/'
          },
          {
            expand: true,
            cwd: 'src/style/',
            src: ['favicon/**.png', 'favicon/**.ico', 'favicon/**.json', 'favicon/**.xml'],
            flatten: true,
            dest: 'dist/style/'
          }
        ]
      }
    },

    // add version info to index.html
    'string-replace': {
      inline: {
        files: {
          'dist/index.html': 'src/index.html',
        },
        options: {
          replacements: [
            {
              pattern: '$VERSION$',
              replacement: '<%= pkg.version %>'
            }
          ]
        }
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
          sourceMapFileInline: true
        }
      }
    },
    
    // minify css file
    postcss: {
      options: {
        processors: [
          require('cssnano')() // minify the result
        ]
      },
      style: {
        src: 'dist/style.css',
        dest: 'dist/style.css'
      }
    },

    // compile babel JS files
    /*
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
    */

    browserify: {
      dist: {
        options: {
          browserifyOptions: {
            debug: true
          },
          transform: [["babelify", { presets: ["es2015"] }]]
        },
        files: {
          'dist/wall.js': 'src/js/wall.js'
        }
      }
    },

    // publish package
    compress: {
      main: {
        options: {
          archive: 'pub/wall-<%= pkg.version %>-<%= githash.main.short %>.zip'
        },
        files: [
          {
            cwd: 'dist/',
            src: ['**'],
            dest: 'wall-<%= pkg.version %>/',
            expand: true
          }
        ]
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
        tasks: ['browserify']
      },
      html: {
        files: 'src/**/*.html',
        tasks: ['copy', 'string-replace']
      }
    },

    // Browser Sync (including watch)
    browserSync: {
      dev: {
        bsFiles: {
          src: ['dist/**.css', 'dist/**.js', 'dist/*.html']
        },
        options: {
          watchTask: true,
          server: {
            baseDir: "./dist"
          }
        }
      }
    },
    
    // clean up dist dir
    clean: {
      dist: ['dist/']
		}

  });

  grunt.loadNpmTasks('grunt-githash');

  grunt.registerTask('build', ['copy', 'less', 'browserify', 'string-replace']);
  grunt.registerTask('dist', ['build', 'uglify', 'postcss']);
  grunt.registerTask('pub', ['dist', 'githash', 'compress']);
  grunt.registerTask('default', ['build', 'watch']);
  grunt.registerTask('serve', ['build', 'browserSync', 'watch']);
};
