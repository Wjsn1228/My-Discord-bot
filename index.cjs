require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CREATORS = ['1183056878004080701', '1385239822070710313'];

// 建立 client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers
  ],
});

// ---------- 訊息內容 ----------
const spamMessages = {
  炸1: `# 炸\n`.repeat(5),
  炸2: `# 想體驗免費的炸訊息機器人嗎？\n# 加入我們伺服器！\nhttps://discord.gg/QQWERNrPCG`,
  炸3: `# @everyone\n# 笑死一群廢物你們被Moonlight給炸了 🤡\n# lol\n# 菜就多練\n# 不會做bot就別叫\n# 想要嗎?來\n# https://discord.gg/QQWERNrPCG`,
  炸4: `# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG`,
  定海神針: `# 定\n`.repeat(30)
};

let customSpam = {}; // 自訂炸訊息 key: userId

// ---------- 工具函式 ----------
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function sendOnceToChannel(channelId, content) {
  try {
    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased()) return false;
    await ch.send(content).catch(()=>{});
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

// 私聊炸訊息
async function spamDM(userId, content, times = 5) {
  try {
    const user = await client.users.fetch(userId);
    for (let i = 0; i < times; i++) {
      await user.send(content).catch(()=>{});
      await sleep(1000);
    }
  } catch(e){}
}

// ---------- 按鈕 / Modal ----------
function createMainButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('炸1').setLabel('炸1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸2').setLabel('炸2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸3').setLabel('炸3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸4').setLabel('炸4').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸私聊').setLabel('炸私聊').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('定海神針').setLabel('定海神針').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('自訂炸').setLabel('自訂炸').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('請瘋狂按我').setLabel('請瘋狂按我').setStyle(ButtonStyle.Primary)
  );
}

function createChannelModal(commandId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${commandId}`)
    .setTitle('輸入頻道ID或自訂文字 (自訂炸填寫文字)');
  const input = new TextInputBuilder()
    .setCustomId('input')
    .setLabel(commandId === '自訂炸' ? '自訂內容' : '頻道ID')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

// ---------- 全域指令 ----------
const commandBuilders = [
  new SlashCommandBuilder().setName('防炸').setDescription('開啟/關閉防炸系統'),
  new SlashCommandBuilder().setName('重啟').setDescription('重啟機器人'),
  new SlashCommandBuilder().setName('刷新').setDescription('重新註冊全域指令')
].map(b => b.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registerGlobalCommands() {
  if (!CLIENT_ID) return;
  try {
    console.log('>> 註冊全域指令中...');
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandBuilders });
    console.log('>> 全域指令註冊完成');
  } catch (e) { console.error(e); }
}

// ---------- Client 事件 ----------
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  await registerGlobalCommands();
});

// ---------- Interaction ----------
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.type === InteractionType.ModalSubmit) {
      const cmd = interaction.customId.replace('modal_','');
      const input = interaction.fields.getTextInputValue('input').trim();
      let targetChannel = interaction.channelId;

      if(cmd !== '自訂炸') targetChannel = input.length ? input : interaction.channelId;
      await interaction.reply({ content: `已排程 ${cmd} 到 <#${targetChannel}>`, ephemeral: true });

      if(cmd === '自訂炸') {
        customSpam[interaction.user.id] = input;
        sendRepeatedToChannel(interaction.channelId, input, 5, 300);
        return;
      }

      if(cmd === '炸私聊') { spamDM(interaction.user.id, spamMessages.炸1+spamMessages.炸2+spamMessages.炸3+spamMessages.炸4); return; }

      const content = spamMessages[cmd] || '';
      sendRepeatedToChannel(targetChannel, content, 5, 300);
      return;
    }

    if(interaction.isButton && interaction.isButton()) {
      const id = interaction.customId;
      if(id === '炸私聊') { await interaction.reply({ content:'已開始私聊炸訊息', ephemeral:true }); spamDM(interaction.user.id, spamMessages.炸1+spamMessages.炸2+spamMessages.炸3+spamMessages.炸4); return; }
      if(id === '請瘋狂按我') { const content = spamMessages.炸1+spamMessages.炸2+spamMessages.炸3+spamMessages.炸4; sendRepeatedToChannel(interaction.channelId, content,5,300); await interaction.deferUpdate(); return; }
      if(id === '自訂炸' || id in spamMessages) { const modal = createChannelModal(id); await interaction.showModal(modal); return; }
      await interaction.reply({ content: '按鈕已收到', ephemeral:true }); return;
    }

    if(interaction.isChatInputCommand() && interaction.isChatInputCommand()) {
      const cmd = interaction.commandName;

      // 創建者限定
      if((cmd==='重啟'||cmd==='刷新') && !CREATORS.includes(interaction.user.id)) return interaction.reply({ content:'❌ 只有創建者可以使用', ephemeral:true });

      // 管理員限定 (防炸)
      if(cmd==='防炸' && !interaction.member.permissions.has('Administrator')) return interaction.reply({ content:'❌ 需要管理員權限', ephemeral:true });

      await interaction.reply({ content:`✅ 已接收 ${cmd} 指令`, ephemeral:true });

      if(cmd==='重啟') { console.log('重啟...'); process.exit(0); return; }
      if(cmd==='刷新') { registerGlobalCommands().then(()=>interaction.followUp({ content:'✅ 已刷新指令', ephemeral:true })); return; }
      if(cmd==='防炸') { interaction.followUp({ content:'防炸系統已切換', ephemeral:true }); return; }
    }
  } catch(e){ console.error(e); }
});

// ---------- 保活 ----------
const app = express();
app.get('/', (req,res)=>res.send('Bot is running'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`保活伺服器已啟動，port=${PORT}`));

// ---------- 登入 ----------
client.login(TOKEN);
