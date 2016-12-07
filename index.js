var util = require("util");
var GitHubApi = require("github");

var RtmClient = require('@slack/client').RtmClient;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

var config = require("./config.js");

var github = new GitHubApi({
    protocol: "https",
    host: "api.github.com", // should be api.github.com for GitHub
    Promise: require('bluebird'),
    followRedirects: false // default: true; there's currently an issue with non-get redirects, so allow ability to disable follow-redirects
});

github.authenticate({
    type: "oauth",
    token: config.githubToken
});

var rtm = new RtmClient(config.slackToken);
var myID;
var channels = {};
var users = {};

var GithubClient = require("./lib/response-lib.js").GithubClient;
var githubClient = new GithubClient(rtm, github, channels, users);

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload if you want to cache it
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
    myID = rtmStartData.self.id;

    for (var cIdx = 0; cIdx < rtmStartData.users.length; cIdx++)
        users[rtmStartData.users[cIdx].id] = rtmStartData.users[cIdx].name;

    for (var cIdx = 0; cIdx < rtmStartData.channels.length; cIdx++)
        channels[rtmStartData.channels[cIdx].id] = rtmStartData.channels[cIdx].name;
    
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}.`);
});

rtm.on(CLIENT_EVENTS.RTM.RAW_MESSAGE, function handleRtmMessage(rawMessage) {
    var message = JSON.parse(rawMessage);
    if ((message.type === 'message') && (message.user !== myID) && message.text && (message.text.indexOf("!") === 0)) githubClient.execute(message);
});

rtm.start();