require('dotenv').config();
const { Client, GatewayIntentBits, Events, SlashCommandBuilder, REST, Routes } = require('discord.js');

//////////////////// 設定區 ////////////////////
const CREATOR_ID = '1424308660900724858'; // 創建者ID
const ALLOWED_ROLE_NAME = '已驗證會員';   // 使用炸訊息指令需要此身分組
const COOLDOWN_MS = 1000;                 // 每個使用者每指令冷卻時間(ms)
////////////////////////////////////////////////

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

//////////////////// Slash 指令註冊 ////////////////////
const commands = [
  ...Object.keys(spamMessages).map(k => new SlashCommandBuilder()
    .setName(k)
    .setDescription(`發送 ${k} 訊息`).toJSON()),
  new SlashCommandBuilder().setName('炸私聊').setDescription('將炸1訊息私訊給自己').toJSON(),
  new SlashCommandBuilder()
    .setName('炸私聊指定')
    .setDescription('將炸1訊息私訊給指定使用者ID')
    .addStringOption(opt => opt.setName('id').setDescription('使用者ID').setRequired(true))
    .toJSON(),
  new SlashCommandBuilder().setName('重啟').setDescription('重新啟動機器人（僅創建者）').toJSON()
];

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commands });
    console.log('✅ 全局指令已註冊完成');
  } catch (e) {
    console.error('❌ 註冊指令失敗:', e);
  }
})();

//////////////////// 工具函數 ////////////////////
function splitMessage(text, maxLength = 1900) {
  const parts = []; let current = '';
  for (const line of text.split('\n')) {
    if ((current + line + '\n').length > maxLength) { parts.push(current); current = ''; }
    current += line + '\n';
  }
  if (current.length) parts.push(current);
  return parts;
}
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }
const cooldowns = new Map();

//////////////////// 處理指令 ////////////////////
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

  // ---------- 重啟指令 ----------
  if (cmd === '重啟') {
    if (userId !== CREATOR_ID)
      return interaction.reply({ content: '❌ 你沒有權限使用此指令', ephemeral: true });
    await interaction.reply({ content: '🔄 Bot 正在重啟...' });
    return process.exit();
  }

  // ---------- 炸訊息指令 ----------
  if (['炸1','炸2','炸3','炸4','炸私聊','炸私聊指定'].includes(cmd)) {
    // 伺服器檢查身分組
    if (interaction.guild) {
      const member = interaction.member;
      if (!member.roles.cache.some(r => r.name === ALLOWED_ROLE_NAME))
        return interaction.reply({ content: `❌ 你必須擁有身分組 **${ALLOWED_ROLE_NAME}** 才能使用此指令`, ephemeral: true });
    }

    // ---------- 處理炸私聊指定 ----------
    if (cmd === '炸私聊指定') {
      const targetId = interaction.options.getString('id');
      let target;
      try {
        target = await client.users.fetch(targetId);
      } catch {
        return interaction.reply({ content: '❌ 找不到此使用者', ephemeral: true });
      }
      const parts = splitMessage(spamMessages['炸1']);
      for (const p of parts) {
        await target.send(p);
        await sleep(300);
      }
      return interaction.reply({ content: `✅ 已私訊炸1訊息給 <@${targetId}>`, ephemeral: true });
    }

    // ---------- 其他炸訊息 ----------
    const parts = cmd === '炸私聊' ? splitMessage(spamMessages['炸1']) : splitMessage(spamMessages[cmd]);
    for (let i = 0; i < 3; i++) { // 每段重複3次
      for (const p of parts) {
        if (interaction.guild)
          await interaction.channel.send(p);
        else
          await interaction.user.send(p);
        await sleep(300);
      }
    }
    if (cmd === '炸私聊')
      return interaction.followUp({ content: '✅ 已私訊炸1訊息', ephemeral: true });

    return;
  }
});

client.once('ready', () => console.log(`🤖 Bot 已上線：${client.user.tag}`));

// 保活伺服器
const express = require('express');
const app = express();
app.get("/", (req, res) => res.send("Bot is running"));
app.listen(process.env.PORT || 3000, () => console.log('✅ 保活伺服器已啟動'));

client.login(process.env.DISCORD_TOKEN);
