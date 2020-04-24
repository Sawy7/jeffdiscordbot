const Discord = require('discord.js');
const {
	prefix,
	token
} = require("./config.json");
const client = new Discord.Client();
const fs = require("fs");
const ytdl = require("ytdl-core");
const googleTTS = require("google-tts-api");
const http = require("http");

class dcServer
{
    constructor(guildid)
    {
        this.guildid = guildid;
        this.dispatcher;
        this.queue = [];
        this.webusermsg = null;
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
            if (this.queue.length > 0) 
            {
                this.SfxPlay(connection, sfvolume);
            }
        });
    }
    async TtsGet(ttsmsg, msg)
    {
        const connection = await msg.member.voice.channel.join();
        var ttsurl = await googleTTS(ttsmsg, "cs", 1)
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

function JoinVoiceMsg(msg)
{
    msg.reply("Nejdřív se musíš připojit do voice kanálu!");
}

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
    if (msg.content === 'ping') {
        msg.reply('pong');
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
        workingDCServers.push(new dcServer(msg.guild.id));
        currentServerIndex = workingDCServers.length - 1;
    }

    if (msg.content.startsWith(prefix+"s ")) {
        if (msg.member.voice.channel) {
            const args = msg.content.split(" ");
            const sfxname = args[1];
            if (sfxname == "list") {
                var final_msg = "Tady jsou zvukové efekty, které můžeš spamovat do chatu.\nSyntaxe je `"+ prefix + "s [efekt]`.\n";
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

    if (msg.content.startsWith(prefix+"r ")) {
        if (msg.member.voice.channel) {
            const args = msg.content.split(" ");
            const radioname = args[1];
            var radiolink = null;
            var radio = JSON.parse(fs.readFileSync("./radio.json"));
            if (radioname == "list") {
                var final_msg = "Tady jsou všechna rádia, která znám.\nSyntaxe je `"+ prefix + "r [radio] ([volume])`.\n";
                for (let i = 0; i < radio.streams.length; i++) {
                    final_msg += ":radio: `" + radio.streams[i].name + "` :flag_" + radio.streams[i].locale + ":\n";
                }
                msg.channel.send(final_msg);
                msg.channel.send("Volume může být číslo (i s desetinnou tečkou) od 0 do 1+. Bez zadání tohoto parametru se rádio nastaví na defaultní hodnotu 0.2.");
                return;
            }
            for (let i = 0; i < radio.streams.length; i++) {
                if (radio.streams[i].name == radioname) {
                    radiolink = radio.streams[i].link;
                }
            }
            var radiovol = 0.2;
            if (args[2] != undefined) {
                radiovol = args[2];
            }
            if (radiolink != null) {
                const connection = await msg.member.voice.channel.join();
                const dispatcher = connection.play(radiolink, {
                    volume: radiovol,
                });
            }
            else {
                msg.reply("tohle rádio neznám, starý.");
            }
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content == prefix+"wconnect") {
        if (msg.member.voice.channel) {
            workingDCServers[currentServerIndex].webusermsg = msg;
            msg.reply("jsi sledován. Můžeš hrát z WebConsole.");
        }
        else {
            JoinVoiceMsg(msg);
        }
    }

    else if (msg.content.startsWith("!play")) {
        if (msg.member.voice.channel) {
            if (msg.channel.name != "music-chat") {
                workingDCServers[currentServerIndex].TtsGet(msg.member.nickname + ", ještě jednou napíšeš vykřičník play mimo music čet a pošlu na tebe Sawyho.", msg);
            }
        }
        else {
            msg.reply("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
        }
    }

    else if (msg.content == prefix+"guildinfo") {
        msg.channel.send(msg.member.guild.name);
        msg.channel.send(msg.member.guild.id);
    }

    else if (msg.content == prefix+"test") {
        var radio = JSON.parse(fs.readFileSync("./radio.json"));
        console.log(radio.streams[0].name);
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