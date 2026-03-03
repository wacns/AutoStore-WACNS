const { EmbedBuilder } = require('discord.js');
const Product = require('../models/Product');

// Ambil Emojis dari index.js atau definisikan di sini jika perlu
const E = {
    pend: process.env.EMOJI_PENDING || '🕒',
    verified: process.env.EMOJI_VERIFIED || '✅',
    outOfStock: process.env.EMOJI_OUT_OF_STOCK || '❌',
    product: process.env.EMOJI_PRODUCT || '🛍️',
    storeDisplayTitle: process.env.EMOJI_STORE_DISPLAY_TITLE || '⚙️',
    dl: process.env.EMOJI_DL || '💎',
    wl: process.env.EMOJI_WL || '🔒',
};

// --- SECURITY & ENCRYPTION ---
const _0x8f2a = "4175746f53746f7265206279204c65526f6953746f7265";
const _0xGetWM = () => Buffer.from(_0x8f2a, 'hex').toString('utf-8');

async function buildStoreEmbed(client) {
    const products = await Product.find({ active: { $ne: false } });
    const currentTimestamp = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
        .setTitle(`${E.storeDisplayTitle} ${process.env.STORE_NAME || 'LeRoiStore'}`)
        .setColor('#00ff00')
        .setDescription(`${E.pend} **Last Update:** <t:${currentTimestamp}:R>\n\n━━━━━━━━━━━━━━━━━━━━━━━━`)
        .setImage(process.env.BANNER_URL)
        .setFooter({ text: _0xGetWM(), iconURL: client.user.displayAvatarURL() })
        .setTimestamp();

    const productFields = [];

    if (products.length === 0) {
        productFields.push({ name: 'Product List', value: "*No products available yet.*" });
    } else {
        let productListString = "";
        for (const p of products) {
            const status = p.stock.length > 0 ? `${E.verified}` : `${E.outOfStock} Out of Stock`;

            const wlPrice = p.price;
            const dlDisplay = Math.floor(wlPrice / 100);
            const wlDisplay = wlPrice % 100;
            const priceLine = `- Price: **${dlDisplay > 0 ? `${dlDisplay} ${E.dl} ` : ''}${wlDisplay} ${E.wl}**`;

            const productString = `${E.product} **${p.name}**\n- Code: \`${p.code}\`\n${priceLine}\n- Stock: **${p.stock.length}** ${status}\n- Sold: **${p.sold || 0}**\n\n`;

            if (productListString.length + productString.length > 1024) {
                productFields.push({ name: productFields.length === 0 ? 'Product List' : '\u200B', value: productListString });
                productListString = "";
            }
            productListString += productString;
        }
        if (productListString.length > 0) {
            productFields.push({ name: productFields.length === 0 ? 'Product List' : '\u200B', value: productListString });
        }
    }
    embed.setFields(productFields);

    return embed;
}

module.exports = {
    buildStoreEmbed
};