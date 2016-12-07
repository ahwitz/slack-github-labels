var fs = require('fs');
var path = require('path');
var baseDir = path.dirname(require.main.filename);

module.exports.register = function()
{
    var self = this;

    this.helpObj["!stage"] = "executes a stage from !stages. Syntax: `!stage name:_____|issue:_____`";
    this.actions["!stage"] = function(message)
    {
        var user = message.user;
        var ghParams = self.parseGHParams(message, true);
        if (!ghParams || !('name' in ghParams) || (!('issue' in ghParams)))
            self.rtm.sendMessage(self.users[user] + " - syntax for !stage is `!stage name:_____|issue:_____`", message.channel);

        var stages = JSON.parse(fs.readFileSync(self.stagesFile, 'utf8'));
        var stageName = ghParams.name;
        var issueNumber = ghParams.issue;
        if (!(user in stages))
            return self.rtm.sendMessage(self.users[user] + " doesn't have any stages stored yet.", message.channel);
        if (!(stageName in stages[user]))
            return self.rtm.sendMessage("Stage '" + stageName + "'' doesn't exist for " + self.users[user] + ".", message.channel);

        var results = [];
        var promises = [];
        var movements = {};
        for (var cID of stages[user][stageName].destinations)
        {
            var pID = self.findProjectForColumn(cID);
            var cardID = self.findCardForProject(pID, issueNumber);
            
            if (!cardID) 
            {
                results.push("- Could not find issue #" + issueNumber + " in project " + self.cachedProjects[pID].name + ". Please add manually.");
                continue;
            }

            if (issueNumber in self.cachedProjects[pID].columns[cID].cards)
            {
                results.push("- Not moving issue #" + issueNumber + " to column " + self.cachedProjects[pID].columns[cID].name + " - already there.");
            }
            else
            {
                (function(pID, cID)
                {
                    promises.push(new Promise(function(resolve, reject)
                    {
                        self.github.projects.moveProjectCard({
                            'column_id': parseInt(cID),
                            'id': cardID,
                            'position': 'bottom'
                        }, function(err, res)
                        {
                            if (res)
                                results.push("- Moved issue #" + issueNumber + " to top of column " + self.cachedProjects[pID].columns[cID].name + ".");
                            else
                            {
                                console.log(err);
                                results.push("- Move failed: " + err);
                            }
                            resolve();
                        });
                    }));
                })(pID, cID);
            }
        }

        if (stages[user][stageName].assignees.length > 0)
        {
            promises.push(new Promise(function(resolve, reject)
            {
                self.github.issues.addAssigneesToIssue({
                    'owner': self.cachedProjects[pID].owner,
                    'repo': self.cachedProjects[pID].repo,
                    'number': issueNumber,
                    'assignees': stages[user][stageName].assignees
                }, function(err, res)
                {
                    if (res)
                        results.push("- Reassigned to " + stages[user][stageName].assignees.join(", "));
                    else
                    {
                        console.log(err);
                        results.push("- Reassignment failed: " + err);
                    }
                    resolve();
                });
            }));
        }

        Promise.all(promises).then(function(resolve)
        {
            self.rtm.sendMessage("Results for " + self.users[user] + " stage movement:\n" + results.join("\n"), message.channel);
        }, function(reject)
        {
            console.log(reject);
            self.rtm.sendMessage("Something went wrong during that stage movement. It was likely half-completed. Reason:" + reject, message.channel);
        });
    };

    this.helpObj["!stages"] = "lists stages added to your user configuration.";
    this.actions["!stages"] = function(message)
    {
        var user = message.user;
        var stages = JSON.parse(fs.readFileSync(self.stagesFile, 'utf8'));
        if (!(user in stages))
            return self.rtm.sendMessage(self.users[user] + " has no stored stages. Use !addstage to fix that.", message.channel);

        var stageStrings = [];
        for (var stageName in stages[user])
        {
            var stageBits = [];
            for (var cID of stages[user][stageName].destinations)
            {
                var pID = self.findProjectForColumn(cID);
                stageBits.push("=> *" + self.cachedProjects[pID].name + "* - " + self.cachedProjects[pID].columns[cID].name);
            }

            for (var username of stages[user][stageName].assignees)
            {
                stageBits.push("=> Assignee: " + username);
            }

            stageStrings.push("*Name:* " + stageName + "\n" + stageBits.join("\n"));
        }

        self.rtm.sendMessage("Stages for " + self.users[user] + ":\n\n" + stageStrings.join("\n"), message.channel);
    };

    this.helpObj["!addstage"] = "adds a new stage to your user configuration. Syntax: `!addstage name:stageName|destinations:columnID1,columnID2|assignees:username`";
    this.actions["!addstage"] = function(message)
    {
        var user = message.user;
        var ghParams = self.parseGHParams(message, true);
        if (!ghParams || !('name' in ghParams) || (!('destinations' in ghParams)))
            self.rtm.sendMessage(self.users[user] + " - syntax for !addstage is `!addstage name:stageName|destinations:columnID1,columnID2|assignees:username`", message.channel);
        else
        {
            var stageName = ghParams.name;
            var columns = {};
            var errors = [];

            var stages = JSON.parse(fs.readFileSync(self.stagesFile, 'utf8'));
            if (!(user in stages))
                stages[user] = {};
            if (stageName in stages[user])
                return self.rtm.sendMessage("Stage '" + stageName + "' already exists for " + self.users[user] + ".", message.channel);

            stages[user][stageName] = {};
            var columnStringStaging = [];
            var assignees = [];
            if (ghParams.destinations)
            {
                for (var incomingCID of ghParams.destinations.split(","))
                {
                    var pID = self.findProjectForColumn(incomingCID);
                    if (!pID)
                        errors.push("- Could not find column with ID " + incomingCID + ".");
                    else
                        columns[incomingCID] = self.cachedProjects[pID].columns[incomingCID].name;
                }

                // If we couldn't find a column...
                if (errors.length > 0)
                    return self.rtm.sendMessage("Errors:\n" + errors.join("\n") + "\nTry !projects again.", message.channel);

                // Otherwise...
                for (var cID in columns)
                    columnStringStaging.push(columns[cID]);

                stages[user][stageName].destinations = [];
                for (var columnID in columns)
                    stages[user][stageName].destinations.push(columnID);
            }

            if (ghParams.assignees)
            {
                stages[user][stageName].assignees = assignees = ghParams.assignees.split(",");
            }

            fs.writeFileSync(self.stagesFile, JSON.stringify(stages));

            self.rtm.sendMessage("Added stage for " + self.users[user] + " - `!stage name:" + stageName + "|issue:____` will now:\n" + 
                (columnStringStaging.length > 0 ? "-Move to columns " + columnStringStaging.join(", ") + "\n" : "") + 
                (assignees.length > 0 ? "-Assign to: " + assignees.join("\n") : "")
            , message.channel);
        }
    };

    this.helpObj["!delstage"] = "deletes a stage from your user configuration. Syntax: `!delstage name:stageName`";
    this.actions["!delstage"] = function(message)
    {
        var user = message.user;
        var ghParams = self.parseGHParams(message, true);
        var stageName = ghParams.name;

        var stages = JSON.parse(fs.readFileSync(self.stagesFile, 'utf8'));
        if (!(user in stages))
            return self.rtm.sendMessage(self.users[user] + " doesn't have any stages stored yet.", message.channel);
        if (!(stageName in stages[user]))
            return self.rtm.sendMessage("Stage '" + stageName + "' doesn't exist for " + self.users[user] + ".", message.channel);

        delete stages[user][stageName];
        fs.writeFileSync(self.stagesFile, JSON.stringify(stages));

        self.rtm.sendMessage("Deleted '" + stageName + "' stage for " + self.users[user] + ".", message.channel);
    };

    // Takes column ID
    this.findProjectForColumn = function(columnID)
    {
        for (var pID in self.cachedProjects)
            for (var cID in self.cachedProjects[pID].columns)
                if (columnID === cID)
                    return pID;

        return false;
    };

    // Takes issue number as a parameter
    this.findCardForProject = function(pID, number)
    {
        for (var cID in self.cachedProjects[pID].columns)
            if (number in self.cachedProjects[pID].columns[cID].cards)
                return self.cachedProjects[pID].columns[cID].cards[number].id;

        return false;
    };

    // Check to make sure stages file exists
    this.stagesFile = baseDir + "/data/stages.json";
    if (!fs.existsSync(this.stagesFile)) fs.writeFileSync(this.stagesFile, "{}");
};