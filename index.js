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

var rtm = new RtmClient(config.botToken);
var myID;

var GithubClient = require("./response-lib.js").GithubClient;
var githubClient = new GithubClient(rtm, github);

// The client will emit an RTM.AUTHENTICATED event on successful connection, with the `rtm.start` payload if you want to cache it
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
    myID = rtmStartData.self.id;
    console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}.`);
});

rtm.on(CLIENT_EVENTS.RTM.RAW_MESSAGE, function handleRtmMessage(rawMessage) {
    var message = JSON.parse(rawMessage);
    if (message.type === 'message' && message.user !== myID)
    {
        console.log(rawMessage);
        var activeChannel = message.channel;
        if (activeChannel in config.channels)
        {
            if (message.text.indexOf("!count") === 0)
                githubClient.countForUser(message.text.split(" ")[1], message.text.split(" ")[2], activeChannel);
            if (message.text.indexOf("!repos") === 0)
            {
                var repos = [];
                for (var repoName in config.repos)
                    repos.push(repoName + ": " + config.repos[repoName].owner + "/" + config.repos[repoName].repo);
                rtm.sendMessage(repos.join("\n"), activeChannel);
            }
        }
    }
});

rtm.start();