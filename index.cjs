require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CREATOR_IDS = ['1183056878004080701','1385239822070710313'];

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// ---------- 訊息內容 ----------
const spamMessages = {
  炸1: `# 炸\n`.repeat(5),
  炸2: `# 想體驗免費的炸訊息機器人嗎？\n# 加入我們伺服器！\nhttps://discord.gg/QQWERNrPCG`,
  炸3: `# @everyone\n# 笑死一群廢物你們被Moonlight給炸了 🤡\n# lol\n# 菜就多練\n# 不會做bot就別叫\n# 想要嗎?來\n# https://discord.gg/QQWERNrPCG`,
  炸4: `# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG`,
  定海神針: `# 定\n`.repeat(5)
};

// ---------- 工具函式 ----------
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function sendRepeatedToChannel(channelId, content, times = 5, intervalMs = 300) {
  (async () => {
    for (let i = 0; i < times; i++) {
      try {
        const ch = await client.channels.fetch(channelId);
        if(ch && ch.isTextBased()) await ch.send(content).catch(()=>{});
      } catch(e){}
      await sleep(intervalMs);
    }
  })();
}

// 私聊炸
function spamDMBackground(userId, content) {
  (async () => {
    const user = await client.users.fetch(userId).catch(()=>null);
    if (!user) return;
    for(let i=0;i<5;i++){
      try{ await user.send(content); } catch(e){}
      await sleep(1000);
    }
  })();
}

// ---------- 按鈕 / Modal ----------
function createMainButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('請瘋狂按我').setLabel('請瘋狂按我').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('炸1').setLabel('炸1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸2').setLabel('炸2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸3').setLabel('炸3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸4').setLabel('炸4').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('自訂炸').setLabel('自訂炸').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('定海神針').setLabel('定海神針').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('炸私聊').setLabel('炸私聊').setStyle(ButtonStyle.Danger)
  );
}

function createCustomModal(commandId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${commandId}`)
    .setTitle('輸入遠程頻道ID (不填則當前頻道)');
  const input = new TextInputBuilder()
    .setCustomId('remoteChannelId')
    .setLabel('頻道 ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  const contentInput = new TextInputBuilder()
    .setCustomId('customContent')
    .setLabel('自訂炸文字 (自訂炸專用)')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  modal.addComponents(new ActionRowBuilder().addComponents(contentInput));
  return modal;
}

// ---------- 全域指令 ----------
const commandBuilders = [
  new SlashCommandBuilder().setName('炸1').setDescription('發送炸1').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('炸2').setDescription('發送炸2').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('炸3').setDescription('發送炸3').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('炸4').setDescription('發送炸4').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('自訂炸').setDescription('自訂炸文字').addStringOption(o=>o.setName('content').setDescription('自訂文字').setRequired(true)).addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('炸私聊').setDescription('對自己私聊發送 (5 條)'),
  new SlashCommandBuilder().setName('定海神針').setDescription('發送定海神針 (5 行)').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('重啟').setDescription('重新啟動 Bot (創建者限定)'),
  new SlashCommandBuilder().setName('刷新').setDescription('刷新全域指令 (創建者限定)'),
].map(b=>b.toJSON());

const rest = new REST({version:'10'}).setToken(TOKEN);
async function registerGlobalCommands(){
  if(!CLIENT_ID) return;
  try{
    await rest.put(Routes.applicationCommands(CLIENT_ID), {body:commandBuilders});
    console.log('全域指令註冊完成');
  }catch(e){console.error(e);}
}

// ---------- Client ----------
client.once(Events.ClientReady, async ()=>{
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  await registerGlobalCommands();
});

client.on(Events.InteractionCreate, async (interaction)=>{
  try{
    if(interaction.type===InteractionType.ModalSubmit){
      const cmd = interaction.customId.replace('modal_','');
      const remoteId = interaction.fields.getTextInputValue('remoteChannelId')?.trim() || interaction.channelId;
      const customText = interaction.fields.getTextInputValue('customContent')?.trim();
      if(cmd==='自訂炸'){
        if(!customText) return interaction.reply({content:'❌ 請輸入文字', ephemeral:true});
        sendRepeatedToChannel(remoteId, customText, 5, 300);
        return interaction.reply({content:`✅ 已發送自訂炸到 <#${remoteId}>`, ephemeral:true});
      } else {
        sendRepeatedToChannel(remoteId, spamMessages[cmd], 5, 300);
        return interaction.reply({content:`✅ 已排程 ${cmd} 到 <#${remoteId}>`, ephemeral:true});
      }
    }

    if(interaction.isButton()){
      const id = interaction.customId;
      if(id==='請瘋狂按我'){
        return interaction.reply({content:'請點擊炸指令按鈕來使用此功能', ephemeral:true});
      }
      if(id==='炸私聊'){
        interaction.reply({content:'已開始私聊炸訊息', ephemeral:true});
        spamDMBackground(interaction.user.id, spamMessages.炸1);
        return;
      }
      sendRepeatedToChannel(interaction.channelId, spamMessages[id] || '', 5, 300);
      interaction.reply({content:`✅ 已執行 ${id}`, ephemeral:true});
      return;
    }

    if(interaction.isChatInputCommand()){
      const cmd = interaction.commandName;
      const optChannel = interaction.options.getString('channel')?.trim() || interaction.channelId;

      if(cmd==='重啟' || cmd==='刷新'){
        if(!CREATOR_IDS.includes(interaction.user.id)){
          return interaction.reply({content:'❌ 只有創建者可以使用此指令', ephemeral:true});
        }
      }

      if(cmd==='自訂炸'){
        const content = interaction.options.getString('content');
        sendRepeatedToChannel(optChannel, content, 5, 300);
        return interaction.reply({content:`✅ 已發送自訂炸到 <#${optChannel}>`, ephemeral:true});
      }

      if(cmd==='炸私聊'){
        spamDMBackground(interaction.user.id, spamMessages.炸1);
        return interaction.reply({content:'已開始私聊炸訊息', ephemeral:true});
      }

      if(cmd==='炸1'||cmd==='炸2'||cmd==='炸3'||cmd==='炸4'||cmd==='定海神針'){
        sendRepeatedToChannel(optChannel, spamMessages[cmd], 5, 300);
        return interaction.reply({content:`✅ 已執行 ${cmd} 到 <#${optChannel}>`, ephemeral:true});
      }

      if(cmd==='重啟'){
        console.log('重啟指令由創建者觸發，準備退出...');
        process.exit(0);
      }

      if(cmd==='刷新'){
        registerGlobalCommands().then(()=>{
          interaction.followUp({content:'✅ 指令已刷新', ephemeral:true}).catch(()=>{});
        }).catch(()=>{});
        return;
      }
    }

  }catch(e){
    console.error(e);
    if(interaction && !interaction.replied) interaction.reply({content:'內部錯誤', ephemeral:true});
  }
});

// ---------- 保活 ----------
const app = express();
app.get('/', (req,res)=>res.send('Bot is running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log(`保活伺服器已啟動，port=${PORT}`));

client.login(TOKEN);
