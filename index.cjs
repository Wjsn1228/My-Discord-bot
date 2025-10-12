require('dotenv').config();
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const express = require('express');

// ---------- 基本設定 ----------
const CREATOR_ID = '1424308660900724858';

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
  炸3: `# @everyone 
# 笑死一群廢物你們被Moonlight給炸了 🤡 
# lol 
# 菜就多練 
# 不會做bot就別叫 
# 想要嗎?來
# https://discord.gg/QQWERNrPCG`,
  炸4: `# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG`
};

// ---------- Slash 指令 ----------
const commands = [
  ...Object.keys(spamMessages).map(k =>
    new SlashCommandBuilder()
      .setName(k)
      .setDescription(`產生 ${k} 按鈕`).toJSON()
  ),
  new SlashCommandBuilder()
    .setName('炸私聊')
    .setDescription('產生炸私聊按鈕給指定使用者')
    .addUserOption(opt =>
      opt.setName('user').setDescription('標記目標使用者').setRequired(true)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('重啟')
    .setDescription('重新啟動機器人（僅創建者）')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// ---------- 註冊指令 ----------
async function registerGuildCommands(guildId) {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: commands });
    console.log(`✅ 指令已註冊到伺服器 ${guildId}`);
  } catch (e) {
    console.error(`❌ 指令註冊失敗（伺服器 ${guildId}）：`, e);
  }
}

// ---------- 工具 ----------
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

// ---------- 處理指令 ----------
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    const cmd = interaction.commandName;
    const userId = interaction.user.id;

    // ---------- 重啟 ----------
    if (cmd === '重啟') {
      if (userId !== CREATOR_ID)
        return interaction.reply({ content: '❌ 只有創建者能使用此指令', ephemeral: true });
      await interaction.reply({ content: '🔄 Bot 正在重啟中...' });
      return process.exit();
    }

    // ---------- 炸私聊按鈕 ----------
    if (cmd === '炸私聊') {
      const target = interaction.options.getUser('user');
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`炸私聊-${target.id}`)
            .setLabel('瘋狂私訊我')
            .setStyle(ButtonStyle.Danger)
        );
      return interaction.reply({ content: `🎯 點擊按鈕開始炸私聊 <@${target.id}>！（共30次）`, components: [row], ephemeral: true });
    }

    // ---------- 伺服器炸訊息按鈕 ----------
    if (['炸1','炸2','炸3','炸4'].includes(cmd)) {
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`炸訊息-${cmd}`)
            .setLabel('瘋狂按我')
            .setStyle(ButtonStyle.Primary)
        );
      return interaction.reply({ content: `🎯 點擊按鈕發送 ${cmd}（共5次）`, components: [row], ephemeral: true });
    }
  }

  // ---------- 處理按鈕 ----------
  if (interaction.isButton()) {
    await interaction.deferReply({ ephemeral: true });

    // 私聊
    if (interaction.customId.startsWith('炸私聊-')) {
      const targetId = interaction.customId.split('-')[1];
      let target;
      try { target = await client.users.fetch(targetId); } 
      catch { return interaction.editReply({ content: '❌ 找不到該使用者' }); }

      const parts = splitMessage(spamMessages['炸1']);
      for (let i=0;i<30;i++){
        for (const p of parts) {
          await target.send(p);
          await sleep(300);
        }
      }
      return interaction.editReply({ content: `✅ 已私訊炸1給 <@${target.id}>（共30次）` });
    }

    // 伺服器訊息
    if (interaction.customId.startsWith('炸訊息-')) {
      const cmd = interaction.customId.split('-')[1];
      const parts = splitMessage(spamMessages[cmd]);
      for (let i=0;i<5;i++){
        for (const p of parts){
          await interaction.channel.send(p);
          await sleep(300);
        }
      }
      return interaction.editReply({ content: `✅ 已發送 ${cmd}（共5次）` });
    }
  }
});

// ---------- Bot 上線 ----------
client.once('ready', async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  for (const guild of client.guilds.cache.values()) {
    await registerGuildCommands(guild.id);
  }
});

// ---------- 新伺服器加入 ----------
client.on(Events.GuildCreate, async guild => {
  console.log(`➡ Bot 加入新伺服器：${guild.id}`);
  await registerGuildCommands(guild.id);
});

// ---------- 保活 ----------
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000, () => console.log('✅ 保活伺服器已啟動'));

client.login(process.env.DISCORD_TOKEN);
    new SlashCommandBuilder()
      .setName(k)
      .setDescription(`發送 ${k} 訊息`).toJSON()
  ),
  new SlashCommandBuilder()
    .setName('炸私聊')
    .setDescription('將炸1訊息私訊給指定使用者')
    .addUserOption(opt =>
      opt.setName('user').setDescription('標記目標使用者').setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('id').setDescription('輸入目標使用者ID').setRequired(false)
    )
    .toJSON(),
  new SlashCommandBuilder()
    .setName('重啟')
    .setDescription('重新啟動機器人（僅創建者）')
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// ---------- 註冊指令 ----------
async function registerGuildCommands(guildId) {
  try {
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: commands });
    console.log(`✅ 指令已註冊到伺服器 ${guildId}`);
  } catch (e) {
    console.error(`❌ 指令註冊失敗（伺服器 ${guildId}）：`, e);
  }
}

// ---------- 工具 ----------
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

  // 冷卻檢查
  if (cooldowns.has(key) && now < cooldowns.get(key))
    return interaction.reply({ content: '🕒 請稍後再使用', ephemeral: true });
  cooldowns.set(key, now + COOLDOWN_MS);

  // ---------- 重啟 ----------
  if (cmd === '重啟') {
    if (userId !== CREATOR_ID)
      return interaction.reply({ content: '❌ 只有創建者能使用此指令', ephemeral: true });
    await interaction.reply({ content: '🔄 Bot 正在重啟中...' });
    return process.exit();
  }

  // ---------- 炸私聊 ----------
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
    for (let i = 0; i < 30; i++) { // 🔥 發30次
      for (const p of parts) {
        await target.send(p);
        await sleep(300);
      }
    }
    return interaction.reply({ content: `✅ 已私訊炸1給 <@${target.id}>（共30次）`, ephemeral: true });
  }

  // ---------- 伺服器炸訊息 ----------
  if (['炸1', '炸2', '炸3', '炸4'].includes(cmd)) {
    const parts = splitMessage(spamMessages[cmd]);
    for (let i = 0; i < 5; i++) { // 🔥 發5次
      for (const p of parts) {
        await interaction.channel.send(p);
        await sleep(300);
      }
    }
    return interaction.reply({ content: `✅ 已發送 ${cmd}（共5次）`, ephemeral: true });
  }
});

// ---------- Bot 上線 ----------
client.once('ready', async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  for (const guild of client.guilds.cache.values()) {
    await registerGuildCommands(guild.id);
  }
});

// ---------- 新伺服器加入 ----------
client.on(Events.GuildCreate, async guild => {
  console.log(`➡ Bot 加入新伺服器：${guild.id}`);
  await registerGuildCommands(guild.id);
});

// ---------- 保活 ----------
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000, () => console.log('✅ 保活伺服器已啟動'));

client.login(process.env.DISCORD_TOKEN);

