const { executionAsyncResource } = require('async_hooks');
const Discord = require('discord.js');
const ytdl = require('ytdl-core');

const { YTSearcher } = require('ytsearcher');

const searcher = new YTSearcher({
    key: process.env.youtube_api,
    revealed: true
});

const client = new Discord.Client();

const queue = new Map();

client.on("ready", () => {
    console.log("Online")
})

client.on("message", async(message) => {
    const prefix = 'nb';

    const serverQueue = queue.get(message.guild.id)

    const args = message.content.slice(prefix.length).trim().split(/ +/g)
    const command = args.shift().toLowerCase();

   switch(command){
       case 'play':
           execute(message, serverQueue);
           break;
       case 'stop' :
           stop(message, serverQueue);
           break;
        case 'skip' :
            skip(message, serverQueue);
           break;
   }
   
    async function execute(message, serverQueue){
        let vc = message.member.voice.channel;
        if(!vc){
            return message.channel.send("ให้ไปแล้ว!");
        }else{
            let result = await searcher.search(args.join(" "), { type: "video" })
            const songInfo = await ytdl.getInfo(result.first.url)

            let song = {
                title: songInfo.videoDetails.title,
                url: songInfo.videoDetails.video_url
            };

            if(!serverQueue){
                const queueConstructor = {
                    txtChannel: message.channel,
                    vChannel: vc,
                    connection: null,
                    songs: [],
                    volume: 10,
                    playing: true
                };
                queue.set(message.guild.id, queueConstructor);

                queueConstructor.songs.push(song);

                try{
                    let connection = await vc.join();
                    queueConstructor.connection = connection;
                    play(message.guild, queueConstructor.songs[0]);
                }catch (err){
                    console.error(err)
                    queue.delete(message.guild.id);
                    return message.channel.send(`ไม่สามารถเข้าห้องพูดคุยได้ ${err}`)
                }
            }else{
                serverQueue.push.songs.push(song);
                return message.channel.send(`เพลงถูกเพิ่มในคิว ${song.url}`);
            }
        }
    }
    function play(guild, song){
        const serverQueue = queue.get(guild.id);
        if(!song){
            serverQueue.vChannel.leave();
            queue.delete(guild.id);
            return;
        }
        const dispatcher = serverQueue.connection
             .play(ytdl(song.url))
             .on('finish', () =>{
                 serverQueue.songs.shift();
                 play(guild, serverQueue.songs[0]);
                 serverQueue.txtChannel.send(`กำลังเล่น ${serverQueue.songs[0].url}`)
             })
    }
    function stop (message, serverQueue){
        if(message.member.voice.channel)
            if(!message.member.voice.channel)
                return message.channel.send("คุณต้องเข้าห้องพูดคุยก่อน")
            serverQueue.songs = [];
            serverQueue.connection.dispatcher.end();
        }
    function skip (message, serverQueue){
            if(message.member.voice.channel)
               return message.channel.send("คุณต้องเข้าห้องพูดคุยก่อน")
            if(!serverQueue)
               return message.channel.send("ไม่มีวีดีโอให้สคิป");
            serverQueue.connection.dispatcher.end();
        }
    }
)

client.login("process.env.token")