import { SlashCommandBuilder, ActionRowBuilder, StringSelectMenuBuilder} from "discord.js";
import axios from "axios"
import CONFIG from "../common/config.js";
import { logger } from "../common/logger.js";

export default {
    data: new SlashCommandBuilder()
        .setName('unsubscribe')
        .setDescription('Unsubscribe from notifications for a fish.')
        .addStringOption(option =>
            option.setName('fish')
                .setDescription(`If you have multiple subscriptions for this fish, you'll be able to chose which one.`)
                .setRequired(true)
        )
        .setDefaultMemberPermissions(0)
        ,
    async execute(interaction) {
        try {
            let res = await axios.get(`${CONFIG.ROOT_SUBSCRIPTION_ENDPOINT}/subscriptions`, {
                params: {
                    id: interaction.channelId,
                    strategy: "discord",
                    fishName: interaction.options.getString("fish"),
                }
            })
            if (res.data.success) {
                let subs = JSON.parse(res.data.subscriptions) 
                if (subs.length === 1) {
                    await axios.delete(`${CONFIG.ROOT_SUBSCRIPTION_ENDPOINT}/subscriptions`, {
                        params: {
                            strategy: "discord",
                            subId: subs[0].subscription_id
                        }
                    })
                    await interaction.reply({ content: `Subscription removed.`, ephemeral: true })
                } else {
                    // show modal with all the options.
                    const row = new ActionRowBuilder()
                        .addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId('DeleteSubscription')
                                .setPlaceholder('Select a subscription to delete.')
                                .addOptions( subs.map(sub => {
                                    return {
                                        label: `${sub.minutes_condition.toString()} mins`,
                                        description: `${sub.has_intuition ? "Has " : "Does not have"} intuition.`,
                                        value: sub.subscription_id
                                    }
                                })),
                        );               
                    await interaction.reply({content: "Which one?", components: [row]})
                }
            }

        } catch (err) {
            if (err.response) {
                if (err.response.status === 400) {
                    logger.warn("Bad Unsubscribe Request.")
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
