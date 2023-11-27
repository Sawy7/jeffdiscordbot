const { prefix, token, appID, language } = require("../config.json");
const chatStrings = require("../chat-strings.json");
const { readdirSync } = require("fs");
const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus, VoiceConnectionStatus } = require("@discordjs/voice");

class Server {
    constructor(id) {
        this.id = id;
        this.voiceConnection;
        this.audioPlayer;
        this.audioSubscription;
        this.soundQueue = [];
        this.soundVolume = 0.5;
    }

    createVoiceConnection(voiceChannel) {
        if (this.voiceConnection && this.voiceConnection.joinConfig.channelId === voiceChannel.id) {
            return;
        }

        this.voiceConnection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: voiceChannel.guild.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        this.voiceConnection.on(VoiceConnectionStatus.Disconnected, async (oldState, newState) => {
            this.voiceConnection.destroy();
            this.voiceConnection = undefined;
        });
    }

    queueSound(voiceChannel, soundName, interaction) {
        this.createVoiceConnection(voiceChannel);
        // TODO: What if 'sfx' does not exist?
        var soundDirectory = readdirSync("./sfx/");
        if (soundDirectory.includes(soundName + ".mp3")) {
            try {
                interaction.reply(`🔊 ${chatStrings[language]["sfxplaying"]} \`${soundName}\``);
            } catch (error) {
                console.error(error);
            }
            this.soundQueue.push({
                "soundName": soundName,
                "interaction": interaction
            });
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
        this.audioSubscription = this.voiceConnection.subscribe(this.audioPlayer);

        const soundFilePath = `./sfx/${this.soundQueue[0]["soundName"]}.mp3`;
        const sound = createAudioResource(soundFilePath, { inlineVolume: true });
        sound.volume.setVolume(this.soundVolume);
        this.audioPlayer.play(sound);

        this.audioPlayer.once(AudioPlayerStatus.Idle, async () => {
            const interaction = await this.soundQueue[0]["interaction"];
            try {
                interaction.editReply(`✅ ${chatStrings[language]["sfxplayed"]} \`${this.soundQueue[0]["soundName"]}\``);
            } catch (error) {
                console.error(error);
            }
            this.soundQueue.shift();
            if (this.soundQueue.length > 0) {
                this.playSound();
            }
            // else if (this.streamingaudio.length > 0) {
            //     const stream = createAudioResource(this.streamingaudio[0], { inlineVolume: true });
            //     stream.volume.setVolume(this.streamingaudio[1]);
            //     this.audioPlayer.play(stream);
            // }
            else {
                if (this.audioSubscription) {
                    this.audioSubscription.unsubscribe();
                    this.audioSubscription = undefined;
                }
                this.audioPlayer = undefined;
            }
        });
    }

    printConnection() {
        console.log(this.voiceConnection);
    }
}

module.exports = Server;