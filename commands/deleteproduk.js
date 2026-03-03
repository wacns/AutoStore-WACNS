const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Product = require('../models/Product');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deleteproduk')
        .setDescription('Admin: Menghapus produk dari toko secara permanen')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('code')
                .setDescription('Kode produk yang ingin dihapus')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });
        const code = interaction.options.getString('code');
        const E_SUCCESS = process.env.EMOJI_SUCCESS || '✅';
        const E_ERROR = process.env.EMOJI_ERROR || '❌';

        try {
            const product = await Product.findOneAndDelete({ code });
            
            if (!product) {
                return interaction.editReply(`${E_ERROR} Produk dengan kode **${code}** tidak ditemukan.`);
            }

            return interaction.editReply(`${E_SUCCESS} Produk **${product.name}** (\`${code}\`) berhasil dihapus dari database.`);
        } catch (error) {
            console.error(error);
            return interaction.editReply(`${E_ERROR} Terjadi kesalahan saat mencoba menghapus produk.`);
        }
    }
};