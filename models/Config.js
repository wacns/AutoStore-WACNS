const mongoose = require('mongoose');

const ConfigSchema = new mongoose.Schema({
    id: { type: String, default: 'main_config' }, 
    world: { type: String, default: '-' },
    owner: { type: String, default: '-' },
    botName: { type: String, default: '-' },
    storeChannelId: { type: String, default: '' },
    storeMessageId: { type: String, default: '' },
    leaderboardChannelId: { type: String, default: '' },
    leaderboardMessageId: { type: String, default: '' }
});

module.exports = mongoose.model('Config', ConfigSchema);