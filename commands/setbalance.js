const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, MessageFlags } = require('discord.js');
const User = require('../models/User');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setbalance')
        .setDescription("Admin: Set a user's balance to a specific amount")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addUserOption(option => 
            option.setName('user')
                .setDescription("The user whose balance you want to change")
                .setRequired(true))
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Currency type for the new balance')
                .setRequired(true)
                .addChoices(
                    { name: 'Diamond Lock (DL)', value: 'dl' },
                    { name: 'World Lock (WL)', value: 'wl' }
                ))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('The new balance amount')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const targetUser = interaction.options.getUser('user');
        const type = interaction.options.getString('type');
        const amount = interaction.options.getInteger('amount');

        if (amount < 0) return interaction.editReply('❌ Balance cannot be negative.');

        try {
            // Convert amount to WL
            const amountInWL = type === 'dl' ? amount * 100 : amount;

            // Atomically find and update the user, or create them if they don't exist.
            // `new: false` returns the document *before* the update, so we can get the oldBalance.
            const oldUserDoc = await User.findOneAndUpdate(
                { userId: targetUser.id },
                { 
                    $set: { balance: amountInWL },
                    // Only set the username if we are creating a new document
                    $setOnInsert: { username: targetUser.username }
                },
                { 
                    upsert: true, // Create if doesn't exist
                    new: false    // Return the document *before* the update
                }
            );

            const oldBalance = oldUserDoc ? oldUserDoc.balance : 0;
            const newBalance = amountInWL;

            const embed = new EmbedBuilder()
                .setTitle('⚖️ BALANCE SET (ADMIN)')
                .setDescription(`**Admin:** <@${interaction.user.id}>\n**Target:** <@${targetUser.id}>\n**Old Balance:** ${Math.floor(oldBalance/100)} ${process.env.EMOJI_DL || '💎'} ${oldBalance%100} ${process.env.EMOJI_WL || '🔒'}\n**New Balance:** ${Math.floor(newBalance/100)} ${process.env.EMOJI_DL || '💎'} ${newBalance%100} ${process.env.EMOJI_WL || '🔒'}`)
                .setColor('Orange')
                .setTimestamp();

            // Kirim notifikasi ke channel log (mengambil ID dari .env)
            const logChannel = await interaction.client.channels.fetch(process.env.CHANNEL_TOPUP_ID).catch(() => null);
            if (logChannel) await logChannel.send({ embeds: [embed] });

            return interaction.editReply(`✅ Successfully set <@${targetUser.id}>'s balance to **${Math.floor(newBalance/100)} ${process.env.EMOJI_DL || '💎'} ${newBalance%100} ${process.env.EMOJI_WL || '🔒'}**`);

        } catch (error) {
            console.error(error);
            interaction.editReply('❌ An error occurred while accessing the database.');
        }
    }
};