// index.cjs
require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CREATORS = ['1183056878004080701', '1385239822070710313'];

// ---------- Client ----------
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.DirectMessages],
});

// ---------- 訊息內容 ----------
const spamMessages = {
  炸1: `# 炸\n`.repeat(30),
  炸2: `# 想體驗免費的炸訊息機器人嗎？\n# 加入我們伺服器！\nhttps://discord.gg/QQWERNrPCG`,
  炸3: `# @everyone\n# 笑死一群廢物你們被Moonlight給炸了 🤡\n# lol\n# 菜就多練\n# 不會做bot就別叫\n# 想要嗎?來\n# https://discord.gg/QQWERNrPCG`,
  炸4: `# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG`,
  定海神針: `# 定\n`.repeat(30),
};

// ---------- 工具函式 ----------
function sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

async function sendOnce(channelId, content){
  try {
    const ch = await client.channels.fetch(channelId);
    if(!ch || !ch.isTextBased()) return false;
    await ch.send(content).catch(()=>{});
    return true;
  } catch(e){ return false; }
}

async function sendRepeated(channelId, content, times=5, interval=300){
  (async ()=>{
    for(let i=0;i<times;i++){
      await sendOnce(channelId, content);
      await sleep(interval);
    }
  })();
}

async function spamDM(userId, content){
  (async ()=>{
    const user = await client.users.fetch(userId).catch(()=>null);
    if(!user) return;
    for(let i=0;i<500;i++){
      await user.send(content).catch(()=>{});
      await sleep(1000);
    }
  })();
}

// ---------- 按鈕 ----------
function createMainButtonRow(){
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('請瘋狂按我').setLabel('請瘋狂按我').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸1').setLabel('炸1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸2').setLabel('炸2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸3').setLabel('炸3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸4').setLabel('炸4').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸私聊').setLabel('炸私聊').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('定海神針').setLabel('定海神針').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('自訂炸').setLabel('自訂炸').setStyle(ButtonStyle.Success)
  );
}

function createModal(id){
  const modal = new ModalBuilder().setCustomId(`modal_${id}`).setTitle('輸入頻道ID或自訂文字');
  const input = new TextInputBuilder().setCustomId('input').setLabel('頻道ID或文字').setStyle(TextInputStyle.Paragraph).setRequired(false);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

// ---------- 全域指令 ----------
const commandBuilders = [
  new SlashCommandBuilder().setName('炸1').setDescription('發送炸1').addStringOption(o=>o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('炸2').setDescription('發送炸2').addStringOption(o=>o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('炸3').setDescription('發送炸3').addStringOption(o=>o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('炸4').setDescription('發送炸4').addStringOption(o=>o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('定海神針').setDescription('發送定海神針').addStringOption(o=>o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('炸私聊').setDescription('對用戶私聊發送500條'),
  new SlashCommandBuilder().setName('自訂炸').setDescription('自訂文字炸訊息').addStringOption(o=>o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('重啟').setDescription('重啟 Bot（創作者限定）'),
  new SlashCommandBuilder().setName('刷新').setDescription('刷新全域指令（創作者限定）'),
].map(b=>b.toJSON());

const rest = new REST({ version:'10' }).setToken(TOKEN);
async function registerCommands(){
  if(!CLIENT_ID) return console.warn('CLIENT_ID 未設定，跳過註冊');
  try{
    console.log('>> 註冊全域指令...');
    await rest.put(Routes.applicationCommands(CLIENT_ID),{body:commandBuilders});
    console.log('✅ 全域指令完成');
  }catch(e){ console.error('全域指令註冊錯誤:',e); }
}

// ---------- Client ----------
client.once(Events.ClientReady, async ()=>{
  console.log(`🤖 Moonlight🌙✨ nuke bot 已上線: ${client.user.tag}`);
  await registerCommands();
});

// ---------- 互動 ----------
client.on(Events.InteractionCreate, async (i)=>{
  try{
    if(i.type===InteractionType.ModalSubmit){
      const id=i.customId.replace('modal_','');
      const val=i.fields.getTextInputValue('input')?.trim();
      const target=i.channelId;

      await i.reply({content:`已排程 ${id}`,ephemeral:true});

      if(id==='自訂炸'){
        if(!val) return;
        const parts = val.split('\n').map(l=>'# '+l);
        sendRepeated(target, parts.join('\n'),5,300);
        return;
      }

      if(spamMessages[id]){
        sendRepeated(target, spamMessages[id],5,300);
      }
      return;
    }

    if(i.isButton() && i.isButton()){
      const id=i.customId;

      if(id==='請瘋狂按我'){
        await i.reply({content:'你按了請瘋狂按我',ephemeral:true});
        return;
      }

      if(id==='炸私聊'){
        await i.reply({content:'已開始私聊炸訊息',ephemeral:true});
        spamDM(i.user.id, spamMessages.炸1+'\n'+spamMessages.炸2+'\n'+spamMessages.炸3+'\n'+spamMessages.炸4);
        return;
      }

      if(id in spamMessages || id==='自訂炸'){
        const modal=createModal(id);
        await i.showModal(modal);
        return;
      }
    }

    if(i.isChatInputCommand() && i.isChatInputCommand()){
      const cmd=i.commandName;
      const opt=i.options.getString('channel');
      const target=opt?.trim()||i.channelId;

      if((cmd==='重啟'||cmd==='刷新')&&!CREATORS.includes(i.user.id)){
        return i.reply({content:'❌ 只有創作者可以使用',ephemeral:true});
      }

      if(['炸1','炸2','炸3','炸4','定海神針','自訂炸','炸私聊'].includes(cmd)){
        await i.reply({content:`✅ 已排程 ${cmd}`,ephemeral:true});
      }

      if(cmd==='炸私聊'){
        spamDM(i.user.id, spamMessages.炸1+'\n'+spamMessages.炸2+'\n'+spamMessages.炸3+'\n'+spamMessages.炸4);
        return;
      }

      if(cmd==='自訂炸'){
        const val=i.options.getString('channel');
        if(!val) return;
        const parts = val.split('\n').map(l=>'# '+l);
        sendRepeated(target, parts.join('\n'),5,300);
        return;
      }

      if(spamMessages[cmd]){
        sendRepeated(target, spamMessages[cmd],5,300);
        return;
      }

      if(cmd==='重啟'){
        console.log('重啟指令觸發，準備退出...');
        process.exit(0);
      }

      if(cmd==='刷新'){
        registerCommands().then(()=>i.followUp({content:'✅ 已刷新指令',ephemeral:true}));
        return;
      }
    }
  }catch(e){ console.error('互動處理錯誤:',e); if(i&&!i.replied)i.reply({content:'錯誤',ephemeral:true}).catch(()=>{}); }
});

// ---------- 保活 ----------
const app=express();
app.get('/',(req,res)=>res.send('Bot is running'));
app.listen(process.env.PORT||3000,()=>console.log('保活伺服器已啟動'));

// ---------- 登入 ----------
client.login(TOKEN);
