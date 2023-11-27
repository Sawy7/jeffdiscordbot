const { SlashCommandBuilder } = require("discord.js");

class Command {
    constructor(name, description) {
        this.createSlashCommand(name, description);
    }

    createSlashCommand(name, description) {
        this.commandObj = (new SlashCommandBuilder()
            .setName(name)
            .setDescription(description)
        );
    }

    addCallback(callback) {
        this.callback = callback;
    }

    addStringOption(name, description) {
        this.commandObj.addStringOption(option =>
            option.setName(name)
                .setDescription(description)
                .setRequired(true));
    }

    toJSON() {
        return this.commandObj.toJSON();
    }
}

module.exports = Command;