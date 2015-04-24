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
    streams  : 'https://api.twitch.tv/kraken/search/streams/',
    channels : 'https://api.twitch.tv/kraken/search/channels/'
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
  // Channel
  search_types.push({'key': "channel", name: chalk.magenta.bold('Channel'), value: "channel"})
  

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
      gamePrompt()
    }


    // Search by game
    if ( answer.search_type === 'channel' ) {
      channelPrompt()
    }

  });

}


/**
 * Prompt Game Search
 *
 * @runs parseStreams()
 */
function gamePrompt() {

  inquirer.prompt([{
    type: "input",
    name: "game",
    message: chalk.green.bold("Enter name of game: ")
  }], function (answer) {

    var game = answer.game;

    parseStreams( game )

  })

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
      message: chalk.green.bold("Choose stream (0-"+(streams.length-1)+")"),
      validate: function( value ) {
        if ( value > (streams.length-1) ) {
          return "Please enter a valid number (0-"+(streams.length-1)+")";
        } else if( !value ) {
          return "Please enter a valid number (0-"+(streams.length-1)+")";
        } else if( value == "b" ) {
          return true;
        } else if( value == "e" ) {
          return true;
        } else if( !value.match(/\d+/g) ) {
          return "Please enter a valid number (0-"+(streams.length-1)+")";
        } else {
          return true;
        }
      }
    }], function (answer) {

      var stream_num = answer.stream_number,
          stream_url = streams[stream_num].channel.url,
          stream_cmd = 'livestreamer ' + stream_url + ' best';

      console.log(
        chalk.green( 'Starting livestreamer : ' ) + 
        chalk.magenta.bold( stream_url )
      )

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
    chalk.cyan.bold( stream.channel.display_name ) + ' - ' +
    chalk.green( stream.viewers + ' viewers ' )
  )
}





/**
 * Prompt Channel Search
 *
 * @runs parseChannels()
 */
function channelPrompt() {

  inquirer.prompt([{
    type: "input",
    name: "channel",
    message: chalk.green.bold("Enter name of channel: ")
  }], function (answer) {

    var channel = answer.channel;

    parseChannels( channel )
  })
}


/**
 * Search Channels
 * 
 * @param  {String}   query    
 * @param  {Function} callback 
 */
function searchChannels(query, callback) {
  request( api.search.channels + '?query=' + query, function (error, response, data) {
    if (!error && response.statusCode == 200) {

      var data     = JSON.parse(data),
          channels = data.channels;

      console.log('Searching: ' + chalk.red.bold(query) + '');

      callback( channels )
    }
  })
}


/**
 * Parse Channels
 * 
 * @param  {String}   query    
 * @param  {Function} callback 
 */
function parseChannels(query, callback) {

  searchChannels(query, function (channel) {

    var data = channel;
    
    // Loop through and format data
    channel.forEach(function (channel, i) {
      logChannel(channel, i)
    })

    // Select stream
    inquirer.prompt([{
      type: "input",
      name: "channel_number",
      message: chalk.green.bold("Choose stream (0-"+(channel.length-1)+")"),
      validate: function( value ) {
        if ( value > (channel.length-1) ) {
          return "Please enter a valid number (0-"+(channel.length-1)+")";
        } else if( !value ) {
          return "Please enter a valid number (0-"+(channel.length-1)+")";
        } else if( value == "b" ) {
          return true;
        } else if( value == "e" ) {
          return true;
        } else if( !value.match(/\d+/g) ) {
          return "Please enter a valid number (0-"+(channel.length-1)+")";
        } else {
          return true;
        }
      }
    }], function (answer) {

      var channel_num = answer.channel_number,
          channel_url = channel[channel_num].url,
          stream_cmd  = 'livestreamer ' + channel_url + ' best';

      console.log(
        chalk.green( 'Starting livestreamer : ' ) + 
        chalk.magenta.bold( channel_url )
      )

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
 * Log Channel
 * 
 * @param  {Object} channel 
 * @param  {Integer} i      
 */
function logChannel(channel, i) {
  console.log(
    chalk.magenta.bold( '['+i+']' ) + ' - ' +
    chalk.blue( channel.game ) + ' - ' +
    chalk.cyan.bold( channel.display_name ) + ' - ' +
    chalk.green( numberWithCommas(channel.views) + ' views ' )
  )
}



/**
 * Format number with commas
 * 
 * @param  {Integer} x 
 * @return {String}   
 */
function numberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}



/**
 * Init
 */
firstPrompt()