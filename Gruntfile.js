/*

Ukoly nad assety: kombilace CSS, JS…
====================================

1) Kopirovani souboru
2) CSS: LESS, PostCSS
3) JS: spojeni do jednoho a minifikace
4) Workflow: BrowserSync, watch
5) Alias tasky: css, js, default

*/

module.exports = function(grunt) {

  "use strict";

  // zjistujeme cas behu tasku
  //require('time-grunt')(grunt);

  // jit-grunt pro zrychleni nacitani gruntu a behu tasku
  //require('jit-grunt')(grunt);

  require('load-grunt-tasks')(grunt);

  // Nastaveni tasku
  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    // 1) Kopirovani souboru
    // ---------------------    

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
    }
  });

  // 5) Alias tasky
  // ==============

  //grunt.registerTask('css', ['sass', 'postcss', 'cssmin']);
  //grunt.registerTask('js', ['browserify', 'uglify']);
  grunt.registerTask('default', ['babel']);

};
