const { Client, GatewayIntentBits, Partials, SlashCommandBuilder, REST, Routes, Collection, Events } = require("discord.js");
const { readdirSync, statSync } = require("fs");
const { prefix, token, appID, language } = require("../config.json");
const chatStrings = require("../chat-strings.json");
const Command = require("./command");
const Server = require("./server");

class Bot {
    constructor() {
        this.client = this.createClientInstance();
        this.initServerStorage();
        this.createSlashCommands();
        this.registerCallbacks();
        this.cacheSoundNames();
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

    registerCallbacks() {
        this.client.once("ready", () => {
            console.log(`Logged in as ${this.client.user.tag}!`);
        });

        this.client.on(Events.InteractionCreate, async interaction => {
            const command = this.commands.get(interaction.commandName);
            if (interaction.isChatInputCommand()) {
                if (!command) {
                    console.error(`No command matching ${interaction.commandName} was found.`);
                    return;
                }

                try {
                    await command.callback(interaction);
                } catch (error) {
                    console.error(error);
                    if (interaction.replied || interaction.deferred) {
                        await interaction.followUp({ content: "There was an error while executing this command!", ephemeral: true });
                    } else {
                        await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
                    }
                }
            }
            else if (interaction.isAutocomplete()) {
                try {
                    await command.autoCompleteCallback(interaction);
                } catch (error) {
                    console.error(error);
                }
            }
        });
    }

    cacheSoundNames() {
        const soundDir = "./sfx/";
        this.soundCache = readdirSync(soundDir);
        this.soundCache.sort((a, b) => {
            return statSync(soundDir + b).mtime.getTime() - statSync(soundDir + a).mtime.getTime();
        });
        this.soundCache = this.soundCache.map(sound => sound.split(".")[0]);
    }

    login() {
        this.client.login(token);
    }

    getServer(serverID) {
        let existingServer = this.servers.get(serverID);
        if (existingServer !== undefined)
            return existingServer;
        existingServer = new Server(serverID);
        this.servers.set(serverID, existingServer);
        return existingServer;
    }

    createSlashCommands() {
        // Create collection
        this.commands = new Collection();

        // Define commands
        const pingCommand = new Command("ping", "Replies with Pong!");
        pingCommand.addCallback(async (interaction) => {
            try {
                await interaction.reply("pong!");
            } catch (error) {
                console.error(error);
            }
        });
        this.commands.set("ping", pingCommand);

        const soundCommand = new Command("sound", "Play a sound effect");
        soundCommand.addCallback(async (interaction) => {
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                await interaction.reply(chatStrings[language].joinvoicefirst);
                return;
            }

            const effectName = interaction.options.getString("name") ?? "No sound name provided";
            const serverID = interaction.guild.id;
            const server = this.getServer(serverID);

            server.queueSound(voiceChannel, effectName, interaction);
        });
        soundCommand.addStringOption("name", "Name of the sound effect", true);
        soundCommand.addAutoCompleteLogic(async (interaction) => {
            const focusedValue = interaction.options.getFocused();
            let filtered;
            if (focusedValue.length == 0) {
                filtered = this.soundCache.slice(0, 10);
            }
            else
                filtered = this.soundCache.filter(choice => choice.startsWith(focusedValue));
            await interaction.respond(
                filtered.map(choice => ({ name: choice, value: choice })),
            );
        });
        this.commands.set("sound", soundCommand);

        const ttsCommand = new Command("tts", "Say a thing using TTS");
        ttsCommand.addCallback(async (interaction) => {
            const voiceChannel = interaction.member.voice.channel;
            if (!voiceChannel) {
                await interaction.reply(chatStrings[language].joinvoicefirst);
                return;
            }

            const ttsText = interaction.options.getString("text") ?? "No text provided";
            const serverID = interaction.guild.id;
            const server = this.getServer(serverID);

            server.queueTTS(voiceChannel, ttsText, interaction);
        });
        ttsCommand.addStringOption("text", "Text to say", false);
        this.commands.set("tts", ttsCommand);

        const listSoundsCommand = new Command("listsounds", "List all available sound effects");
        listSoundsCommand.addCallback(async (interaction) => {
            const ideasChannel = this.client.channels.cache.find(channel => channel.name === "effect-ideas" && channel.guildId === interaction.guildId);
            // Intro msg
            let listMsg = chatStrings[language].sfxlist + " " + chatStrings[language].sfxsubmit;
            listMsg += ` <#${ideasChannel.id}>.\n` + chatStrings[language].cmdis;
            listMsg += chatStrings[language].sfxcmd + "\n\n";
            // Parse out the soundNames
            try {
                interaction.reply(listMsg);
                const dir = "./sfx/";

                listMsg = `**${chatStrings[language].sfxtopten}**\n`;
                for (let i = 0; i < 10; i++) {
                    listMsg += `\`${this.soundCache[i]}\` `;
                }
                interaction.channel.send(listMsg);

                const sfxDirectory = this.soundCache.slice(10).sort();
                listMsg = `\n**${chatStrings[language].sfxeverythingelse}**\n`;
                sfxDirectory.forEach(soundName => {
                    let effectString = `\`${soundName}\` `;
                    if (listMsg.length + effectString.length > 2000) {
                        interaction.channel.send(listMsg);
                        listMsg = effectString;
                    }
                    else {
                        listMsg += effectString;
                    }
                });
                interaction.channel.send(listMsg);
            } catch (error) {
                console.error(error);
            }
        });
        this.commands.set("listsounds", listSoundsCommand);

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