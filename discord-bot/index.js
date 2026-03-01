import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readdirSync } from 'fs';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Command collection
client.commands = new Collection();

// Rate limiter: userID -> timestamp of last request
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 2000; // 2 seconds

// Utility: Check rate limit
export function checkRateLimit(userId) {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(userId);

  if (lastRequest && now - lastRequest < RATE_LIMIT_WINDOW) {
    return false; // Rate limited
  }

  rateLimitMap.set(userId, now);
  return true; // Allowed
}

// Load all commands from commands/ directory
async function loadCommands() {
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    client.commands.set(command.default.data.name, command.default);
    console.log(`✓ Loaded command: ${command.default.data.name}`);
  }
}

client.once('ready', async () => {
  console.log(`\n🤖 Bot logged in as ${client.user.tag}`);
  console.log(`📍 Guild ID: ${process.env.GUILD_ID}`);
  console.log(`🔌 API Base: ${process.env.NBA_API_BASE}\n`);
  
  // Load commands on startup
  await loadCommands();
  
  // Register commands with Discord
  const guild = client.guilds.cache.get(process.env.GUILD_ID);
  if (guild) {
    await guild.commands.set(Array.from(client.commands.values()).map(cmd => cmd.data));
    console.log(`✓ Registered ${client.commands.size} slash commands\n`);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  // Check rate limit
  if (!checkRateLimit(interaction.user.id)) {
    console.log(`⏱️  Rate limit hit for ${interaction.user.tag}`);
    return interaction.reply({
      content: '⏱️ Slow down! You can only make 1 request every 2 seconds.',
      ephemeral: true,
    });
  }

  try {
    console.log(`\n📨 Command: /${interaction.commandName} from ${interaction.user.tag}`);
    if (interaction.options.data.length > 0) {
      console.log(`   Params: ${JSON.stringify(Object.fromEntries(interaction.options.data.map(d => [d.name, d.value])))}`);
    }

    await command.execute(interaction);
  } catch (error) {
    console.error(`❌ Error executing /${interaction.commandName}:`, error.message);
    const reply = {
      content: '❌ An error occurred while processing your request.',
      ephemeral: true,
    };
    if (interaction.replied) {
      await interaction.followUp(reply);
    } else {
      await interaction.reply(reply);
    }
  }
});

client.login(process.env.DISCORD_TOKEN);
