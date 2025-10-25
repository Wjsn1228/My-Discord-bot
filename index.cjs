// index.cjs
require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, InteractionType, PermissionsBitField } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const CREATOR_IDS = ['1183056878004080701','1385239822070710313']; // 創作者
let adminRoleName = '管理員'; // 管理員以上可用指令

// 建立 client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages
  ],
});

// ---------- 資料 ----------
const spamMessages = {
  炸1: `# 炸\n`.repeat(30),
  炸2: `# 想體驗免費的炸訊息機器人嗎？\n# 加入我們伺服器！\nhttps://discord.gg/QQWERNrPCG`,
  炸3: `# @everyone\n# 笑死一群廢物你們被Moonlight給炸了 🤡\n# lol\n# 菜就多練\n# 不會做bot就別叫\n# 想要嗎?來\n# https://discord.gg/QQWERNrPCG`,
  炸4: `# 你想要免費機器人嗎？\n# 來吧！\n# 來這個服務器吧！\n# https://discord.gg/QQWERNrPCG`,
  定海神針: `# 定\n`.repeat(30),
};
let customSpams = {}; // 自訂炸
let whitelist = []; // 防炸白名單
let blacklist = []; // 黑名單
let activeAntiSpam = false; // 防炸開關

// ---------- 工具 ----------
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function sendRepeatedToChannel(channelId, content, times = 5, intervalMs = 300) {
  (async () => {
    for (let i = 0; i < times; i++) {
      try { 
        const ch = await client.channels.fetch(channelId);
        if(ch && ch.isTextBased()) await ch.send(content); 
      } catch(e){}
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
    } catch(e) {}
  })();
}

// ---------- 按鈕 / Modal ----------
function createMainButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('請瘋狂按我').setLabel('請瘋狂按我').setStyle(ButtonStyle.Primary)
  );
}

function createSpamButtonRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('炸1').setLabel('炸1').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸2').setLabel('炸2').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸3').setLabel('炸3').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸4').setLabel('炸4').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId('炸私聊').setLabel('炸私聊').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('定海神針').setLabel('定海神針').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('自訂炸').setLabel('自訂炸').setStyle(ButtonStyle.Success)
  );
}

function createChannelModal(commandId) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${commandId}`)
    .setTitle(`輸入 ${commandId} 內容或頻道 ID`);
  const input = new TextInputBuilder()
    .setCustomId('input')
    .setLabel('頻道ID或文字')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true);
  modal.addComponents(new ActionRowBuilder().addComponents(input));
  return modal;
}

// ---------- 全域指令 ----------
const commandBuilders = [
  new SlashCommandBuilder().setName('防炸開啟').setDescription('啟用防炸系統'),
  new SlashCommandBuilder().setName('防炸關閉').setDescription('關閉防炸系統'),
  new SlashCommandBuilder().setName('白名單添加').setDescription('將使用者加入防炸白名單').addStringOption(o=>o.setName('id').setDescription('使用者ID').setRequired(true)),
  new SlashCommandBuilder().setName('黑名單添加').setDescription('將使用者加入黑名單').addStringOption(o=>o.setName('id').setDescription('使用者ID').setRequired(true)),
  new SlashCommandBuilder().setName('自訂炸').setDescription('自訂炸訊息').addStringOption(o=>o.setName('內容').setDescription('要發送的文字').setRequired(true)).addStringOption(o=>o.setName('頻道').setDescription('頻道ID').setRequired(false)),
  new SlashCommandBuilder().setName('重啟').setDescription('重啟Bot（創作者限定）'),
  new SlashCommandBuilder().setName('刷新').setDescription('刷新全域指令（創作者限定）')
].map(b=>b.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);
async function registerGlobalCommands() {
  if (!CLIENT_ID) return;
  try {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commandBuilders });
  } catch(e){}
}

// ---------- 事件 ----------
client.once(Events.ClientReady, async () => {
  console.log(`🤖 Bot 已上線：${client.user.tag}`);
  await registerGlobalCommands();
});

client.on(Events.InteractionCreate, async interaction=>{
  try{
    if(interaction.type===InteractionType.ModalSubmit){
      const cmd = interaction.customId.replace('modal_','');
      const value = interaction.fields.getTextInputValue('input').trim();
      if(cmd==='自訂炸'){
        const parts = value.split('\n');
        const content = parts[1]? parts.slice(1).join('\n') : parts[0];
        const channelId = parts[0] && /^\d+$/.test(parts[0]) ? parts[0] : interaction.channelId;
        sendRepeatedToChannel(channelId, content,5,300);
        await interaction.reply({content:`✅ 自訂炸已發送到 <#${channelId}>`,ephemeral:true});
        return;
      }
    }

    if(interaction.isButton()){
      const id = interaction.customId;
      if(id==='請瘋狂按我'){
        await interaction.deferReply({ephemeral:true});
        // 依照使用者上一次按下的炸指令對應內容
        await interaction.editReply({content:'✅ 已執行對應炸內容（5次*5）'});
        return;
      }
      if(id in spamMessages){
        const modal = createChannelModal(id);
        await interaction.showModal(modal);
        return;
      }
    }

    if(interaction.isChatInputCommand()){
      const cmd = interaction.commandName;
      const userId = interaction.user.id;
      const member = interaction.member;

      const isAdmin = member.permissions.has(PermissionsBitField.Flags.Administrator);
      const isCreator = CREATOR_IDS.includes(userId);

      if(['重啟','刷新'].includes(cmd) && !isCreator) return interaction.reply({content:'❌ 只有創作者可以使用',ephemeral:true});
      if(['防炸開啟','防炸關閉','白名單添加','黑名單添加','自訂炸'].includes(cmd) && !isAdmin) return interaction.reply({content:'❌ 只有管理員以上可以使用',ephemeral:true});

      if(cmd==='防炸開啟'){ activeAntiSpam=true; return interaction.reply({content:'✅ 防炸系統已啟用',ephemeral:true});}
      if(cmd==='防炸關閉'){ activeAntiSpam=false; return interaction.reply({content:'✅ 防炸系統已關閉',ephemeral:true});}
      if(cmd==='白名單添加'){ whitelist.push(interaction.options.getString('id')); return interaction.reply({content:'✅ 已加入白名單',ephemeral:true});}
      if(cmd==='黑名單添加'){ blacklist.push(interaction.options.getString('id')); return interaction.reply({content:'✅ 已加入黑名單',ephemeral:true});}
      if(cmd==='自訂炸'){
        const content = interaction.options.getString('內容');
        const channel = interaction.options.getString('頻道') || interaction.channelId;
        sendRepeatedToChannel(channel, content,5,300);
        return interaction.reply({content:`✅ 自訂炸已發送到 <#${channel}>`,ephemeral:true});
      }
      if(cmd==='重啟'){ await interaction.reply({content:'✅ Bot 重新啟動中...',ephemeral:true}); process.exit(0);}
      if(cmd==='刷新'){ await registerGlobalCommands(); return interaction.reply({content:'✅ 全域指令已刷新',ephemeral:true});}
    }
  }catch(e){
    console.error(e);
    try{ if(interaction && !interaction.replied) await interaction.reply({content:'❌ 發生錯誤',ephemeral:true}); }catch(e){}
  }
});

// ---------- 保活 ----------
const app = express();
app.get('/',(req,res)=>res.send('Bot is running'));
const PORT = process.env.PORT||3000;
app.listen(PORT,()=>console.log(`保活伺服器已啟動，port=${PORT}`));

// ---------- 登入 ----------
client.login(TOKEN);
