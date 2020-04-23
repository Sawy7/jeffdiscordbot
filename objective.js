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
        this.webusermsg;
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

    else if (msg.content == prefix+"wconnect") {
        if (msg.member.voice.channel) {
            workingDCServers[currentServerIndex].webusermsg = msg;
            msg.reply("jsi sledován. Můžeš hrát z WebConsole.");
        }
    }

    else if (msg.content == prefix+"guildinfo") {
        msg.channel.send(msg.member.guild.name);
    }
});



// HTTP server
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    //webSfx(req.url); //key
    res.write(
        "<script>function httpGet(theUrl){var xmlHttp = new XMLHttpRequest(); xmlHttp.open( 'GET', theUrl, false ); xmlHttp.send( null ); return xmlHttp.responseText;}</script>"
    );
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