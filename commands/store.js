﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿﻿const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js');
const Config = require('../models/Config');
const Product = require('../models/Product');
const { buildStoreEmbed } = require('./storeEmbedBuilder');

// Emojis (Configurable)
const E = {
    reg: process.env.EMOJI_REGISTER || '👤',
    buy: process.env.EMOJI_BUY || '🛒', 
    store: process.env.EMOJI_STORE || '🏪',
    success: process.env.EMOJI_SUCCESS || '✅',
    error: process.env.EMOJI_ERROR || '❌',
    load: process.env.EMOJI_LOADING || '⏳',
    pend: process.env.EMOJI_PENDING || '🕒', // For last update/pending
    autoDeposit: process.env.EMOJI_DEPOSIT || '💎', // For auto deposit log
    dl: process.env.EMOJI_DL || '💎',
    wl: process.env.EMOJI_WL || '🔒', 
    bal: process.env.EMOJI_BALANCE || '💰', 
    verified: process.env.EMOJI_VERIFIED || '✅',
    outOfStock: process.env.EMOJI_OUT_OF_STOCK || '❌', 
    product: process.env.EMOJI_PRODUCT || '🛍️',
    storeDisplayTitle: process.env.EMOJI_STORE_DISPLAY_TITLE || '⚙️', // For the store embed title
    modeDropdown: process.env.EMOJI_MODE_DROPDOWN || '🔽',
    modeButton: process.env.EMOJI_MODE_BUTTON || '🖱️',
    btnRegister: process.env.BTN_REGISTER || '👤',
    btnSaldo: process.env.BTN_SALDO || '💰',
    btnBeli: process.env.BTN_BELI || '🛒',
    btnSetGrowid: process.env.BTN_SETGROWID || '🆔',
    btnDepoDl: process.env.BTN_DEPODL || '💎',
    timeout: process.env.EMOJI_TIMEOUT || '⏰',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('store')
        .setDescription('Display store menu (Choose Mode: Button/Dropdown)'),
    async execute(interaction) {
        // Defer the reply immediately to prevent "Unknown Interaction" errors.
        await interaction.deferReply();

        const rowMode = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('mode_dropdown').setLabel('Mode Dropdown').setEmoji(E.modeDropdown).setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('mode_button').setLabel('Mode Button').setEmoji(E.modeButton).setStyle(ButtonStyle.Success) 
        );

        const embedMode = new EmbedBuilder() //
            .setTitle(`${E.storeDisplayTitle} Choose Store Display`)
            .setDescription('Please choose your preferred interaction mode:')
            .setColor('Blue');

        const msg = await interaction.editReply({ embeds: [embedMode], components: [rowMode] });

        const collector = msg.createMessageComponentCollector({ 
            filter: i => i.user.id === interaction.user.id, 
            time: 30000,
            max: 1 
        });

        collector.on('collect', async (i) => {
            const selectedMode = i.customId === 'mode_button' ? 'BUTTON' : 'DROPDOWN';
            await i.deferUpdate(); 

            async function getStoreContent() {
                try {
                    const embed = await buildStoreEmbed(interaction.client);
                    // ========== CREATE COMPONENTS (DROPDOWN/BUTTON) ==========
                    const components = [];

                    if (selectedMode === 'DROPDOWN') {
                        const menu = new StringSelectMenuBuilder()
                            .setCustomId('main_menu')
                            .setPlaceholder('Please choose an action...')
                            .addOptions(
                                { label: 'Check Balance', value: 'balance', emoji: E.btnSaldo },
                                { label: 'Buy Product', value: 'buy', emoji: E.btnBeli },
                                { label: 'Set GrowID', value: 'set_growid', emoji: E.btnSetGrowid },
                                { label: 'Deposit DL', value: 'depo_dl', emoji: E.btnDepoDl }
                            ); 
                        components.push(new ActionRowBuilder().addComponents(menu));
                    } 
                    else if (selectedMode === 'BUTTON') {
                        const row1 = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('act_balance').setLabel('Balance').setEmoji(E.btnSaldo).setStyle(ButtonStyle.Secondary),
                            new ButtonBuilder().setCustomId('act_buy').setLabel('Buy').setEmoji(E.btnBeli).setStyle(ButtonStyle.Danger)
                        );
                        const row2 = new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('act_set_growid').setLabel('Set GrowID').setEmoji(E.btnSetGrowid).setStyle(ButtonStyle.Primary), 
                            new ButtonBuilder().setCustomId('act_depo_dl').setLabel('Deposit DL').setEmoji(E.btnDepoDl).setStyle(ButtonStyle.Success)
                        );
                        components.push(row1, row2);
                    }

                    return { embeds: [embed], components: components };

                } catch (error) {
                    console.error("Error getStoreContent:", error);
                    return null;
                }
            }

            const initialContent = await getStoreContent();
            if (initialContent) {
                const sentMsg = await i.message.edit(initialContent);

                if (sentMsg) {
                    await Config.findOneAndUpdate(
                        { id: 'main_config' },
                        { storeChannelId: i.channelId, storeMessageId: sentMsg.id },
                        { upsert: true }
                    );
                }
            }
        });

        // Handle jika collector timeout (user tidak memilih)
        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ 
                    content: `${E.timeout} Timeout! Please run \`/store\` again to choose a mode.`,
                    components: [] 
                }).catch(() => {});
            }
        });
    },
};
