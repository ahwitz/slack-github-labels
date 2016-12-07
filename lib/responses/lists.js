module.exports.register = function()
{
    var self = this;

    this.helpObj["!repos"] = "lists all registered repositories";
    this.actions["!repos"] = function(message)
    {
        var repos = [];
        for (var repoName in self.config.repos)
            repos.push(repoName + ": " + self.config.repos[repoName].owner + "/" + self.config.repos[repoName].repo);
        self.rtm.sendMessage(repos.join("\n"), message.channel);
    };
    
    this.helpObj["!labels"] = "repo:________";
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

    this.helpObj["!milestones"] = "repo:________";
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
};