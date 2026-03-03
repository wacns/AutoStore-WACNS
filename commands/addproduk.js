const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Product = require('../models/Product');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addproduk')
        .setDescription('Admin: Add a new product to the store')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        // 1. Input CODE
        .addStringOption(option => 
            option.setName('code')
                .setDescription('Unique Product Code (e.g., nf1)')
                .setRequired(true))
        // 2. Input NAME
        .addStringOption(option => 
            option.setName('name')
                .setDescription('Product Name')
                .setRequired(true))
        // 3. Input PRICE
        .addIntegerOption(option =>
            option.setName('price')
                .setDescription('Product price in World Locks (WL)')
                .setRequired(true))
        // 5. Input ROLE (Sesuai Gambar)
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('Reward role upon purchase (Optional)')
                .setRequired(false))
        // 5. Input DESCRIPTION (+1 More di gambar)
        .addStringOption(option => 
            option.setName('description')
                .setDescription('Product description (Optional)')
                .setRequired(false)),

    async execute(interaction) {
        // Use deferReply to avoid "Application did not respond" timeout
        await interaction.deferReply({ ephemeral: true });

        // Get data from user input
        const code = interaction.options.getString('code');
        const name = interaction.options.getString('name');
        const price = interaction.options.getInteger('price');
        const role = interaction.options.getRole('role'); // Ambil object Role
        const desc = interaction.options.getString('description') || "No description";

        try {
            // Check if code already exists
            const exist = await Product.findOne({ code });
            if (exist) return interaction.editReply(`❌ Code **${code}** is already used by another product.`);

            // Prepare Role ID data (if any)
            const roleIdToSave = role ? role.id : null;
            const roleName = role ? role.name : "None";

            // Save to Database
            const newProd = new Product({
                code: code,
                price: price,
                name: name,
                description: desc,
                roleId: roleIdToSave, // Simpan ID Role
                stock: []
            });

            await newProd.save();

            interaction.editReply(`✅ **Product Created Successfully!**\n📦 Name: ${name}\n🏷️ Code: \`${code}\`\n💰 Price: ${price} WL\n🎭 Reward Role: ${roleName}\n📝 Description: ${desc}`);
            
        } catch (error) {
            console.error(error);
            interaction.editReply("❌ A database error occurred.");
        }
    }
};