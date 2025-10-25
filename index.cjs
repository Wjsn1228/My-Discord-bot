require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, PermissionsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CREATOR_IDS = ['1183056878004080701', '1385239822070710313']; // 創作者ID

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

function spamDMBackground(userId, message) {
  (async () => {
    try {
      const user = await client.users.fetch(userId).catch(()=>null);
      if (!user) return;
      for (let i = 0; i < 500; i++) {
        try { await user.send(message); } catch(e){}
        await sleep(1000);
      }
    } catch(e) { console.error('spamDMBackground error:', e); }
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
    new ButtonBuilder().setCustomId('自訂炸').setLabel('自訂炸').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸私聊').setLabel('炸私聊').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('定海神針').setLabel('定海神針').setStyle(ButtonStyle.Secondary)
  );
}

function createChannelModal(commandId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${commandId}`)
    .setTitle(commandId === '自訂炸' ? '自訂炸文字' : '輸入遠程頻道ID');
  const input = new TextInputBuilder()
    .setCustomId('inputField')
    .setLabel(commandId === '自訂炸' ? '請輸入要炸的文字' : '頻道 ID')
    .setStyle(commandId === '自訂炸' ? TextInputStyle.Paragraph : TextInputStyle.Short)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

// ---------- 全域指令註冊 ----------
const commandBuilders = [
  new SlashCommandBuilder().setName('炸1').setDescription('發送炸1').addStringOption(o=>o.setName('channel').setDescription('頻道ID (不填則當前頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('炸2').setDescription('發送炸2').addStringOption(o=>o.setName('channel').setDescription('頻道ID').setRequired(false)),
  new SlashCommandBuilder().setName('炸3').setDescription('發送炸3').addStringOption(o=>o.setName('channel').setDescription('頻道ID').setRequired(false)),
  new SlashCommandBuilder().setName('炸4').setDescription('發送炸4').addStringOption(o=>o.setName('channel').setDescription('頻道ID').setRequired(false)),
  new SlashCommandBuilder().setName('自訂炸').setDescription('自訂炸文字').addStringOption(o=>o.setName('channel').setDescription('頻道ID').setRequired(false)).addStringOption(o=>o.setName('text').setDescription('要炸的文字').setRequired(true)),
  new SlashCommandBuilder().setName('炸私聊').setDescription('對使用者私聊發送500條'),
  new SlashCommandBuilder().setName('定海神針').setDescription('發送定海神針').addStringOption(o=>o.setName('channel').setDescription('頻道ID').setRequired(false)),
  new SlashCommandBuilder().setName('刷新').setDescription('刷新全域指令（創作者限定）'),
  new SlashCommandBuilder().setName('重啟').setDescription('重新啟動 Bot（創作者限定）')
].map(b=>b.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registerGlobalCommands() {
  if (!CLIENT_ID) return;
  try {
    console.log('>> 註冊全域指令中...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandBuilders });
    console.log('>> 全域指令註冊完成');
  } catch (e) { console.error('registerGlobalCommands error:', e); }
}

// ---------- Client 事件 ----------
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Moonlight🌙✨ nuke bot 已上線：${client.user.tag}`);
  await registerGlobalCommands();
});

// ---------- Interaction ----------
client.on(Events.InteractionCreate, async interaction => {
  try {
    // Modal
    if (interaction.type === InteractionType.ModalSubmit) {
      const cmd = interaction.customId.replace('modal_','');
      const val = interaction.fields.getTextInputValue('inputField').trim();
      const targetChannelId = cmd === '自訂炸' ? (interaction.options?.getString('channel') || interaction.channelId) : val;

      await interaction.reply({ content: `已排程 ${cmd}`, ephemeral:true });

      if (cmd === '自訂炸') sendRepeatedToChannel(targetChannelId, val, 5, 300);
      else sendRepeatedToChannel(targetChannelId, spamMessages[cmd] || '', 5, 300);
      return;
    }

    // Button
    if (interaction.isButton() && interaction.isButton()) {
      const id = interaction.customId;
      if (id === '請瘋狂按我') {
        await interaction.reply({ content:'按下請瘋狂按我', ephemeral:true });
        return;
      }
      if (id in spamMessages) {
        const modal = createChannelModal(id);
        await interaction.showModal(modal);
        return;
      }
      if (id === '自訂炸') {
        const modal = createChannelModal('自訂炸');
        await interaction.showModal(modal);
        return;
      }
      if (id === '炸私聊') {
        await interaction.reply({ content:'已開始私聊炸訊息（背景執行500條）', ephemeral:true });
        spamDMBackground(interaction.user.id, spamMessages.炸1 + spamMessages.炸2 + spamMessages.炸3 + spamMessages.炸4);
        return;
      }
      return;
    }

    // Slash 指令
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;

      if ((cmd === '重啟' || cmd === '刷新') && !CREATOR_IDS.includes(interaction.user.id)) {
        return interaction.reply({ content:'❌ 只有創作者可以使用', ephemeral:true });
      }

      const optChannel = interaction.options.getString('channel');
      const targetChannelId = optChannel && optChannel.trim().length ? optChannel.trim() : interaction.channelId;

      if (cmd.startsWith('炸') && cmd !== '炸私聊') {
        sendRepeatedToChannel(targetChannelId, spamMessages[cmd], 5, 300);
                return interaction.reply({ content: `✅ 已排程 ${cmd} 到 <#${targetChannelId}>`, ephemeral: true });
      }

      if (cmd === '炸私聊') {
        spamDMBackground(interaction.user.id, spamMessages.炸1 + spamMessages.炸2 + spamMessages.炸3 + spamMessages.炸4);
        return interaction.reply({ content: '✅ 已開始私聊炸訊息（背景執行500條）', ephemeral: true });
      }

      if (cmd === '自訂炸') {
        const text = interaction.options.getString('text');
        sendRepeatedToChannel(targetChannelId, text, 5, 300);
        return interaction.reply({ content: `✅ 已排程自訂炸到 <#${targetChannelId}>`, ephemeral: true });
      }

      if (cmd === '定海神針') {
        sendRepeatedToChannel(targetChannelId, spamMessages.定海神針, 5, 300);
        return interaction.reply({ content: `✅ 已排程定海神針到 <#${targetChannelId}>`, ephemeral: true });
      }

      if (cmd === '刷新') {
        registerGlobalCommands().then(() => {
          interaction.followUp({ content: '✅ 全域指令已刷新', ephemeral: true }).catch(() => {});
        }).catch(() => {});
        return;
      }

      if (cmd === '重啟') {
        interaction.reply({ content: '⚠️ Bot 正在重啟...', ephemeral: true }).then(() => {
          console.log('創作者觸發重啟，準備退出...');
          process.exit(0);
        });
        return;
      }
    }
  } catch (err) {
    console.error('interaction handler error:', err);
    if (interaction && !interaction.replied) {
      await interaction.reply({ content: '內部錯誤，請稍後再試', ephemeral: true });
    }
  }
});

// ---------- 保活 ----------
const app = express();
app.get('/', (req,res) => res.send('Moonlight🌙✨ nuke bot 正在運行'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`保活伺服器已啟動，port=${PORT}`));

// ---------- 登入 ----------
client.login(TOKEN);
