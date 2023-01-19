import path from "path"
const __dirname = path.resolve();
import fs from 'fs';
import { Client, Events, GatewayIntentBits, Collection } from "discord.js"

import CONFIG from './common/config.js';

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
        console.error(error);
        await interaction.reply({ content: 'FishEyes encounted an unexpected error executing this command :( Sorry for the inconvenience!', ephemeral: true });
    }
});

client.login(CONFIG.TOKEN);