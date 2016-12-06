var express = require('express');
var config = require("../config.js");

module.exports.GithubListener = function(rtm, github)
{
    var self = this;
    this.rtm = rtm;
    this.github = github;

    this.app = express();

    app.get("/issues", function(req, res)
    {
        if ('X-GitHub-Event' in req.headers)
        {
            console.log("GitHub request received: ", req.headers['X-GitHub-Event']);

        }
        else
        {
            console.log("non-GitHub request");
        }
    });

    this.server = require('http').createServer(app).listen(config.listener);
    this.server.on('listening', function()
    {
        timeLog('Reloaded static content server on http://localhost:' + config.listener + '.');
    });
    this.server.on('clientError', function(err)
    {
        console.log('GENERIC SERVER CLIENT ERROR:', err);
    });
};