# Jeff (Discord Bot)

## Preparation

### Install Node and NPM

This can be done basically on any platform. On Windows, you can download the executable from the official Node website and run it. On Linux you should install Node through your package manager.

- [Official site](https://nodejs.org/en/)
- [Installing via package manager](https://nodejs.org/en/download/package-manager/)

## Download and move
You can download this repository as a zip and extract it whenever you want. You can also use the git clone command if you're running this on a Linux machine.

First you have to install git:
```
sudo apt install git <-- for Debian/Ubuntu based distro
sudo pacman -S git <-- for Arch based distro
```
Then you can clone:
```
git clone https://github.com/Sawy7/jeffdiscordbot.git
```
When you are done with downloading (and possibly unzipping) the project, you can move on to the next step.

## Dependencies
Before you do any of this - remove 'node_modules' folder if you have one in your working directory.

There are some things you will need to pull through NPM for the bot to work properly (or even start). You can download all dependencies using this command:

```
npm install
```

## Config file
Firstly you need to rename the 'config.json.template' file to just 'config.json'. Inside this file, you need to set your prefix - that is the thing that goes before every single one of your bot commands (like .!-). 

Then you need to enter your bot's token. You need to generate one in Discord Developer web console. I left a link with instructions bellow - it's not that hard, just take a peek ;)

[Creating a Bot Account](https://discordpy.readthedocs.io/en/latest/discord.html)

Lastly you have to choose language for Google TTS. The default is "cs" (Czech). You can change to it whatever - eg. "en" (English).

## Running the thing
Now you are basically done and don't need to do anything else. If you'd like to add some more functionality (like radio), you can read some more instructions bellow.

To start your bot, you just have to run this command from the project directory:
```
npm start
```

If you want your bot to run even after closing the window or ssh session, you may want to look into [screen](https://linuxize.com/post/how-to-use-linux-screen/).

## Bot commands
Assuming you left your prefix as '.' (dot), your commands will look like this:
```
.s list <-- lists all sounds in sfx folder (you can add some .mp3 files here, just create sfx folder in the project folder)
.s horn <-- plays horn.mp3 from the sfx folder
.t [message] <-- says the message in voice chat (Google TTS, currently only Czech)
.r list <-- lists all radios
.r [radio name] ([volume]) <-- plays radio (if you don't specify volume, it plays at 0.2 - 20 %)
```

## Adding radio support
To add radio support, you have to rename the 'radio.json.template' file to just 'radio.json'. You can add you favourite stations - just insert the names, stream urls and locales. It is very important to respect the JSON formatting.
