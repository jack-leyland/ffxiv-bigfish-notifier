import { SlashCommandBuilder } from "discord.js";
import axios from "axios"

export default {
    data: new SlashCommandBuilder()
        .setName('register')
        .setDescription('Register yourself or this channel with FishEyes to start receiving notifcations!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('me')
                .setDescription('Register yourself for DM notifications.'))
        .addSubcommand(subcommand =>
                    subcommand
                        .setName('channel')
                        .setDescription('Register this channel for notifications.')),
    async execute(interaction) {
        await interaction.reply(`TEST REPLY: user id is ${interaction.user.id}`)
    }
}