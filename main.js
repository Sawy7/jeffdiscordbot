const Discord = require('discord.js');
const {
	prefix,
	token
} = require("./config.json");
const client = new Discord.Client();
const fs = require("fs");
const ytdl = require("ytdl-core");
const googleTTS = require("google-tts-api");

// webserver and stuff
var http = require('http');
var webuserMsg = [];

var ytServerArray = [];
var sfxServerArray = [];

function youtubeServer(guildid)
{
  this.guildid = guildid;
  this.queue = [];
  this.dispatcher;
}

function sfxServer(guildid)
{
  this.guildid = guildid;
  this.queue = [];
  this.dispatcher;
}

function yt_play(connection, playingguild)
{
  var id;
  for (var i = 0; i < ytServerArray.length; i++)
  {
    if (ytServerArray[i] != null) {
      if (ytServerArray[i].guildid == playingguild) {
        id = i;
      }
    }
  }
  ytServerArray[id].dispatcher = connection.play(ytdl(ytServerArray[id].queue[0], { filter: 'audioonly' }));
  ytServerArray[id].dispatcher.on('finish', () => {
    for (var i = 0; i < ytServerArray.length; i++)
    {
      if (ytServerArray[i] != null)
      {
        if (ytServerArray[i].guildid == playingguild) {
          ytServerArray[i].queue.shift();
        }
      }
    }
    if (ytServerArray[id].queue.length > 0) {
      yt_play(connection, playingguild);
    }
    else
    {
      delete ytServerArray[id];
      ytServerArray[id] = null;
    }
  });
}

async function sfx_get(sfx_name, message) {
  const connection = await message.member.voice.channel.join();
  for (var i = 0; i < sfxServerArray.length; i++)
  {
    if (sfxServerArray[i] != null) {
      if (sfxServerArray[i].guildid == message.channel.guild.id) {
        sfxServerArray[i].queue.push("sfx/"+sfx_name+".mp3");
        return;
      }
    }
  }
  sfxServerArray.push(new sfxServer(message.channel.guild.id));
  sfxServerArray[sfxServerArray.length-1].queue.push("sfx/"+sfx_name+".mp3");
  sfx_play(connection, message.channel.guild.id, 0.5);
}

async function tts_prep(tts_msg, message) {
  const connection = await message.member.voice.channel.join();
  googleTTS(tts_msg, "cs", 1)
  .then(function (url) {
    return tts_get(url, message, connection);
  })
  .catch(function (err) {
    console.error(err.stack);
  });
}

function tts_get(tts_url, message, connection) {
  for (var i = 0; i < sfxServerArray.length; i++)
  {
    if (sfxServerArray[i] != null) {
      if (sfxServerArray[i].guildid == message.channel.guild.id) {
        sfxServerArray[i].queue.push(tts_url);
        return;
      }
    }
  }
  sfxServerArray.push(new sfxServer(message.channel.guild.id));
  sfxServerArray[sfxServerArray.length-1].queue.push(tts_url);
  sfx_play(connection, message.channel.guild.id, 1);
}

function sfx_play(connection, playingguild, sfvolume)
{
  var id;
  for (var i = 0; i < sfxServerArray.length; i++)
  {
    if (sfxServerArray[i] != null)
    {
      if (sfxServerArray[i].guildid == playingguild) {
        id = i;
      }
    }
  }
  sfxServerArray[id].dispatcher = connection.play(sfxServerArray[id].queue[0], {
    volume: sfvolume,
  });
  sfxServerArray[id].dispatcher.on('finish', () => {
    for (var i = 0; i < sfxServerArray.length; i++)
    {
      if (sfxServerArray[i] != null)
      {
        if (sfxServerArray[i].guildid == playingguild) {
          sfxServerArray[i].queue.shift();
        }
      }
    }
    if (sfxServerArray[id].queue.length > 0) {
      sfx_play(connection, playingguild, sfvolume);
    }
    else
    {
      delete sfxServerArray[id];
      sfxServerArray[id] = null;
    }
  });
}

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

client.on('message', msg => {
  if (msg.content === 'ping') {
    msg.reply('pong');
  }
});

client.on('message', msg => {
  if (msg.content === 'Jak se jmenuješ?') {
    msg.reply('Ahoj, já jsem Jeff!');
  }
});

client.on('message', msg => {
  if (msg.content.startsWith("!play")) {
    if (msg.channel.name != "music-chat") {
      //msg.reply("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
      tts_prep(msg.member.nickname + ", ještě jednou napíšeš vykřičník play mimo music čet a pošlu na tebe Sawyho.", msg);
    }
  }
});

client.on('message', async message => {
  if (!message.guild) return;
  if (message.content == prefix+'join') {
    if (message.member.voice.channel) {
      const connection = await message.member.voice.channel.join();
    } 
    else {
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
  } 
  else if (message.content == prefix+"ct24") {
    if (message.member.voice.channel) {
      const connection = await message.member.voice.channel.join();
      const dispatcher = connection.play('-');
    } 
    else {
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
  }
  else if (message.content == prefix+"kdst") {
    if (message.member.voice.channel) {
      const connection = await message.member.voice.channel.join();
      const dispatcher = connection.play("radio/k-dst.mp3", {
    	volume: 0.2,
  	  });
    } 
    else {
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
  }
  else if (message.content == prefix+"novinky") {
    message.channel.send("Moje zvukové efekty už mají frontu, takže se navzájem nepřeruší. Mužeš do chatu naspamovat několik efektů najednou a já je v tom pořadí spustím.");
  }
  else if (message.content == prefix+"migmig") {
    if (message.member.voice.channel) {
      const connection = await message.member.voice.channel.join();
      const dispatcher = connection.play('audio.mp3');
    }
    else {
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
  }
  else if (message.content == prefix+"rick") {
    if (message.member.voice.channel) {
      const connection = await message.member.voice.channel.join();
      const dispatcher = connection.play(ytdl("https://www.youtube.com/watch?v=dQw4w9WgXcQ", { filter: 'audioonly' }));
    }
    else { 
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
  }
  else if (message.content.startsWith(prefix+"yt ")) {
    if (message.member.voice.channel) {
      const args = message.content.split(" ");
      const url = args[1];
      const connection = await message.member.voice.channel.join();
      const songInfo = await ytdl.getInfo(args[1]);
      for (var i = 0; i < ytServerArray.length; i++)
      {
        if (ytServerArray[i] != null) {
          if (ytServerArray[i].guildid == message.channel.guild.id) {
            ytServerArray[i].queue.push(url);
            message.channel.send("Přidávám do queue :white_check_mark: `" + songInfo.title + "`");
            return;
          }
        }
      }
      ytServerArray.push(new youtubeServer(message.channel.guild.id));
      ytServerArray[ytServerArray.length-1].queue.push(url);
      yt_play(connection, message.channel.guild.id);
      message.channel.send("Hraju :notes: `" + songInfo.title + "`");
    }
    else { 
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
  }
  else if (message.content.startsWith(prefix+"s ")) {
    if (message.member.voice.channel) {
      const args = message.content.split(" ");
      const sfx_name = args[1];
      if (sfx_name == "list")
      {
        var final_msg = "Tady jsou zvukové efekty, které můžeš spamovat do chatu.\nSyntaxe je `"+ prefix + "s [efekt]`.\n";
        fs.readdirSync("./sfx").forEach(file => {
          const split = file.split(".");
          final_msg += "`" +split[0]+"` ";
        });
        message.channel.send(final_msg);
      }
      else {
        sfx_get(sfx_name, message);
      } 
    }
    else {
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
  }
  else if (message.content.startsWith(prefix+"t ")) {
    if (message.member.voice.channel) {
      const args = message.content.split(" ");
      const tts_name = args[1];
      var tts_msg = "";
      for (let i = 1; i < args.length; i++) {
        tts_msg += args[i];
      }
      tts_prep(tts_msg, message);
    }
    else {
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
  }
  else if (message.content == prefix+"stop") {
    if (message.member.voice.channel) {
      for (var i = 0; i < ytServerArray.length; i++)
      {
        if (ytServerArray[i].guildid == message.channel.guild.id) {
          ytServerArray[i].dispatcher.destroy();
          delete ytServerArray[i];
          ytServerArray.splice(i,1);
        }
      }
    }
    else {
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
  }
  else if (message.content == prefix+"wconnect") {
    if (message.member.voice.channel) {
      webuserMsg = message;
      message.reply("jsi sledován. Můžeš hrát z WebConsole.");
    }
  }
});

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  webSfx(req.url);
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

async function webSfx(sfxName) {
  sfxName = sfxName.substring(1);
  const splitName = sfxName.split(".");
  if (splitName[1] == "mp3" && webuserMsg != null) {
    webuserMsg.channel.send("`[WebConsole]:`" + prefix + "s " + splitName[0]);
    sfx_get(splitName[0], webuserMsg);
  }
}

client.login(token);
