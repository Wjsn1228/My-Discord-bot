require('dotenv').config();
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');
const express = require('express');

// ---------- 基本設定 ----------
const CREATOR_ID = '1424308660900724858';
const COOLDOWN_MS = 1000;
const GLOBAL_CHECK_INTERVAL = 30 * 1000; // 30 秒

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
    .toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// ---------- 註冊指令函數 ----------
async function registerCommands(guildId) {
  try {
    // 伺服器指令立即生效
    await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, guildId), { body: commands });
    console.log(`✅ [伺服器] 指令已註冊到 ${guildId}`);

    // 全域指令
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log(`🌐 [全域] 指令已註冊成功 (可能 10~60 分鐘後生效)`);
  } catch (e) {
    console.error(`❌ 指令註冊失敗（伺服器 ${guildId}）：`, e);
  }
}

// ---------- 檢查全域指令 ----------
async function checkGlobalCommands() {
  try {
    const globalCommands = await rest.get(Routes.applicationCommands(process.env.CLIENT_ID));
    console.log(`🌐 全域指令共 ${globalCommands.length} 個：`);
    globalCommands.forEach(cmd => console.log(`- ${cmd.name}`));
  } catch (err) {
    console.error('❌ 取得全域指令失敗：', err);
  }
}

// ---------- 自動定時檢查全域指令 ----------
function startGlobalCheckInterval() {
  setInterval(checkGlobalCommands, GLOBAL_CHECK_INTERVAL);
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
      try {
        target = await client.users.fetch(targetId);
      } catch {
        return interaction.reply({ content: '❌ 找不到該使用者', ephemeral: true });
      }
    }

    const parts = splitMessage(spamMessages['炸1']);
    for (const p of parts) {
      await target.send(p);
      await sleep(300);
    }
    return interaction.reply({ content: `✅ 已私訊炸1給 <@${target.id}>`, ephemeral: true });
  }

  if (['炸1', '炸2', '炸3', '炸4'].includes(cmd)) {
    const parts = splitMessage(spamMessages[cmd]);
    for (let i = 0; i < 3; i++) {
      for (const p of parts) {
        await interaction.channel.send(p);
        await sleep(300);
      }
    }
    return interaction.reply({ content: `✅ 已發送 ${cmd}`, ephemeral: true });
  }
});

// ---------- Bot 上線 ----------
client.once('ready', async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);

  for (const guild of client.guilds.cache.values()) {
    await registerCommands(guild.id);
  }

  // 啟動自動檢查全域指令
  startGlobalCheckInterval();
});

// ---------- 新伺服器加入時自動註冊 ----------
client.on(Events.GuildCreate, async guild => {
  console.log(`➡ Bot 加入新伺服器：${guild.id}`);
  await registerCommands(guild.id);
});

// ---------- 保活 ----------
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000, () => console.log('✅ 保活伺服器已啟動'));

client.login(process.env.DISCORD_TOKEN);
