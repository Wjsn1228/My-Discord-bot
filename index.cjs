require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CREATORS = ['1183056878004080701', '1385239822070710313'];

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
  炸1: '# 炸\n'.repeat(30),
  炸2: '# 想體驗免費的炸訊息機器人嗎？\n# 加入我們伺服器！\nhttps://discord.gg/QQWERNrPCG',
  炸3: '# @everyone\n# 笑死一群廢物你們被Moonlight給炸了 🤡\n# lol\n# 菜就多練\n# 不會做bot就別叫\n# 想要嗎?來\n# https://discord.gg/QQWERNrPCG',
  炸4: '# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG',
  定海神針: '# 定\n'.repeat(30),
};

// ---------- 工具函式 ----------
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function sendOnceToChannel(channelId, content) {
  try {
    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased()) return false;
    await ch.send(content).catch(() => {});
    return true;
  } catch (e) { return false; }
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
      for (let i=0;i<500;i++){
        try{await user.send(content);}catch(e){}
        await sleep(1000);
      }
    } catch(e){console.error('spamDMBackground error:', e);}
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
    new ButtonBuilder().setCustomId('定海神針').setLabel('定海神針').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('自訂炸').setLabel('自訂炸').setStyle(ButtonStyle.Success)
  );
}

function createChannelModal(cmd) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${cmd}`)
    .setTitle(`輸入頻道ID或自訂文字 (${cmd})`);
  const input = new TextInputBuilder()
    .setCustomId('channelOrContent')
    .setLabel('頻道ID或文字（自訂炸輸入文字）')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

// ---------- 全域指令 ----------
const commandBuilders = [
  '炸1','炸2','炸3','炸4','炸私聊','定海神針','自訂炸','請瘋狂按我','刷新','重啟'
].map(name => new SlashCommandBuilder().setName(name).setDescription(name)).map(b => b.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registerGlobalCommands() {
  if (!CLIENT_ID) return;
  try {
    console.log('>> 註冊全域指令中...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandBuilders });
    console.log('>> 全域指令註冊完成');
  } catch(e){console.error('registerGlobalCommands error:', e);}
}

// ---------- Client Ready ----------
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  await registerGlobalCommands();
});

// ---------- Interaction ----------
client.on(Events.InteractionCreate, async interaction => {
  try{
    if(interaction.type === InteractionType.ModalSubmit){
      const cmd = interaction.customId.replace('modal_','');
      const input = interaction.fields.getTextInputValue('channelOrContent').trim();

      if(cmd === '炸私聊'){
        spamDMBackground(interaction.user.id,input);
        return interaction.reply({content:'已開始私聊炸訊息',ephemeral:true});
      }

      const targetId = cmd === '自訂炸' ? interaction.channelId : input.match(/^\d+$/)? input : interaction.channelId;
      const content = cmd==='自訂炸'? input : spamMessages[cmd] || input;

      sendRepeatedToChannel(targetId,content,5,300);
      return interaction.reply({content:`已排程 ${cmd}`,ephemeral:true});
    }

    if(interaction.isButton() && interaction.isButton()){
      const id = interaction.customId;
      if(id==='請瘋狂按我'){
        await interaction.reply({content:'按鈕已觸發！',ephemeral:true});
        return;
      }
      if(id in spamMessages || id==='自訂炸' || id==='炸私聊'){
        const modal = createChannelModal(id);
        await interaction.showModal(modal);
        return;
      }
    }

    if(interaction.isChatInputCommand()){
      const cmd = interaction.commandName;
      if(['重啟','刷新'].includes(cmd) && !CREATORS.includes(interaction.user.id)){
        return interaction.reply({content:'❌ 只有創作者可以使用',ephemeral:true});
      }

      await interaction.reply({content:`✅ 已接收 ${cmd} 指令，排程中...`,ephemeral:true});
    }

  }catch(err){console.error(err);}
});

// ---------- 保活 ----------
const app = express();
app.get('/', (req,res)=>res.send('Bot is running'));
const PORT = process.env.PORT||3000;
app.listen(PORT,()=>console.log(`保活伺服器啟動 port=${PORT}`));

client.login(TOKEN);
