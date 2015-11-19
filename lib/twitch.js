#!/usr/bin/env node

/**
 * Module dependencies.
 */
var sys                = require('sys'),
    program            = require('commander'),
    path               = require('path'),
    chalk              = require('chalk'),
    irc                = require('twitch-irc'),
    inquirer           = require('inquirer'),
    request            = require('request'),
    rp                 = require('request-promise'),
    contentDisposition = require('content-disposition'),
    pkg                = require( path.join(__dirname, '../package.json') ),
    exec               = require('child_process').exec,
    child;


/**
 * General Config
 */
var config = {
  user : 'elzizzo'
}


/**
 * Twitch API Settings
 */
var api = {
  root   : 'https://api.twitch.tv/kraken/',
  search : {
    streams  : 'https://api.twitch.tv/kraken/search/streams/',
    channels : 'https://api.twitch.tv/kraken/search/channels/',
    // follows  : 'https://api.twitch.tv/kraken/channels/'+config.user+'/follows',
  }
}

/**
 * IRC Client Options
 *
 * @note Generate OAuth password at http://twitchapps.com/tmi
 */
var irc_client_options = {
  options: {
    debug: true,
    debugIgnore: ['ping', 'chat', 'action']
  },
  identity: {
    username: 'elzizzo',
    password: 'oauth:1ae8lh7yi1329w8i3hue2hgabs8ovx'
  },
  channels: []
}

















/**
 * -----------------------------------------------------------------------------------
 *
 *                                      I N I T
 * 
 * -----------------------------------------------------------------------------------
 */


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
  // Follows
  search_types.push({'key': "follows", name: chalk.magenta.bold('Follows'), value: "follows"})
  

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

    // Search by channel
    if ( answer.search_type === 'channel' ) {
      channelPrompt()
    }

    // Search by following
    if ( answer.search_type === 'follows' ) {
      followsPrompt()
    }

  });

}







/**
 * -----------------------------------------------------------------------------------
 *
 *                                      G A M E 
 * 
 * -----------------------------------------------------------------------------------
 */


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

      // Connect to IRC
      connectToIRC( streams[stream_num].channel.name )

      // Run livestreamer command
      launchLivestreamer( stream_cmd )
      

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
 * -----------------------------------------------------------------------------------
 *
 *                                    C H A N N E L
 * 
 * -----------------------------------------------------------------------------------
 */




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

      // Connect to IRC
      connectToIRC( channel[channel_num].name )

      // Run livestreamer command
      launchLivestreamer( stream_cmd )

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
 * -----------------------------------------------------------------------------------
 *
 *                                 F O L L O W I N G
 * 
 * -----------------------------------------------------------------------------------
 */




/**
 * Prompt Follow Search
 *
 * @runs parseFollows()
 */
function followsPrompt() {

  inquirer.prompt([{
    type: "input",
    name: "user",
    message: chalk.green.bold("Enter name of user: ")
  }], function (answer) {
    var user = answer.user;
    parseFollows( user )
  })
}


/**
 * Search Follows
 * 
 * @param  {String}   user    
 * @param  {Function} callback 
 */
function getFollows(user, callback) {

  // var url = 'https://api.twitch.tv/kraken/channels/'+user+'/follows';
  var url = 'https://api.twitch.tv/kraken/users/'+user+'/follows/channels'

  request( url, function (error, response, data) {
    if (!error && response.statusCode == 200) {

      // console.log(chalk.green.bold('results: ') +  chalk.yellow(data) );

      var data    = JSON.parse(data),
          follows = data.follows;

      callback( follows )
    }
  })
}


/**
 * Parse Follows
 * 
 * @param  {String}   query    
 * @param  {Function} callback 
 *
 * @todo  NEEDS TO USE PROMISE TO FIND OUT IF ONLINE
 */
function parseFollows(user, callback) {

  // do promise stuff here

  getFollows(user, function (follows) {

    var online = [];
    
    // Loop through and format data
    follows.forEach(function (follow, i) {
      logFollow(follow.channel, i)

      isStreamOnline(follow.channel.display_name, function (is_online) {
        // console.log('isStreamOnline', follow.channel.display_name, is_online)
        if ( is_online ) {
          console.log(follow.channel.display_name + ' is online')
          // online.push(follow.channel)
        }
      })
    })

    console.log('online channels', online)

    // Select stream
    inquirer.prompt([{
      type: "input",
      name: "channel_number",
      message: chalk.green.bold("Choose stream (0-"+(follows.length-1)+")"),
      validate: function( value ) {
        if ( value > (follows.length-1) ) {
          return "Please enter a valid number (0-"+(follows.length-1)+")";
        } else if( !value ) {
          return "Please enter a valid number (0-"+(follows.length-1)+")";
        } else if( value == "b" ) {
          return true;
        } else if( value == "e" ) {
          return true;
        } else if( !value.match(/\d+/g) ) {
          return "Please enter a valid number (0-"+(follows.length-1)+")";
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

      // Connect to IRC
      connectToIRC( channel[channel_num].name )

      // Run livestreamer command
      launchLivestreamer( stream_cmd )

    })

  })

}


/**
 * Log Channel
 * 
 * @param  {Object} channel 
 * @param  {Integer} i      
 */
function logFollow(channel, i) {
  console.log(
    chalk.magenta.bold( '['+i+']' ) + ' - ' +
    chalk.blue( channel.game ) + ' - ' +
    chalk.cyan.bold( channel.display_name ) + ' - ' +
    chalk.green( numberWithCommas(channel.views) + ' views ' )
  )
}




function isStreamOnline(channel, callback) {
  request( 'https://api.twitch.tv/kraken/streams/'+channel, function (error, response, data) {
    if (!error && response.statusCode == 200) {

      var data = JSON.parse(data)

      callback(!!data.stream);

      // if ( data.stream !== null ) {
      //   return true;
      // } else {
      //   return false;
      // }
    }
  })
}






































/**
 * -----------------------------------------------------------------------------------
 *
 *                                F U N C T I O N S
 * 
 * -----------------------------------------------------------------------------------
 */



function launchLivestreamer(command) {
  child = exec( command, function (error, stdout, stderr) {
    console.log('stdout: ' + stdout)
    console.log('stderr: ' + stderr)

    if (error !== null) { console.log('exec error: ' + error) }
  })
}



function connectToIRC(channel) {
  var client = new irc.client(irc_client_options)

  irc_client_options.channels = [channel]

  client.connect()

  client.addListener('chat', function (channel, user, message) {
    
    console.log(
      chalk.green.bold(user.username) + ' ' + 
      message
    )

  })
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