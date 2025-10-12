require('dotenv').config();
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

// ---------- 基本設定 ----------
const CREATOR_ID = '1424308660900724858';
const COOLDOWN_MS = 1000;
const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 每 5 分鐘刷新全域指令
const CHANNEL_ID = '1417819492406263933'; // 指定通知頻道ID

// ---------- 建立 Client ----------
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
  partials: ['CHANNEL']
});

// ---------- 訊息內容 ----------
const spamMessages = {
  炸1: `# 炸\n`.repeat(30),
  炸2: `# 想體驗免費的炸訊息機器人嗎？\n# 加入我們伺服器！\nhttps://discord.gg/QQWERNrPCG`,
  炸3: `@everyone 
# 笑死一群廢物你們被Moonlight給炸了 🤡 
# lol 
# 菜就多練 
# 不會做bot就別叫 
# 想要嗎?來
# https://discord.gg/QQWERNrPCG`,
  炸4: `# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG`
};

// ---------- Slash 指令內容 ----------
const commands = [
  ...Object.keys(spamMessages).map(k =>
    new SlashCommandBuilder()
      .setName(k)
      .setDescription(`發送 ${k} 訊息`).toJSON()
  ),
  new SlashCommandBuilder()
    .setName('炸私聊')
    .setDescription('將炸1訊息私訊給指定使用者')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('標記目標使用者')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('輸入目標使用者ID')
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('重啟')
    .setDescription('重新啟動機器人（僅創建者）')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('刷新指令')
    .setDescription('立即刷新全域指令（僅創建者）')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// ---------- 工具函數 ----------
function splitMessage(text, maxLength = 1900) {
  const parts = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + line + '\n').length > maxLength) {
      parts.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current.length) parts.push(current);
  return parts;
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
const cooldowns = new Map();

// ---------- 處理指令 ----------
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;
  const userId = interaction.user.id;
  const key = `${userId}-${cmd}`;
  const now = Date.now();

  if (cooldowns.has(key) && now < cooldowns.get(key))
    return interaction.reply({ content: '🕒 請稍後再使用', ephemeral: true });

  cooldowns.set(key, now + COOLDOWN_MS);

  // ---------- 指令處理 ----------
  if (cmd === '重啟') {
    if (userId !== CREATOR_ID)
      return interaction.reply({ content: '❌ 只有創建者能使用此指令', ephemeral: true });
    await interaction.reply({ content: '🔄 Bot 正在重啟中...' });
    return process.exit();
  }

  if (cmd === '刷新指令') {
    if (userId !== CREATOR_ID)
      return interaction.reply({ content: '❌ 只有創建者能使用此指令', ephemeral: true });
    await interaction.reply({ content: '🔄 正在刷新全域指令...' });
    await registerGlobalCommands();
    return interaction.followUp({ content: '✅ 全域指令已立即刷新完成！', ephemeral: true });
  }

  if (cmd === '炸私聊') {
    let target = interaction.options.getUser('user');
    const targetId = interaction.options.getString('id');
    if (!target && !targetId)
      return interaction.reply({ content: '❌ 請提供 @使用者 或 使用者ID', ephemeral: true });
    if (!target && targetId) {
      try { target = await client.users.fetch(targetId); } 
      catch { return interaction.reply({ content: '❌ 找不到該使用者', ephemeral: true }); }
    }
    const parts = splitMessage(spamMessages['炸1']);
    for (const p of parts) { await target.send(p); await sleep(300); }
    return interaction.reply({ content: `✅ 已私訊炸1給 <@${target.id}>`, ephemeral: true });
  }

  if (['炸1','炸2','炸3','炸4'].includes(cmd)) {
    const parts = splitMessage(spamMessages[cmd]);
    for (let i = 0; i < 3; i++) {
      for (const p of parts) { await interaction.channel.send(p); await sleep(300); }
    }
    return interaction.reply({ content: `✅ 已發送 ${cmd}`, ephemeral: true });
  }
});

// ---------- 註冊全域指令 ----------
async function registerGlobalCommands() {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ 全域指令已註冊完成');

    const globalCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
    console.log('🌐 目前全域指令列表：', globalCommands.map(c => c.name));

    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel) {
      channel.send(`🌐 全域指令已刷新完成！目前指令列表：${globalCommands.map(c => c.name).join(', ')}`);
    }
  } catch (e) {
    console.error('❌ 全域指令註冊失敗：', e);
  }
}

// ---------- 自動每 5 分鐘刷新全域指令 ----------
function startAutoRefresh() {
  setInterval(async () => {
    console.log('🔄 自動刷新全域指令...');
    await registerGlobalCommands();
  }, REFRESH_INTERVAL_MS);
}

// ---------- Bot 上線 ----------
client.once('ready', async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  await registerGlobalCommands();
  startAutoRefresh();
});

// ---------- 保活 ----------
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000, () => console.log('✅ 保活伺服器已啟動'));

client.login(process.env.DISCORD_TOKEN);
  ...Object.keys(spamMessages).map(k =>
    new SlashCommandBuilder()
      .setName(k)
      .setDescription(`發送 ${k} 訊息`).toJSON()
  ),
  new SlashCommandBuilder()
    .setName('炸私聊')
    .setDescription('將炸1訊息私訊給指定使用者')
    .addUserOption(opt =>
      opt.setName('user')
        .setDescription('標記目標使用者')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('id')
        .setDescription('輸入目標使用者ID')
        .setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('重啟')
    .setDescription('重新啟動機器人（僅創建者）')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// ---------- 清空全域指令 ----------
async function clearGlobalCommands() {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] });
    console.log('🗑️ 全域指令已清空');
  } catch (e) {
    console.error('❌ 清空全域指令失敗：', e);
  }
}

// ---------- 註冊指令函數 ----------
async function registerGuildCommands(guildId) {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: commands });
    console.log(`✅ 指令已註冊到測試伺服器 ${guildId}`);
  } catch (e) {
    console.error(`❌ 指令註冊失敗（伺服器 ${guildId}）：`, e);
  }
}

async function registerGlobalCommands() {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ 全域指令已註冊完成');
  } catch (e) {
    console.error('❌ 全域指令註冊失敗：', e);
  }
}

// ---------- 工具函數 ----------
function splitMessage(text, maxLength = 1900) {
  const parts = [];
  let current = '';
  for (const line of text.split('\n')) {
    if ((current + line + '\n').length > maxLength) {
      parts.push(current);
      current = '';
    }
    current += line + '\n';
  }
  if (current.length) parts.push(current);
  return parts;
}

function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
const cooldowns = new Map();

// ---------- 處理指令 ----------
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const cmd = interaction.commandName;
  const userId = interaction.user.id;
  const key = `${userId}-${cmd}`;
  const now = Date.now();

  if (cooldowns.has(key) && now < cooldowns.get(key))
    return interaction.reply({ content: '🕒 請稍後再使用', ephemeral: true });

  cooldowns.set(key, now + COOLDOWN_MS);

  if (cmd === '重啟') {
    if (userId !== CREATOR_ID)
      return interaction.reply({ content: '❌ 只有創建者能使用此指令', ephemeral: true });
    await interaction.reply({ content: '🔄 Bot 正在重啟中...' });
    return process.exit();
  }

  if (cmd === '炸私聊') {
    let target = interaction.options.getUser('user');
    const targetId = interaction.options.getString('id');
    if (!target && !targetId)
      return interaction.reply({ content: '❌ 請提供 @使用者 或 使用者ID', ephemeral: true });
    if (!target && targetId) {
      try { target = await client.users.fetch(targetId); } 
      catch { return interaction.reply({ content: '❌ 找不到該使用者', ephemeral: true }); }
    }
    const parts = splitMessage(spamMessages['炸1']);
    for (const p of parts) { await target.send(p); await sleep(300); }
    return interaction.reply({ content: `✅ 已私訊炸1給 <@${target.id}>`, ephemeral: true });
  }

  if (['炸1','炸2','炸3','炸4'].includes(cmd)) {
    const parts = splitMessage(spamMessages[cmd]);
    for (let i = 0; i < 3; i++) {
      for (const p of parts) { await interaction.channel.send(p); await sleep(300); }
    }
    return interaction.reply({ content: `✅ 已發送 ${cmd}`, ephemeral: true });
  }
});

// ---------- Bot 上線 ----------
client.once('ready', async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);

  // 先清空全域指令
  await clearGlobalCommands();

  // 註冊測試伺服器指令
  console.log('🔄 註冊測試伺服器指令...');
  await registerGuildCommands(TEST_GUILD_ID);
  console.log('✅ 測試伺服器指令註冊完成');

  // 註冊全域指令
  console.log('🔄 註冊全域指令...');
  await registerGlobalCommands();
  console.log('✅ 全域指令註冊完成');
});

// ---------- 保活 ----------
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000, () => console.log('✅ 保活伺服器已啟動'));

client.login(process.env.DISCORD_TOKEN);

