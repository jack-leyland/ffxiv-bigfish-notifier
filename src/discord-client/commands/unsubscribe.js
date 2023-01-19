import { SlashCommandBuilder } from "discord.js";
import axios from "axios"

export default {
    data: new SlashCommandBuilder()
        .setName('unsubscribe')
        .setDescription('Unsubscribe from notifications for a fish.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('me')
                .setDescription('Unsubscribe yourself from notifications for a fish.')
                .addStringOption(option =>
                    option.setName('fish')
                        .setDescription(`If you have multiple subscriptions for this fish, you'll be able to chose which one.`)
                        .setRequired(true)
                ))
        .addSubcommand(subcommand =>
            subcommand
                .setName('channel')
                .setDescription('Unubscribe this channel from notifications for a fish.')
                .addStringOption(option =>
                    option.setName('fish')
                        .setDescription(`If you have multiple subscriptions for this fish, you'll be able to chose which one.`)
                        .setRequired(true)
                )),
    async execute(interaction) {
        await interaction.reply(`TEST REPLY: user id is ${interaction.user.id}`)
    }
}
