import { SlashCommandBuilder } from "discord.js";
import axios from "axios"
import CONFIG from "../common/config.js";
import { logger } from "../common/logger.js";

export default {
    data: new SlashCommandBuilder()
        .setName('subscribe')
        .setDescription('Subscribe to fish notifications! Must be registered first.')
        .addStringOption(option =>
            option.setName('fish')
                .setDescription('The name of the fish you want to subscribe to.')
                .setRequired(true)
        )
        .addIntegerOption(option =>
            option.setName('minutes')
                .setDescription('How many minutes before the window opens would you like to be notified?')
                .setRequired(true)
        )
        .addBooleanOption(option =>
            option.setName('intuition')
                .setDescription(`Would like to be automatically subscribed to the fish's intuition requirements?`)
        )
        .setDefaultMemberPermissions(0),
    async execute(interaction) {
        try {
            const body = {
                id: interaction.channelId,
                strategy: "discord",
                fishName: interaction.options.getString("fish"),
                minutes: interaction.options.getInteger("minutes"),
                intuition: true
            }
            let res = await axios.post(`${CONFIG.ROOT_SUBSCRIPTION_ENDPOINT}/subscriptions`, body)
            
            if (res.data.success) {
                await interaction.reply({ content: `Subscription Successful!`, ephemeral: true })
            } else {
                await interaction.reply({ content: `Subscription failed. ${res.data.reason}`, ephemeral: true })
            }
        } catch (err) {
            if (err.response) {
                if (err.response.status === 400) {
                    logger.warn("Bad Subscribe Request.")
                } else if (err.response.status === 500) {
                    logger.error("Notifier Server Error")
                }
            } else {
                logger.error("Unexpected client error.")
                logger.error(err)
            }
            await interaction.reply({ content: `An Error Occurred. Please try again later.`, ephemeral: true })
        }
    }
}
