const { prefix, token, appID, language } = require("../config.json");
const chatStrings = require("../chat-strings.json");
const { readdirSync } = require("fs");
const { joinVoiceChannel, createAudioResource, createAudioPlayer, AudioPlayerStatus, VoiceConnectionStatus } = require("@discordjs/voice");
const { Readable } = require("stream");
const { getAudioBuffer } = require("simple-tts-mp3");

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

    queueTTS(voiceChannel, ttsMessage, interaction) {
        this.createVoiceConnection(voiceChannel);
        getAudioBuffer(ttsMessage, language)
            .then(buffer => {
                const readableBuffer = Readable.from(buffer);
                try {
                    interaction.reply(`🔊 ${chatStrings[language]["sfxplaying"]} \`${ttsMessage}\``);
                } catch (error) {
                    console.error(error);
                }
                this.soundQueue.push({
                    "ttsMessage": ttsMessage,
                    "ttsBuffer": readableBuffer,
                    "interaction": interaction
                });
                if (this.soundQueue.length == 1) {
                    this.playSound();
                }
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

        let pathToPlay;
        if ("soundName" in this.soundQueue[0])
            pathToPlay = `./sfx/${this.soundQueue[0]["soundName"]}.mp3`;
        else
            pathToPlay = this.soundQueue[0]["ttsBuffer"];
        const sound = createAudioResource(pathToPlay, { inlineVolume: true });
        sound.volume.setVolume(this.soundVolume);
        this.audioPlayer.play(sound);

        this.audioPlayer.once(AudioPlayerStatus.Idle, async () => {
            const interaction = await this.soundQueue[0]["interaction"];
            try {
                const playedName = "soundName" in this.soundQueue[0] ? this.soundQueue[0]["soundName"] : this.soundQueue[0]["ttsMessage"];
                interaction.editReply(`✅ ${chatStrings[language]["sfxplayed"]} \`${playedName}\``);
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