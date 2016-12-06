module.exports.register = function()
{
    var self = this;

    this.helpObj["!projects"] = "https://mikedeboer.github.io/node-github/#api-projects-getRepoProjects";
    this.actions["!projects"] = function(message)
    {
        var ghParams = self.parseGHParams(message);
        if (!ghParams) return;

        (new Promise(function(resolve, reject)
        {
            self.getRepoProjects(ghParams, resolve, reject);
        })).then(function(resolve)
        {
            var projString = "";
            for (var pID in self.cachedProjects)
            {
                projString += "*Project: " + self.cachedProjects[pID].name + " (ID: " + pID + "):*\n";
                for (var cID in self.cachedProjects[pID].columns)
                    projString += "> " + self.cachedProjects[pID].columns[cID].name + " (ID: " + cID + ")\n";
            }

            self.rtm.sendMessage(projString, message.channel);
        }, function(reject)
        {
            self.rtm.sendMessage("Project column lookup failed: " + reject, message.channel);
        });
    };

    this.helpObj["!column"] = "https://mikedeboer.github.io/node-github/#api-projects-getProjectCards";
    this.actions["!column"] = function(message)
    {
        var ghParams = self.parseGHParams(message, true);
        if (!ghParams) return;

        var column_id = ghParams.column_id;
        (new Promise(function(resolve, reject)
        {
            self.getProjectColumn(column_id, resolve, reject);
        })).then(function(resolve) // resolve = project_id
        {
            var column = self.cachedProjects[resolve].columns[column_id];
            var cards = [];
            for (var issueNo in column.cards)
                cards.push("Issue #" + issueNo + " (ID " + column.cards[issueNo].id + ")" + (column.cards[issueNo].note ? " - note: " + column.cards[issueNo] : ""));

            var columnMessage = "*" + column.name + ":*\n" + cards.join("\n");
            self.rtm.sendMessage(columnMessage, message.channel);
        }, function(reject)
        {
            self.rtm.sendMessage("Github told me you messed up. It said: '" + reject.message + "'.", message.channel);
        });
    };

    this.getRepoProjects = function (ghParams, gResolve, gReject)
    {
        self.github.projects.getRepoProjects(ghParams, function(err, res)
        {
            if (res)
            {
                var projectPromises = [];
                for (var project of res)
                {
                    self.cachedProjects[project.id] = {
                        'name': project.name,
                        'columns': {}
                    };

                    projectPromises.push(new Promise(function(resolve, reject)
                    {
                        self.getProjectColumns(project.id, resolve, reject);
                    }));
                }

                Promise.all(projectPromises).then(function(resolve)
                {
                    if (gResolve) gResolve();
                }, function(reject)
                {
                    if (gReject) gReject(reject);
                });
            }
            else
            {
                if (gReject) gReject(err);
            }
        });
    };

    this.getProjectColumns = function (project_id, resolve, reject)
    {
        self.github.projects.getProjectColumns({
            'project_id': project_id 
        }, function(err, res)
        {
            if (res)
            {
                for (var column of res)
                {
                    self.cachedProjects[project_id].columns[column.id] = {
                        'name': column.name,
                        'cards': {}
                    };

                    self.getProjectColumn(column.id, resolve, reject);
                }
            }
            else if (reject) reject("Something happened with ID: " + project.id);
        });
    };

    this.ensureProject = function(column_id, resolve, reject)
    {
        var project_id;
        for (var thisPID in self.cachedProjects)
        {
            if (column_id in self.cachedProjects[thisPID].columns)
            {
                project_id = thisPID;
                break;
            }
        }
        
        return project_id;
    };

    this.getProjectColumn = function(column_id, resolve, reject)
    {
        var project_id = self.ensureProject(column_id, resolve, reject);

        if (!project_id)
        {
            return reject({
                'message': "Couldn't find project that this column belongs to. Try !projects to refresh."
            });
        }

        self.github.projects.getProjectCards({
            'column_id': column_id
        }, function(err, res)
        {
            if (res)
            {
                var cards = [];
                for (var card of res)
                {
                    var splitContentURL = card.content_url.split("/");
                    self.cachedProjects[project_id].columns[column_id].cards[splitContentURL[splitContentURL.length - 1]] = {
                        'id': card.id,
                        'note': card.note
                    };
                }

                if (resolve) resolve(project_id);
            }
            else
            {
                console.log(err);
                if (reject) reject(err);
            }
        });
    };
};