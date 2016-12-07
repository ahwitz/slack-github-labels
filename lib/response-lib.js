// var GithubListener = require("./listener.js").GithubListener;

module.exports.GithubClient = function(rtm, github, channels, users)
{
    var self = this;
    this.rtm = rtm;
    this.github = github;
    this.channels = channels;
    this.users = users;
    this.config = require("../config.js");

    this.helpObj = {
        'For all options': 'paramName1:paramVal1|paramName2:paramVal2 etc as per https://mikedeboer.github.io/node-github/'
    }; // Filled in above each method
    this.actions = {}; // List of functions to execute
    this.cachedProjects = {};

    // if (('listener' in this.config) && this.config.listener)
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
            ghParams['owner'] = self.config.repos[ghParams.repo].owner;
            ghParams['repo'] = self.config.repos[ghParams.repo].repo;
        }
        else if (self.config.defaultRepo)
        {
            ghParams['owner'] = self.config.repos[self.config.defaultRepo].owner;
            ghParams['repo'] = self.config.repos[self.config.defaultRepo].repo;
        }

        ghParams['per_page'] = 100;
        return ghParams;
    };

    // this.setupHooks();

    // this.setupHooks = function()
    // {

    // };

    this.actions["!hello"] = function(message)
    {
        self.rtm.sendMessage("Hello, " + self.users[message.user] + ". I am a bot. !help may give you more information about me.", message.channel);
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
    require("./responses/stages.js").register.apply(this);

    // Initialize the projects object
    for (var repoName in this.config.repos)
    {
        this.getRepoProjects(this.config.repos[repoName]);
    }
};