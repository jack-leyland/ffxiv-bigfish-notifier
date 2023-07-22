/**
 * Because of the sad realization that the discord API rate limits are going to
 * prevent me from being able to implement this bot the way I originally
 * designed it, here is how it's going to work now:
 *
 *  - Only server admins have access to any of the bot commands.
 *
 *  - All fish subscriptions are only channel based, no more DM notifications.
 *
 *  - Notifications every tick will be batched, so that only one message needs
 *    to be posted to a channel containing all the fish that popped.
 *
 *  - For only a small subset of the rarest fish, user will be able to sign up
 *    for a role to receive mentions before that fish's window. Options will be
 *    15 mins, 30mins, 1 hour and two hours for each of those fish. If one of
 *    those fish have intuition requirements, they will also be mentioned before
 *    those intuition requirements pop.
 *
 *  - There will also be a role with the same options for every big fish on a
 *    timer. Warn user that this will result in a lot of mentions.
 *
 *  - There will be a separate channel for each of these roles, where the
 *    mentions will be posted.
 *
 *  - There will only be two channels where members can post anything,
 *    bug-reports and feature-requests.
 *  
 *  - There will also be a FAQ page, and an automatic onboarding experience
 *    where users get to choose their notification roles.
 *
 */




import path from "path"
const __dirname = path.resolve();
import fs from 'fs';
import { Client, Events, GatewayIntentBits, Collection } from "discord.js"
import axios from "axios"

import CONFIG from './common/config.js';
import { logger } from "./common/logger.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.commands = new Collection();

const commandsPath = path.resolve(__dirname, './src/discord-client/commands');
const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.resolve(commandsPath, file);
    const { default: command } = await import(filePath);
    client.commands.set(command.data.name, command);
}

client.once(Events.ClientReady, c => {
    console.log(`Ready! Logged in as ${c.user.tag}`);
});

client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        logger.error(error);
        await interaction.reply({ content: 'FishEyes encounted an unexpected error executing this command :( Sorry for the inconvenience!', ephemeral: true });
    }
});

// Separate select menu handler. Only used for deleting subscriptions. 
// The value is the Id 
client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isStringSelectMenu()) return;

	const selected = interaction.values[0];

    try {
        await axios.delete(`${CONFIG.ROOT_SUBSCRIPTION_ENDPOINT}/subscriptions`, {
            params: {
                strategy: "discord",
                subId: selected
            }
        })
        await interaction.reply({ content: `Subscription removed.`, ephemeral: true })
    } catch (error) {
        if (err.response) {
            if (err.response.status === 400) {
                logger.warn("Bad Unsubscribe Menu Request.")
            } else if (err.response.status === 500) {
                logger.error("Notifier Server Error")
            }
        } else {
            logger.error("Unexpected client error.")
            logger.error(err)
        }
        await interaction.reply({ content: `An Error Occurred. Please try again later.`, ephemeral: true })
    }
})

client.login(CONFIG.TOKEN);