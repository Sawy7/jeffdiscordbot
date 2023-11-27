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

    addStringOption(name, description, autoComplete) {
        this.commandObj.addStringOption(option =>
            option.setName(name)
                .setDescription(description)
                .setRequired(true)
                .setAutocomplete(autoComplete));
    }

    addAutoCompleteLogic(callback) {
        this.autoCompleteCallback = callback;
    }

    toJSON() {
        return this.commandObj.toJSON();
    }
}

module.exports = Command;