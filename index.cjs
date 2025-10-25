// index.cjs
require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CREATOR_IDS = ['1183056878004080701','1385239822070710313'];

// 建立 client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
});

// ---------- 訊息內容 ----------
const spamMessages = {
  炸1: `# 炸1\n`.repeat(30),
  炸2: `# 炸2\n`.repeat(30),
  炸3: `# 炸3\n`.repeat(30),
  炸4: `# 炸4\n`.repeat(30),
};

// ---------- 工具函式 ----------
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function sendOnceToChannel(channelId, content) {
  try {
    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased()) return false;
    await ch.send(content).catch(()=>{});
    return true;
  } catch (e) {
    return false;
  }
}

async function sendRepeatedToChannel(channelId, content, times = 5, intervalMs = 300) {
  (async () => {
    for (let i = 0; i < times; i++) {
      try { await sendOnceToChannel(channelId, content); } catch(e){}
      await sleep(intervalMs);
    }
  })();
}

function spamDMBackground(userId, content) {
  (async () => {
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (!user) return;
      for (let i = 0; i < 500; i++) {
        try { await user.send(content); } catch(e){}
        await sleep(1000);
      }
    } catch(e){
      console.error('spamDMBackground error:', e);
    }
  })();
}

// ---------- 按鈕 / Modal ----------
function createMainButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('請瘋狂按我').setLabel('請瘋狂按我').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸1').setLabel('炸1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸2').setLabel('炸2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸3').setLabel('炸3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸4').setLabel('炸4').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸私聊').setLabel('炸私聊').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('自訂炸').setLabel('自訂炸').setStyle(ButtonStyle.Secondary)
  );
}

function createTextModal(customId, label) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(label);
  const input = new TextInputBuilder()
    .setCustomId('text')
    .setLabel('請輸入文字')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

// ---------- 全域指令 ----------
const commandBuilders = [
  new SlashCommandBuilder().setName('炸1').setDescription('炸1訊息').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('炸2').setDescription('炸2訊息').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('炸3').setDescription('炸3訊息').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('炸4').setDescription('炸4訊息').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('炸私聊').setDescription('私聊炸500條'),
  new SlashCommandBuilder().setName('自訂炸').setDescription('自訂文字炸訊息').addStringOption(o=>o.setName('channel').setDescription('頻道ID')),
  new SlashCommandBuilder().setName('重啟').setDescription('重啟Bot（創建者）'),
  new SlashCommandBuilder().setName('刷新').setDescription('刷新全域指令（創建者）')
].map(b=>b.toJSON());

const rest = new REST({version:'10'}).setToken(TOKEN);
async function registerGlobalCommands() {
  if(!CLIENT_ID) return;
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), {body:commandBuilders});
    console.log('全域指令註冊完成');
  } catch(e){console.error(e);}
}

// ---------- Client事件 ----------
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  await registerGlobalCommands();
});

client.on(Events.InteractionCreate, async interaction=>{
  try{
    if(interaction.type === InteractionType.ModalSubmit){
      const cmd = interaction.customId;
      const text = interaction.fields.getTextInputValue('text');
      if(cmd==='自訂炸'){
        const optChannel = interaction.options?.getString('channel');
        const channelId = optChannel?.trim() || interaction.channelId;
        sendRepeatedToChannel(channelId, text, 5, 300);
        await interaction.reply({content:`已排程自訂炸到 <#${channelId}>`,ephemeral:true});
      }
      return;
    }

    if(interaction.isButton()){
      const id = interaction.customId;
      if(id==='請瘋狂按我'){
        await interaction.reply({content:'已開始請瘋狂按我',ephemeral:true});
        const targets = ['炸1','炸2','炸3','炸4','自訂炸'];
        for(const t of targets){
          if(spamMessages[t]) sendRepeatedToChannel(interaction.channelId, spamMessages[t], 5, 300);
        }
        return;
      }

      if(id==='炸私聊'){
        await interaction.reply({content:'已開始私聊炸訊息（背景500條）',ephemeral:true});
        spamDMBackground(interaction.user.id, '私聊炸500條內容');
        return;
      }

      if(['炸1','炸2','炸3','炸4','自訂炸'].includes(id)){
        const modal = createTextModal(id, `自訂文字 - ${id}`);
        await interaction.showModal(modal);
        return;
      }
    }

    if(interaction.isChatInputCommand()){
      const cmd = interaction.commandName;
      const optChannel = interaction.options.getString('channel');
      const targetChannel = optChannel?.trim() || interaction.channelId;

      if(cmd==='炸1'||cmd==='炸2'||cmd==='炸3'||cmd==='炸4'){
        sendRepeatedToChannel(targetChannel, spamMessages[cmd], 5, 300);
        await interaction.reply({content:`已排程 ${cmd} 到 <#${targetChannel}>`,ephemeral:true});
        return;
      }

      if(cmd==='炸私聊'){
        spamDMBackground(interaction.user.id, '私聊炸500條內容');
        await interaction.reply({content:'已開始私聊炸訊息（背景500條）',ephemeral:true});
        return;
      }

      if(cmd==='自訂炸'){
        await interaction.showModal(createTextModal('自訂炸','自訂炸文字'));
        return;
      }

      if(cmd==='重啟'){
        if(!CREATOR_IDS.includes(interaction.user.id)){
          return interaction.reply({content:'❌ 只有創建者可以使用',ephemeral:true});
        }
        await interaction.reply({content:'重啟中...',ephemeral:true});
        process.exit(0);
      }

      if(cmd==='刷新'){
        if(!CREATOR_IDS.includes(interaction.user.id)){
          return interaction.reply({content:'❌ 只有創建者可以使用',ephemeral:true});
        }
        await registerGlobalCommands();
        await interaction.reply({content:'已刷新全域指令',ephemeral:true});
      }
    }
  }catch(e){console.error(e);}
});

// ---------- 保活 ----------
const app = express();
app.get('/',(req,res)=>res.send('Bot is running'));
const PORT = process.env.PORT||3000;
app.listen(PORT,()=>console.log(`保活伺服器啟動 port=${PORT}`));

client.login(TOKEN);
