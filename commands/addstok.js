const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Product = require('../models/Product');
const axios = require('axios');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addstock')
        .setDescription('Admin: Add product stock (Manual or File Upload)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('code')
                .setDescription('The code of the product to add stock to')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('stok_teks')
                .setDescription('Input stock manually (separate with commas for multiple)')
                .setRequired(false))
        .addAttachmentOption(option => 
            option.setName('stok_file')
                .setDescription('Upload a .txt file containing stock (one item per line)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const code = interaction.options.getString('code');
        const stokTeks = interaction.options.getString('stok_teks');
        const stokFile = interaction.options.getAttachment('stok_file');

        try {
            // 1. Cari Produk
            const product = await Product.findOne({ code });
            if (!product) return interaction.editReply(`❌ Product with code **${code}** not found.`);

            let newStocks = [];

            // 2. Ambil Stok dari Teks (jika ada)
            if (stokTeks) {
                const items = stokTeks.split(',').map(item => item.trim()).filter(item => item !== "");
                newStocks = newStocks.concat(items);
            }

            // 3. Ambil Stok dari File (jika ada)
            if (stokFile) {
                // Pastikan file adalah .txt
                if (!stokFile.name.endsWith('.txt')) {
                    return interaction.editReply('❌ The uploaded file must be in `.txt` format.');
                }

                const response = await axios.get(stokFile.url);
                const fileContent = response.data;
                
                // Pisahkan per baris
                const fileItems = fileContent.split(/\r?\n/).map(item => item.trim()).filter(item => item !== "");
                newStocks = newStocks.concat(fileItems);
            }

            if (newStocks.length === 0) {
                return interaction.editReply('❌ You must either input stock text or upload a stock file.');
            }

            // 4. Update ke Database
            await Product.updateOne(
                { code: code },
                { $push: { stock: { $each: newStocks } } }
            );

            // 5. Berikan Respon
            // Re-fetch to get the new total stock count accurately
            const updatedProduct = await Product.findOne({ code });
            interaction.editReply(`✅ Successfully added **${newStocks.length}** new stock items to the product **${product.name}** (\`${code}\`).\n📦 Total stock is now: **${updatedProduct.stock.length}**`);

        } catch (error) {
            console.error(error);
            interaction.editReply('❌ An error occurred while processing the stock.');
        }
    }
};