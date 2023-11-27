const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, REST, Routes, Collection, Events } = require("discord.js");
const { prefix, token, appID, language } = require("../config.json");
const Command = require("./command");
const Server = require("./server");

class Bot {
    constructor() {
        this.client = this.createClientInstance();
        this.initServerStorage();
        this.createSlashCommands();
        this.registerCallbacks();
        this.login();
    }

    initServerStorage() {
        this.servers = new Collection();
    }

    createClientInstance() {
        return new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMessageTyping,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.MessageContent
            ], partials: [Partials.Message, Partials.Channel, Partials.Reaction]
        });
    }

    login() {
        this.client.login(token);
    }

    registerCallbacks() {
        this.client.once("ready", () => {
            console.log(`Logged in as ${this.client.user.tag}!`);
        });

        this.client.on(Events.InteractionCreate, async interaction => {
            if (!interaction.isChatInputCommand()) return;

            const command = this.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.callback(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        });
    }

    createSlashCommands() {
        // Create collection
        this.commands = new Collection();

        // Define commands
        const pingCommand = new Command("ping", "Replies with Pong!");
        pingCommand.addCallback(async (interaction) => {
            await interaction.reply("pong!");
        });
        this.commands.set("ping", pingCommand);

        const soundCommand = new Command("sound", "Play a sound effect");
        soundCommand.addCallback(async (interaction) => {
            const effectName = interaction.options.getString("name") ?? "No sound name provided";
            // await interaction.reply(effectName);

            const serverID = interaction.guild.id;
            let existingServer = this.servers.get(serverID);
            if (existingServer === undefined) {
                existingServer = new Server(serverID);
                this.servers.set(serverID, existingServer);
            }
            const voiceChannel = interaction.member.voice.channel;
            if (voiceChannel) {
                console.log(voiceChannel);
                existingServer.playSound(voiceChannel, effectName);
            }
            else
                console.log("[no voice]");
        });
        soundCommand.addStringOption("name", "Name of the sound effect");
        this.commands.set("sound", soundCommand);

        // Send everything to Discord HQ
        const rest = new REST().setToken(token);
        const commandsAsJSON = this.commands.map(command => command.toJSON());

        (async () => {
            try {
                const data = await rest.put(
                    Routes.applicationCommands(appID),
                    { body: commandsAsJSON },
                );

                console.log(`Successfully reloaded ${data.length} application (/) commands.`);
            } catch (error) {
                console.error(error);
            }
        })();
    }
}

// Start here
let bot = new Bot();