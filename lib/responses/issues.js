module.exports.register = function()
{
    var self = this;

    this.helpObj["!count"] = "repo:{name of repo, via !repos}";
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

    this.helpObj["!issue"] = "repo:______|number:_______";
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

                var columns = [];
                for (var pID in self.cachedProjects)
                {
                    for (var cID in self.cachedProjects[pID].columns)
                    {
                        if (res.number in self.cachedProjects[pID].columns[cID].cards)
                        {
                            columns.push("- " + self.cachedProjects[pID].columns[cID].name + " (" + self.cachedProjects[pID].name + ")" +
                                " - ID:" + self.cachedProjects[pID].columns[cID].cards[res.number].id + "");
                        }
                    }
                }
                var issueMessage = "*" + res.title + "* (#" + res.number + ") \n" + 
                    "Reporter: " + res.user.login + "\nAssignee: " + res.assignee.login + "\n" +
                    "Labels: " + labels.join(", ") + "\n" +
                    "Projects: \n" + columns.join("\n");
                self.rtm.sendMessage(issueMessage, message.channel);
            }
            else
            {
                console.log(err);
                self.rtm.sendMessage("Github told me you messed up. It said: '" + err.message + "'.", message.channel);
            }
        });
    };

    this.helpObj["!issues"] = "repo:______";
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
};