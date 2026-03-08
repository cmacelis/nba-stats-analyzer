import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Post a formatted announcement to #announcements (admin only)')
    .addStringOption(o =>
      o.setName('title').setDescription('Announcement title').setRequired(true))
    .addStringOption(o =>
      o.setName('bullets').setDescription('Bullet points (one per line)').setRequired(true))
    .addStringOption(o =>
      o.setName('impact').setDescription('Who is affected (default: All users)').setRequired(false))
    .addStringOption(o =>
      o.setName('status').setDescription('Current status')
        .addChoices(
          { name: 'Live', value: 'Live' },
          { name: 'Monitoring', value: 'Monitoring' },
          { name: 'Degraded', value: 'Degraded' },
          { name: 'Maintenance', value: 'Maintenance' },
        )
        .setRequired(false))
    .addStringOption(o =>
      o.setName('link').setDescription('Link URL (default: https://edgedetector.ai)').setRequired(false))
    .addBooleanOption(o =>
      o.setName('silent').setDescription('If true, suppress @mentions').setRequired(false)),

  async execute(interaction) {
    // ── Permission gate ──────────────────────────────────────────────────
    const announcerRoleId = process.env.ANNOUNCER_ROLE_ID;
    const isAdmin = interaction.member.permissions.has(PermissionFlagsBits.Administrator);
    const hasRole = announcerRoleId && interaction.member.roles.cache.has(announcerRoleId);

    if (!isAdmin && !hasRole) {
      console.log(`[announce] denied: ${interaction.user.tag} (no admin/announcer role)`);
      return interaction.reply({ content: 'Not authorized.', ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    // ── Parse options ────────────────────────────────────────────────────
    const title   = interaction.options.getString('title');
    const raw     = interaction.options.getString('bullets');
    const impact  = interaction.options.getString('impact') || 'All users';
    const status  = interaction.options.getString('status') || 'Live';
    const link    = interaction.options.getString('link') || 'https://edgedetector.ai';
    const silent  = interaction.options.getBoolean('silent') ?? false;

    // ── Validate bullets ─────────────────────────────────────────────────
    const bullets = raw
      .split('\n')
      .map(b => b.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, 6)
      .map(b => b.length > 120 ? b.slice(0, 117) + '...' : b);

    if (bullets.length === 0) {
      return interaction.editReply('Bullets cannot be empty.');
    }

    // ── Build message ────────────────────────────────────────────────────
    const bulletList = bullets.map(b => `- ${b}`).join('\n');
    const message = [
      `**✅ Update — ${title}**`,
      '',
      '**What changed**',
      bulletList,
      '',
      `**Impact:** ${impact}`,
      `**Status:** ${status}`,
      `**More:** ${link}`,
      `**Questions:** #general`,
    ].join('\n');

    // ── Strip @everyone/@here ────────────────────────────────────────────
    const safe = message.replace(/@(everyone|here)/g, '@\u200b$1');

    // ── Post to #announcements ───────────────────────────────────────────
    const channelId = process.env.ANNOUNCEMENTS_CHANNEL_ID;
    if (!channelId) {
      console.log(`[announce] ANNOUNCEMENTS_CHANNEL_ID not set`);
      return interaction.editReply('ANNOUNCEMENTS_CHANNEL_ID not configured.');
    }

    try {
      const channel = await interaction.client.channels.fetch(channelId);
      if (!channel?.isTextBased()) {
        console.log(`[announce] channel ${channelId} is not text-based`);
        return interaction.editReply('Announcements channel is not a text channel.');
      }

      const sendOpts = { content: safe };
      if (silent) sendOpts.allowedMentions = { parse: [] };

      await channel.send(sendOpts);

      console.log(`[announce] posted by ${interaction.user.tag}: "${title}"`);
      return interaction.editReply('Posted ✅');
    } catch (err) {
      console.error(`[announce] error:`, err.message);
      return interaction.editReply(`Failed to post: ${err.message}`);
    }
  },
};
