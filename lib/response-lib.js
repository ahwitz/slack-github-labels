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

    this.helpObj["!repos"] = "lists all registered repositories";
    this.actions["!repos"] = function(message)
    {
        var repos = [];
        for (var repoName in config.repos)
            repos.push(repoName + ": " + config.repos[repoName].owner + "/" + config.repos[repoName].repo);
        self.rtm.sendMessage(repos.join("\n"), message.channel);
    };

    this.helpObj["!count"] = "https://mikedeboer.github.io/node-github/#api-issues-getForRepo, returns count only";
    this.actions["!count"] = function(message)
    {
        var ghParams = self.parseGHParams(message);
        if (!ghParams) return;

        self.github.issues.getForRepo(ghParams, function(err, res)
        {
            if (res)
                self.rtm.sendMessage((res.length === 100 ? res.length + "+" : res.length) + " issues match that query.", message.channel);
            else
            {
                console.log(err);
                self.rtm.sendMessage("Github told me you messed up. It said: '" + err.message + "'.", message.channel);
            }
        });
    };

    this.helpObj["!issue"] = "https://mikedeboer.github.io/node-github/#api-issues-get";
    this.actions["!issue"] = function(message)
    {
        var ghParams = self.parseGHParams(message);
        if (!ghParams) return;

        self.github.issues.get(ghParams, function(err, res)
        {
            if (res)
            {
                var labels = [];
                for (var label of res.labels)
                    labels.push(label.name);

                var issueMessage = "*" + res.title + "* (#" + res.number + ") \n" + 
                    "Reporter: " + res.user.login + "\nAssignee: " + res.assignee.login + "\n" +
                    "Labels: " + labels.join(", ");
                self.rtm.sendMessage(issueMessage, message.channel);
            }
            else
            {
                console.log(err);
                self.rtm.sendMessage("Github told me you messed up. It said: '" + err.message + "'.", message.channel);
            }
        });
    };

    this.helpObj["!issues"] = "same as !count, but provides information about issues";
    this.actions["!issues"] = function(message)
    {
        var ghParams = self.parseGHParams(message);
        if (!ghParams) return;

        self.github.issues.getForRepo(ghParams, function(err, res)
        {
            if (res)
            {
                var issues = [];
                for (var issue of res)
                {
                    var assignees = [];
                    for (var assignee of issue.assignees)
                        assignees.push(assignee.login);

                    var labels = [];
                    for (var label of issue.labels)
                        labels.push(label.name);

                    issues.push("*" + issue.title + "*" + 
                        "\n>Assignees: " + assignees.join(", ") + 
                        "\n>Labels: " + labels.join(", ") + 
                        "\n>Milestone: " + issue.milestone.title + "(" + issue.milestone.number + ")" +
                        "\n>" + issue.html_url
                    );
                }
                self.rtm.sendMessage(issues.length > 0 ? issues.join("\n\n") : "No issues match that query.", message.channel);
            }
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
        for (var helpID in self.helpObj)
            helpMessages.push(helpID + " - " + self.helpObj[helpID]);
        self.rtm.sendMessage(helpMessages.join("\n"), message.channel);
    };

    this.helpObj["!labels"] = "https://mikedeboer.github.io/node-github/#api-issues-getLabels";
    this.actions["!labels"] = function(message)
    {
        var ghParams = self.parseGHParams(message);
        if (!ghParams) return;

        self.github.issues.getLabels(ghParams, function(err, res)
        {
            if (res)
            {
                var labels = [];
                for (var label of res)
                    labels.push(label.name);
                self.rtm.sendMessage(labels.length > 0 ? labels.join("\n") : "No labels found for " + ghParams.owner + "/" + ghParams.repo + ".", message.channel);
            }
            else
            {
                console.log(err);
                self.rtm.sendMessage("Github told me you messed up. It said: '" + err.message + "'.", message.channel);
            }
        });
    };

    this.helpObj["!milestones"] = "https://mikedeboer.github.io/node-github/#api-issues-getMilestones";
    this.actions["!milestones"] = function(message)
    {
        var ghParams = self.parseGHParams(message);
        if (!ghParams) return;

        self.github.issues.getMilestones(ghParams, function(err, res)
        {
            if (res)
            {
                var milestones = [];
                for (var milestone of res)
                    milestones.push(milestone.title + "(" + milestone.number + ") - " + milestone.open_issues + "/" + (milestone.open_issues + milestone.closed_issues) + " issues open.");
                self.rtm.sendMessage(milestones.length > 0 ? milestones.join("\n") : "No milestones found for " + ghParams.owner + "/" + ghParams.repo + ".", message.channel);
            }
            else
            {
                console.log(err);
                self.rtm.sendMessage("Github told me you messed up. It said: '" + err.message + "'.", message.channel);
            }
        });
    };

    this.helpObj["!projects"] = "https://mikedeboer.github.io/node-github/#api-projects-getRepoProjects";
    this.actions["!projects"] = function(message)
    {
        var ghParams = self.parseGHParams(message);
        if (!ghParams) return;

        self.github.projects.getRepoProjects(ghParams, function(err, res)
        {
            if (res)
            {
                var projects = {};
                var projectPromises = [];
                for (var project of res)
                {
                    projects[project.id] = {
                        'name': project.name,
                        'columns': {}
                    };

                    (function (project_id)
                    {
                        projectPromises.push(new Promise(function(resolve, reject)
                        {
                            self.github.projects.getProjectColumns({
                                'project_id': project_id 
                            }, function(err, res)
                            {
                                if (res)
                                {
                                    for (var column of res)
                                        projects[project_id].columns[column.id] = column.name;
                                    resolve();
                                }
                                else
                                {
                                    reject("Something happened with ID: " + project.id);
                                }
                            });
                        }));
                    })(project.id);
                }

                Promise.all(projectPromises).then(function(resolve)
                {
                    var projString = "";
                    for (var pID in projects)
                    {
                        projString += "*Project: " + projects[pID].name + " (ID: " + pID + "):*\n";
                        for (var cID in projects[pID].columns)
                            projString += "> " + projects[pID].columns[cID] + " (ID: " + cID + ")\n";
                    }

                    self.rtm.sendMessage(projString, message.channel);
                }, function(reject)
                {
                    self.rtm.sendMessage("Project column lookup failed: " + reject, message.channel);
                });
            }
            else
            {
                console.log(err);
                self.rtm.sendMessage("Github told me you messed up. It said: '" + err.message + "'.", message.channel);
            }
        });
    };

    this.helpObj["!column"] = "https://mikedeboer.github.io/node-github/#api-projects-getProjectCards";
    this.actions["!column"] = function(message)
    {
        var ghParams = self.parseGHParams(message, true);
        if (!ghParams) return;

        self.github.projects.getProjectCards(ghParams, function(err, res)
        {
            if (res)
            {
                var cards = [];
                for (var card of res)
                {
                    var splitURL = card.content_url.split("/");
                    cards.push("Issue #" + splitURL[splitURL.length - 1] + " (ID " + card.id + ") - note: " + card.note);
                }
                self.rtm.sendMessage(cards.length > 0 ? cards.join("\n") : "No cards found for column " + ghParams.id + ".", message.channel);
            }
            else
            {
                console.log(err);
                self.rtm.sendMessage("Github told me you messed up. It said: '" + err.message + "'.", message.channel);
            }
        });
    };
};