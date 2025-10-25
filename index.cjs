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
  炸1: `# 炸\n`.repeat(30),
  炸2: `# 想體驗免費的炸訊息機器人嗎？\n# 加入我們伺服器！\nhttps://discord.gg/QQWERNrPCG`,
  炸3: `# @everyone\n# 笑死一群廢物你們被Moonlight給炸了 🤡\n# lol\n# 菜就多練\n# 不會做bot就別叫\n# 想要嗎?來\n# https://discord.gg/QQWERNrPCG`,
  炸4: `# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG`,
  定海神針: `# 定\n`.repeat(30)
};

// ---------- 工具函式 ----------
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
async function sendOnceToChannel(channelId, content) {
  try {
    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased()) return false;
    await ch.send(content).catch(()=>{});
    return true;
  } catch { return false; }
}

async function sendRepeatedToChannel(channelId, content, times = 5, intervalMs = 300) {
  (async () => {
    for (let i = 0; i < times; i++) {
      try { await sendOnceToChannel(channelId, content); } catch{}
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
        try { await user.send(content); } catch{}
        await sleep(1000);
      }
    } catch{}
  })();
}

// ---------- 按鈕 / Modal ----------
function createMainButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('請瘋狂按我').setLabel('請瘋狂按我').setStyle(ButtonStyle.Primary)
  );
}

function createChannelModal(commandId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${commandId}`)
    .setTitle('輸入頻道ID (不填則本頻道)');
  const input = new TextInputBuilder()
    .setCustomId('remoteChannelId')
    .setLabel('頻道ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

// ---------- 全域指令 ----------
const commandBuilders = [
  new SlashCommandBuilder().setName('炸1').setDescription('發送炸1').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則本頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('炸2').setDescription('發送炸2').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則本頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('炸3').setDescription('發送炸3').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則本頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('炸4').setDescription('發送炸4').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則本頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('遠程炸').setDescription('混合炸1~炸4').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則本頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('炸私聊').setDescription('對任意使用者私聊發送500條').addStringOption(o => o.setName('user').setDescription('使用者ID').setRequired(true)),
  new SlashCommandBuilder().setName('定海神針').setDescription('發送定海神針').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則本頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('自訂炸').setDescription('自訂文字炸').addStringOption(o => o.setName('content').setDescription('輸入文字').setRequired(true)).addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則本頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('刷新').setDescription('重新註冊全域指令（創建者限定）'),
  new SlashCommandBuilder().setName('重啟').setDescription('重啟Bot（創建者限定）')
].map(b => b.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registerGlobalCommands() {
  if (!CLIENT_ID) return;
  try { await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandBuilders }); } catch(e){console.error(e);}
}

// ---------- Client事件 ----------
client.once(Events.ClientReady, async () => { console.log(`🤖 ${client.user.tag} 已上線`); await registerGlobalCommands(); });

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // ---------- Modal ----------
    if (interaction.type === InteractionType.ModalSubmit) {
      const cmd = interaction.customId.replace('modal_','');
      const remoteId = interaction.fields.getTextInputValue('remoteChannelId')?.trim() || interaction.channelId;

      if (cmd === '遠程炸') {
        const mixed = spamMessages.炸1+'\n'+spamMessages.炸2+'\n'+spamMessages.炸3+'\n'+spamMessages.炸4;
        sendRepeatedToChannel(remoteId, mixed, 5, 300);
        return interaction.reply({ content: `已排程遠程炸到 <#${remoteId}>`, ephemeral: true });
      }

      if (spamMessages[cmd]) { sendRepeatedToChannel(remoteId, spamMessages[cmd], 5, 300); return interaction.reply({ content: `已排程 ${cmd} 到 <#${remoteId}>`, ephemeral: true }); }
      return;
    }

    // ---------- Button ----------
    if (interaction.isButton()) {
      if (interaction.customId === '請瘋狂按我') {
        // 連動最近一次炸指令
        await interaction.reply({ content: '已觸發請瘋狂按我!', ephemeral: true });
      }
      return;
    }

    // ---------- Slash指令 ----------
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;
      const optChannel = interaction.options.getString('channel');
      const targetChannelId = optChannel && optChannel.trim() ? optChannel.trim() : interaction.channelId;

      if (cmd === '炸私聊') {
        const userId = interaction.options.getString('user');
        spamDMBackground(userId, spamMessages.炸1+'\n'+spamMessages.炸2+'\n'+spamMessages.炸3+'\n'+spamMessages.炸4);
        return interaction.reply({ content: '已開始私聊炸訊息（500條）', ephemeral: true });
      }

      if (cmd === '遠程炸') {
        const mixed = spamMessages.炸1+'\n'+spamMessages.炸2+'\n'+spamMessages.炸3+'\n'+spamMessages.炸4;
        sendRepeatedToChannel(targetChannelId, mixed, 5, 300);
        return interaction.reply({ content: '已排程遠程炸', ephemeral: true });
      }

      if (cmd === '自訂炸') {
        const content = interaction.options.getString('content');
        sendRepeatedToChannel(targetChannelId, content, 5, 300);
        return interaction.reply({ content: '已排程自訂炸', ephemeral: true });
      }

      if (cmd === '重啟' || cmd === '刷新') {
        if (!CREATOR_IDS.includes(interaction.user.id)) return interaction.reply({ content: '❌ 只有創建者可用', ephemeral: true });
        if (cmd === '重啟') { interaction.reply({ content: '重啟中...', ephemeral: true }); process.exit(0); }
        if (cmd === '刷新') { await registerGlobalCommands(); return interaction.reply({ content: '全域指令已刷新', ephemeral: true }); }
      }

      if (spamMessages[cmd]) { sendRepeatedToChannel(targetChannelId, spamMessages[cmd], 5, 300); return interaction.reply({ content: `已排程 ${cmd}`, ephemeral: true }); }
      if (cmd === '定海神針') { sendRepeatedToChannel(targetChannelId, spamMessages.定海神針, 1, 300); return interaction.reply({ content: '已排程定海神針', ephemeral: true }); }
    }

  } catch(e){console.error(e);}
});

// ---------- 保活 ----------
const app = express();
app.get('/', (req,res)=>res.send('Bot is running'));
const PORT = process.env.PORT||3000;
app.listen(PORT, ()=>console.log(`保活伺服器啟動 port=${PORT}`));

// ---------- 登入 ----------
client.login(TOKEN);
