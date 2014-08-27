#!/usr/bin/env node

/**
 * Firefox OS Layer Tree Utility
 *
 * Captures layer tree dumps from `adb logcat` and
 * outputs them to the console without log noise.
 *
 * Usage:
 *
 *   $ ./layertree.js [--pid=PID] [number_of_layer_trees]
 */

var spawn = require('child_process').spawn;
var parseArgs = require('minimist');
var args = parseArgs(process.argv.slice(2));


console.log(args);

// Wait for `adb` server and device in a separate process
console.log('Waiting for device...\n');

spawn('adb', ['wait-for-device'], { detached: true }).on('close', function(code) {

  console.log('Device ready\n');

  var pid = args.pid ? args.pid : '[0-9]+';
  
  // Regular expression for finding layer tree dump
  var delimiter = new RegExp("^I\\/Gecko\\s+\\(\\s*" + pid + "\\)\\:\\s(?:Client)?LayerManager\\s\\(.+\\)", 'g');

  // Current layer tree dump
  var tree = null;

  // Track number of layer tree dumps
  var count = args._[0] || -1;

  // Start `adb logcat`
  var logcat = spawn('adb', ['logcat']);

  // Handle `adb logcat` output data
  logcat.stdout.on('data', function(data) {
    var lines = data.toString().split('\n');

    lines.forEach(function(line) {
      if (line.indexOf('I/Gecko') !== 0) {
        return;
      }

      // Start layer tree capture
      if (!tree && delimiter.exec(line)) {
        tree = [line];
        return;
      }

      // Continue capturing layer tree
      if (tree) {

        // Dump layer tree to console
        if (delimiter.exec(line)) {
          console.log('******** BEGIN LAYER TREE ********');
          console.log(tree.join('\n'));
          console.log('********  END LAYER TREE  ********\n\n');

          // Terminate if the layer tree dump count is met
          if (--count === 0) {
            logcat.kill();
            process.exit();
          }

          // Reset layer tree capture
          tree = [line];
          return;
        }

        // Add to current layer tree dump
        tree.push(line);
      }
    });
  });

  // Handle `adb logcat` termination
  logcat.on('close', function(code) {
    console.log('[adb process exited with code ' + code + ']');
  });
});
