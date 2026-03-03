const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const Product = require('../models/Product');

// --- WATERMARK ENCRYPTION SYSTEM ---
const _0x8f2a = "4175746f53746f7265206279204c65526f6953746f7265";
const _0xGetWM = () => Buffer.from(_0x8f2a, 'hex').toString('utf-8');
// -----------------------------------

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekstock')
        .setDescription('View list of products available in the store'),

    async execute(interaction) {
        // Defer reply so it doesn't timeout
        await interaction.deferReply();

        try {
            // Get all products
            const products = await Product.find({});
            const currentTimestamp = Math.floor(Date.now() / 1000); 

            const embed = new EmbedBuilder()
                .setTitle(`${process.env.EMOJI_PRODUCT_LIST_TITLE || '🔥'} PRODUCT LIST ${process.env.EMOJI_PRODUCT_LIST_TITLE || '🔥'}`)
                .setColor('#B22222')
                .setFooter({ text: _0xGetWM(), iconURL: interaction.client.user.displayAvatarURL() })
                .setTimestamp();

            // HEADER: Last Update
            let description = `${process.env.EMOJI_LAST_UPDATE || '🕒'} Last Update: <t:${currentTimestamp}:R>\n`;
            description += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;

            if (products.length === 0) {
                description += `*No products are currently for sale.*\n`;
            } else {
                // LOOP PRODUCT
                products.forEach(p => {
                    // Logic Emoji Stock: High (>5), Medium (1-5), Low (0)
                    let stockEmoji = process.env.EMOJI_STOCK_LOW || '🟥';
                    if (p.stock.length > 5) stockEmoji = process.env.EMOJI_STOCK_HIGH || '🟩';
                    else if (p.stock.length > 0) stockEmoji = process.env.EMOJI_STOCK_MEDIUM || '🟨';

                    description += `${process.env.EMOJI_PRODUCT_BOX || '📦'} **${p.name}** ${process.env.EMOJI_PRODUCT_BOX || '📦'}\n`;
                    description += `${process.env.EMOJI_ARROW || '➡️'} Code: \`${p.code}\`\n`;
                    description += `${process.env.EMOJI_ARROW || '➡️'} Stock: ${stockEmoji} (${p.stock.length})\n`;
                    description += `${process.env.EMOJI_ARROW || '➡️'} Price: **Rp ${p.price.toLocaleString()}**\n`;

                    // Show Role if exists
                    if (p.roleId) description += `${process.env.EMOJI_ROLE || '🎭'} Role: <@&${p.roleId}>\n`;
                    
                    description += `\n`; 
                });
            }

            // FOOTER: How To Buy
            description += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
            description += `${process.env.EMOJI_WARNING || '⚠️'} **HOW TO BUY** ${process.env.EMOJI_WARNING || '⚠️'}\n`;
            description += `${process.env.EMOJI_REGISTER || '👤'} Register first\n`;
            description += `${process.env.EMOJI_TOPUP || '💳'} Top up balance via QRIS\n`;
            description += `${process.env.EMOJI_BALANCE || '💰'} Check balance\n`;
            description += `${process.env.EMOJI_BUY || '🛒'} Buy product (/buatorder)`;

            embed.setDescription(description);

            // Send Embed
            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error(error);
            await interaction.editReply("❌ An error occurred while retrieving product data.");
        }
    }
};