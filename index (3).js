const {
  Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType,
  SlashCommandBuilder, REST, Routes, AttachmentBuilder
} = require('discord.js');
const fs = require('fs');
require('dotenv').config();

// ─────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────
const CONFIG_FILE = './config.json';
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const d = {
      prefix: '$', mmRoleId: null, ticketCategoryId: null, vouchData: {}, vacationData: {},
      panelMessages: [], nayMessages: [], warnData: {}, giveaways: [],
      nayMessage: null, nayTriggerRoleId: null, nayAcceptRoleId: null, panelImageUrl: null,
      welcomeChannelId: null, welcomeEnabled: false,
      welcomeTitle: 'Welcome to the server!',
      welcomeMessage: 'We hope you enjoy your stay.',
      rulesChannelId: null, mmRequestChannelId: null,
      savedEmbeds: {},
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(d, null, 2));
    return d;
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE));
  if (!cfg.panelMessages) cfg.panelMessages = [];
  if (!cfg.nayMessages) cfg.nayMessages = cfg.yukicMessages || [];
  if (!cfg.warnData) cfg.warnData = {};
  if (!cfg.giveaways) cfg.giveaways = [];
  if (!cfg.vouchData) cfg.vouchData = {};
  if (!cfg.vacationData) cfg.vacationData = {};
  if (!cfg.nayMessage) cfg.nayMessage = cfg.yukicMessage || null;
  if (!cfg.nayTriggerRoleId) cfg.nayTriggerRoleId = cfg.yukicTriggerRoleId || null;
  if (!cfg.nayAcceptRoleId) cfg.nayAcceptRoleId = cfg.yukicAcceptRoleId || null;
  if (!cfg.welcomeChannelId) cfg.welcomeChannelId = null;
  if (cfg.welcomeEnabled === undefined) cfg.welcomeEnabled = false;
  if (!cfg.welcomeTitle) cfg.welcomeTitle = 'Welcome to the server!';
  if (!cfg.welcomeMessage) cfg.welcomeMessage = 'We hope you enjoy your stay.';
  if (!cfg.rulesChannelId) cfg.rulesChannelId = null;
  if (!cfg.mmRequestChannelId) cfg.mmRequestChannelId = null;
  if (!cfg.savedEmbeds) cfg.savedEmbeds = {};
  return cfg;
}
function saveConfig(cfg) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); }
let config = loadConfig();

// ─────────────────────────────────────────────────────────────
// EMBED BUILDER SESSION STORE (in-memory)
// ─────────────────────────────────────────────────────────────
const embedSessions = {};

function sessionEmbed(userId) {
  if (!embedSessions[userId]) {
    embedSessions[userId] = {
      title: null, description: null, color: 0xf5a623,
      author: null, authorIcon: null,
      footer: null, footerIcon: null,
      image: null, thumbnail: null,
      fields: [],
    };
  }
  return embedSessions[userId];
}

function buildEmbedFromSession(session) {
  const e = new EmbedBuilder().setColor(session.color || 0xf5a623);
  if (session.title) e.setTitle(session.title);
  if (session.description) e.setDescription(session.description);
  if (session.author) e.setAuthor({ name: session.author, iconURL: session.authorIcon || undefined });
  if (session.footer) e.setFooter({ text: session.footer, iconURL: session.footerIcon || undefined });
  if (session.image) e.setImage(session.image);
  if (session.thumbnail) e.setThumbnail(session.thumbnail);
  if (session.fields.length > 0) e.addFields(session.fields);
  return e;
}

function embedBuilderRows(userId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`eb_title_${userId}`).setLabel('Title').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`eb_description_${userId}`).setLabel('Description').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`eb_color_${userId}`).setLabel('Color').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`eb_author_${userId}`).setLabel('Author').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`eb_authoricon_${userId}`).setLabel('Author Icon').setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`eb_footer_${userId}`).setLabel('Footer').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`eb_footericon_${userId}`).setLabel('Footer Icon').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`eb_image_${userId}`).setLabel('Image').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`eb_thumbnail_${userId}`).setLabel('Thumbnail').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`eb_addfield_${userId}`).setLabel('Add Field').setStyle(ButtonStyle.Secondary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`eb_removefield_${userId}`).setLabel('Remove Field').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`eb_send_${userId}`).setLabel('Send').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`eb_save_${userId}`).setLabel('Save Only').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`eb_cancel_${userId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger),
    ),
  ];
}

// ─────────────────────────────────────────────────────────────
// CLIENT
// ─────────────────────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// ─────────────────────────────────────────────────────────────
// SLASH COMMANDS
// ─────────────────────────────────────────────────────────────
const slashCommands = [
  new SlashCommandBuilder().setName('help').setDescription('Show all commands'),
  new SlashCommandBuilder().setName('panel').setDescription('Send the ticket panel'),
  new SlashCommandBuilder().setName('setmmrole').setDescription('Set the middleman role (Admin)').addRoleOption(o => o.setName('role').setDescription('MM role').setRequired(true)),
  new SlashCommandBuilder().setName('setcategory').setDescription('Set ticket category').addChannelOption(o => o.setName('category').setDescription('Category').setRequired(true)),
  new SlashCommandBuilder().setName('setprefix').setDescription('Change the bot prefix').addStringOption(o => o.setName('prefix').setDescription('New prefix').setRequired(true)),
  new SlashCommandBuilder().setName('setpicture').setDescription('Set image on all panels/nay messages').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setrole').setDescription('Set minimum role to use $nay').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('setnayrole').setDescription('Set role given on Accept').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('setnaymessage').setDescription('Set offer message (one time)').addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)),
  new SlashCommandBuilder().setName('resetnaymessage').setDescription('Reset offer message so it can be changed'),
  new SlashCommandBuilder().setName('nay').setDescription('Send offer to a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('close').setDescription('Close this ticket'),
  new SlashCommandBuilder().setName('claim').setDescription('Claim this ticket'),
  new SlashCommandBuilder().setName('unclaim').setDescription('Unclaim this ticket'),
  new SlashCommandBuilder().setName('transcript').setDescription('Generate transcript'),
  new SlashCommandBuilder().setName('add').setDescription('Add user to ticket').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('remove').setDescription('Remove user from ticket').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('rename').setDescription('Rename ticket channel').addStringOption(o => o.setName('name').setDescription('Name').setRequired(true)),
  new SlashCommandBuilder().setName('transfer').setDescription('Transfer ticket to staff').addUserOption(o => o.setName('user').setDescription('Staff').setRequired(true)),
  new SlashCommandBuilder().setName('mminfo').setDescription('Middleman service info'),
  new SlashCommandBuilder().setName('mmfee').setDescription('Middleman fee options'),
  new SlashCommandBuilder().setName('confirm').setDescription('Confirm a trade'),
  new SlashCommandBuilder().setName('vouch').setDescription('Vouch for a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('vouches').setDescription("View a user's vouches").addUserOption(o => o.setName('user').setDescription('User')),
  new SlashCommandBuilder().setName('setvouches').setDescription('Set vouch count').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('count').setDescription('Count').setRequired(true)),
  new SlashCommandBuilder().setName('vacation').setDescription('Start a vacation').addStringOption(o => o.setName('duration').setDescription('1m 2h 3d 1w').setRequired(true)),
  new SlashCommandBuilder().setName('vacationcancel').setDescription('End vacation early'),
  new SlashCommandBuilder().setName('ban').setDescription('Ban a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('kick').setDescription('Kick a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('mute').setDescription('Timeout a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addStringOption(o => o.setName('duration').setDescription('e.g. 10m 1h 1d').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('unmute').setDescription('Remove timeout').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('warn').setDescription('Warn a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('warnings').setDescription("View a user's warnings").addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('clearwarnings').setDescription("Clear a user's warnings").addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('purge').setDescription('Delete messages').addIntegerOption(o => o.setName('amount').setDescription('Amount (1-100)').setRequired(true)),
  new SlashCommandBuilder().setName('lock').setDescription('Lock a channel'),
  new SlashCommandBuilder().setName('unlock').setDescription('Unlock a channel'),
  new SlashCommandBuilder().setName('slowmode').setDescription('Set slowmode').addIntegerOption(o => o.setName('seconds').setDescription('Seconds (0 to disable)').setRequired(true)),
  new SlashCommandBuilder().setName('announce').setDescription('Send an announcement').addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)).addStringOption(o => o.setName('title').setDescription('Title')),
  new SlashCommandBuilder().setName('poll').setDescription('Create a poll').addStringOption(o => o.setName('question').setDescription('Question').setRequired(true)),
  new SlashCommandBuilder().setName('giveaway').setDescription('Start a giveaway').addStringOption(o => o.setName('duration').setDescription('e.g. 10m 1h 1d').setRequired(true)).addStringOption(o => o.setName('prize').setDescription('Prize').setRequired(true)).addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setRequired(false)),
  new SlashCommandBuilder().setName('role').setDescription('Give or remove a role from a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('embed').setDescription('Open the interactive embed builder'),
  new SlashCommandBuilder().setName('serverinfo').setDescription('Server info'),
  new SlashCommandBuilder().setName('userinfo').setDescription('User info').addUserOption(o => o.setName('user').setDescription('User')),
  new SlashCommandBuilder().setName('avatar').setDescription('User avatar').addUserOption(o => o.setName('user').setDescription('User')),
  new SlashCommandBuilder().setName('banner').setDescription('User banner').addUserOption(o => o.setName('user').setDescription('User')),
  new SlashCommandBuilder().setName('membercount').setDescription('Member count'),
  new SlashCommandBuilder().setName('ping').setDescription('Bot latency'),
  new SlashCommandBuilder().setName('uptime').setDescription('Bot uptime'),
  new SlashCommandBuilder().setName('botinfo').setDescription('Bot info'),
  new SlashCommandBuilder().setName('afk').setDescription('Mark yourself AFK').addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('nickname').setDescription("Change a user's nickname").addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addStringOption(o => o.setName('name').setDescription('New nickname')),
  new SlashCommandBuilder().setName('fill').setDescription('Fill all roles below your highest role'),
  new SlashCommandBuilder().setName('setwelcomechannel').setDescription('Set the channel where welcome messages are sent').addChannelOption(o => o.setName('channel').setDescription('Welcome channel').setRequired(true)),
  new SlashCommandBuilder().setName('setruleschannel').setDescription('Set the rules channel shown in welcome messages').addChannelOption(o => o.setName('channel').setDescription('Rules channel').setRequired(true)),
  new SlashCommandBuilder().setName('setmmrequestchannel').setDescription('Set the MM request channel shown in welcome messages').addChannelOption(o => o.setName('channel').setDescription('MM request channel').setRequired(true)),
  new SlashCommandBuilder().setName('setwelcometitle').setDescription('Set the title of the welcome embed').addStringOption(o => o.setName('title').setDescription('Title text').setRequired(true)),
  new SlashCommandBuilder().setName('setwelcomemessage').setDescription('Set the body of the welcome message (use {user} for mention)').addStringOption(o => o.setName('message').setDescription('Message text').setRequired(true)),
  new SlashCommandBuilder().setName('togglewelcome').setDescription('Enable or disable welcome messages'),
  new SlashCommandBuilder().setName('welcomeconfig').setDescription('View current welcome configuration'),
  new SlashCommandBuilder().setName('testwelcome').setDescription('Send a test welcome message for yourself'),
];

async function registerSlashCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: slashCommands.map(c => c.toJSON()) });
    console.log('✅ Slash commands registered');
  } catch (e) { console.error('Failed to register slash commands:', e); }
}

client.once('ready', async () => {
  console.log(`✅ Bot online as ${client.user.tag}`);
  await registerSlashCommands();
});

// ─────────────────────────────────────────────────────────────
// WELCOME ON MEMBER JOIN
// ─────────────────────────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  config = loadConfig();
  if (!config.welcomeEnabled || !config.welcomeChannelId) return;
  const channel = member.guild.channels.cache.get(config.welcomeChannelId);
  if (!channel) return;
  await sendWelcomeMessage(channel, member);
});

async function sendWelcomeMessage(channel, member) {
  config = loadConfig();
  const rulesLine = config.rulesChannelId ? `📜 **Check the rules:** <#${config.rulesChannelId}>` : '';
  const mmLine = config.mmRequestChannelId ? `🤝 **Request a Middleman:** <#${config.mmRequestChannelId}>` : '';
  const bodyParts = [
    config.welcomeMessage.replace(/{user}/g, `<@${member.id}>`),
    '',
    rulesLine,
    mmLine,
  ].filter(l => l !== undefined && !(l === '' && !rulesLine && !mmLine));
  const embed = new EmbedBuilder()
    .setColor(0xf5a623)
    .setTitle(config.welcomeTitle)
    .setDescription(bodyParts.join('\n').trim())
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Member #${member.guild.memberCount}` })
    .setTimestamp();
  if (config.panelImageUrl) embed.setImage(config.panelImageUrl);
  await channel.send({ content: `👋 Welcome <@${member.id}>!`, embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// PREFIX HANDLER
// ─────────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  config = loadConfig();
  const PREFIX = config.prefix;
  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  const ctx = { message, args, guild: message.guild, member: message.member, channel: message.channel, isSlash: false };
  const cmds = {
    help: runHelp, panel: runPanel, setmmrole: runSetMMRole, setcategory: runSetCategory,
    setprefix: runSetPrefix, setpicture: runSetPicture, setrole: runSetRole,
    setnayrole: runSetNayRole, setnaymessage: runSetNayMessage,
    resetnaymessage: runResetNayMessage, nay: runNay,
    close: runClose, claim: runClaim, unclaim: runUnclaim, transcript: runTranscript,
    add: runAdd, remove: runRemove, rename: runRename, transfer: runTransfer,
    mminfo: runMmInfo, mmfee: runMmFee, confirm: runConfirm,
    vouch: runVouch, vouches: runVouches, setvouches: runSetVouches,
    vacation: runVacation, vacationcancel: runVacationCancel, vc: runVacationCancel,
    ban: runBan, kick: runKick, mute: runMute, unmute: runUnmute,
    warn: runWarn, warnings: runWarnings, clearwarnings: runClearWarnings,
    purge: runPurge, lock: runLock, unlock: runUnlock, slowmode: runSlowmode,
    announce: runAnnounce, poll: runPoll, giveaway: runGiveaway,
    role: runRole, embed: runEmbed,
    serverinfo: runServerInfo, userinfo: runUserInfo, whois: runUserInfo, w: runUserInfo,
    avatar: runAvatar, av: runAvatar, pfp: runAvatar, banner: runBanner,
    membercount: runMemberCount, ping: runPing, uptime: runUptime, botinfo: runBotInfo,
    afk: runAfk, nickname: runNickname, fill: runFill,
    setwelcomechannel: runSetWelcomeChannel, setruleschannel: runSetRulesChannel,
    setmmrequestchannel: runSetMMRequestChannel, setwelcometitle: runSetWelcomeTitle,
    setwelcomemessage: runSetWelcomeMessageCmd, togglewelcome: runToggleWelcome,
    welcomeconfig: runWelcomeConfig, testwelcome: runTestWelcome,
  };
  if (cmds[command]) cmds[command](ctx);
});

// ─────────────────────────────────────────────────────────────
// SLASH + INTERACTION HANDLER
// ─────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  config = loadConfig();

  // ── Slash commands ──
  if (interaction.isChatInputCommand()) {
    const ctx = {
      interaction, guild: interaction.guild, member: interaction.member,
      channel: interaction.channel, isSlash: true, args: [],
      getOption: (n) => interaction.options.get(n)?.value,
      getUserOption: (n) => interaction.options.getUser(n),
      getMemberOption: (n) => interaction.options.getMember(n),
      getRoleOption: (n) => interaction.options.getRole(n),
      getChannelOption: (n) => interaction.options.getChannel(n),
    };
    const cmds = {
      help: runHelp, panel: runPanel, setmmrole: runSetMMRole, setcategory: runSetCategory,
      setprefix: runSetPrefix, setpicture: runSetPicture, setrole: runSetRole,
      setnayrole: runSetNayRole, setnaymessage: runSetNayMessage,
      resetnaymessage: runResetNayMessage, nay: runNay,
      close: runClose, claim: runClaim, unclaim: runUnclaim, transcript: runTranscript,
      add: runAdd, remove: runRemove, rename: runRename, transfer: runTransfer,
      mminfo: runMmInfo, mmfee: runMmFee, confirm: runConfirm,
      vouch: runVouch, vouches: runVouches, setvouches: runSetVouches,
      vacation: runVacation, vacationcancel: runVacationCancel,
      ban: runBan, kick: runKick, mute: runMute, unmute: runUnmute,
      warn: runWarn, warnings: runWarnings, clearwarnings: runClearWarnings,
      purge: runPurge, lock: runLock, unlock: runUnlock, slowmode: runSlowmode,
      announce: runAnnounce, poll: runPoll, giveaway: runGiveaway,
      role: runRole, embed: runEmbed,
      serverinfo: runServerInfo, userinfo: runUserInfo,
      avatar: runAvatar, banner: runBanner,
      membercount: runMemberCount, ping: runPing, uptime: runUptime, botinfo: runBotInfo,
      afk: runAfk, nickname: runNickname, fill: runFill,
      setwelcomechannel: runSetWelcomeChannel, setruleschannel: runSetRulesChannel,
      setmmrequestchannel: runSetMMRequestChannel, setwelcometitle: runSetWelcomeTitle,
      setwelcomemessage: runSetWelcomeMessageCmd, togglewelcome: runToggleWelcome,
      welcomeconfig: runWelcomeConfig, testwelcome: runTestWelcome,
    };
    if (cmds[interaction.commandName]) cmds[interaction.commandName](ctx);
    return;
  }

  // ── Select menu — ticket type ──
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type') {
    const type = interaction.values[0];
    if (type === 'ingame') {
      const modal = new ModalBuilder().setCustomId('modal_ingame').setTitle('Ingame Trading — Middleman');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trading_with').setLabel('Who are you trading with?').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_details').setLabel('What is the trade?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('join_links').setLabel('Can you both provide join links?').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('roblox_users').setLabel('If not, send both Roblox usernames').setStyle(TextInputStyle.Short).setRequired(false)),
      );
      return interaction.showModal(modal);
    }
    if (type === 'payment') {
      const modal = new ModalBuilder().setCustomId('modal_payment').setTitle('PayPal/Cashapp/Crypto — Middleman');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trading_with').setLabel('Who are you trading with?').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('trade_details').setLabel('What is the trade?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('payment_method').setLabel('Payment method?').setStyle(TextInputStyle.Short).setRequired(true)),
      );
      return interaction.showModal(modal);
    }
    return;
  }

  // ── Help section buttons ──
  if (interaction.isButton() && interaction.customId.startsWith('help_')) {
    const section = interaction.customId.replace('help_', '');
    return showHelpSection(interaction, section);
  }

  // ── Embed builder buttons ──
  if (interaction.isButton() && interaction.customId.startsWith('eb_')) {
    return handleEmbedBuilderButton(interaction);
  }

  // ── Embed builder modals ──
  if (interaction.isModalSubmit() && interaction.customId.startsWith('ebm_')) {
    return handleEmbedBuilderModal(interaction);
  }

  // ── Ticket modals ──
  if (interaction.isModalSubmit() && (interaction.customId === 'modal_ingame' || interaction.customId === 'modal_payment')) {
    await interaction.deferReply({ ephemeral: true });
    return createTicket(interaction);
  }

  // ── Other buttons ──
  if (interaction.isButton()) {
    if (interaction.customId === 'close_ticket') {
      if (!interaction.channel.name.startsWith('ticket-')) return;
      await interaction.reply({ content: '🔒 Closing ticket in 5 seconds...' });
      return setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
    if (interaction.customId === 'fee_split') return interaction.reply({ content: '✅ **Split (50/50)** selected. Both parties pay half the fee.' });
    if (interaction.customId === 'fee_full') return interaction.reply({ content: '✅ **Full (100%)** selected. One party covers the full fee.' });
    if (interaction.customId === 'mm_understand') return interaction.reply({ content: '✅ Got it! A middleman will be with you shortly.', ephemeral: true });

    if (interaction.customId.startsWith('nay_accept_')) {
      const userId = interaction.customId.replace('nay_accept_', '');
      if (interaction.user.id !== userId) return interaction.reply({ content: '❌ This offer is not for you.', ephemeral: true });
      config = loadConfig();
      const roleId = config.nayAcceptRoleId;
      if (!roleId) return interaction.reply({ content: '❌ No accept role set.', ephemeral: true });
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      let roleName = 'the role';
      if (member) {
        try {
          await member.roles.add(roleId);
          const role = interaction.guild.roles.cache.get(roleId);
          if (role) roleName = role.name;
        } catch (e) {}
      }
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('done_a').setLabel('✅ Accepted').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('done_b').setLabel('Decline').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      await interaction.update({ components: [disabledRow] });
      return interaction.channel.send({ content: `✅ <@${userId}> has been given the **${roleName}** role!` });
    }

    if (interaction.customId.startsWith('nay_decline_')) {
      const userId = interaction.customId.replace('nay_decline_', '');
      if (interaction.user.id !== userId) return interaction.reply({ content: '❌ This offer is not for you.', ephemeral: true });
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('done_a').setLabel('Accept').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('done_b').setLabel('❌ Declined').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      await interaction.update({ components: [disabledRow] });
      return interaction.channel.send({ content: `❌ <@${userId}> has declined the offer.` });
    }
  }
});

// ─────────────────────────────────────────────────────────────
// EMBED BUILDER — BUTTON HANDLER
// ─────────────────────────────────────────────────────────────
async function handleEmbedBuilderButton(interaction) {
  // customId format: eb_action_userId
  const withoutPrefix = interaction.customId.slice(3); // remove "eb_"
  const underscoreIdx = withoutPrefix.indexOf('_');
  const action = withoutPrefix.slice(0, underscoreIdx);
  const userId = withoutPrefix.slice(underscoreIdx + 1);

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: '❌ This embed builder is not yours.', ephemeral: true });
  }

  const session = sessionEmbed(userId);

  if (action === 'cancel') {
    delete embedSessions[userId];
    return interaction.update({ content: '❌ Embed builder cancelled.', embeds: [], components: [] });
  }

  if (action === 'send') {
    const built = buildEmbedFromSession(session);
    await interaction.channel.send({ embeds: [built] });
    delete embedSessions[userId];
    return interaction.update({ content: '✅ Embed sent!', embeds: [], components: [] });
  }

  if (action === 'save') {
    const modal = new ModalBuilder().setCustomId(`ebm_savename_${userId}`).setTitle('Save Embed');
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId('save_name').setLabel('Name to save this embed as').setStyle(TextInputStyle.Short).setRequired(true)
      )
    );
    return interaction.showModal(modal);
  }

  if (action === 'removefield') {
    if (session.fields.length === 0) {
      return interaction.reply({ content: '❌ No fields to remove.', ephemeral: true });
    }
    session.fields.pop();
    const built = buildEmbedFromSession(session);
    return interaction.update({ embeds: [built], components: embedBuilderRows(userId) });
  }

  // All other actions open a modal
  const modalDefs = {
    title:      { id: `ebm_title_${userId}`,      title: 'Set Title',       fields: [{ id: 'val', label: 'Title text', style: TextInputStyle.Short, value: session.title }] },
    description:{ id: `ebm_description_${userId}`,title: 'Set Description', fields: [{ id: 'val', label: 'Description', style: TextInputStyle.Paragraph, value: session.description }] },
    color:      { id: `ebm_color_${userId}`,      title: 'Set Color',       fields: [{ id: 'val', label: 'Hex color e.g. #ff0000', style: TextInputStyle.Short, value: session.color ? `#${session.color.toString(16).padStart(6,'0')}` : '#f5a623' }] },
    author:     { id: `ebm_author_${userId}`,     title: 'Set Author',      fields: [{ id: 'val', label: 'Author name', style: TextInputStyle.Short, value: session.author }] },
    authoricon: { id: `ebm_authoricon_${userId}`, title: 'Set Author Icon', fields: [{ id: 'val', label: 'Author icon URL', style: TextInputStyle.Short, value: session.authorIcon }] },
    footer:     { id: `ebm_footer_${userId}`,     title: 'Set Footer',      fields: [{ id: 'val', label: 'Footer text', style: TextInputStyle.Short, value: session.footer }] },
    footericon: { id: `ebm_footericon_${userId}`, title: 'Set Footer Icon', fields: [{ id: 'val', label: 'Footer icon URL', style: TextInputStyle.Short, value: session.footerIcon }] },
    image:      { id: `ebm_image_${userId}`,      title: 'Set Image',       fields: [{ id: 'val', label: 'Image URL', style: TextInputStyle.Short, value: session.image }] },
    thumbnail:  { id: `ebm_thumbnail_${userId}`,  title: 'Set Thumbnail',   fields: [{ id: 'val', label: 'Thumbnail URL', style: TextInputStyle.Short, value: session.thumbnail }] },
    addfield:   {
      id: `ebm_addfield_${userId}`, title: 'Add Field',
      fields: [
        { id: 'field_name',   label: 'Field name',       style: TextInputStyle.Short,     value: null },
        { id: 'field_value',  label: 'Field value',      style: TextInputStyle.Paragraph, value: null },
        { id: 'field_inline', label: 'Inline? (yes/no)', style: TextInputStyle.Short,     value: 'no' },
      ]
    },
  };

  const def = modalDefs[action];
  if (!def) return interaction.reply({ content: '❌ Unknown action.', ephemeral: true });

  const modal = new ModalBuilder().setCustomId(def.id).setTitle(def.title);
  for (const f of def.fields) {
    const ti = new TextInputBuilder().setCustomId(f.id).setLabel(f.label).setStyle(f.style).setRequired(false);
    if (f.value) ti.setValue(String(f.value));
    modal.addComponents(new ActionRowBuilder().addComponents(ti));
  }
  return interaction.showModal(modal);
}

// ─────────────────────────────────────────────────────────────
// EMBED BUILDER — MODAL HANDLER
// ─────────────────────────────────────────────────────────────
async function handleEmbedBuilderModal(interaction) {
  // customId format: ebm_action_userId
  const withoutPrefix = interaction.customId.slice(4); // remove "ebm_"
  const underscoreIdx = withoutPrefix.indexOf('_');
  const action = withoutPrefix.slice(0, underscoreIdx);
  const userId = withoutPrefix.slice(underscoreIdx + 1);

  if (interaction.user.id !== userId) {
    return interaction.reply({ content: '❌ Not your embed builder.', ephemeral: true });
  }

  const session = sessionEmbed(userId);

  if (action === 'savename') {
    const name = interaction.fields.getTextInputValue('save_name');
    config = loadConfig();
    if (!config.savedEmbeds) config.savedEmbeds = {};
    config.savedEmbeds[name] = JSON.parse(JSON.stringify(session));
    saveConfig(config);
    delete embedSessions[userId];
    return interaction.update({ content: `✅ Embed saved as **${name}**!`, embeds: [], components: [] });
  }

  if (action === 'addfield') {
    const name = interaction.fields.getTextInputValue('field_name');
    const value = interaction.fields.getTextInputValue('field_value');
    const inlineStr = (interaction.fields.getTextInputValue('field_inline') || 'no').toLowerCase();
    const inline = inlineStr === 'yes' || inlineStr === 'y' || inlineStr === 'true';
    if (name && value) {
      if (session.fields.length >= 25) {
        return interaction.reply({ content: '❌ Maximum 25 fields allowed.', ephemeral: true });
      }
      session.fields.push({ name, value, inline });
    }
  } else {
    const val = interaction.fields.getTextInputValue('val') || null;
    if (action === 'title') session.title = val;
    else if (action === 'description') session.description = val;
    else if (action === 'color') {
      if (val) { try { session.color = parseInt(val.replace('#', ''), 16); } catch(e) { session.color = 0xf5a623; } }
    }
    else if (action === 'author') session.author = val;
    else if (action === 'authoricon') session.authorIcon = val;
    else if (action === 'footer') session.footer = val;
    else if (action === 'footericon') session.footerIcon = val;
    else if (action === 'image') session.image = val;
    else if (action === 'thumbnail') session.thumbnail = val;
  }

  const built = buildEmbedFromSession(session);
  try {
    await interaction.update({
      content: '🛠️ **Embed Builder** — click the buttons below to build your embed',
      embeds: [built],
      components: embedBuilderRows(userId)
    });
  } catch(e) {
    await interaction.reply({ content: '✅ Updated!', ephemeral: true });
  }
}

// ─────────────────────────────────────────────────────────────
// HELP — SECTION DISPLAY
// ─────────────────────────────────────────────────────────────
async function showHelpSection(interaction, section) {
  const P = config.prefix;

  if (section === 'back') {
    return interaction.update({ embeds: [buildHelpMenuEmbed()], components: buildHelpMenuRows() });
  }

  const sections = {
    tickets: {
      emoji: '🎫', name: 'Tickets', color: 0x5865f2,
      commands: [
        { name: `${P}panel / /panel`, desc: 'Send the ticket panel in this channel' },
        { name: `${P}close / /close`, desc: 'Close the current ticket channel' },
        { name: `${P}claim / /claim`, desc: 'Claim a ticket as your own (MM role)' },
        { name: `${P}unclaim / /unclaim`, desc: 'Unclaim a ticket (MM role)' },
        { name: `${P}transcript / /transcript`, desc: 'Generate a .txt transcript of the ticket' },
        { name: `${P}add @user / /add`, desc: 'Add a user to this ticket' },
        { name: `${P}remove @user / /remove`, desc: 'Remove a user from this ticket' },
        { name: `${P}rename <name> / /rename`, desc: 'Rename this ticket channel' },
        { name: `${P}transfer @staff / /transfer`, desc: 'Transfer ticket to another staff member' },
      ],
    },
    middleman: {
      emoji: '🤝', name: 'Middleman', color: 0xf5a623,
      commands: [
        { name: `${P}mminfo / /mminfo`, desc: 'Show how the middleman service works' },
        { name: `${P}mmfee / /mmfee`, desc: 'Show fee options with interactive buttons' },
        { name: `${P}confirm / /confirm`, desc: 'Confirm your side of the trade' },
        { name: `${P}vouch @user / /vouch`, desc: 'Give a vouch to a user' },
        { name: `${P}vouches [@user] / /vouches`, desc: 'View vouches for yourself or another user' },
        { name: `${P}setvouches @user <n>`, desc: 'Manually set vouch count (Manage Server)' },
        { name: `${P}vacation <dur> / /vacation`, desc: 'Start a vacation — roles saved & restored after' },
        { name: `${P}vacationcancel / vc`, desc: 'End your vacation early and restore roles' },
      ],
    },
    nay: {
      emoji: '🎁', name: 'Nay / Offer System', color: 0xff6b9d,
      commands: [
        { name: `${P}nay @user / /nay`, desc: 'Send the offer message to a user with Accept/Decline buttons' },
        { name: `${P}setrole @role`, desc: 'Set the minimum role required to use $nay' },
        { name: `${P}setnayrole @role`, desc: 'Set the role given when a user accepts' },
        { name: `${P}setnaymessage <msg>`, desc: 'Set the offer message content (one-time lock)' },
        { name: `${P}resetnaymessage`, desc: 'Reset the offer message so it can be changed again' },
      ],
    },
    welcome: {
      emoji: '👋', name: 'Welcome System', color: 0x57f287,
      commands: [
        { name: `${P}setwelcomechannel #ch`, desc: 'Set where welcome messages are sent' },
        { name: `${P}setruleschannel #ch`, desc: 'Set the rules channel linked in welcome messages' },
        { name: `${P}setmmrequestchannel #ch`, desc: 'Set the MM request channel linked in welcome messages' },
        { name: `${P}setwelcometitle <text>`, desc: 'Set the embed title for welcome messages' },
        { name: `${P}setwelcomemessage <text>`, desc: 'Set body text — use {user} for member mention' },
        { name: `${P}togglewelcome`, desc: 'Enable or disable the welcome system' },
        { name: `${P}welcomeconfig`, desc: 'View all current welcome settings' },
        { name: `${P}testwelcome`, desc: 'Send a test welcome message as yourself' },
      ],
    },
    moderation: {
      emoji: '🔨', name: 'Moderation', color: 0xed4245,
      commands: [
        { name: `${P}ban @user [reason]`, desc: 'Permanently ban a user from the server' },
        { name: `${P}kick @user [reason]`, desc: 'Kick a user from the server' },
        { name: `${P}mute @user <dur> [reason]`, desc: 'Timeout a user (e.g. 10m, 1h, 1d — max 28d)' },
        { name: `${P}unmute @user`, desc: 'Remove a timeout from a user' },
        { name: `${P}warn @user [reason]`, desc: 'Issue a warning to a user' },
        { name: `${P}warnings @user`, desc: 'View all warnings for a user' },
        { name: `${P}clearwarnings @user`, desc: 'Clear all warnings for a user' },
        { name: `${P}purge <1-100>`, desc: 'Bulk-delete messages in this channel' },
        { name: `${P}lock`, desc: 'Lock this channel — prevents @everyone from sending' },
        { name: `${P}unlock`, desc: 'Unlock this channel' },
        { name: `${P}slowmode <seconds>`, desc: 'Set slowmode (0 to disable, max 21600)' },
      ],
    },
    fun: {
      emoji: '🎉', name: 'Fun & Utility', color: 0x57f287,
      commands: [
        { name: `${P}giveaway <dur> <prize>`, desc: 'Start a giveaway with 🎉 reaction entry' },
        { name: `${P}poll <question>`, desc: 'Create a yes/no poll with reaction voting' },
        { name: `${P}announce [title] <msg>`, desc: 'Post a formatted announcement embed' },
        { name: `${P}embed / /embed`, desc: 'Open the interactive embed builder' },
        { name: `${P}role @user @role`, desc: 'Toggle a role on a user (add or remove)' },
        { name: `${P}nickname @user [name]`, desc: "Set or reset a user's nickname" },
        { name: `${P}fill`, desc: 'Give yourself all roles below your highest role' },
        { name: `${P}afk [reason]`, desc: 'Mark yourself as AFK with an optional reason' },
      ],
    },
    info: {
      emoji: '🛠️', name: 'Info & Stats', color: 0x00b0f4,
      commands: [
        { name: `${P}serverinfo`, desc: 'View server details, owner, member count, channels' },
        { name: `${P}userinfo [@user] / whois`, desc: "View a user's account info, roles, join date" },
        { name: `${P}avatar [@user] / av / pfp`, desc: "Get a user's full-size avatar" },
        { name: `${P}banner [@user]`, desc: "Get a user's profile banner" },
        { name: `${P}membercount`, desc: "Show the server's total member count" },
        { name: `${P}ping`, desc: "Show the bot's WebSocket latency" },
        { name: `${P}uptime`, desc: 'Show how long the bot has been online' },
        { name: `${P}botinfo`, desc: 'Show info about this bot (servers, ping)' },
      ],
    },
    setup: {
      emoji: '⚙️', name: 'Setup & Config', color: 0x9b59b6,
      commands: [
        { name: `${P}setmmrole @role`, desc: 'Set the Middleman staff role (Admin only)' },
        { name: `${P}setcategory #category`, desc: 'Set the category where ticket channels are created' },
        { name: `${P}setprefix <char>`, desc: 'Change the bot prefix (default: $)' },
        { name: `${P}setpicture [attachment]`, desc: 'Set a global image on all panels and nay messages' },
      ],
    },
  };

  const s = sections[section];
  if (!s) return interaction.reply({ content: '❌ Unknown section.', ephemeral: true });

  const embed = new EmbedBuilder()
    .setColor(s.color)
    .setTitle(`${s.emoji} ${s.name} Commands`)
    .setDescription(s.commands.map(c => `\`${c.name}\`\n↳ ${c.desc}`).join('\n\n'))
    .setFooter({ text: `All commands also work as /slash-commands • Prefix: ${P}` });

  const backRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('help_back').setLabel('← Back to Menu').setStyle(ButtonStyle.Secondary)
  );

  return interaction.update({ embeds: [embed], components: [backRow] });
}

function buildHelpMenuEmbed() {
  return new EmbedBuilder()
    .setColor(0xf5a623)
    .setTitle('📖 Help Menu')
    .setDescription('Click a button below to view commands for that section.')
    .addFields(
      { name: '🎫 Tickets', value: 'Ticket creation, management & transcripts', inline: true },
      { name: '🤝 Middleman', value: 'MM service, vouches & vacation', inline: true },
      { name: '🎁 Nay System', value: 'Offer system with Accept/Decline', inline: true },
      { name: '👋 Welcome', value: 'Auto-welcome on member join', inline: true },
      { name: '🔨 Moderation', value: 'Ban, kick, mute, warn & more', inline: true },
      { name: '🎉 Fun & Utility', value: 'Giveaways, polls, embeds & more', inline: true },
      { name: '🛠️ Info', value: 'Server, user & bot information', inline: true },
      { name: '⚙️ Setup', value: 'Configure the bot for your server', inline: true },
    )
    .setFooter({ text: 'Select a category below to see detailed commands' });
}

function buildHelpMenuRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_tickets').setLabel('🎫 Tickets').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help_middleman').setLabel('🤝 Middleman').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help_nay').setLabel('🎁 Nay System').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help_welcome').setLabel('👋 Welcome').setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_moderation').setLabel('🔨 Moderation').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('help_fun').setLabel('🎉 Fun & Utility').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('help_info').setLabel('🛠️ Info').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help_setup').setLabel('⚙️ Setup').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

// ─────────────────────────────────────────────────────────────
// COMMANDS
// ─────────────────────────────────────────────────────────────
async function runHelp(ctx) {
  await reply(ctx, { embeds: [buildHelpMenuEmbed()], components: buildHelpMenuRows() });
}

async function runEmbed(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.' });
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  embedSessions[userId] = {
    title: null, description: null, color: 0xf5a623,
    author: null, authorIcon: null, footer: null, footerIcon: null,
    image: null, thumbnail: null, fields: [],
  };
  const previewEmbed = new EmbedBuilder().setColor(0xf5a623).setTitle('New Embed').setDescription('Click the buttons below to customize this embed.');
  await reply(ctx, {
    content: '🛠️ **Embed Builder** — click the buttons below to build your embed',
    embeds: [previewEmbed],
    components: embedBuilderRows(userId),
  });
}

async function runPanel(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.', ephemeral: true });
  config = loadConfig();
  const embed = new EmbedBuilder().setColor(0xf5a623).setTitle('🤝 Middleman Service').setDescription('Open a ticket to request a middleman for your trade.\nSelect the type of trade below to get started.');
  if (config.panelImageUrl) embed.setImage(config.panelImageUrl);
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('ticket_type').setPlaceholder('Select an option...').addOptions([
      { label: 'Ingame Trading', description: 'Trading inside a game (e.g. Roblox)', value: 'ingame', emoji: '🤝' },
      { label: 'PayPal/Cashapp/Crypto trades', description: 'Cross trading via external payments', value: 'payment', emoji: '💳' },
    ])
  );
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const sentMsg = await channel.send({ embeds: [embed], components: [row] });
  config.panelMessages.push({ channelId: channel.id, messageId: sentMsg.id });
  saveConfig(config);
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Panel sent!', ephemeral: true });
  else await ctx.message.reply('✅ Panel sent!');
}

async function runSetMMRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.' });
  config.mmRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Middleman role set to **${role.name}**`)] });
}

async function runSetCategory(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.' });
  const cat = ctx.isSlash ? ctx.getChannelOption('category') : ctx.message.mentions.channels.first();
  if (!cat) return reply(ctx, { content: '❌ Please mention a category.' });
  config.ticketCategoryId = cat.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Ticket category set to **${cat.name}**`)] });
}

async function runSetPrefix(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.' });
  const p = ctx.isSlash ? ctx.getOption('prefix') : ctx.args[0];
  if (!p) return reply(ctx, { content: '❌ Please provide a prefix.' });
  config.prefix = p; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Prefix changed to \`${p}\``)] });
}

async function runSetPicture(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  let imageUrl = ctx.isSlash ? ctx.interaction.options.getAttachment('image')?.url : ctx.message.attachments.first()?.url;
  if (!imageUrl) return reply(ctx, { content: '❌ Please attach an image.' });
  config = loadConfig();
  config.panelImageUrl = imageUrl;
  let updated = 0;
  const validPanels = [], validNay = [];
  for (const panel of [...config.panelMessages]) {
    try {
      const ch = await ctx.guild.channels.fetch(panel.channelId).catch(() => null);
      if (!ch) continue;
      const msg = await ch.messages.fetch(panel.messageId).catch(() => null);
      if (!msg) continue;
      await msg.edit({ embeds: [EmbedBuilder.from(msg.embeds[0]).setImage(imageUrl)], components: msg.components });
      updated++; validPanels.push(panel);
    } catch (e) {}
  }
  for (const panel of [...config.nayMessages]) {
    try {
      const ch = await ctx.guild.channels.fetch(panel.channelId).catch(() => null);
      if (!ch) continue;
      const msg = await ch.messages.fetch(panel.messageId).catch(() => null);
      if (!msg) continue;
      await msg.edit({ embeds: [EmbedBuilder.from(msg.embeds[0]).setImage(imageUrl)], components: msg.components });
      updated++; validNay.push(panel);
    } catch (e) {}
  }
  config.panelMessages = validPanels;
  config.nayMessages = validNay;
  saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Image updated on **${updated}** message(s).`)] });
}

// Welcome
async function runSetWelcomeChannel(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  const ch = ctx.isSlash ? ctx.getChannelOption('channel') : ctx.message.mentions.channels.first();
  if (!ch) return reply(ctx, { content: '❌ Please mention a channel.' });
  config.welcomeChannelId = ch.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Welcome channel set to <#${ch.id}>`)] });
}
async function runSetRulesChannel(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  const ch = ctx.isSlash ? ctx.getChannelOption('channel') : ctx.message.mentions.channels.first();
  if (!ch) return reply(ctx, { content: '❌ Please mention a channel.' });
  config.rulesChannelId = ch.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Rules channel set to <#${ch.id}>`)] });
}
async function runSetMMRequestChannel(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  const ch = ctx.isSlash ? ctx.getChannelOption('channel') : ctx.message.mentions.channels.first();
  if (!ch) return reply(ctx, { content: '❌ Please mention a channel.' });
  config.mmRequestChannelId = ch.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ MM request channel set to <#${ch.id}>`)] });
}
async function runSetWelcomeTitle(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  const title = ctx.isSlash ? ctx.getOption('title') : ctx.args.join(' ');
  if (!title) return reply(ctx, { content: '❌ Please provide a title.' });
  config.welcomeTitle = title; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Welcome title set to: **${title}**`)] });
}
async function runSetWelcomeMessageCmd(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  const msg = ctx.isSlash ? ctx.getOption('message') : ctx.args.join(' ');
  if (!msg) return reply(ctx, { content: '❌ Please provide a message. Use `{user}` to mention the new member.' });
  config.welcomeMessage = msg; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ Welcome Message Updated').setDescription(msg).setFooter({ text: '{user} will be replaced with the member mention' })] });
}
async function runToggleWelcome(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  config.welcomeEnabled = !config.welcomeEnabled; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(config.welcomeEnabled ? 0x57f287 : 0xed4245).setDescription(config.welcomeEnabled ? '✅ Welcome messages **enabled**.' : '❌ Welcome messages **disabled**.')] });
}
async function runWelcomeConfig(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.' });
  config = loadConfig();
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('👋 Welcome Configuration')
    .addFields(
      { name: 'Status', value: config.welcomeEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
      { name: 'Welcome Channel', value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'Not set', inline: true },
      { name: 'Rules Channel', value: config.rulesChannelId ? `<#${config.rulesChannelId}>` : 'Not set', inline: true },
      { name: 'MM Request Channel', value: config.mmRequestChannelId ? `<#${config.mmRequestChannelId}>` : 'Not set', inline: true },
      { name: 'Welcome Title', value: config.welcomeTitle || 'Not set' },
      { name: 'Welcome Message', value: config.welcomeMessage || 'Not set' },
    );
  await reply(ctx, { embeds: [embed] });
}
async function runTestWelcome(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.' });
  config = loadConfig();
  if (!config.welcomeChannelId) return reply(ctx, { content: '❌ No welcome channel set. Use `$setwelcomechannel #channel` first.' });
  const channel = ctx.guild.channels.cache.get(config.welcomeChannelId);
  if (!channel) return reply(ctx, { content: '❌ Welcome channel not found.' });
  const member = ctx.isSlash ? ctx.interaction.member : ctx.member;
  await sendWelcomeMessage(channel, member);
  if (ctx.isSlash) await ctx.interaction.reply({ content: `✅ Test welcome sent to <#${config.welcomeChannelId}>`, ephemeral: true });
  else await ctx.message.reply(`✅ Test welcome sent to <#${config.welcomeChannelId}>`);
}

// Nay
async function runSetRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.' });
  config.nayTriggerRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Nay trigger role set to **${role.name}**.`)] });
}
async function runSetNayRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.' });
  config.nayAcceptRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Accept role set to **${role.name}**.`)] });
}
async function runSetNayMessage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  config = loadConfig();
  if (config.nayMessage) return reply(ctx, { content: '❌ Offer message already set. Use `$resetnaymessage` to reset it first.' });
  const msg = ctx.isSlash ? ctx.getOption('message') : ctx.args.join(' ');
  if (!msg) return reply(ctx, { content: '❌ Please provide a message.' });
  config.nayMessage = msg; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ Offer Message Set').setDescription(msg).setFooter({ text: 'Use $resetnaymessage to change it' })] });
}
async function runResetNayMessage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.' });
  config = loadConfig();
  if (!config.nayMessage) return reply(ctx, { content: '❌ No offer message is set.' });
  delete config.nayMessage; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription('✅ Offer message reset. Set a new one with `$setnaymessage`.')] });
}
async function runNay(ctx) {
  config = loadConfig();
  let hasAccess = hasAdmin(ctx);
  if (!hasAccess && config.nayTriggerRoleId) {
    const triggerRole = ctx.guild.roles.cache.get(config.nayTriggerRoleId);
    if (triggerRole) hasAccess = ctx.member.roles.highest.position >= triggerRole.position;
  }
  if (!hasAccess) return reply(ctx, { content: '❌ You do not have permission to use this command.' });
  if (!config.nayMessage) return reply(ctx, { content: '❌ No offer message set. Use `$setnaymessage` first.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (target.user.bot) return reply(ctx, { content: '❌ Cannot send to a bot.' });
  const embed = new EmbedBuilder().setColor(0xf5a623).setDescription(config.nayMessage).setThumbnail(target.user.displayAvatarURL());
  if (config.panelImageUrl) embed.setImage(config.panelImageUrl);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`nay_accept_${target.id}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`nay_decline_${target.id}`).setLabel('❌ Decline').setStyle(ButtonStyle.Danger),
  );
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const sentMsg = await channel.send({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
  config.nayMessages.push({ channelId: channel.id, messageId: sentMsg.id });
  saveConfig(config);
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Offer sent!', ephemeral: true });
  else await ctx.message.reply('✅ Offer sent!');
}

// Tickets
async function runClose(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (!channel.name.startsWith('ticket-')) return reply(ctx, { content: '❌ This command can only be used inside a ticket channel.' });
  await reply(ctx, { content: '🔒 Closing ticket in 5 seconds...' });
  setTimeout(() => channel.delete().catch(() => {}), 5000);
}
async function runClaim(ctx) {
  const hasMmRole = config.mmRoleId && ctx.member.roles.cache.has(config.mmRoleId);
  if (!hasMmRole && !hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need the Middleman role to claim a ticket.' });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Ticket claimed by **${ctx.member.user.tag}**`)] });
}
async function runUnclaim(ctx) {
  const hasMmRole = config.mmRoleId && ctx.member.roles.cache.has(config.mmRoleId);
  if (!hasMmRole && !hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need the Middleman role to unclaim a ticket.' });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`🔓 Ticket unclaimed by **${ctx.member.user.tag}**`)] });
}
async function runTranscript(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.deferReply();
  const messages = await channel.messages.fetch({ limit: 100 });
  const lines = messages.reverse().map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}`);
  const file = new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf8'), { name: `transcript-${channel.name}.txt` });
  await reply(ctx, { content: '📄 Transcript generated:', files: [file] });
}
async function runAdd(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  await channel.permissionOverwrites.create(target, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Added **${target.user.tag}** to this ticket.`)] });
}
async function runRemove(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  await channel.permissionOverwrites.delete(target);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`✅ Removed **${target.user.tag}** from this ticket.`)] });
}
async function runRename(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const newName = ctx.isSlash ? ctx.getOption('name') : ctx.args.join('-');
  if (!newName) return reply(ctx, { content: '❌ Please provide a name.' });
  await channel.setName(newName);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Channel renamed to **${newName}**`)] });
}
async function runTransfer(ctx) {
  const hasMmRole = config.mmRoleId && ctx.member.roles.cache.has(config.mmRoleId);
  if (!hasMmRole && !hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need the Middleman role to transfer a ticket.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a staff member.' });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`🔁 Ticket transferred to **${target.user.tag}**`)] });
}

// MM
async function runMmInfo(ctx) {
  const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('🛡️ Middleman Service').setDescription(
    'A Middleman (MM) is a trusted staff member.\n• MMs ensure safe trades between users.\n\n**How it works:**\n• Seller gives item to MM\n• Buyer pays seller (after MM confirms)\n• MM gives item to buyer\n\n📋 **Notes:**\n• Both traders must agree first.\n• Troll tickets = punishment.'
  );
  await reply(ctx, { embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_understand').setLabel('I Understand').setStyle(ButtonStyle.Success))] });
}
async function runMmFee(ctx) {
  const embed = new EmbedBuilder().setColor(0xf5a623).setTitle('🔒 Middleman Fee').setDescription(
    '🔒 **MM Service Fee**\nAgree on how the fee is covered:\n• **Split (50/50)** — Both parties pay half\n• **Full (100%)** — One party pays all\n\n⚠️ Once selected, this cannot be reversed.'
  );
  await reply(ctx, { embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fee_split').setLabel('Split (50/50)').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('fee_full').setLabel('Full (100%)').setStyle(ButtonStyle.Primary))] });
}
async function runConfirm(ctx) {
  const user = ctx.isSlash ? ctx.interaction.user : ctx.message.author;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ Trade Confirmed').setDescription(`**${user.tag}** has confirmed the trade.\nBoth parties must confirm before the MM releases anything.`)] });
}

// Vouches
async function runVouch(ctx) {
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  const author = ctx.isSlash ? ctx.interaction.user : ctx.message.author;
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (target.id === author.id) return reply(ctx, { content: '❌ You cannot vouch for yourself.' });
  if (!config.vouchData[target.id]) config.vouchData[target.id] = 0;
  config.vouchData[target.id]++;
  saveConfig(config);
  const count = config.vouchData[target.id];
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('✅ Vouch Added').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 User', value: `<@${target.id}>`, inline: true }, { name: '⭐ Total Vouches', value: `**${count}**`, inline: true }, { name: '✍️ Vouched by', value: `<@${author.id}>`, inline: true })] });
}
async function runVouches(ctx) {
  const target = ctx.isSlash ? (ctx.getUserOption('user') || ctx.interaction.user) : (ctx.message.mentions.users.first() || ctx.message.author);
  const count = config.vouchData?.[target.id] || 0;
  const stars = '⭐'.repeat(Math.min(count, 10));
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0xf5a623).setTitle(`📋 Vouches — ${target.username}`).setThumbnail(target.displayAvatarURL()).addFields({ name: '⭐ Vouches', value: `**${count}**`, inline: true }, { name: 'Rating', value: stars || 'No vouches yet', inline: true })] });
}
async function runSetVouches(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.' });
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  const count = ctx.isSlash ? ctx.getOption('count') : parseInt(ctx.args[1]);
  if (!target || isNaN(count)) return reply(ctx, { content: '❌ Usage: `setvouches @user <number>`' });
  config.vouchData[target.id] = count; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Set **${target.tag}**'s vouches to **${count}**.`)] });
}

// Vacation
async function runVacation(ctx) {
  const dur = ctx.isSlash ? ctx.getOption('duration') : ctx.args[0];
  const ms = parseDuration(dur);
  if (!ms) return reply(ctx, { content: '❌ Valid durations: `1m`, `2h`, `3d`, `1w`' });
  const member = ctx.member;
  const savedRoles = member.roles.cache.filter(r => r.id !== ctx.guild.id).map(r => r.id);
  config.vacationData[member.id] = { roles: savedRoles, active: true }; saveConfig(config);
  try { await member.roles.set([ctx.guild.id]); } catch (e) { return reply(ctx, { content: '⚠️ Could not remove roles.' }); }
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x00b0f4).setTitle('🏖️ Vacation Started').setDescription(`Vacation started for **${dur}**! Your roles will be restored when you return.`)] });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  setTimeout(async () => {
    config = loadConfig();
    if (config.vacationData?.[member.id]?.active) await restoreRoles(ctx.guild, member.id, channel);
  }, ms);
}
async function runVacationCancel(ctx) {
  config = loadConfig();
  if (!config.vacationData?.[ctx.member.id]?.active) return reply(ctx, { content: '❌ You are not on vacation.' });
  await reply(ctx, { content: '✅ Ending vacation...' });
  await restoreRoles(ctx.guild, ctx.member.id, ctx.isSlash ? ctx.interaction.channel : ctx.channel);
}
async function restoreRoles(guild, userId, channel) {
  config = loadConfig();
  const data = config.vacationData?.[userId];
  if (!data) return;
  data.active = false;
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member) { try { await member.roles.set(data.roles); } catch (e) {} }
  delete config.vacationData[userId]; saveConfig(config);
  await channel.send({ embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ <@${userId}> your vacation ended and your roles have been restored!`)] });
}

// Moderation
async function runBan(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return reply(ctx, { content: '❌ You need **Ban Members** permission.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const reason = ctx.isSlash ? (ctx.getOption('reason') || 'No reason provided') : (ctx.args.slice(1).join(' ') || 'No reason provided');
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (!target.bannable) return reply(ctx, { content: '❌ I cannot ban this user.' });
  await target.ban({ reason });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0xed4245).setTitle('🔨 User Banned').setThumbnail(target.user.displayAvatarURL()).addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '📋 Reason', value: reason, inline: true }, { name: '🛡️ Moderator', value: ctx.isSlash ? ctx.interaction.user.tag : ctx.message.author.tag, inline: true })] });
}
async function runKick(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return reply(ctx, { content: '❌ You need **Kick Members** permission.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const reason = ctx.isSlash ? (ctx.getOption('reason') || 'No reason provided') : (ctx.args.slice(1).join(' ') || 'No reason provided');
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (!target.kickable) return reply(ctx, { content: '❌ I cannot kick this user.' });
  await target.kick(reason);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0xff7700).setTitle('👢 User Kicked').setThumbnail(target.user.displayAvatarURL()).addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '📋 Reason', value: reason, inline: true }, { name: '🛡️ Moderator', value: ctx.isSlash ? ctx.interaction.user.tag : ctx.message.author.tag, inline: true })] });
}
async function runMute(ctx) {
  if (!hasModPerms(ctx)) return reply(ctx, { content: '❌ You need **Moderate Members** permission.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const durStr = ctx.isSlash ? ctx.getOption('duration') : ctx.args[1];
  const reason = ctx.isSlash ? (ctx.getOption('reason') || 'No reason provided') : (ctx.args.slice(2).join(' ') || 'No reason provided');
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  const ms = parseDuration(durStr);
  if (!ms) return reply(ctx, { content: '❌ Invalid duration. Example: `10m`, `1h`, `1d`' });
  if (ms > 2419200000) return reply(ctx, { content: '❌ Max timeout is 28 days.' });
  await target.timeout(ms, reason);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('🔇 User Timed Out').setThumbnail(target.user.displayAvatarURL()).addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '⏱️ Duration', value: formatDuration(ms), inline: true }, { name: '📋 Reason', value: reason, inline: true })] });
}
async function runUnmute(ctx) {
  if (!hasModPerms(ctx)) return reply(ctx, { content: '❌ You need **Moderate Members** permission.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  await target.timeout(null);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Timeout removed from **${target.user.tag}**`)] });
}
async function runWarn(ctx) {
  if (!hasModPerms(ctx)) return reply(ctx, { content: '❌ You need **Moderate Members** permission.' });
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  const reason = ctx.isSlash ? (ctx.getOption('reason') || 'No reason provided') : (ctx.args.slice(1).join(' ') || 'No reason provided');
  const mod = ctx.isSlash ? ctx.interaction.user : ctx.message.author;
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (!config.warnData[target.id]) config.warnData[target.id] = [];
  config.warnData[target.id].push({ reason, mod: mod.tag, date: new Date().toISOString() });
  saveConfig(config);
  const count = config.warnData[target.id].length;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0xffa500).setTitle('⚠️ User Warned').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 User', value: target.tag, inline: true }, { name: '⚠️ Total Warnings', value: `${count}`, inline: true }, { name: '📋 Reason', value: reason }, { name: '🛡️ Moderator', value: mod.tag, inline: true })] });
}
async function runWarnings(ctx) {
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  const warns = config.warnData?.[target.id] || [];
  const embed = new EmbedBuilder().setColor(0xffa500).setTitle(`⚠️ Warnings — ${target.username}`).setThumbnail(target.displayAvatarURL());
  if (warns.length === 0) embed.setDescription('No warnings.');
  else embed.setDescription(warns.map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.mod}`).join('\n'));
  await reply(ctx, { embeds: [embed] });
}
async function runClearWarnings(ctx) {
  if (!hasModPerms(ctx)) return reply(ctx, { content: '❌ You need **Moderate Members** permission.' });
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  config.warnData[target.id] = []; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Cleared all warnings for **${target.tag}**`)] });
}
async function runPurge(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return reply(ctx, { content: '❌ You need **Manage Messages** permission.' });
  const amount = ctx.isSlash ? ctx.getOption('amount') : parseInt(ctx.args[0]);
  if (!amount || amount < 1 || amount > 100) return reply(ctx, { content: '❌ Amount must be between 1 and 100.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.reply({ content: '🗑️ Purging...', ephemeral: true });
  const deleted = await channel.bulkDelete(amount, true).catch(() => null);
  const count = deleted?.size || 0;
  await channel.send({ embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`🗑️ Deleted **${count}** message(s).`)] });
}
async function runLock(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return reply(ctx, { content: '❌ You need **Manage Channels** permission.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.permissionOverwrites.edit(ctx.guild.id, { SendMessages: false });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`🔒 **${channel.name}** has been locked.`)] });
}
async function runUnlock(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return reply(ctx, { content: '❌ You need **Manage Channels** permission.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.permissionOverwrites.edit(ctx.guild.id, { SendMessages: null });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`🔓 **${channel.name}** has been unlocked.`)] });
}
async function runSlowmode(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return reply(ctx, { content: '❌ You need **Manage Channels** permission.' });
  const seconds = ctx.isSlash ? ctx.getOption('seconds') : parseInt(ctx.args[0]);
  if (isNaN(seconds) || seconds < 0 || seconds > 21600) return reply(ctx, { content: '❌ Seconds must be between 0 and 21600.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.setRateLimitPerUser(seconds);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x00b0f4).setDescription(seconds === 0 ? `✅ Slowmode disabled in **${channel.name}**` : `✅ Slowmode set to **${seconds}s** in **${channel.name}**`)] });
}

// Fun & Utility
async function runAnnounce(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.' });
  const msg = ctx.isSlash ? ctx.getOption('message') : ctx.args.join(' ');
  const title = ctx.isSlash ? (ctx.getOption('title') || '📢 Announcement') : '📢 Announcement';
  if (!msg) return reply(ctx, { content: '❌ Please provide a message.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Announcement sent!', ephemeral: true });
  await channel.send({ embeds: [new EmbedBuilder().setColor(0xf5a623).setTitle(title).setDescription(msg).setTimestamp()] });
}
async function runPoll(ctx) {
  const question = ctx.isSlash ? ctx.getOption('question') : ctx.args.join(' ');
  if (!question) return reply(ctx, { content: '❌ Please provide a question.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Poll created!', ephemeral: true });
  const pollMsg = await channel.send({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('📊 Poll').setDescription(`**${question}**\n\n✅ Yes\n❌ No`).setFooter({ text: 'React to vote!' }).setTimestamp()] });
  await pollMsg.react('✅');
  await pollMsg.react('❌');
}
async function runGiveaway(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.' });
  const durStr = ctx.isSlash ? ctx.getOption('duration') : ctx.args[0];
  const prize = ctx.isSlash ? ctx.getOption('prize') : ctx.args.slice(1).join(' ');
  const winnerCount = ctx.isSlash ? (ctx.getOption('winners') || 1) : 1;
  if (!durStr || !prize) return reply(ctx, { content: '❌ Usage: `$giveaway <duration> <prize>`' });
  const ms = parseDuration(durStr);
  if (!ms) return reply(ctx, { content: '❌ Invalid duration. Example: `10m`, `1h`, `1d`' });
  const endsAt = Date.now() + ms;
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.reply({ content: '🎉 Giveaway started!', ephemeral: true });
  const gMsg = await channel.send({ embeds: [new EmbedBuilder().setColor(0xf5a623).setTitle('🎉 GIVEAWAY 🎉').setDescription(`**Prize:** ${prize}\n**Winners:** ${winnerCount}\n**Ends:** <t:${Math.floor(endsAt / 1000)}:R>\n\nReact with 🎉 to enter!`).setTimestamp(endsAt)] });
  await gMsg.react('🎉');
  setTimeout(async () => {
    const fetched = await gMsg.fetch().catch(() => null);
    if (!fetched) return;
    const reactions = fetched.reactions.cache.get('🎉');
    const users = await reactions?.users.fetch();
    const eligible = users?.filter(u => !u.bot).map(u => u);
    if (!eligible || eligible.length === 0) {
      return gMsg.edit({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle('🎉 GIVEAWAY ENDED').setDescription(`**Prize:** ${prize}\n\nNo valid entries. No winner.`)] });
    }
    const winners = [];
    const pool = [...eligible.values()];
    for (let i = 0; i < Math.min(winnerCount, pool.length); i++) {
      const idx = Math.floor(Math.random() * pool.length);
      winners.push(pool.splice(idx, 1)[0]);
    }
    const winnerStr = winners.map(w => `<@${w.id}>`).join(', ');
    await gMsg.edit({ embeds: [new EmbedBuilder().setColor(0x57f287).setTitle('🎉 GIVEAWAY ENDED').setDescription(`**Prize:** ${prize}\n**Winner(s):** ${winnerStr}\n\nCongratulations!`)] });
    await channel.send({ content: `🎉 Congratulations ${winnerStr}! You won **${prize}**!` });
  }, ms);
}
async function runRole(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return reply(ctx, { content: '❌ You need **Manage Roles** permission.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!target || !role) return reply(ctx, { content: '❌ Please mention a user and a role.' });
  if (target.roles.cache.has(role.id)) {
    await target.roles.remove(role);
    await reply(ctx, { embeds: [new EmbedBuilder().setColor(0xed4245).setDescription(`✅ Removed **${role.name}** from **${target.user.tag}**`)] });
  } else {
    await target.roles.add(role);
    await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`✅ Gave **${role.name}** to **${target.user.tag}**`)] });
  }
}

// Info
async function runServerInfo(ctx) {
  const g = ctx.guild;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`📊 ${g.name}`).setThumbnail(g.iconURL()).addFields({ name: 'Owner', value: `<@${g.ownerId}>`, inline: true }, { name: 'Members', value: `${g.memberCount}`, inline: true }, { name: 'Roles', value: `${g.roles.cache.size}`, inline: true }, { name: 'Channels', value: `${g.channels.cache.size}`, inline: true }, { name: 'Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:F>` })] });
}
async function runUserInfo(ctx) {
  const member = ctx.isSlash ? (ctx.getMemberOption('user') || ctx.member) : (ctx.message.mentions.members.first() || ctx.member);
  const user = member.user;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`👤 ${user.tag}`).setThumbnail(user.displayAvatarURL()).addFields({ name: 'ID', value: user.id, inline: true }, { name: 'Nickname', value: member.nickname || 'None', inline: true }, { name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` }, { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` }, { name: 'Roles', value: member.roles.cache.filter(r => r.id !== ctx.guild.id).map(r => r.toString()).join(', ') || 'None' })] });
}
async function runAvatar(ctx) {
  const user = ctx.isSlash ? (ctx.getUserOption('user') || ctx.interaction.user) : (ctx.message.mentions.users.first() || ctx.message.author);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🖼️ ${user.tag}'s Avatar`).setImage(user.displayAvatarURL({ size: 1024 }))] });
}
async function runBanner(ctx) {
  const user = ctx.isSlash ? (ctx.getUserOption('user') || ctx.interaction.user) : (ctx.message.mentions.users.first() || ctx.message.author);
  const fetched = await user.fetch();
  if (!fetched.banner) return reply(ctx, { content: `❌ **${user.tag}** has no banner.` });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`🖼️ ${user.tag}'s Banner`).setImage(fetched.bannerURL({ size: 1024 }))] });
}
async function runMemberCount(ctx) {
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`👥 **${ctx.guild.memberCount}** members in this server.`)] });
}
async function runPing(ctx) {
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`🏓 Pong! Latency: **${client.ws.ping}ms**`)] });
}
async function runUptime(ctx) {
  const u = process.uptime();
  const h = Math.floor(u / 3600), m = Math.floor((u % 3600) / 60), s = Math.floor(u % 60);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`⏱️ Uptime: **${h}h ${m}m ${s}s**`)] });
}
async function runBotInfo(ctx) {
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('🤖 Bot Info').addFields({ name: 'Name', value: client.user.tag, inline: true }, { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true }, { name: 'Ping', value: `${client.ws.ping}ms`, inline: true })] });
}
async function runAfk(ctx) {
  const reason = ctx.isSlash ? (ctx.getOption('reason') || 'AFK') : (ctx.args.join(' ') || 'AFK');
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`💤 You are now AFK: **${reason}**`)] });
}
async function runNickname(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) return reply(ctx, { content: '❌ You need **Manage Nicknames** permission.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  const name = ctx.isSlash ? (ctx.getOption('name') || null) : (ctx.args.slice(1).join(' ') || null);
  await target.setNickname(name);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(name ? `✅ Nickname set to **${name}** for ${target.user.tag}` : `✅ Nickname reset for ${target.user.tag}`)] });
}
async function runFill(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return reply(ctx, { content: '❌ You need **Manage Roles** permission.' });
  const botMember = ctx.guild.members.cache.get(client.user.id);
  const botHighest = botMember.roles.highest;
  const userHighest = ctx.member.roles.highest;
  const assignable = ctx.guild.roles.cache.filter(r => r.id !== ctx.guild.id && r.position < userHighest.position && r.position < botHighest.position && !r.managed);
  if (assignable.size === 0) return reply(ctx, { content: '❌ No assignable roles below your highest role.' });
  const missing = assignable.filter(r => !ctx.member.roles.cache.has(r.id));
  if (missing.size === 0) return reply(ctx, { content: '✅ You already have all roles below your highest role!' });
  if (ctx.isSlash) await ctx.interaction.reply({ content: `⏳ Adding **${missing.size}** role(s)...` });
  else var statusMsg = await ctx.message.reply(`⏳ Adding **${missing.size}** role(s)...`);
  const added = [], failed = [];
  for (const [, role] of missing) {
    try { await ctx.member.roles.add(role); added.push(role.name); await new Promise(r => setTimeout(r, 300)); }
    catch (e) { failed.push(role.name); }
  }
  const embed = new EmbedBuilder().setColor(added.length > 0 ? 0x57f287 : 0xed4245).setTitle('⚡ Fill Complete').addFields({ name: `✅ Added (${added.length})`, value: added.length ? added.map(r => `• ${r}`).join('\n') : 'None', inline: true }, { name: `❌ Failed (${failed.length})`, value: failed.length ? failed.map(r => `• ${r}`).join('\n') : 'None', inline: true }).setFooter({ text: `Roles below ${userHighest.name}` });
  if (ctx.isSlash) await ctx.interaction.editReply({ content: '', embeds: [embed] });
  else await statusMsg.edit({ content: '', embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// TICKET CREATION
// ─────────────────────────────────────────────────────────────
async function createTicket(interaction) {
  config = loadConfig();
  const guild = interaction.guild;
  const user = interaction.user;
  const isIngame = interaction.customId === 'modal_ingame';
  const tradingWith = interaction.fields.getTextInputValue('trading_with');
  const tradeDetails = interaction.fields.getTextInputValue('trade_details');

  let tradingWithMember = null;
  const mentionMatch = tradingWith.match(/^<@!?(\d+)>$/);
  if (mentionMatch) tradingWithMember = await guild.members.fetch(mentionMatch[1]).catch(() => null);
  else tradingWithMember = guild.members.cache.find(m => m.user.username.toLowerCase() === tradingWith.toLowerCase() || m.displayName.toLowerCase() === tradingWith.toLowerCase()) || null;

  const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}-${Date.now().toString().slice(-4)}`;
  let ticketChannel;
  try {
    const overwrites = [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory] },
    ];
    if (config.mmRoleId) overwrites.push({ id: config.mmRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
    if (tradingWithMember) overwrites.push({ id: tradingWithMember.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
    const opts = { name: channelName, type: ChannelType.GuildText, permissionOverwrites: overwrites };
    if (config.ticketCategoryId) opts.parent = config.ticketCategoryId;
    ticketChannel = await guild.channels.create(opts);
  } catch (e) {
    return interaction.editReply({ content: '❌ Could not create ticket channel. Check my **Manage Channels** permission.' });
  }

  const typeLabel = isIngame ? '🎮 Ingame Trading' : '💳 PayPal/Cashapp/Crypto';
  const embed = new EmbedBuilder().setColor(0xf5a623).setTitle(`🎫 Middleman Ticket — ${typeLabel}`).addFields(
    { name: '👤 Opened by', value: `<@${user.id}>`, inline: true },
    { name: '🤝 Trading with', value: tradingWithMember ? `<@${tradingWithMember.id}>` : `\`${tradingWith}\``, inline: true },
    { name: '📋 Trade details', value: tradeDetails },
  );
  if (isIngame) {
    embed.addFields(
      { name: '🔗 Join links?', value: interaction.fields.getTextInputValue('join_links'), inline: true },
      { name: '🎮 Roblox usernames', value: interaction.fields.getTextInputValue('roblox_users') || 'N/A', inline: true },
    );
  } else {
    embed.addFields({ name: '💸 Payment method', value: interaction.fields.getTextInputValue('payment_method'), inline: true });
  }
  embed.setFooter({ text: 'A middleman will claim this ticket shortly.' });

  const mmEmbed = new EmbedBuilder().setColor(0x57f287).setTitle('🛡️ Middleman Service').setDescription(
    'A Middleman (MM) is a trusted staff member.\n• MMs ensure safe trades between users.\n\n**Process:**\n• Seller gives item to MM\n• Buyer pays seller (after MM confirms)\n• MM gives item to buyer\n\n📋 **Notes:**\n• Both traders must agree before opening a ticket.\n• Troll tickets will result in punishment.'
  );

  const rows = [
    new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger)),
    new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('mm_understand').setLabel('I Understand').setStyle(ButtonStyle.Success)),
  ];

  let ping = `<@${user.id}>`;
  if (tradingWithMember) ping += ` <@${tradingWithMember.id}>`;
  if (config.mmRoleId) ping += ` <@&${config.mmRoleId}> — new ticket needs a middleman!`;

  await ticketChannel.send({ content: ping, embeds: [embed, mmEmbed], components: rows });
  await interaction.editReply({ content: `✅ Ticket created: ${ticketChannel}` });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
async function reply(ctx, options) {
  if (ctx.isSlash) {
    if (ctx.interaction.deferred || ctx.interaction.replied) return ctx.interaction.editReply(options);
    return ctx.interaction.reply(options);
  }
  return ctx.message.reply(options);
}
function parseDuration(str) {
  const match = str?.match(/^(\d+)(s|m|h|d|w)$/);
  if (!match) return null;
  const n = parseInt(match[1]);
  const map = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };
  return n * map[match[2]];
}
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function hasAdmin(ctx) { return ctx.member.permissions.has(PermissionsBitField.Flags.Administrator); }
function hasManageGuild(ctx) { return ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild); }
function hasModPerms(ctx) { return ctx.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) || ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild); }

// ─────────────────────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN);
