import { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
import express from "express";
dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const MEMORY_FILE = process.env.MEMORY_FILE || "memory.json";
const MAX_MEMORY = 10;
const CREATOR_ID = "1183056878004080701"; // 創建者ID

// 讀取記憶
let memory = {};
if (fs.existsSync(MEMORY_FILE)) {
  try { memory = JSON.parse(fs.readFileSync(MEMORY_FILE, "utf8")); console.log("✅ 記憶檔案載入完成"); }
  catch (err) { console.error("⚠️ 載入記憶檔案失敗：", err); }
}

// 保活服務
const app = express();
app.get("/", (req, res) => res.send("Bot is alive ✅"));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🌐 保活服務運行在 port ${PORT}`));

// 全域 Slash 指令
const commands = [
  new SlashCommandBuilder().setName("ai").setDescription("讓 AI 回覆訊息").addStringOption(opt => opt.setName("message").setDescription("你想問 AI 的問題").setRequired(true)),
  new SlashCommandBuilder().setName("memory_reset").setDescription("重置指定使用者的 AI 記憶").addUserOption(opt => opt.setName("user").setDescription("要重置的使用者").setRequired(true)),
  new SlashCommandBuilder().setName("memory_load").setDescription("查看指定使用者的 AI 記憶").addUserOption(opt => opt.setName("user").setDescription("要查看的使用者").setRequired(true)),
  // 創建者專屬指令
  new SlashCommandBuilder().setName("memory_reset_all").setDescription("創建者專屬：重置全部使用者記憶"),
  new SlashCommandBuilder().setName("memory_sync_user").setDescription("創建者專屬：同步指定使用者所有頻道記憶").addUserOption(opt => opt.setName("user").setDescription("要同步的使用者").setRequired(true))
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
  try {
    console.log('🚀 開始註冊全域指令...');
    await rest.put(Routes.applicationCommands(client.user?.id || "your-client-id"), { body: commands });
    console.log('✅ 全域指令註冊完成');
  } catch (err) { console.error(err); }
})();

client.once("ready", () => console.log(`🤖 已上線：${client.user.tag}`));

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  // 創建者專屬指令
  if (["memory_reset_all", "memory_sync_user"].includes(commandName)) {
    if (interaction.user.id !== CREATOR_ID) {
      return interaction.reply({ content: "❌ 只有創建者可以使用這個指令", ephemeral: true });
    }
  } else {
    // 其他指令：管理員權限檢查
    const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
    if (!isAdmin) return interaction.reply({ content: "❌ 你沒有權限使用這個指令", ephemeral: true });
  }

  // ----- AI 指令 -----
  if (commandName === "ai") {
    const userMessage = interaction.options.getString("message");
    const userId = interaction.user.id;
    const channelId = interaction.channelId;

    if (!memory[channelId]) memory[channelId] = {};
    if (!memory[channelId][userId]) memory[channelId][userId] = [];
    memory[channelId][userId].push({ role: "user", content: userMessage });
    if (memory[channelId][userId].length > MAX_MEMORY) memory[channelId][userId].splice(0, memory[channelId][userId].length - MAX_MEMORY);

    try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2)); } catch (err) { console.error(err); }

    await interaction.deferReply();

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: "你是一個友善且聰明的 Discord 助理，記住使用者對話。" }, ...memory[channelId][userId]],
        max_tokens: 400,
      });

      const reply = completion.choices[0].message.content;
      memory[channelId][userId].push({ role: "assistant", content: reply });
      if (memory[channelId][userId].length > MAX_MEMORY) memory[channelId][userId].splice(0, memory[channelId][userId].length - MAX_MEMORY);

      try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2)); } catch (err) { console.error(err); }

      await interaction.editReply(reply);
    } catch (err) {
      console.error(err);
      await interaction.editReply("⚠️ 發生錯誤，請稍後再試。");
    }
  }

  // ----- 重置記憶 -----
  if (commandName === "memory_reset") {
    const targetUser = interaction.options.getUser("user");
    const channelId = interaction.channelId;
    if (memory[channelId] && memory[channelId][targetUser.id]) {
      delete memory[channelId][targetUser.id];
      try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2)); } catch (err) { console.error(err); }
      await interaction.reply(`✅ ${targetUser.tag} 的記憶已重置`);
    } else { await interaction.reply(`⚠️ 沒有找到 ${targetUser.tag} 的記憶`); }
  }

  // ----- 查看記憶 -----
  if (commandName === "memory_load") {
    const targetUser = interaction.options.getUser("user");
    const channelId = interaction.channelId;
    if (memory[channelId] && memory[channelId][targetUser.id] && memory[channelId][targetUser.id].length > 0) {
      const history = memory[channelId][targetUser.id].map(m => `${m.role}: ${m.content}`).join("\n");
      await interaction.reply({ content: `📝 ${targetUser.tag} 的記憶：\n${history}`, ephemeral: true });
    } else {
      await interaction.reply({ content: `⚠️ 沒有找到 ${targetUser.tag} 的記憶`, ephemeral: true });
    }
  }

  // ----- 創建者專屬：重置全部記憶 -----
  if (commandName === "memory_reset_all") {
    memory = {};
    try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2)); } catch (err) { console.error(err); }
    await interaction.reply("✅ 已重置所有使用者的記憶");
  }

  // ----- 創建者專屬：同步單一使用者所有頻道記憶 -----
  if (commandName === "memory_sync_user") {
    const targetUser = interaction.options.getUser("user");
    let combinedMemory = [];
    for (const channelId in memory) {
      if (memory[channelId][targetUser.id]) {
        combinedMemory = combinedMemory.concat(memory[channelId][targetUser.id]);
      }
    }
    // 將同步結果存到所有頻道
    for (const channelId in memory) {
      memory[channelId][targetUser.id] = combinedMemory.slice(-MAX_MEMORY);
    }
    try { fs.writeFileSync(MEMORY_FILE, JSON.stringify(memory, null, 2)); } catch (err) { console.error(err); }
    await interaction.reply(`✅ 已同步 ${targetUser.tag} 的所有頻道記憶`);
  }
});

client.login(process.env.DISCORD_TOKEN);
