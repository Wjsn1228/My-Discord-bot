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
    } catch(e) {
      console.error('spamDMBackground error:', e);
    }
  })();
}

// ---------- 按鈕 / Modal 建立 ----------
function createMainButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('請瘋狂按我').setLabel('請瘋狂按我').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸1').setLabel('炸1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸2').setLabel('炸2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸3').setLabel('炸3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸4').setLabel('炸4').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸私聊').setLabel('炸私聊').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('自訂炸').setLabel('自訂炸').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('定海神針').setLabel('定海神針').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('遠程炸').setLabel('遠程炸').setStyle(ButtonStyle.Success)
  );
}

function createChannelModal(commandId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${commandId}`)
    .setTitle(`輸入遠程頻道ID (不填則當前頻道)`);
  const input = new TextInputBuilder()
    .setCustomId('remoteChannelId')
    .setLabel('頻道 ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(false);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

function createCustomModal() {
  const modal = new ModalBuilder()
    .setCustomId('modal_自訂炸')
    .setTitle('自訂炸訊息');
  const input = new TextInputBuilder()
    .setCustomId('customContent')
    .setLabel('輸入自訂文字')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

// ---------- 全域指令註冊 ----------
const commandBuilders = [
  new SlashCommandBuilder().setName('炸1').setDescription('發送炸1').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('炸2').setDescription('發送炸2').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('炸3').setDescription('發送炸3').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('炸4').setDescription('發送炸4').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('遠程炸').setDescription('混合炸1~炸4 (遠程)').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('炸私聊').setDescription('對自己私聊發送 (500 條)'),
  new SlashCommandBuilder().setName('定海神針').setDescription('發送定海神針 (30 行)').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('自訂炸').setDescription('自訂文字炸訊息').addStringOption(o => o.setName('channel').setDescription('頻道ID (不填則當前頻道)').setRequired(false)),
  new SlashCommandBuilder().setName('刷新').setDescription('重新註冊全域指令（創建者限定）'),
  new SlashCommandBuilder().setName('重啟').setDescription('重新啟動 Bot（創建者限定）')
].map(b => b.toJSON());

// 註冊程式
const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registerGlobalCommands() {
  if (!CLIENT_ID) return;
  try {
    console.log('>> 註冊全域指令中...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandBuilders });
    console.log('>> 全域指令註冊完成');
  } catch (e) {
    console.error('registerGlobalCommands error:', e);
  }
}

// ---------- Client 事件 ----------
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  await registerGlobalCommands();
});

// ---------- Interaction 處理 ----------
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Modal 提交
    if (interaction.type === InteractionType.ModalSubmit) {
      const custom = interaction.customId;

      if (custom === 'modal_自訂炸') {
        const content = interaction.fields.getTextInputValue('customContent');
        const optChannel = interaction.options?.getString('channel') || interaction.channelId;
        sendRepeatedToChannel(optChannel, content, 5, 300);
        await interaction.reply({ content: '✅ 自訂炸訊息已排程發送', ephemeral: true });
        return;
      }

      if (!custom.startsWith('modal_')) return;
      const cmd = custom.replace('modal_', '');
      const remoteId = interaction.fields.getTextInputValue('remoteChannelId')?.trim();
      const targetChannelId = remoteId && remoteId.length ? remoteId : interaction.channelId;

      await interaction.reply({ content: `已排程 ${cmd} 到 <#${targetChannelId}>，稍後執行。`, ephemeral: true });
      if (cmd === '遠程炸') {
        const mixed = spamMessages.炸1 + '\n' + spamMessages.炸2 + '\n' + spamMessages.炸3 + '\n' + spamMessages.炸4;
        sendRepeatedToChannel(targetChannelId, mixed, 5, 300);
        return;
      }
      if (spamMessages[cmd]) sendRepeatedToChannel(targetChannelId, spamMessages[cmd], 5, 300);
      return;
    }

    // Button 點擊
    if (interaction.isButton()) {
      const id = interaction.customId;
      const optChannel = interaction.channelId;

      if (id === '請瘋狂按我') {
        const content = spamMessages.炸1;
        sendRepeatedToChannel(optChannel, content, 5, 300);
        await interaction.reply({ content: '✅ 開始瘋狂按我！', ephemeral: true });
        return;
      }

      if (id === '炸私聊') {
        await interaction.reply({ content: '已開始私聊炸訊息（背景執行）', ephemeral: true });
        spamDMBackground(interaction.user.id, spamMessages.炸1);
        return;
      }

      if (id in spamMessages) {
        const modal = createChannelModal(id);
        await interaction.showModal(modal);
        return;
      }

      if (id === '自訂炸') {
        const modal = createCustomModal();
        await interaction.showModal(modal);
        return;
      }

      await interaction.reply({ content: '按鈕已收到', ephemeral: true });
      return;
    }

    // Slash 指令
    if (interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;
      const isCreator = CREATOR_IDS.includes(interaction.user.id);
      const optChannel = interaction.options.getString('channel') || interaction.channelId;

      if ((cmd === '重啟' || cmd === '刷新') && !isCreator) {
        return interaction.reply({ content: '❌ 只有創建者可以使用此指令', ephemeral: true });
      }

      if (['炸1','炸2','炸3','炸4','遠程炸','定海神針'].includes(cmd) || cmd === '自訂炸') {
        // 所有人都可用自訂炸，其他炸指令限制可自行擴展
        await interaction.reply({ content: `✅ 已接收 ${cmd} 指令，正在排程執行...`, ephemeral: true });
        if (cmd === '自訂炸') {
          const modal = createCustomModal();
          await interaction.showModal(modal);
          return;
        }
        if (cmd === '遠程炸') {
          const mixed = spamMessages.炸1 + '\n' + spamMessages.炸2 + '\n' + spamMessages.炸3 + '\n' + spamMessages.炸4;
          sendRepeatedToChannel(optChannel, mixed, 5, 300);
          return;
        }
        if (spamMessages[cmd]) sendRepeatedToChannel(optChannel, spamMessages[cmd], 5, 300);
        return;
      }

      if (cmd === '炸私聊') {
        spamDMBackground(interaction.user.id, spamMessages.炸1);
        await interaction.reply({ content: '✅ 已開始私聊炸訊息（背景執行）', ephemeral: true });
        return;
      }

      if (cmd === '刷新') {
        registerGlobalCommands().then(()=>{
          interaction.followUp({ content:'✅ 指令已刷新（排程）', ephemeral:true }).catch(()=>{});
        }).catch(()=>{});
        return;
      }

      if (cmd === '重啟') {
        console.log('重啟指令由創建者觸發，準備退出...');
        process.exit(0);
      }
    }

  } catch (err) {
    console.error('interaction handler error:', err);
    try {
      if (interaction && !interaction.replied) await interaction.reply({ content: '內部錯誤，請稍後再試', ephemeral: true });
    } catch(e){}
  }
});

// ---------- 保活 (express) ----------
const app = express();
app.get('/', (req, res) => res.send('Bot is running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`保活伺服器已啟動，port=${PORT}`));

// ---------- 登入 ----------
client.login(TOKEN);
