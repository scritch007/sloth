module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      dist: {
        src: ['src/sloth.js', 'src/component.js', 'src/service.js', 'src/router.js'],
        dest: 'dist/sloth.js',
      }
    },
    uglify: {
      dist: {
        files: {
          'dist/sloth.min.js': ['dist/sloth.js']
        }
      }
    },
    watch:{
      scripts: {
        files: ['src/*.js'],
        tasks: ['concat:dist'],
        options: {
          spawn: false
        }
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  grunt.registerTask('default', ['concat', 'uglify']);

};