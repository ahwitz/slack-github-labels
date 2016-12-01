var config = require("./config.js");

module.exports.GithubClient = function(rtm, github)
{
    var self = this;
    this.rtm = rtm;
    this.github = github;

    this.countForUser = function(repo, username, channel)
    {
        if (!username)
            return this.rtm.sendMessage("Didn't catch that username - you were thinking `!count {repo} {username}`.", channel);
        self.github.issues.getForRepo({
            'owner': config.repos[repo].owner,
            'repo': config.repos[repo].repo,
            'assignee': username,
            'per_page': 100
        }, function(err, res)
        {
            self.rtm.sendMessage(username + " has " + res.length + " issues in Github.", channel);
        });
    };
};