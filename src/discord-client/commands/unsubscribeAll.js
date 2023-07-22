import { SlashCommandBuilder } from "discord.js";
import axios from "axios"

export default {
    data: new SlashCommandBuilder()
        .setName('unsubscribe-all')
        .setDescription('Unsubscribe from all notifications.')
        .setDefaultMemberPermissions(0)
        ,
    async execute(interaction) {
        await interaction.reply(`TEST REPLY: user id is ${interaction.user.id}`)
    }
}
