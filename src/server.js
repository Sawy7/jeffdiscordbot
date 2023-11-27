const { prefix, token, appID, language } = require("../config.json");
const chatStrings = require("../chat-strings.json");
const { readdirSync } = require("fs");
const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus } = require("@discordjs/voice");

class Server {
    constructor(id) {
        this.id = id;
        this.voiceConnection;
        this.audioPlayer;
        this.soundQueue = [];
        this.soundVolume = 0.5;
    }

    queueSound(voiceChannel, soundName, interaction) {
        // TODO: Better status checking
        if (this.voiceConnection === undefined)
            this.voiceConnection = joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: voiceChannel.guild.id,
                adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            });
        // TODO: What if 'sfx' does not exist?
        var soundDirectory = readdirSync("./sfx/");
        if (soundDirectory.includes(soundName+".mp3")) {
            interaction.reply(`🔊 ${chatStrings[language]["sfxplaying"]} \`${soundName}\``);
            this.soundQueue.push(`./sfx/${soundName}.mp3`);
            // this.msgQueue.push(msg);
            if (this.soundQueue.length == 1) {
                this.playSound();
            }
        }
        else {
            interaction.reply(`❓ ${chatStrings[language]["sfxunknown"]}`);
        }
    }

    playSound() {
        if (this.audioPlayer === undefined)
            this.audioPlayer = createAudioPlayer();
        this.voiceConnection.subscribe(this.audioPlayer);

        const sound = createAudioResource(this.soundQueue[0], { inlineVolume: true });
        sound.volume.setVolume(this.soundVolume);
        this.audioPlayer.play(sound);

        this.audioPlayer.once(AudioPlayerStatus.Idle, () => {
            this.soundQueue.shift();
            // this.msgQueue[0].react("✅");
            // try {
            //     this.msgQueue[0].reactions.cache.get("⏩").remove();
            // } catch (error) {
            //     console.error("Error: Failed to remove reactions. Details:\n" + error);
            // }
            // this.msgQueue.shift();
            if (this.soundQueue.length > 0) {
                this.playSound();
            }
            // else if (this.streamingaudio.length > 0) {
            //     const stream = createAudioResource(this.streamingaudio[0], { inlineVolume: true });
            //     stream.volume.setVolume(this.streamingaudio[1]);
            //     this.audioPlayer.play(stream);
            // }
            else {
                // TODO: Smarter connection and player mgmt
                this.audioPlayer = undefined;
                this.voiceConnection.destroy();
                this.voiceConnection = undefined;
            }
        });
    }
}

module.exports = Server;