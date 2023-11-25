const { SlashCommandBuilder } = require("discord.js");

class Command {
    constructor(name, description, callback) {
        this.createSlashCommand(name, description);
        this.callback = callback;
    }

    createSlashCommand(name, description) {
        this.commandObj = (new SlashCommandBuilder()
            .setName(name)
            .setDescription(description)
        );
    }

    toJSON() {
        return this.commandObj.toJSON();
    }
}

module.exports = Command;