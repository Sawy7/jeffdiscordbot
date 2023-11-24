const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require('@discordjs/voice');
const {
    prefix,
    token,
    language
} = require("./config.json");
const chatstrings = require("./chat-strings.json");
const client = new Client({
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
const fs = require("fs");
const { Readable } = require("stream");
const http = require("http");
const https = require("https");
const { getAudioBuffer } = require('simple-tts-mp3');

class dcServer {
    constructor(msg) {
        this.guildid = msg.guild.id;
        this.dispatcher;
        this.audioPlayer;
        this.queue = [];
        this.msgQueue = [];
        this.webusermsg = null;
        this.streamingaudio = [];
    }
    GetGuildId() {
        return this.guildid;
    }
    async SfxGet(sfxname, msg) {
        const channel = msg.member.voice.channel;
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        var sfxDirectory = fs.readdirSync("./sfx/");
        if (sfxDirectory.includes(sfxname.split("/")[1])) {
            this.queue.push(sfxname);
            this.msgQueue.push(msg);
            msg.react("⏩");
            if (this.queue.length == 1) {
                this.SfxPlay(connection, 0.5);
            }
        }
        else {
            msg.react("❓");
        }
    }
    SfxPlay(connection, sfvolume) {
        if (this.audioPlayer === undefined)
            this.audioPlayer = createAudioPlayer();
        const song = createAudioResource(this.queue[0], { inlineVolume: true });
        song.volume.setVolume(sfvolume);
        this.audioPlayer.play(song);
        connection.subscribe(this.audioPlayer);

        this.audioPlayer.once(AudioPlayerStatus.Idle, () => {
            this.queue.shift();
            this.msgQueue[0].react("✅");
            try {
                this.msgQueue[0].reactions.cache.get("⏩").remove();
            } catch (error) {
                console.error("Error: Failed to remove reactions. Details:\n" + error);
            }
            this.msgQueue.shift();
            if (this.queue.length > 0) {
                this.SfxPlay(connection, sfvolume);
            }
            else if (this.streamingaudio.length > 0) {
                const stream = createAudioResource(this.streamingaudio[0], { inlineVolume: true });
                stream.volume.setVolume(this.streamingaudio[1]);
                this.audioPlayer.play(stream);
            }
            else {
                this.audioPlayer = undefined;
            }
        });
    }
    async TtsGet(ttsmsg, msg) {
        const channel = msg.member.voice.channel;
        const connection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guild.id,
            adapterCreator: channel.guild.voiceAdapterCreator,
        });
        getAudioBuffer(ttsmsg, language)
            .then(buffer => {
                const readableBuffer = Readable.from(buffer);
                this.queue.push(readableBuffer);
                this.msgQueue.push(msg);
                msg.react("⏩");
                if (this.queue.length == 1) {
                    this.SfxPlay(connection, 1);
                }
            });
    }
}

var workingDCServers = [];

function LeaveCheck() {
    var channels = client.voice.connections.array();
    for (let i = 0; i < channels.length; i++) {
        var membersNo = channels[i].channel.members.size;
        if (membersNo == 1) {
            let timedateob = new Date();
            var date = timedateob.getDate() + "/" + (timedateob.getMonth() + 1) + "/" + String(timedateob.getFullYear()).substring(2);
            var time = timedateob.getHours() + ":" + timedateob.getMinutes() + ":" + timedateob.getSeconds();
            var inactivemsg = "[" + date + " " + time + "] Leaving inactive voice channel on " + channels[i].channel.guild.name;
            console.log("\x1b[33m%s\x1b[0m", inactivemsg);
            fs.appendFile("./leaving.log", inactivemsg + "\n", function (err) {
                if (err) {
                    return console.log(err);
                }
            });
            channels[i].channel.leave();
        }
    }
}
setInterval(LeaveCheck, 900000);

function JoinVoiceMsg(msg) {
    msg.reply(chatstrings[language].joinvoicefirst);
}

function downloadFileSecure(url, name, path) {
    const file = createWriteStream(path + name);
    const request = https.get(url, function (response) {
        response.pipe(file);
    });
}

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // https://discord.js.org/#/docs/main/stable/typedef/ActivityType
    client.user.setActivity("tvoji mámu", {
        type: "WATCHING"
        //url: "https://www.twitch.tv/drdisrespect"
    });
});

client.on('messageCreate', msg => {
    if (msg.content === 'ping') {
        msg.reply('pong');
    }
});

client.on('messageCreate', msg => {
    if (msg.channel.name == "bot-ideas" & msg.author.bot == false) {
        var ideasfile = JSON.parse(fs.readFileSync("./ideas.json"));
        ideasfile.ideas.push(
            {
                nickname: msg.member.user.tag,
                message: msg.content
            }
        )
        fs.writeFileSync('./ideas.json', JSON.stringify(ideasfile, null, "\t"), "utf8");
        msg.reply(chatstrings[language].suggestion);
    }
});

client.on('messageCreate', async msg => {
    if (!msg.guild) return;
    var currentServerIndex = -1;
    for (let i = 0; i < workingDCServers.length; i++) {
        if (workingDCServers[i].GetGuildId() == msg.guild.id) {
            currentServerIndex = i;
        }
    }
    if (currentServerIndex == -1) {
        workingDCServers.push(new dcServer(msg));
        currentServerIndex = workingDCServers.length - 1;
    }

    if (msg.content.startsWith(prefix + "s ")) {
        if (msg.member.voice.channel) {
            const args = msg.content.split(" ");
            const sfxname = args[1];
            if (sfxname == "list") {
                var msgToSend = chatstrings[language].sfxlist + " " + chatstrings[language].sfxsubmit + "\n" + chatstrings[language].cmdis + prefix + chatstrings[language].sfxcmd + "\n\n";
                msg.channel.send(msgToSend);

                try {
                    var dir = "./sfx/";
                    var sfxDirectory = fs.readdirSync(dir);
                    sfxDirectory.sort(
                        function (a, b) {
                            return fs.statSync(dir + b).mtime.getTime() - fs.statSync(dir + a).mtime.getTime();
                        }
                    );

                    msgToSend = "**" + chatstrings[language].sfxtopten + "**\n"
                    for (let i = 0; i < 10; i++) {
                        const split = sfxDirectory[0].split(".");
                        msgToSend += "`" + split[0] + "` ";
                        sfxDirectory.shift();
                    }
                    msg.channel.send(msgToSend);

                    sfxDirectory.sort();
                    msgToSend = "\n**" + chatstrings[language].sfxeverythingelse + "**\n"
                    sfxDirectory.forEach(file => {
                        const split = file.split(".");
                        var effectString = "`" + split[0] + "` ";
                        if (msgToSend.length + effectString.length > 2000) {
                            msg.channel.send(msgToSend);
                            msgToSend = effectString;
                        }
                        else {
                            msgToSend += effectString;
                        }
                    });
                    msg.channel.send(msgToSend);

                } catch (error) {
                    console.error("Error: You have to create the directory 'sfx' and fill it with .mp3 files first.");
                }
            }
            else {
                workingDCServers[currentServerIndex].SfxGet("sfx/" + sfxname + ".mp3", msg);
                // song console report
                let timedateob = new Date();
                var date = timedateob.getDate() + "/" + (timedateob.getMonth() + 1) + "/" + String(timedateob.getFullYear()).substring(2);
                var time = timedateob.getHours() + ":" + timedateob.getMinutes() + ":" + timedateob.getSeconds();
                var consoleReport = "[" + date + " " + time + "] " + msg.member.nickname + " played '.s " + sfxname + "' on " + msg.member.guild.name;
                console.log("\x1b[32m%s\x1b[0m", consoleReport);
            }
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    if (msg.channel.name == "effect-ideas" & msg.author.bot == false) {
        var mp3File = msg.attachments.first();
        if (mp3File) {
            if (mp3File.name.endsWith(".mp3")) {
                var submitPath = "./sfxSubmit/";
                if (!fs.existsSync(submitPath)) {
                    fs.mkdirSync(submitPath);
                }
                downloadFileSecure(mp3File.url, mp3File.name, submitPath);
                msg.reply("díky za příspěvek. Admin to musí schválit.")
                    .then(adminReply => {
                        adminReply.react("✅");
                        adminReply.react("❌");
                        // owner id could use some improvement - maybe any admin?
                        adminReply.awaitReactions((reaction, user) => msg.guild.ownerID == user.id && (reaction.emoji.name == "✅" || reaction.emoji.name == "❌"),
                            { max: 1, time: 43200000 }).then(reactions => { // time = 12 hours
                                if (reactions.first().emoji.name == "✅") {
                                    // admin approves
                                    console.log("positive");
                                    fs.rename(submitPath + mp3File.name, "./sfx/" + mp3File.name, err => {
                                        if (err) console.log("Could not move approved effect.");
                                    })
                                }
                                else {
                                    // admin disapproves
                                    console.log("negative");
                                    fs.rm(submitPath + mp3File.name, err => {
                                        if (err) console.log("Could not remove disapproved effect.");
                                    })
                                }
                            }).catch(() => {
                                console.log("timeout");
                            });
                    }).catch(() => {
                        console.error("Error: Could not create admin reaction message.");
                    });
            }
            else {
                msg.react("❓");
            }
        }
        else {
            msg.react("❌");
        }
    }

    else if (msg.content.startsWith(prefix + "t ")) {
        if (msg.member.voice.channel) {
            const args = msg.content.split(" ");
            var ttsmsg = "";
            for (let i = 1; i < args.length; i++) {
                ttsmsg += args[i];
            }
            workingDCServers[currentServerIndex].TtsGet(ttsmsg, msg);
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content.startsWith(prefix + "r ")) {
        if (msg.member.voice.channel) {
            const args = msg.content.split(" ");
            const radioname = args[1];
            var radiolink = null;
            var radio;
            try {
                radio = JSON.parse(fs.readFileSync("./radio.json"));
            } catch (error) {
                console.error("Error: You have to create the file 'radio.json' first. Template is available in the bot's directory.");
                return;
            }
            var radioflag;
            if (radioname == "list") {
                var final_msg = chatstrings[language].radiolist + "\n" + chatstrings[language].cmdis + prefix + chatstrings[language].radiocmd + "\n\n";
                for (let i = 0; i < radio.streams.length; i++) {
                    radioflag = ":flag_" + radio.streams[i].locale + ":";
                    final_msg += ":radio: `" + radio.streams[i].name + "` " + radioflag + "\n";
                }
                msg.channel.send(final_msg);
                msg.channel.send(chatstrings[language].radiovol);
                return;
            }
            else if (radioname == "add") {
                var nameadd = args[2];
                var localeadd = args[3];
                var linkadd = args[4];
                radio.streams.push(
                    {
                        name: nameadd,
                        locale: localeadd,
                        link: linkadd
                    }
                )
                fs.writeFileSync('./radio.json', JSON.stringify(radio, null, "\t"), "utf8");
                msg.channel.send(":radio: `" + nameadd + "` " + ":flag_" + localeadd + ": " + chatstrings[language].radiostream + " " + linkadd + " " + chatstrings[language].radioadd + "\n");
                return;
            }
            else if (radioname == "remove") {
                var nameremove = args[2];
                for (i = 0; i < radio.streams.length; i++) {
                    if (nameremove == radio.streams[i].name) {
                        msg.channel.send(":radio: `" + radio.streams[i].name + "` " + ":flag_" + radio.streams[i].locale + ": " + chatstrings[language].radiostream + " " + radio.streams[i].link + " " + chatstrings[language].radioremove + "\n");
                        radio.streams.splice(i, 1);
                    }
                }
                fs.writeFileSync('./radio.json', JSON.stringify(radio, null, "\t"), "utf8");
                return;
            }
            for (let i = 0; i < radio.streams.length; i++) {
                if (radio.streams[i].name == radioname) {
                    radiolink = radio.streams[i].link;
                    radioflag = ":flag_" + radio.streams[i].locale + ":";
                }
            }
            var radiovol = 0.2;
            if (args[2] != undefined) {
                radiovol = args[2];
            }
            if (radiolink != null) {
                msg.channel.send(":satellite: " + chatstrings[language].radiotuning + " :radio: `" + radioname + "` " + radioflag);
                const channel = msg.member.voice.channel;
                const connection = joinVoiceChannel({
                    channelId: channel.id,
                    guildId: channel.guild.id,
                    adapterCreator: channel.guild.voiceAdapterCreator,
                });
                if (workingDCServers[currentServerIndex].audioPlayer === undefined)
                    workingDCServers[currentServerIndex].audioPlayer = createAudioPlayer();
                connection.subscribe(workingDCServers[currentServerIndex].audioPlayer);
                const readableStream = await fetch(radiolink).then(r => Readable.fromWeb(r.body));
                const radioStream = createAudioResource(readableStream, { inlineVolume: true });
                radioStream.volume.setVolume(radiovol);
                workingDCServers[currentServerIndex].audioPlayer.play(radioStream);
                workingDCServers[currentServerIndex].streamingaudio[0] = radiolink;
                workingDCServers[currentServerIndex].streamingaudio[1] = radiovol;
                workingDCServers[currentServerIndex].queue = [];
            }
            else {
                msg.reply(chatstrings[language].unknownradio);
            }
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content == prefix + "stop") {
        if (msg.member.voice.channel) {
            if (workingDCServers[currentServerIndex].audioPlayer !== undefined) {
                msg.react("✅");
                workingDCServers[currentServerIndex].audioPlayer.stop();
                workingDCServers[currentServerIndex].audioPlayer = undefined;
                workingDCServers[currentServerIndex].streamingaudio = [];
                workingDCServers[currentServerIndex].queue = [];
            }
            else {
                msg.reply(chatstrings[language].nothingtostop);
            }
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content == prefix + "wconnect") {
        if (msg.member.voice.channel) {
            workingDCServers[currentServerIndex].webusermsg = msg;
            msg.reply(chatstrings[language].wconsole);
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content == prefix + "join") {
        const channel = msg.member.voice.channel;
        if (msg.member.voice.channel) {
            const connection = joinVoiceChannel({
                channelId: channel.id,
                guildId: channel.guild.id,
                adapterCreator: channel.guild.voiceAdapterCreator,
            });
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content == prefix + "guildinfo") {
        msg.channel.send(msg.member.guild.name);
        msg.channel.send(msg.member.guild.id);
    }

    else if (msg.content == prefix + "moveall") {
        return; // Disabled for now
        if (msg.member.voice.channel) {
            msg.member.voice.channel.join();
            var channels = client.voice.connections.array();
            var formerChannel = msg.member.voice.channel;
            var checkCounter = 0;
            var newChannel;

            msg.guild.member(client.user).setNickname("[" + chatstrings[language].moveall + "]");
            checkForNewChannel();

            function checkForNewChannel() {
                channels.forEach(ch => {
                    if (ch.channel.guild.id == msg.member.guild.id) {
                        if (formerChannel.id == ch.channel.id) {
                            checkCounter++;
                            if (checkCounter >= 200) {
                                msg.guild.member(client.user).setNickname("");
                                return;
                            }
                            setTimeout(checkForNewChannel, 50);
                        }
                        else {
                            newChannel = ch.channel;
                            msg.guild.member(client.user).setNickname("");
                            moveToNewChannel();
                        }
                    }
                });
            }

            function moveToNewChannel() {
                formerChannel.members.forEach(member => {
                    member.voice.setChannel(newChannel);
                });
            }
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content == prefix + "help") {
        var timeNow = new Date();
        const exampleEmbed = new Discord.MessageEmbed()
            .setColor('#0099ff')
            .setTitle(chatstrings[language].helpheader)
            .setURL('https://github.com/Sawy7/jeffdiscordbot/blob/master/usage-gifs.md')
            .setDescription(chatstrings[language].helpdesc)
            .setThumbnail('https://cdn.discordapp.com/avatars/336569159188086784/e1af040e8a840e266ea35e8be1053bc1.png')
            .setTimestamp()
            .setFooter('© Jan Němec ' + timeNow.getFullYear(), 'https://cdn.discordapp.com/avatars/336569159188086784/e1af040e8a840e266ea35e8be1053bc1.png');
        msg.channel.send(exampleEmbed)
    }

    else if (msg.content == prefix + "staryahoj") {
        msg.author.send("stary ahoj!");
    }
});

function WebSfx(urlinfo) {
    urlinfo = urlinfo.substring(1);
    const args = urlinfo.split(".");
    var index;
    for (let i = 0; i < workingDCServers.length; i++) {
        if (workingDCServers[i].guildid == args[2]) {
            index = i;
        }
    }
    if (args[1] == "mp3" && workingDCServers[index].webusermsg.member.voice.channelID != null) {
        workingDCServers[index].webusermsg.channel.send("`[WebConsole]:`" + prefix + "s " + args[0]);
        workingDCServers[index].SfxGet("sfx/" + args[0] + "." + args[1], workingDCServers[index].webusermsg);
    }
}

// HTTP server
http.createServer(function (req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    WebSfx(req.url); //key
    res.write(
        "<script>function httpGet(theUrl){var xmlHttp = new XMLHttpRequest(); xmlHttp.open( 'GET', theUrl + '.' + document.getElementById('servers').value, false ); xmlHttp.send( null ); return xmlHttp.responseText;}</script><select id='servers'>"
    );
    for (let i = 0; i < workingDCServers.length; i++) {
        if (workingDCServers[i].webusermsg != null) {
            res.write(
                "<option value='" + workingDCServers[i].guildid + "'>" + workingDCServers[i].webusermsg.member.guild.name + " (" + workingDCServers[i].webusermsg.member.nickname + ")</option>"
            );
        }
    }
    res.write("</select><br>");
    var buttons = "";
    fs.readdirSync("./sfx").forEach(file => {
        const split = file.split(".");
        buttons += "<button class='btn info' onclick=javascript:httpGet('" + file + "')>" + split[0] + "</button><br>";
    });
    //res.write(
    //  "Username: <input id='username' type='text'></input><br>"
    //);
    res.write(
        "<style>.btn {border: none; background-color: inherit; padding: 14px 28px; font-size: 16px; cursor: pointer; display: inline-block;} .btn:hover {background: #eee;} .success {color: green;} .info {color: dodgerblue;} .warning {color: orange;} .danger {color: red;} .default {color: black;}</style>"
    );
    res.write(buttons);
    res.end();
}).listen(2223);

client.login(token);