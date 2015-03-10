#!/usr/bin/env node

/**
 * Module dependencies.
 */
var sys                = require('sys'),
    program            = require('commander'),
    path               = require('path'),
    chalk              = require('chalk'),
    inquirer           = require('inquirer'),
    request            = require('request'),
    contentDisposition = require('content-disposition'),
    pkg                = require( path.join(__dirname, '../package.json') ),
    exec               = require('child_process').exec,
    child;

/**
 * Twitch API Settings
 */
var api = {
  root   : 'https://api.twitch.tv/kraken/',
  search : {
    streams : 'https://api.twitch.tv/kraken/search/streams/'
  }
}


/**
 * First Prompt
 */
function firstPrompt() {
  
  // Search type array (game title or user name)
  var search_types = [];

  // Game
  search_types.push({'key': "game", name: chalk.magenta.bold('Game'), value: "game"})
  // User
  search_types.push({'key': "user", name: chalk.magenta.bold('User'), value: "user"})
  

  /**
   * Prompt for search type
   */
  inquirer.prompt([{
    type: "list",
    name: "search_type",
    message: chalk.green.bold("Search for: "),
    choices: search_types
  }], function (answer) {

    // Search by game
    if ( answer.search_type === 'game' ) {
      
      inquirer.prompt([{
        type: "input",
        name: "game",
        message: chalk.green.bold("Enter name of game: ")
      }], function (answer) {

        var game = answer.game;

        parseStreams( game )

      })
    }


    // Search by game
    if ( answer.search_type === 'user' ) {
      console.log('Not yet supported')
    }

  });

}


/**
 * Search Streams
 * 
 * @param  {String}   query    
 * @param  {Function} callback 
 */
function searchStreams(query, callback) {
  request( api.search.streams + '?query=' + query, function (error, response, data) {
    if (!error && response.statusCode == 200) {

      var data    = JSON.parse(data),
          streams = data.streams;

      console.log('Searching: ' + chalk.red.bold(query) + '');

      callback( streams )
    }
  })
}


/**
 * Parse Streams
 * 
 * @param  {String}   query    
 * @param  {Function} callback 
 */
function parseStreams(query, callback) {

  searchStreams(query, function (streams) {

    var data = streams;
    
    // Loop through and format data
    streams.forEach(function (stream, i) {
      logStream(stream, i)
    })

    // Select stream
    inquirer.prompt([{
      type: "input",
      name: "stream_number",
      message: chalk.green.bold("Choose stream number "),
      validate: function( value ) {
        if ( value > streams.length ) {
          return "Please enter a valid torrent number (1-"+streams.length+")";
        } else if( !value ) {
          return "Please enter a valid torrent number (1-"+streams.length+")";
        } else if( value == "b" ) {
          return true;
        } else if( value == "e" ) {
          return true;
        } else if( !value.match(/\d+/g) ) {
          return "Please enter a valid torrent number (1-"+streams.length+")";
        } else {
          return true;
        }
      }
    }], function (answer) {

      var stream_num = answer.stream_number,
          stream_url = streams[stream_num].channel.url,
          stream_cmd = 'livestreamer ' + stream_url + ' best';

      // Run livestreamer command
      child = exec( stream_cmd, function (error, stdout, stderr) {
        console.log('stdout: ' + stdout)
        console.log('stderr: ' + stderr)

        if (error !== null) { console.log('exec error: ' + error) }
      })

    })

  })

}



/**
 * Log Stream
 * 
 * @param  {Object} stream 
 * @param  {Integer} i      
 */
function logStream(stream, i) {
  console.log(
    chalk.magenta.bold( '['+i+']' ) + ' - ' +
    chalk.blue( stream.game ) + ' - ' +
    chalk.cyan.bold( stream.channel.name ) + ' - ' +
    chalk.green( stream.viewers + ' viewers ' )
  )
}

/**
 * Init
 */
firstPrompt()