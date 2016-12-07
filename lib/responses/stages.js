var fs = require('fs');
var path = require('path');
var baseDir = path.dirname(require.main.filename);

module.exports.register = function()
{
    var self = this;

    this.helpObj["!addstage"] = "adds a new stage to your user configuration. Syntax: `!addstage name:stageName|destinations:columnID1,columnID2`";
    this.actions["!addstage"] = function(message)
    {
        var user = message.user;
        var ghParams = self.parseGHParams(message, true);
        if (!ghParams) return;
        if (!('name' in ghParams) || (!('destinations' in ghParams)))
            self.rtm.sendMessage(self.users[user] + " - syntax for !addstage is `!addstage name:stageName|destinations:columnID1,columnID2`", message.channel);
        else
        {
            var stageName = ghParams.name;
            var columns = {};
            var errors = [];
            for (var incomingCID of ghParams.destinations.split(","))
            {
                var columnName = null;
                for (var pID in self.cachedProjects)
                {
                    for (var cID in self.cachedProjects[pID].columns)
                    {
                        if (incomingCID === cID)
                        {
                            columnName = "*" + self.cachedProjects[pID].name + "* - " + self.cachedProjects[pID].columns[cID].name + "";
                            break;
                        }
                    }

                    if (columnName) break;
                }

                if (columnName)
                    columns[incomingCID] = columnName;
                else
                    errors.push("- Could not find column with ID " + incomingCID + ".");
            }

            // If we couldn't find a column...
            if (errors.length > 0)
                return self.rtm.sendMessage("Errors:\n" + errors.join("\n") + "\nTry !projects again.", message.channel);

            // Otherwise...
            var columnStringStaging = [];
            for (var cID in columns)
                columnStringStaging.push(columns[cID]);

            var stages = JSON.parse(fs.readFileSync(self.stagesFile, 'utf8'));
            if (!(user in stages))
                stages[user] = {};
            if (stageName in stages[user])
                return self.rtm.sendMessage("Stage '" + stageName + "'' already exists for " + self.users[user] + ".", message.channel);

            stages[user][stageName] = [];
            for (var columnID in columns)
                stages[user][stageName].push({'destination': columnID});

            fs.writeFileSync(self.stagesFile, JSON.stringify(stages));

            self.rtm.sendMessage("Adding stage for " + self.users[user] + " - !stage name:" + stageName + "|issue:____ will now move to columns:\n" + columnStringStaging.join("\n"), message.channel);
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
            return self.rtm.sendMessage("Stage '" + stageName + "'' doesn't exist for " + self.users[user] + ".", message.channel);

        delete stages[user][stageName];
        fs.writeFileSync(self.stagesFile, JSON.stringify(stages));

        self.rtm.sendMessage("Deleted " + stageName + " stage for " + self.users[user] + ".", message.channel);
    };
    // Check to make sure stages file exists
    this.stagesFile = baseDir + "/data/stages.json";
    if (!fs.existsSync(this.stagesFile)) fs.writeFileSync(this.stagesFile, "{}");
};