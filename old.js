const Discord = require('discord.js');
const {
	prefix,
	token
} = require("./config.json");
const client = new Discord.Client();
const fs = require("fs");
const ytdl = require("ytdl-core");

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
    if (ytServerArray[i].guildid == playingguild) {
      id = i;
    }
  }
  ytServerArray[id].dispatcher = connection.play(ytdl(ytServerArray[id].queue[0], { filter: 'audioonly' }));
  ytServerArray[id].dispatcher.on('finish', () => {
    for (var i = 0; i < ytServerArray.length; i++)
    {
      if (ytServerArray[i].guildid == playingguild) {
        ytServerArray[i].queue.shift();
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

function findGuild(message)
{
  for (var i = 0; i < ytServerArray.length; i++)
    {
      if (ytServerArray[i].guildid == message.channel.guild.id) {
        return ytServerArray[i];
      }
    }
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
      msg.reply("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"); 
    }
  }
});

//client.on('message', msg => {
//  if (msg.content.startsWith("serverid")) {
//    console.log(msg.channel.guild.id);
//  }
//});

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
      const dispatcher = connection.play('http://sledovanitv.cz/vlc/channel/ct24.vlc?token=93iisn546t5g82hmaxfb3thykhzp58s3tn4b7nkh6gzpmauv9l061gadanewkkqv');
    } 
    else {
      message.reply("Nejdřív se musíš připojit do voice kanálu!");
    }
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
        if (ytServerArray[i].guildid == message.channel.guild.id) {
          ytServerArray[i].queue.push(url);
          message.channel.send("Přidávám do queue :white_check_mark: `" + songInfo.title + "`");
          return;
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
  else if (message.content == prefix+"q") {
    if (message.member.voice.channel) {
      const localGuild = findGuild(message);
      message.channel.send("Queue :notes:");
      for (let i = 0; i < localGuild.queue.length; i++) {
        message.channel.send((i+1) + ". song: " + localGuild.queue[i]);    
      }
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
        const connection = await message.member.voice.channel.join();
        const dispatcher = connection.play("sfx/"+sfx_name+".mp3", {
          volume: 0.5,
        });
      } 
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
});

client.login(token);