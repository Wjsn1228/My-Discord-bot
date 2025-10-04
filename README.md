# My-Discord-bot
discord bot
require('dotenv').config();

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
  InteractionType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// ---------- 冷卻時間設定（0.1 秒） ----------
const COOLDOWN_MS = 100;
const cooldowns = new Map();

// ---------- 訊息內容 ----------
const messages = {
  炸1: `# 炸\n`.repeat(30),
  炸2: `你想要免費炸群機器人嗎？\n來吧！\n來這個服務器吧！\nhttps://discord.gg/QQWERNrPCG`,
  炸3: `@everyone\n笑死一群廢物你們被Moonlight給炸了 🤡`,
  炸4: `# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG`
};

// ---------- Slash 指令 ----------
const commands = Object.keys(messages).map(cmd =>
  new SlashCommandBuilder().setName(cmd).setDescription(`發送 ${cmd} 訊息`)
).map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log('📨 註冊斜線指令...');
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log('✅ 指令註冊完成');
  } catch (err) {
    console.error('❌ 指令註冊失敗:', err);
  }
})();

client.once('ready', () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
});

// ---------- 暫存使用者確認狀態 ----------
const pendingConfirm = new Map();

// ---------- Slash 與按鈕處理 ----------
client.on(Events.InteractionCreate, async interaction => {
  try {
    // 處理 Slash 指令
    if (interaction.type === InteractionType.ApplicationCommand) {
      const cmd = interaction.commandName;
      const userId = interaction.user.id;
      const key = `${userId}-${cmd}`;
      const now = Date.now();

      if (cooldowns.has(key) && now < cooldowns.get(key)) {
        return interaction.reply({ content: '🕒 請稍後再試。', ephemeral: true });
      }

      // 顯示確認按鈕
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`confirm-${cmd}`).setLabel('✅ 確定').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`cancel-${cmd}`).setLabel('❌ 不要').setStyle(ButtonStyle.Danger)
      );

      pendingConfirm.set(userId, cmd);
      await interaction.reply({ content: `你確定要執行 /${cmd} 嗎？`, components: [row], ephemeral: true });
      return;
    }

    // 處理按鈕點擊
    if (interaction.isButton()) {
      const [action, cmd] = interaction.customId.split('-');
      const userId = interaction.user.id;

      if (!Object.keys(messages).includes(cmd)) return;

      const key = `${userId}-${cmd}`;
      const now = Date.now();

      if (action === 'cancel') {
        await interaction.reply({ content: '👌 已取消。', ephemeral: true });
        pendingConfirm.delete(userId);
        return;
      }

      if (action === 'confirm') {
        // 冷卻檢查
        if (cooldowns.has(key) && now < cooldowns.get(key)) {
          await interaction.reply({ content: '🕒 請稍後再試。', ephemeral: true });
          return;
        }

        cooldowns.set(key, now + COOLDOWN_MS);
        pendingConfirm.delete(userId);

        // 回覆隱藏訊息 + 「請瘋狂按我」按鈕（不會消失）
        const crazyRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`crazy-${cmd}`).setLabel('請瘋狂按我').setStyle(ButtonStyle.Primary)
        );

        await interaction.reply({ content: '✅ 請按下「請瘋狂按我」開始發送訊息', components: [crazyRow], ephemeral: true });
        return;
      }

      if (action === 'crazy') {
        // 這裡先冷卻判斷，不然會爆訊息
        if (cooldowns.has(key) && now < cooldowns.get(key)) {
          return interaction.reply({ content: '🕒 請稍後再試。', ephemeral: true });
        }
        cooldowns.set(key, now + COOLDOWN_MS);

        await interaction.reply({ content: '🚀 開始發送訊息！', ephemeral: true });

        const msgParts = splitMessage(messages[cmd]);

        // 每0.5秒發送一次，共5次
        for (let i = 0; i < 5; i++) {
          for (const part of msgParts) {
            await interaction.channel.send(part);
          }
          await sleep(500);
        }

        return;
      }
    }
  } catch (err) {
    console.error('錯誤：', err);
  }
});

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

client.login(process.env.DISCORD_TOKEN);
