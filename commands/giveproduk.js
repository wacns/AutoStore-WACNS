﻿﻿﻿﻿﻿﻿﻿﻿﻿const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, AttachmentBuilder, MessageFlags } = require('discord.js');
const Product = require('../models/Product');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('giveproduk')
        .setDescription('Admin: Give a product to a user (Free/Giveaway)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(o => o.setName('user').setDescription('The user to receive the product').setRequired(true))
        .addStringOption(o => o.setName('kode').setDescription('Product Code').setRequired(true))
        .addIntegerOption(o => 
            o.setName('jumlah')
            .setDescription('Amount of the product to send (default: 1)')
            .setRequired(false)
            .setMinValue(1)),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const target = interaction.options.getUser('user');
        const code = interaction.options.getString('kode'); 
        const jumlah = interaction.options.getInteger('jumlah') || 1;

        const product = await Product.findOne({ code });
        if (!product) return interaction.editReply("❌ Product not found.");
        
        // Cek stok cukup
        if (product.stock.length < jumlah) {
            return interaction.editReply(`❌ Insufficient stock. Available stock: ${product.stock.length}, requested: ${jumlah}`);
        }

        // --- ATOMIC UPDATE ---
        // Ambil item dari stok tanpa menghapusnya dulu
        const itemsToGive = product.stock.slice(0, jumlah);

        // Hapus item dari database secara atomik
        const updateResult = await Product.updateOne(
            { code: code, stock: { $all: itemsToGive } }, // Pastikan stok tidak berubah
            { $pull: { stock: { $in: itemsToGive } } }
        );

        if (updateResult.modifiedCount === 0) {
            return interaction.editReply(`❌ Stock was modified by another process or admin. Please try again.`);
        }

        // Gabungkan semua item menjadi string
        const itemsText = itemsToGive.join('\n');
        
        // Buat file attachment
        const buffer = Buffer.from(itemsText, 'utf-8');
        const attachment = new AttachmentBuilder(buffer, { name: `gift_${code}_${jumlah}items.txt` });

        const embed = new EmbedBuilder()
            .setTitle("🎁 You've Received a Gift!")
            .setDescription(`An admin has sent you **${product.name}** (${jumlah}x).`)
            .addFields({ 
                name: 'Item Data:', 
                value: jumlah === 1 ?
                    `\`\`\`${itemsToGive[0]}\`\`\`` : 
                    `📦 **${jumlah} items** (attached in the .txt file)` 
            })
            .setColor('Purple');

        try {
            // Kirim ke DM user
            if (jumlah === 1) {
                await target.send({ embeds: [embed] });
            } else {
                await target.send({ 
                    embeds: [embed],
                    files: [attachment]
                });
            }
            
            // Respons ke admin
            const updatedProduct = await Product.findOne({ code }); // Get latest stock count
            interaction.editReply(`✅ Successfully sent **${jumlah} ${product.name}** to ${target.tag}. Remaining stock: ${updatedProduct.stock.length}`);

            // Tambahkan role jika produk punya role (hanya untuk jumlah > 0)
            if (product.roleId && jumlah > 0) {
                try {
                    const member = await interaction.guild.members.fetch(target.id);
                    const role = await interaction.guild.roles.fetch(product.roleId);
                    if (role) await member.roles.add(role);
                } catch (roleErr) {
                    // Ignore jika gagal menambah role
                }
            }
            
        } catch (err) {
            // Jika DM tertutup, kembalikan semua item ke stok
            // Menggunakan $push untuk mengembalikan stok secara aman
            await Product.updateOne(
                { code: code },
                { $push: { stock: { $each: itemsToGive } } }
            );
            
            interaction.editReply(`❌ Failed to DM user (DMs are likely closed). The stock of **${jumlah} item(s)** has been safely returned.`);
        }
    }
};