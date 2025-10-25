require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CREATOR_IDS = ['1183056878004080701', '1385239822070710313'];

// 建立 client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
});

// ---------- 預設炸訊息 ----------
const spamMessages = {
  炸1: `# 炸\n`.repeat(30),
  炸2: `# 想體驗免費的炸訊息機器人嗎？\n# 加入我們伺服器！\nhttps://discord.gg/QQWERNrPCG`,
  炸3: `# @everyone\n# 笑死一群廢物你們被Moonlight給炸了 🤡\n# lol\n# 菜就多練\n# 不會做bot就別叫\n# 想要嗎?來\n# https://discord.gg/QQWERNrPCG`,
  炸4: `# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG`,
  定海神針: `# 定\n`.repeat(30)
};

// ---------- 工具 ----------
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
      await sendOnceToChannel(channelId, content);
      await sleep(intervalMs);
    }
  })();
}

function spamDMBackground(userId, content) {
  (async () => {
    const user = await client.users.fetch(userId).catch(()=>null);
    if (!user) return;
    for (let i = 0; i < 500; i++) {
      await user.send(content).catch(()=>{});
      await sleep(1000);
    }
  })();
}

// ---------- 按鈕與 Modal ----------
function createMainButtonRow(customText = null) {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder().setCustomId('請瘋狂按我').setLabel('請瘋狂按我').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('炸1').setLabel('炸1').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('炸2').setLabel('炸2').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('炸3').setLabel('炸3').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('炸4').setLabel('炸4').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('自訂炸').setLabel('自訂炸').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('炸私聊').setLabel('炸私聊').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('定海神針').setLabel('定海神針').setStyle(ButtonStyle.Secondary)
    );
  return row;
}

function createChannelModal(commandId, defaultText=null) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${commandId}`)
    .setTitle(`輸入 ${commandId} 的頻道ID (不填則本頻道)`);
  const input = new TextInputBuilder()
    .setCustomId('remoteChannelId')
    .setLabel('頻道ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  modal.addComponents(new ActionRowBuilder().addComponents(input));

  if (commandId === '自訂炸') {
    const textInput = new TextInputBuilder()
      .setCustomId('customText')
      .setLabel('自訂炸文字')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);
    if (defaultText) textInput.setValue(defaultText);
    modal.addComponents(new ActionRowBuilder().addComponents(textInput));
  }

  return modal;
}

// ---------- 全域指令 ----------
const commandBuilders = [
  new SlashCommandBuilder().setName('炸1').setDescription('發送炸1').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('炸2').setDescription('發送炸2').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('炸3').setDescription('發送炸3').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('炸4').setDescription('發送炸4').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('自訂炸').setDescription('自訂炸文字').addStringOption(o => o.setName('text').setDescription('炸的內容').setRequired(true)).addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('炸私聊').setDescription('私聊炸 500 條'),
  new SlashCommandBuilder().setName('定海神針').setDescription('發送定海神針 (30 行)').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前)').setRequired(false)),
  new SlashCommandBuilder().setName('刷新').setDescription('重新註冊全域指令（創建者限定）'),
  new SlashCommandBuilder().setName('重啟').setDescription('重新啟動 Bot（創建者限定）')
].map(b => b.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registerGlobalCommands() {
  if (!CLIENT_ID) return console.warn('CLIENT_ID 未設定');
  try {
    console.log('>> 註冊全域指令...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandBuilders });
    console.log('>> 全域指令註冊完成');
  } catch (e) { console.error(e); }
}

// ---------- Client ----------
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  await registerGlobalCommands();
});

// Interaction
client.on(Events.InteractionCreate, async interaction => {
  try {
    // Modal 提交
    if (interaction.type === InteractionType.ModalSubmit) {
      const custom = interaction.customId;
      if (!custom.startsWith('modal_')) return;
      const cmd = custom.replace('modal_', '');
      const targetChannelId = interaction.fields.getTextInputValue('remoteChannelId')?.trim() || interaction.channelId;

      if (cmd === '自訂炸') {
        const text = interaction.fields.getTextInputValue('customText');
        sendRepeatedToChannel(targetChannelId, text, 5, 300);
        await interaction.reply({ content: `✅ 自訂炸已排程到 <#${targetChannelId}>`, ephemeral: true });
        return;
      }

      if (spamMessages[cmd]) {
        sendRepeatedToChannel(targetChannelId, spamMessages[cmd], 5, 300);
        await interaction.reply({ content: `✅ ${cmd} 已排程到 <#${targetChannelId}>`, ephemeral: true });
        return;
      }
      return;
    }

    // Button 點擊
    if (interaction.isButton()) {
      const id = interaction.customId;

      if (id === '請瘋狂按我') {
        await interaction.reply({ content: '請瘋狂按我已觸發！', ephemeral: true });
        return;
      }

      if (id === '炸私聊') {
        await interaction.reply({ content: '已開始私聊炸訊息（500 條）', ephemeral: true });
        spamDMBackground(interaction.user.id, spamMessages.炸1 + '\n' + spamMessages.炸2 + '\n' + spamMessages.炸3 + '\n' + spamMessages.炸4);
        return;
      }

      if (id in spamMessages || id === '自訂炸') {
        const modal = createChannelModal(id);
        await interaction.showModal(modal);
        return;
      }
    }

    // Slash 指令
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;
      const userId = interaction.user.id;
      const optChannel = interaction.options.getString('channel');
      const targetChannelId = optChannel && optChannel.trim().length ? optChannel.trim() : interaction.channelId;

// 創建者限定指令
if ((cmd === '重啟' || cmd === '刷新') && !CREATOR_IDS.includes(userId)) {
    return interaction.reply({ content: '❌ 只有創建者可以使用此指令', ephemeral: true });
}

// 管理員以上才能用的炸指令（炸1~炸4、自訂炸、定海神針、炸私聊）
const member = await interaction.guild.members.fetch(userId).catch(()=>null);
const isAdmin = member?.permissions.has('Administrator') || false;

if (['炸1','炸2','炸3','炸4','自訂炸','定海神針','炸私聊'].includes(cmd) && !isAdmin) {
    return interaction.reply({ content: '❌ 只有管理員以上才能使用此指令', ephemeral: true });
}

// 執行各指令
if (cmd === '炸私聊') {
    spamDMBackground(interaction.user.id, spamMessages.炸1 + '\n' + spamMessages.炸2 + '\n' + spamMessages.炸3 + '\n' + spamMessages.炸4);
    return interaction.reply({ content: '已開始私聊炸訊息（500 條）', ephemeral: true });
}

if (cmd === '自訂炸') {
    const text = interaction.options.getString('text');
    sendRepeatedToChannel(targetChannelId, text, 5, 300);
    return interaction.reply({ content: `✅ 自訂炸已排程到 <#${targetChannelId}>`, ephemeral: true });
}

if (['炸1','炸2','炸3','炸4','定海神針'].includes(cmd)) {
    sendRepeatedToChannel(targetChannelId, spamMessages[cmd], 5, 300);
    return interaction.reply({ content: `✅ ${cmd} 已排程到 <#${targetChannelId}>`, ephemeral: true });
}

if (cmd === '重啟') {
    await interaction.reply({ content: 'Bot 正在重啟...', ephemeral: true });
    process.exit(0);
}

if (cmd === '刷新') {
    await registerGlobalCommands();
    return interaction.reply({ content: '✅ 指令已刷新', ephemeral: true });
}
