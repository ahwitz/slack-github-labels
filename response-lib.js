var config = require("./config.js");

module.exports.GithubClient = function(rtm, github)
{
    var self = this;
    this.rtm = rtm;
    this.github = github;

    this.helpObj = {}; // Filled in above each method
    this.actions = {}; // List of functions to execute

    this.execute = function(message)
    {
        var which = message.text.split(" ")[0];
        if (which in this.actions)
            this.actions[which](message);
        else
            self.rtm.sendMessage("Did not recognize that message. Supported requests: " + Object.keys(this.actions).join(", "), message.channel);
    };

    // this.setupHooks();

    // this.setupHooks = function()
    // {

    // };

    this.actions["!hello"] = function(message)
    {
        self.rtm.sendMessage("Hello. I am a bot. !help may give you more information about me.", message.channel);
    };

    this.helpObj["!repos"] = "lists all registered repositories";
    this.actions["!repos"] = function(message)
    {
        var repos = [];
        for (var repoName in config.repos)
            repos.push(repoName + ": " + config.repos[repoName].owner + "/" + config.repos[repoName].repo);
        self.rtm.sendMessage(repos.join("\n"), message.channel);
    };

    this.helpObj["!count"] = "for all parameters `field:description`, feeds directly into https://mikedeboer.github.io/node-github/#api-issues-getForRepo\n- `repo:_____`, which is pulled from the results of !repos and feeds into both `owner` and `repo` in the above link.\n- per_page overridden to 100 no matter what.";
    this.actions["!count"] = function(message)
    {
        var ghParams = {};
        var blocks = message.text.split(" ");
        for (var bIdx = 0; bIdx < blocks.length; bIdx++)
        {
            var block = blocks[bIdx].split(":");
            ghParams[block[0]] = block[1];
        }

        if (!('repo' in ghParams))
            return self.rtm.sendMessage("!count requires repo:{_____}, one of the values from !repos", message.channel);

        ghParams['owner'] = config.repos[ghParams.repo].owner;
        ghParams['repo'] = config.repos[ghParams.repo].repo;
        ghParams['per_page'] = 100;
        self.github.issues.getForRepo(ghParams, function(err, res)
        {
            if (res)
                self.rtm.sendMessage(res.length + " issues that match that query.", message.channel);
            else
            {
                console.log(err);
                self.rtm.sendMessage("Github told me you messed up. It said: '" + err.message + "'.", message.channel);
            }
        });
    };

    this.helpObj["!help"] = "displays these commands";
    this.actions["!help"] = function(message)
    {
        var helpMessages = [];
        for (var helpID in this.helpObj)
            helpMessages.push(helpID + " - " + this.helpObj[helpID]);
        self.rtm.sendMessage(helpMessages.join("\n"), message.channel);
    };

    this.helpObj["!labels"] = "displays all labels for repo:_____";
    this.actions["!labels"] = function(message)
    {
        self.rtm.sendMessage("Not yet implemented.", message.channel);
    };

    this.helpObj["!milestones"] = "displays all milestones for repo:_____";
    this.actions["!milestones"] = function(message)
    {
        self.rtm.sendMessage("Not yet implemented.", message.channel);
    };
};