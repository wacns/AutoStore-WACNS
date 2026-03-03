﻿﻿﻿﻿﻿const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Product = require('../models/Product');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editproduk')
        .setDescription('Admin: Edit product price or name')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(o => o.setName('kode').setDescription('Product Code').setRequired(true))
        .addIntegerOption(o => o.setName('harga').setDescription('New Price in WL (Optional)'))
        .addStringOption(o => o.setName('nama_baru').setDescription('New Name (Optional)'))
        .addBooleanOption(o => o.setName('active').setDescription('Active Status (True = Show, False = Hide)')),

    async execute(interaction) {
        // Gunakan deferReply dengan ephemeral: true agar hanya admin yang melihat
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        
        const code = interaction.options.getString('kode');
        const newPrice = interaction.options.getInteger('harga');
        const newName = interaction.options.getString('nama_baru');
        const active = interaction.options.getBoolean('active');

        const product = await Product.findOne({ code });
        if (!product) return interaction.editReply({ content: "❌ Product not found." });

        let updates = [];
        if (newPrice !== null) {
            product.price = newPrice;
            updates.push(`Price -> ${newPrice} ${process.env.EMOJI_WL || '🔒'}`);
        }
        if (newName) {
            product.name = newName;
            updates.push(`Name -> ${newName}`);
        }
        if (active !== null) {
            product.active = active;
            updates.push(`Status -> ${active ? 'Active 🟢' : 'Inactive 🔴'}`);
        }

        if (updates.length === 0) return interaction.editReply({ content: "ℹ️ No changes were entered." });

        await product.save();
        interaction.editReply(`✅ Product **${code}** updated:\n${updates.join('\n')}`);
    }
};