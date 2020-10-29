const Discord = require('discord.js');
const {
	prefix,
    token,
    language
} = require("./config.json");
const chatstrings = require("./chat-strings.json");
const client = new Discord.Client();
const fs = require("fs");
const ytdl = require("ytdl-core");
const googleTTS = require("google-tts-api");
const http = require("http");

class dcServer
{
    constructor(msg)
    {
        this.guildid = msg.guild.id;
        this.dispatcher;
        this.queue = [];
        this.webusermsg = null;
        this.streamingaudio = [];
    }
    GetGuildId()
    {
        return this.guildid;
    }
    async SfxGet(sfxname, msg)
    {
        const connection = await msg.member.voice.channel.join();
        this.queue.push(sfxname);
        if (this.queue.length == 1) {
            this.SfxPlay(connection, 0.5);
        }
    }
    SfxPlay(connection, sfvolume)
    {
        this.dispatcher = connection.play(this.queue[0], {
            volume: sfvolume,
        });
        this.dispatcher.on('finish', () => {
            this.queue.shift();
            if (this.queue.length > 0) {
                this.SfxPlay(connection, sfvolume);
            }
            else if (this.streamingaudio.length > 0) {
                this.dispatcher = connection.play(this.streamingaudio[0], {
                    volume: this.streamingaudio[1],
                });
            }
        });
    }
    async TtsGet(ttsmsg, msg)
    {
        const connection = await msg.member.voice.channel.join();
        var ttsurl = await googleTTS(ttsmsg, language, 1)
        .then(function (url) {
            return url;    
        })
        this.queue.push(ttsurl);
        if (this.queue.length == 1) {
            this.SfxPlay(connection, 1);
        } 
    }
}

var workingDCServers = [];

function LeaveCheck()
{
    var channels = client.voice.connections.array();
    for (let i = 0; i < channels.length; i++) {
        var membersNo = channels[i].channel.members.size;
        //console.log("People in channel no." + (i+1) + ": " + membersNo);
        if (membersNo == 1) {
            let timedateob = new Date();
            var date = timedateob.getDate() + "/" + (timedateob.getMonth()+1) + "/" + String(timedateob.getFullYear()).substring(2);
            var time = timedateob.getHours() + ":" + timedateob.getMinutes() + ":" + timedateob.getSeconds();
            var inactivemsg = "[" + date + " " + time + "] Leaving inactive voice channel on " + channels[i].channel.guild.name;
            console.log("\x1b[33m%s\x1b[0m", inactivemsg);
            fs.appendFile("./leaving.log", inactivemsg + "\n", function(err) {
                if(err) {
                    return console.log(err);
                }
            });
            channels[i].channel.leave();
        }
    }
}
setInterval(LeaveCheck, 900000);

function JoinVoiceMsg(msg)
{
    msg.reply(chatstrings[language].joinvoicefirst);
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    // https://discord.js.org/#/docs/main/stable/typedef/ActivityType
    client.user.setActivity("tvoji mámu", {
        type: "WATCHING"
        //url: "https://www.twitch.tv/drdisrespect"
    });
});

client.on('message', msg => {
    if (msg.content === 'ping') {
        msg.reply('pong');
    }
});

client.on('message', msg => {
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

client.on('message', async msg => {
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

    if (msg.content.startsWith(prefix+"s ")) {
        if (msg.member.voice.channel) {
            const args = msg.content.split(" ");
            const sfxname = args[1];
            if (sfxname == "list") {
                var final_msg = chatstrings[language].sfxlist + "\n" + chatstrings[language].cmdis + prefix + chatstrings[language].sfxcmd + "\n\n";
                fs.readdirSync("./sfx").forEach(file => {
                    const split = file.split(".");
                    final_msg += "`" +split[0]+"` ";
                });
                msg.channel.send(final_msg);
            }
            else {
                workingDCServers[currentServerIndex].SfxGet("sfx/"+sfxname+".mp3", msg);
            } 
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content.startsWith(prefix+"t ")) {
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

    else if (msg.content.startsWith(prefix+"r ")) {
        if (msg.member.voice.channel) {
            const args = msg.content.split(" ");
            const radioname = args[1];
            var radiolink = null;
            var radio = JSON.parse(fs.readFileSync("./radio.json"));
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
            else if (radioname == "add")
            {
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
            else if (radioname == "remove")
            {
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
                //workingDCServers[currentServerIndex].SfxGet("sfx/tuning.mp3", msg); // only once apparently (bug maybe?)
                const connection = await msg.member.voice.channel.join();
                workingDCServers[currentServerIndex].dispatcher = connection.play(radiolink, {
                    volume: radiovol,
                });
                workingDCServers[currentServerIndex].streamingaudio[0] = radiolink;
                workingDCServers[currentServerIndex].streamingaudio[1] = radiovol;
                workingDCServers[currentServerIndex].queue = [];
            }
            else {
                msg.reply("tohle rádio neznám, starý.");
            }
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content == prefix+"stop") {
        if (msg.member.voice.channel) {
            workingDCServers[currentServerIndex].dispatcher.destroy();
            workingDCServers[currentServerIndex].streamingaudio = [];
        }
        else {
            JoinVoiceMsg(msg);
        }
      }

    else if (msg.content == prefix+"wconnect") {
        if (msg.member.voice.channel) {
            workingDCServers[currentServerIndex].webusermsg = msg;
            msg.reply(chatstrings[language].wconsole);
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content == prefix+"join") {
        if (msg.member.voice.channel) {
            msg.member.voice.channel.join();
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    // This is pretty server specific - let's not use it for now
    /*
    else if (msg.content.startsWith("!play")) {
        if (msg.member.voice.channel) {
            if (msg.channel.name != "music-chat") {
                workingDCServers[currentServerIndex].TtsGet(msg.member.nickname + ", ještě jednou napíšeš vykřičník play mimo music čet, tak na tebe pošlu Sawyho.", msg);
            }
        }
        else {
            msg.reply("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        }
    }
    */

    else if (msg.content == prefix+"guildinfo") {
        msg.channel.send(msg.member.guild.name);
        msg.channel.send(msg.member.guild.id);
    }

    else if (msg.content == prefix+"moveall") {
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

            function moveToNewChannel()
            {
                formerChannel.members.forEach(member => {
                    member.voice.setChannel(newChannel);
                });
            }
        }
        else {
            JoinVoiceMsg(msg);
        }        
    }

    else if (msg.content == prefix+"test") {
        msg.channel.send("!play something");       
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
        workingDCServers[index].SfxGet("sfx/"+args[0]+"."+args[1], workingDCServers[index].webusermsg);
    }
}

// HTTP server
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
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
}).listen(8080);

client.login(token);