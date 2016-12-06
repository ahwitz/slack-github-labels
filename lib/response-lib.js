var config = require("../config.js");
// var GithubListener = require("./listener.js").GithubListener;

module.exports.GithubClient = function(rtm, github)
{
    var self = this;
    this.rtm = rtm;
    this.github = github;

    this.helpObj = {
        'For all options': 'paramName1:paramVal1|paramName2:paramVal2 etc as per https://mikedeboer.github.io/node-github/'
    }; // Filled in above each method
    this.actions = {}; // List of functions to execute
    this.cachedProjects = {};

    // if (('listener' in config) && config.listener)
    //     this.listener = new GithubListener(this.rtm, this.github);

    this.execute = function(message)
    {
        var which = message.text.split(" ")[0];
        if (which in this.actions)
            this.actions[which](message);
        else
            self.rtm.sendMessage("Did not recognize that message. Supported requests: " + Object.keys(this.actions).join(", "), message.channel);
    };

    this.parseGHParams = function(message, skipRepo)
    {
        var messageText = message.text.replace(/^![^ ]* /, "");
        var ghParams = {};
        var blocks = messageText.split("|");
        for (var bIdx = 0; bIdx < blocks.length; bIdx++)
        {
            var block = blocks[bIdx].split(":");
            ghParams[block[0]] = block.splice(1, block.length).join(":");
        }

        if (!skipRepo && !('repo' in ghParams))
        {
            self.rtm.sendMessage("This endpoint requires `repo:_____`, one of the values from !repos", message.channel);
            return false;
        }

        if (ghParams.repo)
        {
            ghParams['owner'] = config.repos[ghParams.repo].owner;
            ghParams['repo'] = config.repos[ghParams.repo].repo;
            ghParams['per_page'] = 100;
        }
        return ghParams;
    };

    // this.setupHooks();

    // this.setupHooks = function()
    // {

    // };

    this.actions["!hello"] = function(message)
    {
        self.rtm.sendMessage("Hello. I am a bot. !help may give you more information about me.", message.channel);
    };

    this.helpObj["!help"] = "displays these commands";
    this.actions["!help"] = function(message)
    {
        var helpMessages = [];
        for (var helpID in self.helpObj)
            helpMessages.push(helpID + " - " + self.helpObj[helpID]);
        self.rtm.sendMessage(helpMessages.join("\n"), message.channel);
    };

    // Imports
    require("./responses/issues.js").register.apply(this);
    require("./responses/lists.js").register.apply(this);
    require("./responses/projects.js").register.apply(this);

    for (var repoName in config.repos)
    {
        this.getRepoProjects(config.repos[repoName]);
    }
};