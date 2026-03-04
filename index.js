const http = require("http");

const PORT = process.env.PORT || 3000;

http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    return res.end("OK");
  }
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Alive");
}).listen(PORT, "0.0.0.0", () => {
  console.log(`[SYSTEM] 🌐 Health server listening on 0.0.0.0:${PORT}`);
});

﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿require('dotenv').config();
const { 
    Client, GatewayIntentBits, Collection, EmbedBuilder, 
    ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder,
    ButtonBuilder, ButtonStyle, REST, Routes, Events, MessageFlags 
} = require('discord.js');
const fs = require('fs');
const mongoose = require('mongoose');

// Import Database Models
const User = require('./models/User');
const Product = require('./models/Product');
const Config = require('./models/Config');
const { buildStoreEmbed } = require('./commands/storeEmbedBuilder');

// --- SECURITY: ENCRYPTED EMBED BANNER ---
const _0xSec = "4175746f53746f7265206279204c65526f6953746f7265"; 

const E = {
    reg: process.env.EMOJI_REGISTER || '👤',
    buy: process.env.EMOJI_BUY || '🛒',
    store: process.env.EMOJI_STORE || '🏪',
    success: process.env.EMOJI_SUCCESS || '✅',
    error: process.env.EMOJI_ERROR || '❌',
    load: process.env.EMOJI_LOADING || '⏳',
    pend: process.env.EMOJI_PENDING || '🕒',
    autoDeposit: process.env.EMOJI_DEPOSIT || '💎', 
    dl: process.env.EMOJI_DL || '💎', 
    wl: process.env.EMOJI_WL || '🔒', 
    bal: process.env.EMOJI_BALANCE || '💰', 
    
    // Specific Emojis
    accessDenied: process.env.EMOJI_ACCESS_DENIED || '⛔',
    verificationFailed: process.env.EMOJI_VERIFICATION_FAILED || '❌',
    growidSuccess: process.env.EMOJI_GROWID_SUCCESS || '✅',
    depositWorldTitle: process.env.EMOJI_DEPOSIT_WORLD_TITLE || '💎',
    depositWorldItem: process.env.EMOJI_DEPOSIT_WORLD_ITEM || '➡️',
    importantNote: process.env.EMOJI_IMPORTANT_NOTE || '⚠️', 
    soldLog: process.env.EMOJI_SOLD_LOG || '🛒',
    purchaseSuccess: process.env.EMOJI_PURCHASE_SUCCESS || '✅',
    timeout: process.env.EMOJI_TIMEOUT || '⏰', 
    verified: process.env.EMOJI_VERIFIED || '✅',
    outOfStock: process.env.EMOJI_OUT_OF_STOCK || '❌',
    product: process.env.EMOJI_PRODUCT || '🛍️',
    storeDisplayTitle: process.env.EMOJI_STORE_DISPLAY_TITLE || '⚙️',
    modeDropdown: process.env.EMOJI_MODE_DROPDOWN || '🔽',
    modeButton: process.env.EMOJI_MODE_BUTTON || '🖱️',
    leaderboardTitle: process.env.EMOJI_LEADERBOARD_TITLE || '🏆',
    medal1: process.env.EMOJI_MEDAL_1 || '🥇', 
    medal2: process.env.EMOJI_MEDAL_2 || '🥈', 
    medal3: process.env.EMOJI_MEDAL_3 || '🥉', 
    btnRegister: process.env.BTN_REGISTER || '👤', 
    btnSaldo: process.env.BTN_SALDO || '💰',
    btnBeli: process.env.BTN_BELI || '🛒',
    btnSetGrowid: process.env.BTN_SETGROWID || '🆔',
    btnDepoDl: process.env.BTN_DEPODL || '💎',
};

// ==========================================
// 2. SETUP DISCORD BOT
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ]
});

async function sendUpdateLog(channelId, title, description, color = '#0099FF') {
    try {
        const logChannel = await client.channels.fetch(channelId).catch(() => null);
        if (!logChannel) return;
        const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setFooter({ text: Buffer.from(_0xSec, 'hex').toString('utf-8') }).setTimestamp();
        await logChannel.send({ embeds: [embed] }); 
    } catch (e) { console.error("Failed to send log:", e); }
}

client.commands = new Collection();
const commandsData = []; // Array to hold command data for deployment
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js')); 

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    if (command.data) {
        client.commands.set(command.data.name, command);
        commandsData.push(command.data.toJSON()); // Add command data to array
    }
}

// --- AUTO DEPLOY COMMANDS (Replaces deploy-commands.js) ---
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
(async () => {
    try {
        if (process.env.CLIENT_ID && process.env.GUILD_ID) {
            // console.log(`🔄 Registering ${commandsData.length} commands...`);
            await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commandsData },
            );
            console.log(`✅ Successfully registered ${commandsData.length} Slash Commands automatically!`);
        } else { 
            console.log(`⚠️ CLIENT_ID or GUILD_ID not found in .env, skipping auto-deploy.`);
        }
    } catch (error) {
        console.error(`❌ Failed to deploy commands: ${error}`);
    }
})();

// ==========================================
// 🔥 3. AUTO DEPOSIT LISTENER (LUA SCRIPT) 🔥
// ==========================================
client.on('messageCreate', async (message) => {
    if (!message.webhookId) return;

    if (!message.embeds || message.embeds.length === 0) {
        return;
    }

    const embed = message.embeds[0];
    console.log(`[DEBUG] Embed found. Title: "${embed.title}"`);

    if (!embed.title || !embed.title.includes("Donation Log")) {
        console.log(`[DEBUG_FAIL] Embed title does not match "Donation Log". Skipping.`);
        return;
    }
    
    const description = embed.description;
    if (!description) {
        console.log(`[DEBUG_FAIL] Embed has no description. Skipping.`);
        return;
    }
    console.log(`[DEBUG] Embed Description: "${description.replace(/\n/g, '\\n')}"`);

    try {
        const growIdMatch = description.match(/GrowID:\s*(.+?)\n/);
        const depositMatch = description.match(/Deposit:\s*(.+)/);

        if (!growIdMatch || !depositMatch) {
            console.log(`[DEBUG_FAIL] Failed to match GrowID or Deposit from description. Check LUA script format.`);
            return;
        }

        const growIdRaw = growIdMatch[1].trim(); 
        const itemRaw = depositMatch[1].trim(); 
        console.log(`[DEBUG] Matched GrowID: "${growIdRaw}", Item: "${itemRaw}"`);

        const user = await User.findOne({ growId: { $regex: new RegExp(`^${growIdRaw}$`, "i") } });

        if (!user) {
            console.log(`[SKIP] GrowID ${growIdRaw} not linked to Discord.`);
            // Kirim log ke channel topup bahwa ada deposit dari GrowID yang tidak terdaftar
            await sendUpdateLog(process.env.CHANNEL_TOPUP_ID,
                `${E.error} UNLINKED DEPOSIT`,
                `Deposit received from an unregistered GrowID.\n**GrowID:** ${growIdRaw}\n**Item:** ${itemRaw}\n\n**Action:** Tell the user to register their GrowID with the bot.`,
                '#FF0000' // Red for error
            );
            return; 
        }
        console.log(`[DEBUG] Found linked user: ${user.username} (${user.userId})`);

        let qty = 1;
        let itemName = itemRaw;
        const numberMatch = itemRaw.match(/^(\d+)\s+(.*)/);
        if (numberMatch) {
            qty = parseInt(numberMatch[1]);
            itemName = numberMatch[2];
        }

        let totalSaldo = 0;

        // CONVERT ITEM TO WL (Main Balance = WL)
        if (itemName.includes("Diamond Lock")) totalSaldo = qty * 100; // 1 DL = 100 WL
        else if (itemName.includes("World Lock")) totalSaldo = qty;    // 1 WL = 1 WL 
        else if (itemName.includes("Blue Gem Lock")) totalSaldo = qty * 10000; // 1 BGL = 10000 WL 
        else if (itemName.includes("BGL")) totalSaldo = qty * 10000;
        else {
            console.log(`[SKIP] Unsupported item: ${itemName}`);
            return;
        }

        // Atomically update balance to prevent race conditions
        await User.updateOne({ _id: user._id }, { $inc: { balance: totalSaldo } });
        console.log(`[SUCCESS] Updated balance for ${user.username}. New balance: ${user.balance} WL`);

        // ONLY SEND TO CHANNEL_TOPUP_ID (1306406102493298822)
        await sendUpdateLog(process.env.CHANNEL_TOPUP_ID,
            `${E.autoDeposit} AUTO DEPOSIT`,
            `**User:** <@${user.userId}>\n**GrowID:** ${growIdRaw}\n**Item:** ${itemRaw}\n**Balance:** +${Math.floor(totalSaldo/100)} ${E.dl} ${totalSaldo%100} ${E.wl}`,
            '#00FFFF'
        );

    } catch (err) {
        console.error("[DEBUG] 💥 Error parsing:", err);
    }
});

// ==========================================
// 4. INTERACTION HANDLER
// ==========================================
client.on('interactionCreate', async interaction => {
    
    // --- HANDLE SLASH COMMANDS ---
    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;

        // ============================================================
        // 🔒 SECURITY CHECK: KHUSUS ADMIN 🔒
        // ============================================================
        // Get IDs from .env
        const allowedIDs = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());

        // Check if the user ID is in the allowed list from .env
        // This check applies to ALL slash commands.
        if (!allowedIDs.includes(interaction.user.id)) {
            return interaction.reply({ 
                content: `${E.accessDenied} **Access Denied!**\nYou do not have permission to use this command.`, 
                flags: MessageFlags.Ephemeral 
            });
        }
        // ============================================================

        try { await command.execute(interaction, process.env); } catch (e) { console.error(e); }
    }

    // --- HANDLE STORE ACTIONS ---
    else if (interaction.isStringSelectMenu() || interaction.isButton()) {
        
        const isStoreInteraction = 
            (interaction.isStringSelectMenu() && interaction.customId === 'main_menu') ||
            (interaction.isButton() && interaction.customId.startsWith('act_'));

        if (isStoreInteraction) {
            let selected = '';
            if (interaction.isStringSelectMenu()) selected = interaction.values[0]; 
            else if (interaction.isButton()) selected = interaction.customId.replace('act_', ''); 

            try {
                // REGISTER
                if (selected === 'register') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    let user = await User.findOne({ userId: interaction.user.id });

                    if (!user) {
                        // User not registered, create user and prompt for GrowID
                        user = await new User({ userId: interaction.user.id, username: interaction.user.username }).save();
                        await interaction.editReply(`${E.success} Successfully registered. Now, please set your GrowID.`);
                        // Show modal for GrowID immediately
                        const modal = new ModalBuilder().setCustomId('modal_growid').setTitle('Setting GrowID');
                        const inputGrowID = new TextInputBuilder().setCustomId('growid_input').setLabel("Input Your GrowID *").setStyle(TextInputStyle.Short).setRequired(true);
                        const confirmGrowID = new TextInputBuilder().setCustomId('growid_confirm').setLabel("Confirm Your GrowID *").setStyle(TextInputStyle.Short).setRequired(true);
                        modal.addComponents(new ActionRowBuilder().addComponents(inputGrowID), new ActionRowBuilder().addComponents(confirmGrowID));
                        await interaction.followUp({ embeds: [new EmbedBuilder().setDescription("Please enter your GrowID.")], components: [modal], flags: MessageFlags.Ephemeral });
                        return;
                    } else if (!user.growId) {
                        // User registered but no GrowID, prompt for GrowID
                        await interaction.editReply(`${E.error} You are already registered, but your GrowID is not set. Please set your GrowID.`);
                        const modal = new ModalBuilder().setCustomId('modal_growid').setTitle('Setting GrowID');
                        const inputGrowID = new TextInputBuilder().setCustomId('growid_input').setLabel("Input Your GrowID *").setStyle(TextInputStyle.Short).setRequired(true);
                        const confirmGrowID = new TextInputBuilder().setCustomId('growid_confirm').setLabel("Confirm Your GrowID *").setStyle(TextInputStyle.Short).setRequired(true);
                        modal.addComponents(new ActionRowBuilder().addComponents(inputGrowID), new ActionRowBuilder().addComponents(confirmGrowID));
                        await interaction.followUp({ embeds: [new EmbedBuilder().setDescription("Please enter your GrowID.")], components: [modal], flags: MessageFlags.Ephemeral });
                        return;
                    } else {
                        // User registered and has GrowID
                        return interaction.editReply(`${E.success} You are already registered and your GrowID is set to: **${user.growId}**.`);
                    }
                }

                // BALANCE CHECK
                if (selected === 'balance') {
                    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    const user = await User.findOne({ userId: interaction.user.id });
                    const bal = user ? user.balance : 0; 
                    const totalSpent = user?.totalSpent || 0;
                    return interaction.editReply(`${E.bal} Balance: **${Math.floor(bal/100)} ${E.dl} ${bal%100} ${E.wl}**\n${E.buy} Total Spent: **${Math.floor(totalSpent/100)} ${E.dl} ${totalSpent%100} ${E.wl}**`);
                }

                // SET GROWID
                if (selected === 'set_growid') {
                    const modal = new ModalBuilder().setCustomId('modal_growid').setTitle('Setting GrowID');
                    const inputGrowID = new TextInputBuilder().setCustomId('growid_input').setLabel("Input Your GrowID *").setStyle(TextInputStyle.Short).setRequired(true);
                    const confirmGrowID = new TextInputBuilder().setCustomId('growid_confirm').setLabel("Confirm Your GrowID *").setStyle(TextInputStyle.Short).setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(inputGrowID), new ActionRowBuilder().addComponents(confirmGrowID));
                    await interaction.showModal(modal);
                }

                // DEPOSIT DL
                if (selected === 'depo_dl') {
                    const user = await User.findOne({ userId: interaction.user.id });
                    if (!user || !user.growId) {
                        const modal = new ModalBuilder().setCustomId('modal_growid').setTitle('Setting GrowID');
                        const inputGrowID = new TextInputBuilder().setCustomId('growid_input').setLabel("Input Your GrowID *").setStyle(TextInputStyle.Short).setRequired(true);
                        const confirmGrowID = new TextInputBuilder().setCustomId('growid_confirm').setLabel("Confirm Your GrowID *").setStyle(TextInputStyle.Short).setRequired(true);
                        modal.addComponents(new ActionRowBuilder().addComponents(inputGrowID), new ActionRowBuilder().addComponents(confirmGrowID));
                        await interaction.showModal(modal);
                        return;
                    }
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                    let config = await Config.findOne({ id: 'main_config' });
                    if (!config) config = { world: '-', owner: '-', botName: '-' };
                    const embed = new EmbedBuilder()
                        .setColor('#2b2d31')
                        .setTitle(`${E.depositWorldTitle} Deposit World ${E.depositWorldTitle}`)
                        .setDescription(`
${E.depositWorldItem} **World : ${config.world}**
${E.depositWorldItem} **Owner : ${config.owner}**
${E.depositWorldItem} **Bot Name : ${config.botName}**

**${E.importantNote} IMPORTANT NOTE:**
If the bot is **OFFLINE** in the world:
1. Put your DLs in the **Donation Box**.
2. Take a **Screenshot** as proof.
3. Send it to the **OWNER** or create a **Ticket**.
                        `)
                        .setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL() })
                        .setTimestamp();
                    
                    interaction.editReply({ embeds: [embed] });
                }

                // BUY PRODUCT
                if (selected === 'buy') {
                    const modal = new ModalBuilder().setCustomId('modal_buy').setTitle('Buy Product');
                    const inputCode = new TextInputBuilder().setCustomId('p_code').setLabel("Product Code").setStyle(TextInputStyle.Short).setRequired(true);
                    const inputQty = new TextInputBuilder().setCustomId('p_qty').setLabel("Quantity").setStyle(TextInputStyle.Short).setValue("1").setRequired(true);
                    modal.addComponents(new ActionRowBuilder().addComponents(inputCode), new ActionRowBuilder().addComponents(inputQty));
                    await interaction.showModal(modal);
                }

            } catch (err) { console.error("Store Action Error:", err); }
        }
    }

    // --- HANDLE MODAL SUBMITS ---
    else if (interaction.isModalSubmit()) {
        try {
            // MODAL SET GROWID
            if (interaction.customId === 'modal_growid') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const newGrowId = interaction.fields.getTextInputValue('growid_input');
                const confirmGrowId = interaction.fields.getTextInputValue('growid_confirm');
                if (newGrowId !== confirmGrowId) return interaction.editReply(`${E.verificationFailed} **Verification Failed!** The GrowIDs do not match.`); 
                const exist = await User.findOne({ growId: { $regex: new RegExp(`^${newGrowId}$`, "i") } });
                if (exist && exist.userId !== interaction.user.id) return interaction.editReply(`${E.verificationFailed} GrowID **${newGrowId}** is already in use by another account.`);
                let user = await User.findOne({ userId: interaction.user.id });
                if (!user) user = new User({ userId: interaction.user.id, username: interaction.user.username });
                user.growId = newGrowId;
                await user.save();
                interaction.editReply(`${E.growidSuccess} GrowID successfully set to: **${newGrowId}**.`);
            }

            // BUY MODAL (WITH AUTO-BUY SUPPORT - AUTOMATIC PRICE) //
            if (interaction.customId === 'modal_buy') {
                await interaction.deferReply({ flags: MessageFlags.Ephemeral });
                const code = interaction.fields.getTextInputValue('p_code');
                const qtyInput = interaction.fields.getTextInputValue('p_qty');
                const qty = parseInt(qtyInput);

                if (isNaN(qty) || qty <= 0) {
                    return interaction.editReply(`${E.error} Please enter a valid positive number for the quantity.`);
                }

                // Step 1: Preliminary checks for product and user balance
                const product = await Product.findOne({ code, active: { $ne: false } });
                if (!product) {
                    return interaction.editReply(`${E.error} Product with code \`${code}\` was not found.`);
                }
                if (product.stock.length < qty) {
                    return interaction.editReply(`${E.error} Product stock is insufficient. Available: **${product.stock.length}**, you requested: **${qty}**.`);
                }

                const user = await User.findOne({ userId: interaction.user.id });
                const totalCostWL = product.price * qty;

                if (!user || user.balance < totalCostWL) {
                    const requiredBalance = `**${Math.floor(totalCostWL/100)} ${E.dl} ${totalCostWL%100} ${E.wl}**`;
                    return interaction.editReply(`${E.error} Insufficient balance. Your balance is too low to complete this purchase.\nTotal cost: ${requiredBalance}`);
                }

                // Step 2: Atomically secure the stock to prevent race conditions
                const itemsToSell = product.stock.slice(0, qty);
                const productUpdateResult = await Product.updateOne(
                    {
                        code: code,
                        // Optimistic lock: ensure the exact items we sliced are still in the array.
                        // This assumes stock items are unique.
                        stock: { $all: itemsToSell }
                    },
                    {
                        $pull: { stock: { $in: itemsToSell } },
                        $inc: { sold: qty }
                    }
                );

                if (productUpdateResult.modifiedCount === 0) {
                    return interaction.editReply(`${E.error} The stock was purchased by someone else during your transaction. Please try again.`);
                }

                // Step 3: Atomically update user's balance and total spent
                await User.updateOne(
                    { userId: interaction.user.id },
                    { $inc: { balance: -totalCostWL, totalSpent: totalCostWL } }
                );
                const updatedUser = await User.findOne({ userId: interaction.user.id });

                // Step 4: Grant role if applicable
                if (product.roleId) {
                    try {
                        const member = await interaction.guild.members.fetch(interaction.user.id);
                        const role = await interaction.guild.roles.fetch(product.roleId);
                        if (role) {
                            if (role.editable) {
                                await member.roles.add(role);
                            } else {
                                // Log a specific error if the role is not manageable
                                const errorMessage = `Cannot assign role "${role.name}" (${role.id}). It is not editable. Check bot permissions and role hierarchy.`;
                                console.error(`[ROLE_ERROR] ${errorMessage}`);
                                // Send a log to an admin channel
                                await sendUpdateLog(process.env.CHANNEL_BUY_ID,
                                    `⚠️ ROLE ASSIGNMENT FAILED`,
                                    `Could not assign role <@&${role.id}> to user <@${interaction.user.id}>.\n\n**Reason:** The role is higher than the bot's role or the bot lacks "Manage Roles" permission. Please adjust server settings.`,
                                    '#FFCC00' // Yellow for warning
                                );
                            }
                        }
                    } catch (e) {
                        console.error(`Failed to add role ${product.roleId} for user ${interaction.user.id}:`, e);
                    }
                }

                // Step 5: Send logs and deliver product to user
                const file = new AttachmentBuilder(Buffer.from(itemsToSell.join('\n')), { name: `${code}.txt` });

                await sendUpdateLog(process.env.CHANNEL_BUY_LOG_ID,
                    `${E.soldLog} SOLD`,
                    `User: <@${interaction.user.id}>\nItem: ${qty} (${product.name})\nTotal: ${Math.floor(totalCostWL/100)} ${E.dl} ${totalCostWL%100} ${E.wl}`,
                    '#00FFFF'
                );

                const embedDM = new EmbedBuilder()
                    .setTitle(`${E.purchaseSuccess} Purchase Successful!`)
                    .setDescription(`You have purchased **${product.name}** (${qty}x).\nThe product file is attached below.`)
                    .addFields({ name: '💰 Total Paid', value: `${Math.floor(totalCostWL/100)} ${E.dl} ${totalCostWL%100} ${E.wl}` }, { name: '📊 Remaining Balance', value: `${Math.floor(updatedUser.balance/100)} ${E.dl} ${updatedUser.balance%100} ${E.wl}` })
                    .setColor('#00FF00')
                    .setTimestamp();

                try {
                    await interaction.user.send({ embeds: [embedDM], files: [file] }); 
                    await interaction.editReply(`${E.purchaseSuccess} Success! Check your DMs.`); 
                } catch (e) {
                    await interaction.editReply({ content: `${E.purchaseSuccess} Success! Your file is below:`, files: [file] });
                }

                // Step 6: Send product file to the dedicated product log channel
                const productLogChannelId = process.env.CHANNEL_PRODUCT_LOG_ID;
                if (productLogChannelId) {
                    try {
                        const productLogChannel = await client.channels.fetch(productLogChannelId).catch(() => null);
                        if (productLogChannel) {
                            const logEmbed = new EmbedBuilder()
                                .setTitle(`${E.product} Product Delivery Log`)
                                .setColor('#A020F0') // Purple
                                .setDescription(`Product file for a recent purchase has been logged.`)
                                .addFields(
                                    { name: '👤 User', value: `<@${interaction.user.id}> (${interaction.user.username})`, inline: true },
                                    { name: '🛍️ Product', value: `${product.name} (\`${product.code}\`)`, inline: true },
                                    { name: '🔢 Quantity', value: `${qty}`, inline: true },
                                    { name: '💰 Cost', value: `${Math.floor(totalCostWL/100)} ${E.dl} ${totalCostWL%100} ${E.wl}`, inline: false }
                                )
                                .setTimestamp();
                            
                            const logFile = new AttachmentBuilder(Buffer.from(itemsToSell.join('\n')), { name: `${interaction.user.username}_${code}_${qty}.txt` });

                            await productLogChannel.send({ embeds: [logEmbed], files: [logFile] });
                        }
                    } catch (logError) {
                        console.error(`[PRODUCT_LOG_ERROR] Failed to send product log to channel ${productLogChannelId}:`, logError);
                    }
                }
            }
        } catch (err) { console.error("Modal Error:", err); } 
    }
});

// ========================================================
// 🔥 AUTO-REFRESH RESUME & STARTUP BANNER 🔥
// ========================================================
client.once(Events.ClientReady, async (c) => {
    
    // --- SHOW CUSTOM CONSOLE BANNER (Request User) ---
    console.clear(); 
    console.log(`
\x1b[36m██╗     ███████╗██████╗  ██████╗ ██╗███████╗████████╗ ██████╗ ██████╗ ███████╗
\x1b[36m██║     ██╔════╝██╔══██╗██╔═══██╗██║██╔════╝╚══██╔══╝██╔═══██╗██╔══██╗██╔════╝
\x1b[36m██║     █████╗  ██████╔╝██║   ██║██║███████╗   ██║   ██║   ██║██████╔╝█████╗
\x1b[36m██║     ██╔══╝  ██╔══██╗██║   ██║██║╚════██║   ██║   ██║   ██║██╔══██╗██╔══╝
\x1b[36m███████╗███████╗██║  ██║╚██████╔╝██║███████║   ██║   ╚██████╔╝██║  ██║███████╗
\x1b[36m╚══════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚══════╝\x1b[0m
\x1b[33m   >>> AutoStore • Created by LeRoiStore • Ready to Serve <<<\x1b[0m
    `);
    
    console.log(`\x1b[32m[SYSTEM] ${E.success} Bot Online: ${c.user.tag}\x1b[0m`);
    console.log(`\x1b[32m[SYSTEM] ${E.store} Webhook Server running on port 3000\x1b[0m`);
    
    // Resume Auto-Refresh Logic (Store & Leaderboard)
    try { 
        const config = await Config.findOne({ id: 'main_config' });
        
        if (!config) return;

        // --- 1. RESUME STORE ---
        if (config.storeChannelId && config.storeMessageId) {
            const channel = await client.channels.fetch(config.storeChannelId).catch(() => null);
            if (channel) {
                const msg = await channel.messages.fetch(config.storeMessageId).catch(() => null);
                if (msg) {
                    console.log(`\x1b[34m[RESUME]\x1b[0m Store Auto-Refresh: ${msg.id}`); 
                    
                    // Use interval with better error handling
                    const storeInterval = setInterval(async () => {
                        try {
                            const embed = await buildStoreEmbed(client);

                            await msg.edit({ embeds: [embed] }).catch(async (err) => {
                                // If message not found (deleted), remove ID from config and stop interval
                                if (err.code === 10008 || err.message?.includes('Unknown Message')) {
                                    console.log(`\x1b[33m[WARN]\x1b[0m Store message not found, clearing config...`);
                                    config.storeMessageId = '';
                                    await config.save().catch(console.error);
                                    clearInterval(storeInterval);
                                } else if (err.code === 'ENOTFOUND') {
                                    // Handle DNS/Network error specifically
                                    console.error(`\x1b[31m[NETWORK ERROR]\x1b[0m Failed to connect to Discord API (Store). Check internet connection and DNS settings. Details:`, err.message);
                                } else if (err.code !== 'UND_ERR_SOCKET' && !err.message?.includes('other side closed')) {
                                    console.error("Auto-Update Store Error:", err);
                                }
                            });

                        } catch (err) {
                            if (err.code !== 'UND_ERR_SOCKET' && !err.message?.includes('other side closed')) {
                                console.error("Auto-Update Store Error:", err);
                            }
                        }
                    }, 30000); // 30 Seconds
                } else {
                    // If message is not found at startup
                    console.log(`\x1b[33m[WARN]\x1b[0m Store message not found at startup, clearing config...`);
                    config.storeMessageId = '';
                    await config.save().catch(console.error);
                }
            }
        }
 
    } catch (e) { console.error("Failed to Resume Auto-Features:", e); }
});
// --- ANTI-CRASH HANDLERS ---
process.on('unhandledRejection', (reason, p) => {
    console.log(' [antiCrash] :: Unhandled Rejection/Catch');
    console.log(reason, p);
});

mongoose.connect(process.env.MONGO_URI).then(() => { 
    console.log(`\x1b[32m[SYSTEM] ${E.load} DB Connected\x1b[0m`); 
    client.login(process.env.DISCORD_TOKEN); 
}).catch(err => console.error("Database Error:", err));
process.on('uncaughtException', (err, origin) => {
    console.log(' [antiCrash] :: Uncaught Exception/Catch');
    console.log(err, origin);
});
process.on('uncaughtExceptionMonitor', (err, origin) => {
    console.log(' [antiCrash] :: Uncaught Exception/Catch (MONITOR)');
    console.log(err, origin);
});