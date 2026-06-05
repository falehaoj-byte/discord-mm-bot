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
      prefix: '$', mmRoleId: null, ticketCategoryId: null,
      supportCategoryId: null, aiCategoryId: null,
      vouchData: {}, vacationData: {},
      panelMessages: [], yukicMessages: [], warnData: {}, giveaways: [],
      yukicMessage: null, yukicTriggerRoleId: null, yukicAcceptRoleId: null,
      panelImageUrl: null,
      tpanelImageUrl: null, spanelImageUrl: null, apanelImageUrl: null,
      ticketImageUrl: null, supportTicketImageUrl: null, aiTicketImageUrl: null,
      tpanelTitle: 'Middleman Service',
      tpanelDescription: null,
      spanelTitle: 'Support Ticket',
      spanelDescription: null,
      apanelTitle: 'AI Middleman',
      apanelDescription: null,
      ticketTitle: 'Ticket Opened',
      supportTicketTitle: 'Support Ticket',
      aiTicketTitle: 'AI Middleman Ticket',
      welcomeChannelId: null, welcomeEnabled: false,
      welcomeTitle: 'Welcome to the server!',
      welcomeMessage: 'We hope you enjoy your stay.',
      rulesChannelId: null, mmRequestChannelId: null,
      savedEmbeds: {},
      yukicCommandName: 'yukic',
      autoRoleId: null,
      backups: {},
      gamblingData: {},
      transcriptChannelId: null,
      supportRoleId: null,
      panelText: 'Roblox Values',
      tpanelEmbedIds: [], spanelEmbedIds: [], apanelEmbedIds: [],
      helpRoleId: null,
      aiSystemPrompt: null,
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(d, null, 2));
    return d;
  }
  const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE));
  // migrations
  if (cfg.nayMessages && !cfg.yukicMessages) { cfg.yukicMessages = cfg.nayMessages; delete cfg.nayMessages; }
  if (cfg.nayMessage !== undefined && cfg.yukicMessage === undefined) { cfg.yukicMessage = cfg.nayMessage; delete cfg.nayMessage; }
  if (cfg.nayTriggerRoleId !== undefined && cfg.yukicTriggerRoleId === undefined) { cfg.yukicTriggerRoleId = cfg.nayTriggerRoleId; delete cfg.nayTriggerRoleId; }
  if (cfg.nayAcceptRoleId !== undefined && cfg.yukicAcceptRoleId === undefined) { cfg.yukicAcceptRoleId = cfg.nayAcceptRoleId; delete cfg.nayAcceptRoleId; }
  if (cfg.nayCommandName !== undefined && cfg.yukicCommandName === undefined) { cfg.yukicCommandName = cfg.nayCommandName; delete cfg.nayCommandName; }
  const defaults = {
    panelMessages: [], yukicMessages: [], warnData: {}, giveaways: [],
    vouchData: {}, vacationData: {}, savedEmbeds: {}, backups: {},
    gamblingData: {}, tpanelEmbedIds: [], spanelEmbedIds: [], apanelEmbedIds: [],
    yukicMessage: null, yukicTriggerRoleId: null, yukicAcceptRoleId: null,
    welcomeChannelId: null, welcomeEnabled: false,
    welcomeTitle: 'Welcome to the server!', welcomeMessage: 'We hope you enjoy your stay.',
    rulesChannelId: null, mmRequestChannelId: null,
    yukicCommandName: 'yukic', autoRoleId: null,
    transcriptChannelId: null, supportRoleId: null,
    panelText: 'Roblox Values',
    tpanelImageUrl: null, spanelImageUrl: null, apanelImageUrl: null,
    ticketImageUrl: null, supportTicketImageUrl: null, aiTicketImageUrl: null,
    tpanelTitle: 'Middleman Service', tpanelDescription: null,
    spanelTitle: 'Support Ticket', spanelDescription: null,
    apanelTitle: 'AI Middleman', apanelDescription: null,
    ticketTitle: 'Ticket Opened', supportTicketTitle: 'Support Ticket',
    aiTicketTitle: 'AI Middleman Ticket',
    helpRoleId: null, aiSystemPrompt: null,
    supportCategoryId: null, aiCategoryId: null,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (cfg[k] === undefined || cfg[k] === null && v !== null) {
      if (cfg[k] === undefined) cfg[k] = v;
    }
  }
  // image fallbacks
  if (!cfg.tpanelImageUrl) cfg.tpanelImageUrl = cfg.panelImageUrl || null;
  if (!cfg.spanelImageUrl) cfg.spanelImageUrl = cfg.panelImageUrl || null;
  if (!cfg.apanelImageUrl) cfg.apanelImageUrl = cfg.panelImageUrl || null;
  if (!cfg.ticketImageUrl) cfg.ticketImageUrl = cfg.panelImageUrl || null;
  if (!cfg.supportTicketImageUrl) cfg.supportTicketImageUrl = cfg.panelImageUrl || null;
  if (!cfg.aiTicketImageUrl) cfg.aiTicketImageUrl = cfg.panelImageUrl || null;
  return cfg;
}
function saveConfig(cfg) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); }
let config = loadConfig();

// ─────────────────────────────────────────────────────────────
// COLORS & UTILS
// ─────────────────────────────────────────────────────────────
const COLORS = {
  orange: 0xf5a623, green: 0x57f287, red: 0xed4245,
  blue: 0x5865f2, cyan: 0x00b0f4, purple: 0x9b59b6,
  yellow: 0xffa500, pink: 0xff6b9d, gold: 0xFFD700,
  dark: 0x2f3136, ai: 0x00c8ff,
};

function getBalance(userId) {
  config = loadConfig();
  if (!config.gamblingData[userId]) config.gamblingData[userId] = 500;
  return config.gamblingData[userId];
}
function setBalance(userId, amount) {
  config = loadConfig();
  config.gamblingData[userId] = Math.max(0, Math.round(amount));
  saveConfig(config);
  return config.gamblingData[userId];
}
function addBalance(userId, amount) { return setBalance(userId, getBalance(userId) + amount); }

// ─────────────────────────────────────────────────────────────
// ANTHROPIC AI HELPER
// ─────────────────────────────────────────────────────────────
async function callAI(messages, systemPrompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        messages,
      }),
    });
    const data = await res.json();
    return data?.content?.[0]?.text || null;
  } catch (e) {
    console.error('AI call failed:', e);
    return null;
  }
}

// Store per-channel AI conversation history
const aiTicketHistory = new Map();

// ─────────────────────────────────────────────────────────────
// EMBED BUILDER SESSION STORE
// ─────────────────────────────────────────────────────────────
const embedSessions = {};
function sessionEmbed(userId) {
  if (!embedSessions[userId]) {
    embedSessions[userId] = { title: null, description: null, color: COLORS.orange, author: null, authorIcon: null, footer: null, footerIcon: null, image: null, thumbnail: null, fields: [] };
  }
  return embedSessions[userId];
}
function buildEmbedFromSession(session) {
  const e = new EmbedBuilder().setColor(session.color || COLORS.orange);
  if (session.title) e.setTitle(session.title);
  if (session.description) e.setDescription(session.description);
  if (session.author) e.setAuthor({ name: session.author, iconURL: session.authorIcon || undefined });
  if (session.footer) e.setFooter({ text: session.footer, iconURL: session.footerIcon || undefined });
  if (session.image) e.setImage(session.image);
  if (session.thumbnail) e.setThumbnail(session.thumbnail);
  if (session.fields && session.fields.length > 0) e.addFields(session.fields);
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
  new SlashCommandBuilder().setName('tpanel').setDescription('Send the trading/middleman ticket panel'),
  new SlashCommandBuilder().setName('spanel').setDescription('Send the support ticket panel'),
  new SlashCommandBuilder().setName('aipanel').setDescription('Send the AI Middleman panel'),
  new SlashCommandBuilder().setName('panel').setDescription('Send the trading ticket panel (alias)'),
  new SlashCommandBuilder().setName('setmmrole').setDescription('Set the middleman role').addRoleOption(o => o.setName('role').setDescription('MM role').setRequired(true)),
  new SlashCommandBuilder().setName('setcategory').setDescription('Set trading ticket category').addChannelOption(o => o.setName('category').setDescription('Category').setRequired(true)),
  new SlashCommandBuilder().setName('setsupportcategory').setDescription('Set support ticket category').addChannelOption(o => o.setName('category').setDescription('Category').setRequired(true)),
  new SlashCommandBuilder().setName('setaicategory').setDescription('Set AI ticket category').addChannelOption(o => o.setName('category').setDescription('Category').setRequired(true)),
  new SlashCommandBuilder().setName('settranscriptchannel').setDescription('Set channel for ticket transcripts').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
  new SlashCommandBuilder().setName('setsupportrole').setDescription('Set the role pinged for support tickets').addRoleOption(o => o.setName('role').setDescription('Support role').setRequired(true)),
  new SlashCommandBuilder().setName('setprefix').setDescription('Change the bot prefix').addStringOption(o => o.setName('prefix').setDescription('New prefix').setRequired(true)),
  new SlashCommandBuilder().setName('settradingpanelimage').setDescription('Set image on the trading panel embed').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setsupportpanelimage').setDescription('Set image on the support panel embed').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setaipanelimage').setDescription('Set image on the AI panel embed').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setticketimage').setDescription('Set image inside trading ticket channels').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setsupportticketimage').setDescription('Set image inside support ticket channels').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setpicture').setDescription('Set image on ALL panels and tickets at once').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('settpanetitle').setDescription('Set the trading panel title').addStringOption(o => o.setName('title').setDescription('New title').setRequired(true)),
  new SlashCommandBuilder().setName('settpaneldesc').setDescription('Set the trading panel description').addStringOption(o => o.setName('description').setDescription('New description').setRequired(true)),
  new SlashCommandBuilder().setName('setspanetitle').setDescription('Set the support panel title').addStringOption(o => o.setName('title').setDescription('New title').setRequired(true)),
  new SlashCommandBuilder().setName('setspaneldesc').setDescription('Set the support panel description').addStringOption(o => o.setName('description').setDescription('New description').setRequired(true)),
  new SlashCommandBuilder().setName('setaipaneltitle').setDescription('Set the AI panel title').addStringOption(o => o.setName('title').setDescription('New title').setRequired(true)),
  new SlashCommandBuilder().setName('setaipaneldesc').setDescription('Set the AI panel description').addStringOption(o => o.setName('description').setDescription('New description').setRequired(true)),
  new SlashCommandBuilder().setName('settickettitle').setDescription('Set the trading ticket embed title').addStringOption(o => o.setName('title').setDescription('New title').setRequired(true)),
  new SlashCommandBuilder().setName('setsupporttickettitle').setDescription('Set the support ticket embed title').addStringOption(o => o.setName('title').setDescription('New title').setRequired(true)),
  new SlashCommandBuilder().setName('setaisystemprompt').setDescription('Set a custom system prompt for the AI middleman').addStringOption(o => o.setName('prompt').setDescription('System prompt').setRequired(true)),
  new SlashCommandBuilder().setName('panelconfig').setDescription('View current panel configuration'),
  new SlashCommandBuilder().setName('renamep').setDescription('Rename panel text everywhere').addStringOption(o => o.setName('text').setDescription('New text').setRequired(true)),
  new SlashCommandBuilder().setName('panelembeds').setDescription('Manage embeds attached to panels'),
  new SlashCommandBuilder().setName('setrole').setDescription('Set minimum role to use the yukic command').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('setyukicrole').setDescription('Set role given on Accept').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('setyukicmessage').setDescription('Set offer message').addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)),
  new SlashCommandBuilder().setName('resetyukicmessage').setDescription('Reset offer message'),
  new SlashCommandBuilder().setName('setyukicname').setDescription('Rename the offer command').addStringOption(o => o.setName('name').setDescription('New command name').setRequired(true)),
  new SlashCommandBuilder().setName('yukic').setDescription('Send offer to a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('sethelprole').setDescription('Set the role required to use $help').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('embeds').setDescription('Manage your saved embeds and panels'),
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
  new SlashCommandBuilder().setName('giveaway').setDescription('Start a giveaway').addStringOption(o => o.setName('duration').setDescription('e.g. 10m 1h 1d').setRequired(true)).addStringOption(o => o.setName('prize').setDescription('Prize').setRequired(true)).addIntegerOption(o => o.setName('winners').setDescription('Number of winners')),
  new SlashCommandBuilder().setName('role').setDescription('Give or remove a role').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
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
  new SlashCommandBuilder().setName('setwelcomechannel').setDescription('Set welcome channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
  new SlashCommandBuilder().setName('setruleschannel').setDescription('Set rules channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
  new SlashCommandBuilder().setName('setmmrequestchannel').setDescription('Set MM request channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
  new SlashCommandBuilder().setName('setwelcometitle').setDescription('Set welcome embed title').addStringOption(o => o.setName('title').setDescription('Title').setRequired(true)),
  new SlashCommandBuilder().setName('setwelcomemessage').setDescription('Set welcome body ({user} for mention)').addStringOption(o => o.setName('message').setDescription('Message').setRequired(true)),
  new SlashCommandBuilder().setName('togglewelcome').setDescription('Enable/disable welcome messages'),
  new SlashCommandBuilder().setName('welcomeconfig').setDescription('View welcome config'),
  new SlashCommandBuilder().setName('testwelcome').setDescription('Send a test welcome'),
  new SlashCommandBuilder().setName('setautorole').setDescription('Set auto-role on join').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('removeautorole').setDescription('Disable auto-role'),
  new SlashCommandBuilder().setName('backup').setDescription('Backup server config').addStringOption(o => o.setName('name').setDescription('Backup name').setRequired(true)),
  new SlashCommandBuilder().setName('restore').setDescription('Restore a backup').addStringOption(o => o.setName('name').setDescription('Backup name').setRequired(true)),
  new SlashCommandBuilder().setName('backuplist').setDescription('List all backups'),
  new SlashCommandBuilder().setName('backupdelete').setDescription('Delete a backup').addStringOption(o => o.setName('name').setDescription('Backup name').setRequired(true)),
  new SlashCommandBuilder().setName('balance').setDescription('Check your coin balance').addUserOption(o => o.setName('user').setDescription('User')),
  new SlashCommandBuilder().setName('gamble').setDescription('Gamble your coins').addIntegerOption(o => o.setName('amount').setDescription('Amount to gamble').setRequired(true)),
  new SlashCommandBuilder().setName('flip').setDescription('Flip a coin').addIntegerOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)).addStringOption(o => o.setName('side').setDescription('heads or tails').setRequired(true)),
  new SlashCommandBuilder().setName('slots').setDescription('Play the slot machine').addIntegerOption(o => o.setName('amount').setDescription('Amount to bet').setRequired(true)),
  new SlashCommandBuilder().setName('rob').setDescription('Try to rob someone').addUserOption(o => o.setName('user').setDescription('User to rob').setRequired(true)),
  new SlashCommandBuilder().setName('daily').setDescription('Claim your daily coins'),
  new SlashCommandBuilder().setName('leaderboard').setDescription('Show the richest users'),
  new SlashCommandBuilder().setName('setcoins').setDescription('Set a user\'s coins (Admin)').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addIntegerOption(o => o.setName('amount').setDescription('Amount').setRequired(true)),
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
// AFK TRACKING
// ─────────────────────────────────────────────────────────────
const afkUsers = new Map();

// ─────────────────────────────────────────────────────────────
// AUTO ROLE ON JOIN
// ─────────────────────────────────────────────────────────────
client.on('guildMemberAdd', async (member) => {
  config = loadConfig();
  if (config.autoRoleId) {
    const role = member.guild.roles.cache.get(config.autoRoleId);
    if (role) { try { await member.roles.add(role); } catch (e) { console.error('Auto-role failed:', e); } }
  }
  if (!config.welcomeEnabled || !config.welcomeChannelId) return;
  const channel = member.guild.channels.cache.get(config.welcomeChannelId);
  if (!channel) return;
  await sendWelcomeMessage(channel, member);
});

async function sendWelcomeMessage(channel, member) {
  config = loadConfig();
  const rulesLine = config.rulesChannelId ? `📜 **Check the rules:** <#${config.rulesChannelId}>` : '';
  const mmLine = config.mmRequestChannelId ? `🤝 **Request a Middleman:** <#${config.mmRequestChannelId}>` : '';
  const bodyParts = [config.welcomeMessage.replace(/{user}/g, `<@${member.id}>`), '', rulesLine, mmLine].filter(Boolean);
  const embed = new EmbedBuilder()
    .setColor(COLORS.orange).setTitle(config.welcomeTitle)
    .setDescription(bodyParts.join('\n').trim())
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: `Member #${member.guild.memberCount}` }).setTimestamp();
  if (config.panelImageUrl) embed.setImage(config.panelImageUrl);
  await channel.send({ content: `👋 Welcome <@${member.id}>!`, embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// MESSAGE CREATE
// ─────────────────────────────────────────────────────────────
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  config = loadConfig();
  const PREFIX = config.prefix;

  // AFK handling
  if (afkUsers.has(message.author.id)) {
    afkUsers.delete(message.author.id);
    const m = await message.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Welcome back <@${message.author.id}>! Your AFK has been removed.`)] });
    setTimeout(() => m.delete().catch(() => {}), 5000);
  }
  for (const [userId, afkData] of afkUsers) {
    if (message.mentions.users.has(userId)) {
      message.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.yellow).setDescription(`💤 <@${userId}> is AFK: **${afkData.reason}** (${formatTimeAgo(afkData.time)})`)] });
    }
  }

  // ── AI Middleman ticket — respond to messages ──
  if (message.channel.name && message.channel.name.startsWith('ai-ticket-')) {
    const history = aiTicketHistory.get(message.channel.id) || [];
    history.push({ role: 'user', content: `${message.author.username}: ${message.content}` });
    if (history.length > 20) history.splice(0, history.length - 20);
    aiTicketHistory.set(message.channel.id, history);

    const systemPrompt = config.aiSystemPrompt || getDefaultAISystemPrompt();
    const aiReply = await callAI(history, systemPrompt);
    if (aiReply) {
      const embed = new EmbedBuilder()
        .setColor(COLORS.ai)
        .setDescription(aiReply)
        .setFooter({ text: '🤖 AI Middleman • Roblox Values' });
      await message.channel.send({ embeds: [embed] });
      history.push({ role: 'assistant', content: aiReply });
      aiTicketHistory.set(message.channel.id, history);
    }
    return;
  }

  // yukic auto-trigger in ticket channels
  if (message.channel.name && message.channel.name.startsWith('ticket-')) {
    const mentioned = message.mentions.members.first();
    if (mentioned && !mentioned.user.bot && message.content.trim().match(/^<@!?\d+>$/) && mentioned.id !== message.author.id) {
      config = loadConfig();
      if (config.yukicMessage) {
        const hasAccess = hasAdmin({ member: message.member }) ||
          (config.yukicTriggerRoleId && message.member.roles.highest.position >= (message.guild.roles.cache.get(config.yukicTriggerRoleId)?.position || 999));
        if (hasAccess) {
          const embed = new EmbedBuilder().setColor(COLORS.orange).setDescription(config.yukicMessage).setThumbnail(mentioned.user.displayAvatarURL());
          if (config.panelImageUrl) embed.setImage(config.panelImageUrl);
          const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`yukic_accept_${mentioned.id}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`yukic_decline_${mentioned.id}`).setLabel('❌ Decline').setStyle(ButtonStyle.Danger),
          );
          await message.channel.send({ content: `<@${mentioned.id}>`, embeds: [embed], components: [row] });
          return;
        }
      }
    }
  }

  if (!message.content.startsWith(PREFIX)) return;
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift().toLowerCase();
  const ctx = { message, args, guild: message.guild, member: message.member, channel: message.channel, isSlash: false };
  const yukicName = (config.yukicCommandName || 'yukic').toLowerCase();

  const cmds = {
    help: runHelp, tpanel: runTPanel, spanel: runSPanel, aipanel: runAIPanel, panel: runTPanel,
    setmmrole: runSetMMRole, setcategory: runSetCategory,
    setsupportcategory: runSetSupportCategory, setaicategory: runSetAICategory,
    settranscriptchannel: runSetTranscriptChannel,
    setsupportrole: runSetSupportRole, setprefix: runSetPrefix,
    settradingpanelimage: runSetTradingPanelImage,
    setsupportpanelimage: runSetSupportPanelImage,
    setaipanelimage: runSetAIPanelImage,
    setticketimage: runSetTicketImage,
    setsupportticketimage: runSetSupportTicketImage,
    setpicture: runSetPicture,
    settpanetitle: runSetTPaneTitle, settpaneldesc: runSetTPaneDesc,
    setspanetitle: runSetSPaneTitle, setspaneldesc: runSetSPaneDesc,
    setaipaneltitle: runSetAIPanelTitle, setaipaneldesc: runSetAIPanelDesc,
    settickettitle: runSetTicketTitle, setsupporttickettitle: runSetSupportTicketTitle,
    setaisystemprompt: runSetAISystemPrompt,
    panelconfig: runPanelConfig, renamep: runRenamePanel,
    setrole: runSetRole, setyukicrole: runSetYukicRole,
    setyukicmessage: runSetYukicMessage, resetyukicmessage: runResetYukicMessage,
    setyukicname: runSetYukicName, sethelprole: runSetHelpRole,
    [yukicName]: runYukic, yukic: runYukic,
    embeds: runEmbeds,
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
    setautorole: runSetAutoRole, removeautorole: runRemoveAutoRole,
    backup: runBackup, restore: runRestore, backuplist: runBackupList, backupdelete: runBackupDelete,
    balance: runBalance, bal: runBalance,
    gamble: runGamble, bet: runGamble,
    flip: runFlip, slots: runSlots, rob: runRob, daily: runDaily,
    leaderboard: runLeaderboard, lb: runLeaderboard,
    setcoins: runSetCoins,
  };
  if (cmds[command]) cmds[command](ctx);
});

// ─────────────────────────────────────────────────────────────
// INTERACTION HANDLER
// ─────────────────────────────────────────────────────────────
client.on('interactionCreate', async (interaction) => {
  config = loadConfig();

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
      help: runHelp, tpanel: runTPanel, spanel: runSPanel, aipanel: runAIPanel, panel: runTPanel,
      setmmrole: runSetMMRole, setcategory: runSetCategory,
      setsupportcategory: runSetSupportCategory, setaicategory: runSetAICategory,
      settranscriptchannel: runSetTranscriptChannel,
      setsupportrole: runSetSupportRole, setprefix: runSetPrefix,
      settradingpanelimage: runSetTradingPanelImage,
      setsupportpanelimage: runSetSupportPanelImage,
      setaipanelimage: runSetAIPanelImage,
      setticketimage: runSetTicketImage,
      setsupportticketimage: runSetSupportTicketImage,
      setpicture: runSetPicture,
      settpanetitle: runSetTPaneTitle, settpaneldesc: runSetTPaneDesc,
      setspanetitle: runSetSPaneTitle, setspaneldesc: runSetSPaneDesc,
      setaipaneltitle: runSetAIPanelTitle, setaipaneldesc: runSetAIPanelDesc,
      settickettitle: runSetTicketTitle, setsupporttickettitle: runSetSupportTicketTitle,
      setaisystemprompt: runSetAISystemPrompt,
      panelconfig: runPanelConfig, renamep: runRenamePanel, panelembeds: runPanelEmbeds,
      setrole: runSetRole, setyukicrole: runSetYukicRole,
      setyukicmessage: runSetYukicMessage, resetyukicmessage: runResetYukicMessage,
      setyukicname: runSetYukicName, sethelprole: runSetHelpRole,
      yukic: runYukic, embeds: runEmbeds,
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
      setautorole: runSetAutoRole, removeautorole: runRemoveAutoRole,
      backup: runBackup, restore: runRestore, backuplist: runBackupList, backupdelete: runBackupDelete,
      balance: runBalance, gamble: runGamble, flip: runFlip,
      slots: runSlots, rob: runRob, daily: runDaily, leaderboard: runLeaderboard, setcoins: runSetCoins,
    };
    if (cmds[interaction.commandName]) cmds[interaction.commandName](ctx);
    return;
  }

  // ── AI Panel button ──
  if (interaction.isButton() && interaction.customId === 'open_ai_ticket') {
    await interaction.deferReply({ ephemeral: true });
    return createAITicket(interaction);
  }

  // ── Trading ticket type select ──
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type_trading') {
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

  // ── Support ticket type select ──
  if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_type_support') {
    const type = interaction.values[0];
    const labelMap = { staff_app: 'Staff Application', report: 'Report', general: 'General Assistance' };
    await interaction.deferReply({ ephemeral: true });
    return createSupportTicket(interaction, type, labelMap[type] || type);
  }

  // ── Saved embeds select menu ──
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('embeds_select_')) {
    const userId = interaction.customId.replace('embeds_select_', '');
    if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your menu.', ephemeral: true });
    const name = interaction.values[0];
    embedSessions[`pick_${userId}`] = name;
    return interaction.update(buildEmbedsMenuPayload(userId, name));
  }

  if (interaction.isStringSelectMenu() && interaction.customId.startsWith('panel_embeds_select_')) {
    const userId = interaction.customId.replace('panel_embeds_select_', '');
    if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your menu.', ephemeral: true });
    const name = interaction.values[0];
    embedSessions[`panel_pick_${userId}`] = name;
    return interaction.update({ content: `📌 Selected embed: **${name}**\nChoose a panel to attach it to:`, components: panelEmbedActionRows(userId, name) });
  }

  if (interaction.isButton() && interaction.customId.startsWith('panel_attach_')) {
    const parts = interaction.customId.replace('panel_attach_', '').split('_');
    const panelType = parts[0];
    const userId = parts[1];
    if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your menu.', ephemeral: true });
    const embedName = embedSessions[`panel_pick_${userId}`];
    if (!embedName) return interaction.reply({ content: '❌ Please select an embed first.', ephemeral: true });
    config = loadConfig();
    if (panelType === 'tpanel') { if (!config.tpanelEmbedIds.includes(embedName)) config.tpanelEmbedIds.push(embedName); }
    else if (panelType === 'spanel') { if (!config.spanelEmbedIds.includes(embedName)) config.spanelEmbedIds.push(embedName); }
    else if (panelType === 'apanel') { if (!config.apanelEmbedIds.includes(embedName)) config.apanelEmbedIds.push(embedName); }
    saveConfig(config);
    delete embedSessions[`panel_pick_${userId}`];
    const labels = { tpanel: 'Trading Panel', spanel: 'Support Panel', apanel: 'AI Panel' };
    return interaction.update({ content: `✅ Embed **${embedName}** attached to **${labels[panelType] || panelType}**!`, embeds: [], components: [] });
  }

  if (interaction.isButton() && interaction.customId.startsWith('panel_detach_')) {
    const parts = interaction.customId.replace('panel_detach_', '').split('_');
    const panelType = parts[0];
    const userId = parts[1];
    if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your menu.', ephemeral: true });
    const embedName = embedSessions[`panel_pick_${userId}`];
    if (!embedName) return interaction.reply({ content: '❌ Please select an embed first.', ephemeral: true });
    config = loadConfig();
    if (panelType === 'tpanel') config.tpanelEmbedIds = config.tpanelEmbedIds.filter(id => id !== embedName);
    else if (panelType === 'spanel') config.spanelEmbedIds = config.spanelEmbedIds.filter(id => id !== embedName);
    else if (panelType === 'apanel') config.apanelEmbedIds = config.apanelEmbedIds.filter(id => id !== embedName);
    saveConfig(config);
    delete embedSessions[`panel_pick_${userId}`];
    const labels = { tpanel: 'Trading Panel', spanel: 'Support Panel', apanel: 'AI Panel' };
    return interaction.update({ content: `✅ Embed **${embedName}** detached from **${labels[panelType] || panelType}**!`, embeds: [], components: [] });
  }

  if (interaction.isButton() && interaction.customId.startsWith('help_')) {
    return showHelpSection(interaction, interaction.customId.replace('help_', ''));
  }
  if (interaction.isButton() && interaction.customId.startsWith('eb_')) {
    return handleEmbedBuilderButton(interaction);
  }
  if (interaction.isModalSubmit() && interaction.customId.startsWith('ebm_')) {
    return handleEmbedBuilderModal(interaction);
  }
  if (interaction.isButton() && interaction.customId.startsWith('emb_')) {
    return handleEmbedsAction(interaction);
  }
  if (interaction.isModalSubmit() && (interaction.customId === 'modal_ingame' || interaction.customId === 'modal_payment')) {
    await interaction.deferReply({ ephemeral: true });
    return createTradingTicket(interaction);
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'claim_ticket') {
      config = loadConfig();
      const hasMmRole = config.mmRoleId && interaction.member.roles.cache.has(config.mmRoleId);
      if (!hasMmRole && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        return interaction.reply({ content: '❌ You need the Middleman role to claim this ticket.', ephemeral: true });
      }
      const claimRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`unclaim_ticket_${interaction.user.id}`).setLabel(`🔓 Unclaim (${interaction.user.username})`).setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
      );
      const embed = new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Ticket Claimed')
        .setDescription(`This ticket has been claimed by <@${interaction.user.id}>.\nThey will assist you shortly.`)
        .setThumbnail(interaction.user.displayAvatarURL()).setTimestamp();
      await interaction.update({ components: [claimRow] });
      return interaction.channel.send({ embeds: [embed] });
    }

    if (interaction.customId.startsWith('unclaim_ticket_')) {
      config = loadConfig();
      const claimerId = interaction.customId.replace('unclaim_ticket_', '');
      const hasMmRole = config.mmRoleId && interaction.member.roles.cache.has(config.mmRoleId);
      const isClaimerOrAdmin = interaction.user.id === claimerId || interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild);
      if (!hasMmRole && !isClaimerOrAdmin) return interaction.reply({ content: '❌ Only the claimer or a manager can unclaim.', ephemeral: true });
      const unclaimRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim_ticket').setLabel('✅ Claim').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
      );
      const embed = new EmbedBuilder().setColor(COLORS.yellow).setDescription(`🔓 Ticket unclaimed by <@${interaction.user.id}>. Available to claim.`).setTimestamp();
      await interaction.update({ components: [unclaimRow] });
      return interaction.channel.send({ embeds: [embed] });
    }

    if (interaction.customId === 'close_ticket_btn' || interaction.customId === 'close_ticket') {
      const ch = interaction.channel;
      if (!ch.name.startsWith('ticket-') && !ch.name.startsWith('ai-ticket-')) return;
      const hasMmRole = config.mmRoleId && interaction.member.roles.cache.has(config.mmRoleId);
      if (!hasMmRole && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
        const canClose = ch.permissionOverwrites.cache.has(interaction.user.id);
        if (!canClose) return interaction.reply({ content: '❌ You cannot close this ticket.', ephemeral: true });
      }
      aiTicketHistory.delete(ch.id);
      await interaction.reply({ content: '📄 Saving transcript and closing in 5 seconds...', ephemeral: false });
      await saveTranscript(ch, interaction.guild);
      return setTimeout(() => ch.delete().catch(() => {}), 5000);
    }

    if (interaction.customId === 'fee_split') return interaction.reply({ content: '✅ **Split (50/50)** selected.', ephemeral: true });
    if (interaction.customId === 'fee_full') return interaction.reply({ content: '✅ **Full (100%)** selected.', ephemeral: true });

    if (interaction.customId.startsWith('yukic_accept_')) {
      const userId = interaction.customId.replace('yukic_accept_', '');
      if (interaction.user.id !== userId) return interaction.reply({ content: '❌ This offer is not for you.', ephemeral: true });
      config = loadConfig();
      const roleId = config.yukicAcceptRoleId;
      if (!roleId) return interaction.reply({ content: '❌ No accept role configured.', ephemeral: true });
      const member = await interaction.guild.members.fetch(userId).catch(() => null);
      let roleName = 'the role';
      if (member) { try { await member.roles.add(roleId); const role = interaction.guild.roles.cache.get(roleId); if (role) roleName = role.name; } catch (e) { console.error(e); } }
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('done_a').setLabel('✅ Accepted').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('done_b').setLabel('Decline').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      await interaction.update({ components: [disabledRow] });
      return interaction.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ <@${userId}> accepted and received **${roleName}**!`)] });
    }

    if (interaction.customId.startsWith('yukic_decline_')) {
      const userId = interaction.customId.replace('yukic_decline_', '');
      if (interaction.user.id !== userId) return interaction.reply({ content: '❌ This offer is not for you.', ephemeral: true });
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('done_a').setLabel('Accept').setStyle(ButtonStyle.Success).setDisabled(true),
        new ButtonBuilder().setCustomId('done_b').setLabel('❌ Declined').setStyle(ButtonStyle.Danger).setDisabled(true),
      );
      await interaction.update({ components: [disabledRow] });
      return interaction.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(`❌ <@${userId}> declined the offer.`)] });
    }
  }
});

// ─────────────────────────────────────────────────────────────
// TRANSCRIPT HELPER
// ─────────────────────────────────────────────────────────────
async function saveTranscript(channel, guild) {
  try {
    config = loadConfig();
    const messages = await channel.messages.fetch({ limit: 100 });
    const lines = messages.reverse().map(m => {
      const time = new Date(m.createdTimestamp).toISOString();
      const attachments = m.attachments.size > 0 ? ` [${m.attachments.map(a => a.url).join(', ')}]` : '';
      return `[${time}] ${m.author.tag}: ${m.content}${attachments}`;
    });
    const transcriptContent = `Transcript of #${channel.name}\nGuild: ${guild.name}\nDate: ${new Date().toISOString()}\n${'─'.repeat(60)}\n${lines.join('\n')}`;
    const file = new AttachmentBuilder(Buffer.from(transcriptContent, 'utf8'), { name: `transcript-${channel.name}.txt` });
    if (config.transcriptChannelId) {
      const transcriptChannel = guild.channels.cache.get(config.transcriptChannelId);
      if (transcriptChannel) {
        await transcriptChannel.send({
          embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle('📄 Ticket Transcript').addFields(
            { name: 'Channel', value: `#${channel.name}`, inline: true },
            { name: 'Closed At', value: new Date().toLocaleString(), inline: true },
          )],
          files: [file],
        });
      }
    }
  } catch (e) { console.error('Transcript save failed:', e); }
}

// ─────────────────────────────────────────────────────────────
// SAVED EMBEDS MENU
// ─────────────────────────────────────────────────────────────
function buildEmbedsMenuPayload(userId, selectedName) {
  config = loadConfig();
  const saved = config.savedEmbeds || {};
  const names = Object.keys(saved);
  const tpE = config.tpanelEmbedIds || [], spE = config.spanelEmbedIds || [], apE = config.apanelEmbedIds || [];

  let listLines = names.length === 0 ? ['*No saved embeds yet.*'] : names.map(n => {
    const tags = [];
    if (tpE.includes(n)) tags.push('**[Trading]**');
    if (spE.includes(n)) tags.push('**[Support]**');
    if (apE.includes(n)) tags.push('**[AI]**');
    return `\`${n}\` — *${saved[n].title || 'untitled'}*${tags.length ? ' — ' + tags.join(' ') : ''}`;
  });
  listLines.push('─────────────────────────');
  listLines.push('`trading-panel` — *Trading Panel Embed*');
  listLines.push('`support-panel` — *Support Panel Embed*');
  listLines.push('`ai-panel` — *AI Panel Embed*');
  listLines.push('─────────────────────────');
  listLines.push(selectedName ? `— selected: **${selectedName}**, or click Create New` : '— select one below, or click Create New');

  const options = names.slice(0, 21).map(n => ({ label: n, description: (saved[n].title || 'untitled').slice(0, 50), value: n }));
  options.push({ label: '🎫 Trading Panel', description: 'Edit trading panel embed', value: 'trading-panel', emoji: '🎫' });
  options.push({ label: '🎟️ Support Panel', description: 'Edit support panel embed', value: 'support-panel', emoji: '🎟️' });
  options.push({ label: '🤖 AI Panel', description: 'Edit AI panel embed', value: 'ai-panel', emoji: '🤖' });

  const components = [];
  if (options.length > 0) {
    components.push(new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder().setCustomId(`embeds_select_${userId}`).setPlaceholder('select an embed...').addOptions(options)
    ));
  }
  components.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`emb_createnew_${userId}`).setLabel('Create New').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`emb_send_${userId}`).setLabel('Send').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`emb_edit_${userId}`).setLabel('Edit').setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId(`emb_delete_${userId}`).setLabel('Delete').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId(`emb_close_${userId}`).setLabel('Close').setStyle(ButtonStyle.Secondary),
  ));
  return { content: `**saved embeds**\n\n${listLines.join('\n')}`, embeds: [], components };
}

function panelEmbedActionRows(userId, embedName) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`panel_attach_tpanel_${userId}`).setLabel('Attach to Trading Panel').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`panel_attach_spanel_${userId}`).setLabel('Attach to Support Panel').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`panel_attach_apanel_${userId}`).setLabel('Attach to AI Panel').setStyle(ButtonStyle.Success),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`panel_detach_tpanel_${userId}`).setLabel('Detach from Trading').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`panel_detach_spanel_${userId}`).setLabel('Detach from Support').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`panel_detach_apanel_${userId}`).setLabel('Detach from AI').setStyle(ButtonStyle.Danger),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`emb_close_${userId}`).setLabel('Close').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

async function runEmbeds(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.', ephemeral: true });
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  const payload = buildEmbedsMenuPayload(userId, null);
  if (ctx.isSlash) await ctx.interaction.reply({ ...payload, ephemeral: true });
  else await ctx.message.reply(payload);
}

async function runPanelEmbeds(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.', ephemeral: true });
  config = loadConfig();
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  const saved = config.savedEmbeds || {};
  const names = Object.keys(saved);
  if (names.length === 0) return reply(ctx, { content: '❌ No saved embeds found. Create one with `/embed`.', ephemeral: true });
  const options = names.slice(0, 25).map(n => ({ label: n, description: (saved[n].title || 'untitled').slice(0, 50), value: n }));
  const embed = new EmbedBuilder().setColor(COLORS.purple).setTitle('🔗 Attach Embeds to Panels').setDescription('Select a saved embed to attach/detach from panels.');
  const components = [
    new ActionRowBuilder().addComponents(new StringSelectMenuBuilder().setCustomId(`panel_embeds_select_${userId}`).setPlaceholder('Select an embed...').addOptions(options)),
    new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`emb_close_${userId}`).setLabel('Close').setStyle(ButtonStyle.Secondary)),
  ];
  if (ctx.isSlash) await ctx.interaction.reply({ embeds: [embed], components, ephemeral: true });
  else await ctx.message.reply({ embeds: [embed], components });
}

async function handleEmbedsAction(interaction) {
  const withoutPrefix = interaction.customId.slice(4);
  const underscoreIdx = withoutPrefix.indexOf('_');
  const action = withoutPrefix.slice(0, underscoreIdx);
  const userId = withoutPrefix.slice(underscoreIdx + 1);
  if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your menu.', ephemeral: true });
  config = loadConfig();
  const selectedName = embedSessions[`pick_${userId}`];

  if (action === 'close') {
    delete embedSessions[`pick_${userId}`]; delete embedSessions[`panel_pick_${userId}`];
    return interaction.update({ content: '✅ Closed.', embeds: [], components: [] });
  }
  if (action === 'createnew') {
    delete embedSessions[`pick_${userId}`];
    embedSessions[userId] = { title: null, description: null, color: COLORS.orange, author: null, authorIcon: null, footer: null, footerIcon: null, image: null, thumbnail: null, fields: [] };
    const previewEmbed = new EmbedBuilder().setColor(COLORS.orange).setTitle('New Embed').setDescription('Click the buttons below to customize this embed.');
    return interaction.update({ content: '🛠️ **Embed Builder**', embeds: [previewEmbed], components: embedBuilderRows(userId) });
  }
  if (!selectedName) return interaction.reply({ content: '❌ Please select an embed first.', ephemeral: true });

  // Panel edits
  const panelEditMap = {
    'trading-panel': { configTitle: 'tpanelTitle', configDesc: 'tpanelDescription', configImg: 'tpanelImageUrl', defaultTitle: 'Middleman Service', defaultDescFn: getDefaultTPanelDesc, storeKey: '__tpanel__' },
    'support-panel': { configTitle: 'spanelTitle', configDesc: 'spanelDescription', configImg: 'spanelImageUrl', defaultTitle: 'Support Ticket', defaultDescFn: getDefaultSPanelDesc, storeKey: '__spanel__' },
    'ai-panel': { configTitle: 'apanelTitle', configDesc: 'apanelDescription', configImg: 'apanelImageUrl', defaultTitle: 'AI Middleman', defaultDescFn: getDefaultAPanelDesc, storeKey: '__apanel__' },
  };
  if (panelEditMap[selectedName]) {
    const pm = panelEditMap[selectedName];
    if (action === 'edit') {
      embedSessions[userId] = { title: config[pm.configTitle] || pm.defaultTitle, description: config[pm.configDesc] || pm.defaultDescFn(), color: COLORS.orange, author: null, authorIcon: null, footer: null, footerIcon: null, image: config[pm.configImg] || null, thumbnail: null, fields: [] };
      embedSessions[`editing_${userId}`] = pm.storeKey;
      return interaction.update({ content: `🛠️ **Editing: ${selectedName}**`, embeds: [buildEmbedFromSession(embedSessions[userId])], components: embedBuilderRows(userId) });
    }
    if (action === 'send') return interaction.reply({ content: `❌ Use the panel command to send this panel.`, ephemeral: true });
    if (action === 'delete') return interaction.reply({ content: '❌ You cannot delete panel embeds.', ephemeral: true });
  }

  const savedSession = config.savedEmbeds[selectedName];
  if (!savedSession) return interaction.reply({ content: '❌ Embed not found.', ephemeral: true });
  if (action === 'send') {
    await interaction.channel.send({ embeds: [buildEmbedFromSession(savedSession)] });
    return interaction.update({ content: `✅ Sent embed **${selectedName}**!`, embeds: [], components: [] });
  }
  if (action === 'edit') {
    embedSessions[userId] = JSON.parse(JSON.stringify(savedSession));
    embedSessions[`editing_${userId}`] = selectedName;
    return interaction.update({ content: `🛠️ **Editing: ${selectedName}**`, embeds: [buildEmbedFromSession(embedSessions[userId])], components: embedBuilderRows(userId) });
  }
  if (action === 'delete') {
    delete config.savedEmbeds[selectedName];
    config.tpanelEmbedIds = (config.tpanelEmbedIds || []).filter(id => id !== selectedName);
    config.spanelEmbedIds = (config.spanelEmbedIds || []).filter(id => id !== selectedName);
    config.apanelEmbedIds = (config.apanelEmbedIds || []).filter(id => id !== selectedName);
    saveConfig(config);
    delete embedSessions[`pick_${userId}`];
    return interaction.update({ content: `🗑️ Deleted embed **${selectedName}**.`, embeds: [], components: [] });
  }
}

// ─────────────────────────────────────────────────────────────
// EMBED BUILDER
// ─────────────────────────────────────────────────────────────
async function handleEmbedBuilderButton(interaction) {
  const withoutPrefix = interaction.customId.slice(3);
  const underscoreIdx = withoutPrefix.indexOf('_');
  const action = withoutPrefix.slice(0, underscoreIdx);
  const userId = withoutPrefix.slice(underscoreIdx + 1);
  if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your embed builder.', ephemeral: true });
  const session = sessionEmbed(userId);

  if (action === 'cancel') {
    delete embedSessions[userId]; delete embedSessions[`editing_${userId}`];
    return interaction.update({ content: '❌ Embed builder cancelled.', embeds: [], components: [] });
  }
  if (action === 'send') {
    const built = buildEmbedFromSession(session);
    await interaction.channel.send({ embeds: [built] });
    const editingName = embedSessions[`editing_${userId}`];
    if (editingName) {
      config = loadConfig();
      if (editingName === '__tpanel__') { config.tpanelTitle = session.title || config.tpanelTitle; config.tpanelDescription = session.description || null; if (session.image) config.tpanelImageUrl = session.image; }
      else if (editingName === '__spanel__') { config.spanelTitle = session.title || config.spanelTitle; config.spanelDescription = session.description || null; if (session.image) config.spanelImageUrl = session.image; }
      else if (editingName === '__apanel__') { config.apanelTitle = session.title || config.apanelTitle; config.apanelDescription = session.description || null; if (session.image) config.apanelImageUrl = session.image; }
      else { config.savedEmbeds[editingName] = JSON.parse(JSON.stringify(session)); }
      saveConfig(config);
      delete embedSessions[`editing_${userId}`];
    }
    delete embedSessions[userId];
    return interaction.update({ content: '✅ Embed sent!', embeds: [], components: [] });
  }
  if (action === 'save') {
    const editingName = embedSessions[`editing_${userId}`];
    if (editingName) {
      config = loadConfig();
      if (editingName === '__tpanel__') { config.tpanelTitle = session.title || config.tpanelTitle; config.tpanelDescription = session.description || null; if (session.image) config.tpanelImageUrl = session.image; saveConfig(config); delete embedSessions[userId]; delete embedSessions[`editing_${userId}`]; return interaction.update({ content: '✅ Trading Panel updated!', embeds: [], components: [] }); }
      else if (editingName === '__spanel__') { config.spanelTitle = session.title || config.spanelTitle; config.spanelDescription = session.description || null; if (session.image) config.spanelImageUrl = session.image; saveConfig(config); delete embedSessions[userId]; delete embedSessions[`editing_${userId}`]; return interaction.update({ content: '✅ Support Panel updated!', embeds: [], components: [] }); }
      else if (editingName === '__apanel__') { config.apanelTitle = session.title || config.apanelTitle; config.apanelDescription = session.description || null; if (session.image) config.apanelImageUrl = session.image; saveConfig(config); delete embedSessions[userId]; delete embedSessions[`editing_${userId}`]; return interaction.update({ content: '✅ AI Panel updated!', embeds: [], components: [] }); }
      else { config.savedEmbeds[editingName] = JSON.parse(JSON.stringify(session)); saveConfig(config); delete embedSessions[userId]; delete embedSessions[`editing_${userId}`]; return interaction.update({ content: `✅ Embed **${editingName}** updated!`, embeds: [], components: [] }); }
    }
    const modal = new ModalBuilder().setCustomId(`ebm_savename_${userId}`).setTitle('Save Embed');
    modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('save_name').setLabel('Name to save as').setStyle(TextInputStyle.Short).setRequired(true)));
    return interaction.showModal(modal);
  }
  if (action === 'removefield') {
    if (session.fields.length === 0) return interaction.reply({ content: '❌ No fields to remove.', ephemeral: true });
    session.fields.pop();
    return interaction.update({ embeds: [buildEmbedFromSession(session)], components: embedBuilderRows(userId) });
  }

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
    addfield:   { id: `ebm_addfield_${userId}`, title: 'Add Field', fields: [
      { id: 'field_name', label: 'Field name', style: TextInputStyle.Short, value: null },
      { id: 'field_value', label: 'Field value', style: TextInputStyle.Paragraph, value: null },
      { id: 'field_inline', label: 'Inline? (yes/no)', style: TextInputStyle.Short, value: 'no' },
    ]},
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

async function handleEmbedBuilderModal(interaction) {
  const withoutPrefix = interaction.customId.slice(4);
  const underscoreIdx = withoutPrefix.indexOf('_');
  const action = withoutPrefix.slice(0, underscoreIdx);
  const userId = withoutPrefix.slice(underscoreIdx + 1);
  if (interaction.user.id !== userId) return interaction.reply({ content: '❌ Not your embed builder.', ephemeral: true });
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
    const inline = ['yes', 'y', 'true'].includes(inlineStr);
    if (name && value) { if (session.fields.length >= 25) return interaction.reply({ content: '❌ Maximum 25 fields.', ephemeral: true }); session.fields.push({ name, value, inline }); }
  } else {
    const val = interaction.fields.getTextInputValue('val') || null;
    if (action === 'title') session.title = val;
    else if (action === 'description') session.description = val;
    else if (action === 'color') { if (val) { try { session.color = parseInt(val.replace('#', ''), 16); } catch(e) { session.color = COLORS.orange; } } }
    else if (action === 'author') session.author = val;
    else if (action === 'authoricon') session.authorIcon = val;
    else if (action === 'footer') session.footer = val;
    else if (action === 'footericon') session.footerIcon = val;
    else if (action === 'image') session.image = val;
    else if (action === 'thumbnail') session.thumbnail = val;
  }
  try {
    await interaction.update({ content: '🛠️ **Embed Builder**', embeds: [buildEmbedFromSession(session)], components: embedBuilderRows(userId) });
  } catch(e) { await interaction.reply({ content: '✅ Updated!', ephemeral: true }); }
}

// ─────────────────────────────────────────────────────────────
// DEFAULT DESCRIPTIONS
// ─────────────────────────────────────────────────────────────
function getDefaultTPanelDesc() {
  const pt = config.panelText || 'Roblox Values';
  return `Welcome to **${pt}** Middleman Service Centre.\n\nAt **${pt}**, we value and provide a safe and secure way to exchange your goods.\n\n**If you've found a trade and want to ensure your safety, use our middleman service.**\n\n───\n**Usage Conditions:**\n• Both parties agree to trade before requesting a middleman.\n• State the trade and value.\n• Fake or troll tickets will result in punishments.`;
}
function getDefaultSPanelDesc() {
  const pt = config.panelText || 'Roblox Values';
  return `Welcome to **${pt}**.\n\nThis panel is for Staff Applications, Reports, and General Assistance.\n\n───\n**Usage Conditions:**\n• Select the correct category.\n• Provide complete and honest information.\n• Treat staff with respect at all times.`;
}
function getDefaultAPanelDesc() {
  const pt = config.panelText || 'Roblox Values';
  return (
    `Welcome to **${pt}** — AI Middleman Service.\n\n` +
    `🤖 Our **AI Middleman** is available 24/7 to assist and guide you through your trade safely and professionally.\n\n` +
    `**What the AI does:**\n` +
    `• Greets you and collects your trade details\n` +
    `• Reviews your trade for any scam indicators\n` +
    `• Guides both parties step-by-step through the trade\n` +
    `• Answers any questions about the process\n\n` +
    `───\n` +
    `**Usage Conditions:**\n` +
    `• Be honest about your trade details.\n` +
    `• Follow the AI's instructions carefully.\n` +
    `• Human staff can be requested at any time.\n` +
    `• Fake or troll tickets will result in punishment.`
  );
}
function getDefaultAISystemPrompt() {
  return (
    `You are an expert, trusted AI Middleman for a Roblox trading server called "Roblox Values". ` +
    `Your job is to safely guide trades between users. ` +
    `When a ticket opens, you greet both parties, ask for trade details (what is being traded, values, usernames), ` +
    `then review the trade for any scam indicators (low-value offers, suspicious requests, pressure tactics). ` +
    `Guide them step-by-step: first confirm both parties agree, then instruct the seller to hold until payment is confirmed, then confirm completion. ` +
    `Be professional, friendly, and concise. If something seems scammy, flag it clearly. ` +
    `Always remind users that human staff can be requested. Keep responses under 300 words.`
  );
}

// ─────────────────────────────────────────────────────────────
// HELP
// ─────────────────────────────────────────────────────────────
function hasHelpAccess(ctx) {
  config = loadConfig();
  if (!config.helpRoleId) return true;
  if (hasAdmin(ctx)) return true;
  const helpRole = ctx.guild.roles.cache.get(config.helpRoleId);
  if (!helpRole) return true;
  return ctx.member.roles.highest.position >= helpRole.position;
}

async function showHelpSection(interaction, section) {
  const P = config.prefix;
  const yukicName = config.yukicCommandName || 'yukic';
  if (section === 'back') return interaction.update({ embeds: [buildHelpMenuEmbed()], components: buildHelpMenuRows() });

  const sections = {
    tickets: {
      emoji: '🎫', name: 'Tickets', color: COLORS.blue,
      commands: [
        { name: `${P}tpanel / /tpanel`, desc: 'Send the **trading** ticket panel' },
        { name: `${P}spanel / /spanel`, desc: 'Send the **support** ticket panel' },
        { name: `${P}aipanel / /aipanel`, desc: 'Send the **AI Middleman** panel' },
        { name: `${P}close / /close`, desc: 'Close the current ticket' },
        { name: `${P}claim / /claim`, desc: 'Claim a ticket' },
        { name: `${P}unclaim / /unclaim`, desc: 'Unclaim a ticket' },
        { name: `${P}transcript / /transcript`, desc: 'Generate a transcript file' },
        { name: `${P}add @user`, desc: 'Add a user to this ticket' },
        { name: `${P}remove @user`, desc: 'Remove a user from this ticket' },
        { name: `${P}rename <name>`, desc: 'Rename this ticket channel' },
        { name: `${P}transfer @staff`, desc: 'Transfer ticket to another staff member' },
        { name: `${P}setcategory #cat`, desc: 'Set trading ticket category' },
        { name: `${P}setsupportcategory #cat`, desc: 'Set support ticket category' },
        { name: `${P}setaicategory #cat`, desc: 'Set AI ticket category' },
        { name: `${P}settranscriptchannel #ch`, desc: 'Set channel for auto-transcripts' },
      ],
    },
    middleman: {
      emoji: '🤝', name: 'Middleman', color: COLORS.orange,
      commands: [
        { name: `${P}mminfo / /mminfo`, desc: 'Show how the middleman service works' },
        { name: `${P}mmfee / /mmfee`, desc: 'Show fee options' },
        { name: `${P}confirm / /confirm`, desc: 'Confirm your side of the trade' },
        { name: `${P}vouch @user`, desc: 'Give a vouch to a user' },
        { name: `${P}vouches [@user]`, desc: 'View vouches' },
        { name: `${P}setvouches @user <n>`, desc: 'Set vouch count manually' },
        { name: `${P}vacation <dur>`, desc: 'Start a vacation' },
        { name: `${P}vacationcancel / vc`, desc: 'End vacation early' },
      ],
    },
    aipanel: {
      emoji: '🤖', name: 'AI Middleman', color: COLORS.ai,
      commands: [
        { name: `${P}aipanel / /aipanel`, desc: 'Send the AI Middleman panel to a channel' },
        { name: `${P}setaicategory #cat`, desc: 'Set which category AI tickets go into' },
        { name: `${P}setaipanelimage`, desc: 'Set image on the AI panel embed' },
        { name: `${P}setaipaneltitle <title>`, desc: 'Set the AI panel title' },
        { name: `${P}setaipaneldesc <desc>`, desc: 'Set the AI panel description' },
        { name: `${P}setaisystemprompt <prompt>`, desc: 'Customize how the AI behaves in tickets' },
        { name: 'ANTHROPIC_API_KEY', desc: 'Add this to your .env file to enable AI responses' },
      ],
    },
    yukic: {
      emoji: '🎁', name: 'Offer System', color: COLORS.pink,
      commands: [
        { name: `${P}${yukicName} @user`, desc: 'Send offer to a user' },
        { name: `Mention @user in ticket`, desc: 'Auto-triggers the offer in ticket channels' },
        { name: `${P}setyukicname <name>`, desc: 'Rename the offer command' },
        { name: `${P}setrole @role`, desc: 'Set minimum role to use yukic' },
        { name: `${P}setyukicrole @role`, desc: 'Set role given on accept' },
        { name: `${P}setyukicmessage <msg>`, desc: 'Set the offer message' },
        { name: `${P}resetyukicmessage`, desc: 'Reset the offer message' },
      ],
    },
    gambling: {
      emoji: '🎰', name: 'Gambling', color: COLORS.purple,
      commands: [
        { name: `${P}balance [@user]`, desc: 'Check coin balance' },
        { name: `${P}gamble <amount>`, desc: 'Gamble coins' },
        { name: `${P}flip <amount> <heads/tails>`, desc: 'Coin flip' },
        { name: `${P}slots <amount>`, desc: 'Slot machine' },
        { name: `${P}rob @user`, desc: 'Try to rob someone' },
        { name: `${P}daily`, desc: 'Claim 200 free coins daily' },
        { name: `${P}leaderboard`, desc: 'Richest users' },
        { name: `${P}setcoins @user <amount>`, desc: 'Set coins (Admin)' },
      ],
    },
    moderation: {
      emoji: '🔨', name: 'Moderation', color: COLORS.red,
      commands: [
        { name: `${P}ban @user [reason]`, desc: 'Ban a user' },
        { name: `${P}kick @user [reason]`, desc: 'Kick a user' },
        { name: `${P}mute @user <dur>`, desc: 'Timeout a user' },
        { name: `${P}unmute @user`, desc: 'Remove timeout' },
        { name: `${P}warn @user [reason]`, desc: 'Warn a user' },
        { name: `${P}warnings @user`, desc: 'View warnings' },
        { name: `${P}clearwarnings @user`, desc: 'Clear warnings' },
        { name: `${P}purge <1-100>`, desc: 'Bulk-delete messages' },
        { name: `${P}lock`, desc: 'Lock channel' },
        { name: `${P}unlock`, desc: 'Unlock channel' },
        { name: `${P}slowmode <seconds>`, desc: 'Set slowmode' },
      ],
    },
    fun: {
      emoji: '🎉', name: 'Fun & Utility', color: COLORS.green,
      commands: [
        { name: `${P}giveaway <dur> <prize>`, desc: 'Start a giveaway' },
        { name: `${P}poll <question>`, desc: 'Create a poll' },
        { name: `${P}announce <msg>`, desc: 'Post an announcement embed' },
        { name: `${P}embed`, desc: 'Open the embed builder' },
        { name: `${P}embeds`, desc: 'Manage saved embeds and panels' },
        { name: `${P}role @user @role`, desc: 'Toggle a role' },
        { name: `${P}nickname @user [name]`, desc: 'Set/reset nickname' },
        { name: `${P}fill`, desc: 'Give yourself all roles below yours' },
        { name: `${P}afk [reason]`, desc: 'Mark yourself as AFK' },
      ],
    },
    info: {
      emoji: '🛠️', name: 'Info & Stats', color: COLORS.cyan,
      commands: [
        { name: `${P}serverinfo`, desc: 'View server details' },
        { name: `${P}userinfo [@user]`, desc: 'View user info' },
        { name: `${P}avatar [@user]`, desc: 'Get avatar' },
        { name: `${P}banner [@user]`, desc: 'Get banner' },
        { name: `${P}membercount`, desc: 'Member count' },
        { name: `${P}ping`, desc: 'Bot latency' },
        { name: `${P}uptime`, desc: 'Bot uptime' },
        { name: `${P}botinfo`, desc: 'Bot info' },
      ],
    },
    setup: {
      emoji: '⚙️', name: 'Setup & Config', color: COLORS.purple,
      commands: [
        { name: `${P}setmmrole @role`, desc: 'Set the Middleman staff role' },
        { name: `${P}setsupportrole @role`, desc: 'Set support ping role' },
        { name: `${P}setcategory #cat`, desc: 'Set trading ticket category' },
        { name: `${P}setsupportcategory #cat`, desc: 'Set support ticket category' },
        { name: `${P}setaicategory #cat`, desc: 'Set AI ticket category' },
        { name: `${P}settranscriptchannel #ch`, desc: 'Set transcript log channel' },
        { name: `${P}setprefix <char>`, desc: 'Change prefix' },
        { name: `${P}setpicture`, desc: 'Set one image on ALL panels & tickets' },
        { name: `${P}renamep <text>`, desc: 'Rename "Roblox Values" text everywhere' },
        { name: `${P}panelconfig`, desc: 'View current panel config' },
        { name: `${P}setautorole @role`, desc: 'Auto-give role on join' },
        { name: `${P}backup <name>`, desc: 'Backup server config' },
        { name: `${P}restore <name>`, desc: 'Restore a backup' },
      ],
    },
  };

  const s = sections[section];
  if (!s) return interaction.reply({ content: '❌ Unknown section.', ephemeral: true });
  const embed = new EmbedBuilder().setColor(s.color).setTitle(`${s.emoji} ${s.name} Commands`)
    .setDescription(s.commands.map(c => `\`${c.name}\`\n↳ ${c.desc}`).join('\n\n'))
    .setFooter({ text: `Prefix: ${P} • All commands also work as /slash commands` });
  return interaction.update({ embeds: [embed], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('help_back').setLabel('← Back').setStyle(ButtonStyle.Secondary))] });
}

function buildHelpMenuEmbed() {
  return new EmbedBuilder().setColor(COLORS.orange).setTitle('📖 Help Menu').setDescription('Click a button below to explore commands.')
    .addFields(
      { name: '🎫 Tickets', value: 'Ticket panels, management & transcripts', inline: true },
      { name: '🤝 Middleman', value: 'MM service, vouches & vacation', inline: true },
      { name: '🤖 AI Middleman', value: 'AI-powered middleman system', inline: true },
      { name: '🎁 Offer System', value: 'Yukic offer with Accept/Decline', inline: true },
      { name: '🎰 Gambling', value: 'Coins, gamble, slots, rob & more', inline: true },
      { name: '🔨 Moderation', value: 'Ban, kick, mute, warn & more', inline: true },
      { name: '🎉 Fun & Utility', value: 'Giveaways, polls, embeds & more', inline: true },
      { name: '🛠️ Info', value: 'Server, user & bot info', inline: true },
      { name: '⚙️ Setup', value: 'Configure panels, images & bot', inline: true },
    ).setFooter({ text: 'Select a category to see detailed commands' });
}

function buildHelpMenuRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_tickets').setLabel('🎫 Tickets').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help_middleman').setLabel('🤝 Middleman').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help_aipanel').setLabel('🤖 AI MM').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('help_yukic').setLabel('🎁 Offer').setStyle(ButtonStyle.Primary),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('help_gambling').setLabel('🎰 Gambling').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help_moderation').setLabel('🔨 Moderation').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('help_fun').setLabel('🎉 Fun').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('help_info').setLabel('🛠️ Info').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('help_setup').setLabel('⚙️ Setup').setStyle(ButtonStyle.Secondary),
    ),
  ];
}

// ─────────────────────────────────────────────────────────────
// COMMANDS
// ─────────────────────────────────────────────────────────────
async function runHelp(ctx) {
  if (!hasHelpAccess(ctx)) return reply(ctx, { content: '❌ You do not have permission to use the help command.', ephemeral: true });
  await reply(ctx, { embeds: [buildHelpMenuEmbed()], components: buildHelpMenuRows() });
}

async function runEmbed(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.', ephemeral: true });
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  embedSessions[userId] = { title: null, description: null, color: COLORS.orange, author: null, authorIcon: null, footer: null, footerIcon: null, image: null, thumbnail: null, fields: [] };
  const previewEmbed = new EmbedBuilder().setColor(COLORS.orange).setTitle('New Embed').setDescription('Click the buttons below to customize this embed.');
  if (ctx.isSlash) await ctx.interaction.reply({ content: '🛠️ **Embed Builder**', embeds: [previewEmbed], components: embedBuilderRows(userId), ephemeral: true });
  else await ctx.message.reply({ content: '🛠️ **Embed Builder**', embeds: [previewEmbed], components: embedBuilderRows(userId) });
}

async function runSetHelpRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.', ephemeral: true });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.' });
  config = loadConfig(); config.helpRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Help restricted to **${role.name}** and above.`)] });
}

async function runRenamePanel(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ You need **Administrator** permission.', ephemeral: true });
  const replacement = ctx.isSlash ? ctx.getOption('text') : ctx.args.join(' ');
  if (!replacement) return reply(ctx, { content: '❌ Please provide replacement text.', ephemeral: true });
  config = loadConfig();
  const oldText = config.panelText || 'Roblox Values';
  config.panelText = replacement;
  const replaceInStr = (str) => str ? str.replace(new RegExp(oldText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement) : str;
  config.tpanelTitle = replaceInStr(config.tpanelTitle);
  config.tpanelDescription = replaceInStr(config.tpanelDescription);
  config.spanelTitle = replaceInStr(config.spanelTitle);
  config.spanelDescription = replaceInStr(config.spanelDescription);
  config.apanelTitle = replaceInStr(config.apanelTitle);
  config.apanelDescription = replaceInStr(config.apanelDescription);
  config.ticketTitle = replaceInStr(config.ticketTitle);
  config.supportTicketTitle = replaceInStr(config.supportTicketTitle);
  config.aiTicketTitle = replaceInStr(config.aiTicketTitle);
  config.welcomeTitle = replaceInStr(config.welcomeTitle);
  config.welcomeMessage = replaceInStr(config.welcomeMessage);
  saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Panel Text Renamed').setDescription(`Replaced **"${oldText}"** → **"${replacement}"** across all panels.`)], ephemeral: true });
}

// ── Trading Panel ──
async function runTPanel(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.', ephemeral: true });
  config = loadConfig();
  const embeds = [];
  const mainEmbed = new EmbedBuilder().setColor(COLORS.orange).setTitle(config.tpanelTitle || 'Middleman Service').setDescription(config.tpanelDescription || getDefaultTPanelDesc());
  if (config.tpanelImageUrl) mainEmbed.setImage(config.tpanelImageUrl);
  embeds.push(mainEmbed);
  for (const embedId of (config.tpanelEmbedIds || [])) {
    if (config.savedEmbeds?.[embedId]) embeds.push(buildEmbedFromSession(config.savedEmbeds[embedId]));
  }
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('ticket_type_trading').setPlaceholder('Select an option...').addOptions([
      { label: 'Ingame Trading', description: 'Trading inside a game (e.g. Roblox)', value: 'ingame', emoji: '🎮' },
      { label: 'PayPal/Cashapp/Crypto', description: 'Cross trading via external payments', value: 'payment', emoji: '💳' },
    ])
  );
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const sentMsg = await channel.send({ embeds, components: [row] });
  config.panelMessages.push({ channelId: channel.id, messageId: sentMsg.id });
  saveConfig(config);
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Trading panel sent!', ephemeral: true });
  else await ctx.message.reply('✅ Trading panel sent!');
}

// ── Support Panel ──
async function runSPanel(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.', ephemeral: true });
  config = loadConfig();
  const embeds = [];
  const mainEmbed = new EmbedBuilder().setColor(COLORS.blue).setTitle(config.spanelTitle || 'Support Ticket').setDescription(config.spanelDescription || getDefaultSPanelDesc());
  if (config.spanelImageUrl) mainEmbed.setImage(config.spanelImageUrl);
  embeds.push(mainEmbed);
  for (const embedId of (config.spanelEmbedIds || [])) {
    if (config.savedEmbeds?.[embedId]) embeds.push(buildEmbedFromSession(config.savedEmbeds[embedId]));
  }
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('ticket_type_support').setPlaceholder('Select an option...').addOptions([
      { label: 'Staff Application', description: 'Apply for a staff position', value: 'staff_app', emoji: '📋' },
      { label: 'Report', description: 'Report a user or issue', value: 'report', emoji: '🚨' },
      { label: 'General Assistance', description: 'Get help with something', value: 'general', emoji: '❓' },
    ])
  );
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const sentMsg = await channel.send({ embeds, components: [row] });
  config.panelMessages.push({ channelId: channel.id, messageId: sentMsg.id });
  saveConfig(config);
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Support panel sent!', ephemeral: true });
  else await ctx.message.reply('✅ Support panel sent!');
}

// ── AI Panel ──
async function runAIPanel(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.', ephemeral: true });
  config = loadConfig();
  const embeds = [];

  const mainEmbed = new EmbedBuilder()
    .setColor(COLORS.ai)
    .setTitle(config.apanelTitle || 'AI Middleman')
    .setDescription(config.apanelDescription || getDefaultAPanelDesc())
    .setFooter({ text: '🤖 Powered by AI — Available 24/7 • Roblox Values' })
    .setTimestamp();
  if (config.apanelImageUrl) mainEmbed.setImage(config.apanelImageUrl);
  embeds.push(mainEmbed);

  for (const embedId of (config.apanelEmbedIds || [])) {
    if (config.savedEmbeds?.[embedId]) embeds.push(buildEmbedFromSession(config.savedEmbeds[embedId]));
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('open_ai_ticket').setLabel('🤖 Open AI Middleman Ticket').setStyle(ButtonStyle.Primary),
  );

  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.send({ embeds, components: [row] });
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ AI Middleman panel sent!', ephemeral: true });
  else await ctx.message.reply('✅ AI Middleman panel sent!');
}

// ── Image/Title/Desc setters ──
async function runSetTradingPanelImage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const imageUrl = ctx.isSlash ? ctx.interaction.options.getAttachment('image')?.url : ctx.message.attachments.first()?.url;
  if (!imageUrl) return reply(ctx, { content: '❌ Please attach an image.' });
  config = loadConfig(); config.tpanelImageUrl = imageUrl; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Trading panel image updated!').setImage(imageUrl)] });
}
async function runSetSupportPanelImage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const imageUrl = ctx.isSlash ? ctx.interaction.options.getAttachment('image')?.url : ctx.message.attachments.first()?.url;
  if (!imageUrl) return reply(ctx, { content: '❌ Please attach an image.' });
  config = loadConfig(); config.spanelImageUrl = imageUrl; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Support panel image updated!').setImage(imageUrl)] });
}
async function runSetAIPanelImage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const imageUrl = ctx.isSlash ? ctx.interaction.options.getAttachment('image')?.url : ctx.message.attachments.first()?.url;
  if (!imageUrl) return reply(ctx, { content: '❌ Please attach an image.' });
  config = loadConfig(); config.apanelImageUrl = imageUrl; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ AI panel image updated!').setImage(imageUrl)] });
}
async function runSetTicketImage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const imageUrl = ctx.isSlash ? ctx.interaction.options.getAttachment('image')?.url : ctx.message.attachments.first()?.url;
  if (!imageUrl) return reply(ctx, { content: '❌ Please attach an image.' });
  config = loadConfig(); config.ticketImageUrl = imageUrl; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Trading ticket image updated!').setImage(imageUrl)] });
}
async function runSetSupportTicketImage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const imageUrl = ctx.isSlash ? ctx.interaction.options.getAttachment('image')?.url : ctx.message.attachments.first()?.url;
  if (!imageUrl) return reply(ctx, { content: '❌ Please attach an image.' });
  config = loadConfig(); config.supportTicketImageUrl = imageUrl; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Support ticket image updated!').setImage(imageUrl)] });
}
async function runSetPicture(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const imageUrl = ctx.isSlash ? ctx.interaction.options.getAttachment('image')?.url : ctx.message.attachments.first()?.url;
  if (!imageUrl) return reply(ctx, { content: '❌ Please attach an image.' });
  config = loadConfig();
  config.panelImageUrl = config.tpanelImageUrl = config.spanelImageUrl = config.apanelImageUrl = config.ticketImageUrl = config.supportTicketImageUrl = config.aiTicketImageUrl = imageUrl;
  saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Image updated on **all** panels and tickets!').setImage(imageUrl)] });
}
async function runSetTPaneTitle(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const title = ctx.isSlash ? ctx.getOption('title') : ctx.args.join(' ');
  if (!title) return reply(ctx, { content: '❌ Please provide a title.' });
  config = loadConfig(); config.tpanelTitle = title; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Trading panel title: **${title}**`)] });
}
async function runSetTPaneDesc(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const desc = ctx.isSlash ? ctx.getOption('description') : ctx.args.join(' ');
  if (!desc) return reply(ctx, { content: '❌ Please provide a description.' });
  config = loadConfig(); config.tpanelDescription = desc.replace(/\\n/g, '\n'); saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Trading panel description updated.')] });
}
async function runSetSPaneTitle(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const title = ctx.isSlash ? ctx.getOption('title') : ctx.args.join(' ');
  if (!title) return reply(ctx, { content: '❌ Please provide a title.' });
  config = loadConfig(); config.spanelTitle = title; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Support panel title: **${title}**`)] });
}
async function runSetSPaneDesc(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const desc = ctx.isSlash ? ctx.getOption('description') : ctx.args.join(' ');
  if (!desc) return reply(ctx, { content: '❌ Please provide a description.' });
  config = loadConfig(); config.spanelDescription = desc.replace(/\\n/g, '\n'); saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Support panel description updated.')] });
}
async function runSetAIPanelTitle(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const title = ctx.isSlash ? ctx.getOption('title') : ctx.args.join(' ');
  if (!title) return reply(ctx, { content: '❌ Please provide a title.' });
  config = loadConfig(); config.apanelTitle = title; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ AI panel title: **${title}**`)] });
}
async function runSetAIPanelDesc(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const desc = ctx.isSlash ? ctx.getOption('description') : ctx.args.join(' ');
  if (!desc) return reply(ctx, { content: '❌ Please provide a description.' });
  config = loadConfig(); config.apanelDescription = desc.replace(/\\n/g, '\n'); saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ AI panel description updated.')] });
}
async function runSetAISystemPrompt(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const prompt = ctx.isSlash ? ctx.getOption('prompt') : ctx.args.join(' ');
  if (!prompt) return reply(ctx, { content: '❌ Please provide a prompt.' });
  config = loadConfig(); config.aiSystemPrompt = prompt; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ AI system prompt updated.').addFields({ name: 'New Prompt', value: prompt.slice(0, 1000) })] });
}
async function runSetTicketTitle(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const title = ctx.isSlash ? ctx.getOption('title') : ctx.args.join(' ');
  if (!title) return reply(ctx, { content: '❌ Please provide a title.' });
  config = loadConfig(); config.ticketTitle = title; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Trading ticket title: **${title}**`)] });
}
async function runSetSupportTicketTitle(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const title = ctx.isSlash ? ctx.getOption('title') : ctx.args.join(' ');
  if (!title) return reply(ctx, { content: '❌ Please provide a title.' });
  config = loadConfig(); config.supportTicketTitle = title; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Support ticket title: **${title}**`)] });
}
async function runPanelConfig(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  config = loadConfig();
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.cyan).setTitle('⚙️ Panel & Ticket Configuration')
    .addFields(
      { name: '📝 Panel Text', value: config.panelText || 'Roblox Values', inline: true },
      { name: '📋 Trading Panel Title', value: config.tpanelTitle || 'Middleman Service', inline: true },
      { name: '📋 Support Panel Title', value: config.spanelTitle || 'Support Ticket', inline: true },
      { name: '🤖 AI Panel Title', value: config.apanelTitle || 'AI Middleman', inline: true },
      { name: '🎫 Trading Ticket Title', value: config.ticketTitle || 'Ticket Opened', inline: true },
      { name: '🎫 Support Ticket Title', value: config.supportTicketTitle || 'Support Ticket', inline: true },
      { name: '🤖 AI Ticket Title', value: config.aiTicketTitle || 'AI Middleman Ticket', inline: true },
      { name: '🖼️ Trading Panel Image', value: config.tpanelImageUrl ? '✅ Set' : '❌ Not set', inline: true },
      { name: '🖼️ Support Panel Image', value: config.spanelImageUrl ? '✅ Set' : '❌ Not set', inline: true },
      { name: '🖼️ AI Panel Image', value: config.apanelImageUrl ? '✅ Set' : '❌ Not set', inline: true },
      { name: '🤝 MM Role', value: config.mmRoleId ? `<@&${config.mmRoleId}>` : '❌ Not set', inline: true },
      { name: '🆘 Support Role', value: config.supportRoleId ? `<@&${config.supportRoleId}>` : '❌ Not set', inline: true },
      { name: '📁 Trading Category', value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : '❌ Not set', inline: true },
      { name: '📁 Support Category', value: config.supportCategoryId ? `<#${config.supportCategoryId}>` : '❌ Not set', inline: true },
      { name: '📁 AI Category', value: config.aiCategoryId ? `<#${config.aiCategoryId}>` : '❌ Not set', inline: true },
      { name: '📄 Transcript Channel', value: config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : '❌ Not set', inline: true },
      { name: '🧠 AI System Prompt', value: config.aiSystemPrompt ? '✅ Custom set' : '✅ Using default', inline: true },
    )
  ] });
}
async function runSetSupportRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.' });
  config = loadConfig(); config.supportRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Support ping role set to **${role.name}**.`)] });
}
async function runSetTranscriptChannel(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const ch = ctx.isSlash ? ctx.getChannelOption('channel') : ctx.message.mentions.channels.first();
  if (!ch) return reply(ctx, { content: '❌ Please mention a channel.' });
  config = loadConfig(); config.transcriptChannelId = ch.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Transcript channel: <#${ch.id}>`)] });
}
async function runSetMMRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.' });
  config = loadConfig(); config.mmRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Middleman role: **${role.name}**`)] });
}
async function runSetCategory(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  const cat = ctx.isSlash ? ctx.getChannelOption('category') : ctx.message.mentions.channels.first();
  if (!cat) return reply(ctx, { content: '❌ Please mention a category.' });
  config = loadConfig(); config.ticketCategoryId = cat.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Trading ticket category: **${cat.name}**`)] });
}
async function runSetSupportCategory(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  const cat = ctx.isSlash ? ctx.getChannelOption('category') : ctx.message.mentions.channels.first();
  if (!cat) return reply(ctx, { content: '❌ Please mention a category.' });
  config = loadConfig(); config.supportCategoryId = cat.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Support ticket category: **${cat.name}**`)] });
}
async function runSetAICategory(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  const cat = ctx.isSlash ? ctx.getChannelOption('category') : ctx.message.mentions.channels.first();
  if (!cat) return reply(ctx, { content: '❌ Please mention a category.' });
  config = loadConfig(); config.aiCategoryId = cat.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ AI ticket category: **${cat.name}**`)] });
}
async function runSetPrefix(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  const p = ctx.isSlash ? ctx.getOption('prefix') : ctx.args[0];
  if (!p) return reply(ctx, { content: '❌ Please provide a prefix.' });
  config = loadConfig(); config.prefix = p; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Prefix changed to \`${p}\``)] });
}
async function runSetAutoRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.' });
  config = loadConfig(); config.autoRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Auto-role: **${role.name}**.`)] });
}
async function runRemoveAutoRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  config = loadConfig(); config.autoRoleId = null; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription('✅ Auto-role disabled.')] });
}

// Backup
async function runBackup(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const name = ctx.isSlash ? ctx.getOption('name') : ctx.args[0];
  if (!name) return reply(ctx, { content: '❌ Please provide a backup name.' });
  config = loadConfig();
  const guild = ctx.guild;
  const roles = guild.roles.cache.filter(r => !r.managed && r.id !== guild.id).map(r => ({ id: r.id, name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: r.permissions.bitfield.toString(), position: r.position })).sort((a, b) => a.position - b.position);
  const channels = guild.channels.cache.map(c => ({ id: c.id, name: c.name, type: c.type, parentId: c.parentId || null, position: c.position }));
  const configSnapshot = JSON.parse(JSON.stringify(config));
  delete configSnapshot.backups;
  config.backups[name] = { createdAt: new Date().toISOString(), guildName: guild.name, roles, channels, botConfig: configSnapshot };
  saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Backup Created').addFields({ name: '📦 Name', value: name, inline: true }, { name: '🎭 Roles', value: `${roles.length}`, inline: true }, { name: '📁 Channels', value: `${channels.length}`, inline: true })] });
}
async function runRestore(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const name = ctx.isSlash ? ctx.getOption('name') : ctx.args[0];
  if (!name) return reply(ctx, { content: '❌ Please provide a backup name.' });
  config = loadConfig();
  const backup = config.backups[name];
  if (!backup) return reply(ctx, { content: `❌ No backup found: **${name}**` });
  if (ctx.isSlash) await ctx.interaction.reply({ content: '⏳ Restoring backup...' });
  else await ctx.message.reply('⏳ Restoring backup...');
  const guild = ctx.guild;
  let rolesRestored = 0, rolesFailed = 0;
  const restoredCfg = backup.botConfig;
  restoredCfg.backups = config.backups;
  saveConfig(restoredCfg);
  config = restoredCfg;
  for (const roleData of backup.roles) {
    try {
      const existing = guild.roles.cache.get(roleData.id);
      if (existing) await existing.edit({ name: roleData.name, color: roleData.color, hoist: roleData.hoist, mentionable: roleData.mentionable, permissions: BigInt(roleData.permissions) });
      else await guild.roles.create({ name: roleData.name, color: roleData.color, hoist: roleData.hoist, mentionable: roleData.mentionable, permissions: BigInt(roleData.permissions), reason: `Restored from backup: ${name}` });
      rolesRestored++;
    } catch (e) { rolesFailed++; }
    await new Promise(r => setTimeout(r, 200));
  }
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Backup Restored').addFields({ name: '📦 Backup', value: name, inline: true }, { name: '🎭 Roles restored', value: `${rolesRestored}`, inline: true }, { name: '❌ Failed', value: `${rolesFailed}`, inline: true })] });
}
async function runBackupList(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  config = loadConfig();
  const names = Object.keys(config.backups || {});
  if (names.length === 0) return reply(ctx, { content: '❌ No backups found.' });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle('📦 Saved Backups').setDescription(names.map(n => `**${n}** — ${config.backups[n].guildName} — ${new Date(config.backups[n].createdAt).toLocaleString()}`).join('\n'))] });
}
async function runBackupDelete(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const name = ctx.isSlash ? ctx.getOption('name') : ctx.args[0];
  config = loadConfig();
  if (!config.backups[name]) return reply(ctx, { content: `❌ No backup: **${name}**` });
  delete config.backups[name]; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(`🗑️ Deleted backup **${name}**.`)] });
}

// Welcome
async function runSetWelcomeChannel(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const ch = ctx.isSlash ? ctx.getChannelOption('channel') : ctx.message.mentions.channels.first();
  if (!ch) return reply(ctx, { content: '❌ Please mention a channel.' });
  config = loadConfig(); config.welcomeChannelId = ch.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Welcome channel: <#${ch.id}>`)] });
}
async function runSetRulesChannel(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const ch = ctx.isSlash ? ctx.getChannelOption('channel') : ctx.message.mentions.channels.first();
  if (!ch) return reply(ctx, { content: '❌ Please mention a channel.' });
  config = loadConfig(); config.rulesChannelId = ch.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Rules channel: <#${ch.id}>`)] });
}
async function runSetMMRequestChannel(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const ch = ctx.isSlash ? ctx.getChannelOption('channel') : ctx.message.mentions.channels.first();
  if (!ch) return reply(ctx, { content: '❌ Please mention a channel.' });
  config = loadConfig(); config.mmRequestChannelId = ch.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ MM request channel: <#${ch.id}>`)] });
}
async function runSetWelcomeTitle(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const title = ctx.isSlash ? ctx.getOption('title') : ctx.args.join(' ');
  if (!title) return reply(ctx, { content: '❌ Please provide a title.' });
  config = loadConfig(); config.welcomeTitle = title; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Welcome title: **${title}**`)] });
}
async function runSetWelcomeMessageCmd(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const msg = ctx.isSlash ? ctx.getOption('message') : ctx.args.join(' ');
  if (!msg) return reply(ctx, { content: '❌ Please provide a message. Use `{user}` for the mention.' });
  config = loadConfig(); config.welcomeMessage = msg; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Welcome Message Updated').setDescription(msg).setFooter({ text: '{user} = member mention' })] });
}
async function runToggleWelcome(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  config = loadConfig(); config.welcomeEnabled = !config.welcomeEnabled; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(config.welcomeEnabled ? COLORS.green : COLORS.red).setDescription(config.welcomeEnabled ? '✅ Welcome messages **enabled**.' : '❌ Welcome messages **disabled**.')] });
}
async function runWelcomeConfig(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  config = loadConfig();
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle('👋 Welcome Configuration').addFields(
    { name: 'Status', value: config.welcomeEnabled ? '✅ Enabled' : '❌ Disabled', inline: true },
    { name: 'Welcome Channel', value: config.welcomeChannelId ? `<#${config.welcomeChannelId}>` : 'Not set', inline: true },
    { name: 'Rules Channel', value: config.rulesChannelId ? `<#${config.rulesChannelId}>` : 'Not set', inline: true },
    { name: 'MM Request Channel', value: config.mmRequestChannelId ? `<#${config.mmRequestChannelId}>` : 'Not set', inline: true },
    { name: 'Auto-Role', value: config.autoRoleId ? `<@&${config.autoRoleId}>` : 'Not set', inline: true },
    { name: 'Transcript Channel', value: config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : 'Not set', inline: true },
    { name: 'Welcome Title', value: config.welcomeTitle || 'Not set' },
    { name: 'Welcome Message', value: config.welcomeMessage || 'Not set' },
  )] });
}
async function runTestWelcome(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  config = loadConfig();
  if (!config.welcomeChannelId) return reply(ctx, { content: '❌ No welcome channel set.' });
  const channel = ctx.guild.channels.cache.get(config.welcomeChannelId);
  if (!channel) return reply(ctx, { content: '❌ Welcome channel not found.' });
  const member = ctx.isSlash ? ctx.interaction.member : ctx.member;
  await sendWelcomeMessage(channel, member);
  if (ctx.isSlash) await ctx.interaction.reply({ content: `✅ Test sent to <#${config.welcomeChannelId}>`, ephemeral: true });
  else await ctx.message.reply(`✅ Test sent to <#${config.welcomeChannelId}>`);
}

// Yukic
async function runSetYukicName(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const name = (ctx.isSlash ? ctx.getOption('name') : ctx.args[0] || '').toLowerCase().replace(/\s+/g, '');
  if (!name) return reply(ctx, { content: '❌ Please provide a name.' });
  config = loadConfig(); config.yukicCommandName = name; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Offer command renamed to \`${config.prefix}${name}\``)] });
}
async function runSetRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.' });
  config = loadConfig(); config.yukicTriggerRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Yukic trigger role: **${role.name}**.`)] });
}
async function runSetYukicRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.' });
  config = loadConfig(); config.yukicAcceptRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Yukic accept role: **${role.name}**.`)] });
}
async function runSetYukicMessage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  config = loadConfig();
  if (config.yukicMessage) return reply(ctx, { content: `❌ Already set. Use \`${config.prefix}resetyukicmessage\` to reset.` });
  const msg = ctx.isSlash ? ctx.getOption('message') : ctx.args.join(' ');
  if (!msg) return reply(ctx, { content: '❌ Please provide a message.' });
  config.yukicMessage = msg; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Yukic Message Set').setDescription(msg)] });
}
async function runResetYukicMessage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  config = loadConfig();
  if (!config.yukicMessage) return reply(ctx, { content: '❌ No yukic message set.' });
  config.yukicMessage = null; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Yukic message reset.')] });
}
async function runYukic(ctx) {
  config = loadConfig();
  let hasAccess = hasAdmin(ctx);
  if (!hasAccess && config.yukicTriggerRoleId) {
    const triggerRole = ctx.guild.roles.cache.get(config.yukicTriggerRoleId);
    if (triggerRole) hasAccess = ctx.member.roles.highest.position >= triggerRole.position;
  }
  if (!hasAccess) return reply(ctx, { content: '❌ You do not have permission.', ephemeral: true });
  if (!config.yukicMessage) return reply(ctx, { content: `❌ No offer message set.` });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (target.user.bot) return reply(ctx, { content: '❌ Cannot send to a bot.' });
  const embed = new EmbedBuilder().setColor(COLORS.orange).setDescription(config.yukicMessage).setThumbnail(target.user.displayAvatarURL());
  if (config.panelImageUrl) embed.setImage(config.panelImageUrl);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`yukic_accept_${target.id}`).setLabel('✅ Accept').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`yukic_decline_${target.id}`).setLabel('❌ Decline').setStyle(ButtonStyle.Danger),
  );
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.send({ content: `<@${target.id}>`, embeds: [embed], components: [row] });
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Offer sent!', ephemeral: true });
  else { try { await ctx.message.delete(); } catch(e) {} }
}

// Tickets
async function runClose(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (!channel.name.startsWith('ticket-') && !channel.name.startsWith('ai-ticket-')) return reply(ctx, { content: '❌ This command can only be used inside a ticket channel.' });
  await reply(ctx, { content: '📄 Saving transcript and closing in 5 seconds...' });
  aiTicketHistory.delete(channel.id);
  await saveTranscript(channel, ctx.guild);
  setTimeout(() => channel.delete().catch(() => {}), 5000);
}
async function runClaim(ctx) {
  const hasMmRole = config.mmRoleId && ctx.member.roles.cache.has(config.mmRoleId);
  if (!hasMmRole && !hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need the Middleman role to claim a ticket.' });
  const user = ctx.isSlash ? ctx.interaction.user : ctx.message.author;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Ticket Claimed').setDescription(`Claimed by <@${user.id}>. They will assist you shortly.`).setThumbnail(user.displayAvatarURL()).setTimestamp()] });
}
async function runUnclaim(ctx) {
  const hasMmRole = config.mmRoleId && ctx.member.roles.cache.has(config.mmRoleId);
  if (!hasMmRole && !hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need the Middleman role to unclaim.' });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(`🔓 Ticket unclaimed by **${ctx.member.user.tag}**`)] });
}
async function runTranscript(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.deferReply();
  const messages = await channel.messages.fetch({ limit: 100 });
  const lines = messages.reverse().map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content}`);
  const file = new AttachmentBuilder(Buffer.from(lines.join('\n'), 'utf8'), { name: `transcript-${channel.name}.txt` });
  await reply(ctx, { content: '📄 Transcript:', files: [file] });
}
async function runAdd(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  await channel.permissionOverwrites.create(target, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Added **${target.user.tag}** to this ticket.`)] });
}
async function runRemove(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  await channel.permissionOverwrites.delete(target);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(`✅ Removed **${target.user.tag}** from this ticket.`)] });
}
async function runRename(ctx) {
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  const newName = ctx.isSlash ? ctx.getOption('name') : ctx.args.join('-');
  if (!newName) return reply(ctx, { content: '❌ Please provide a name.' });
  await channel.setName(newName);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Renamed to **${newName}**`)] });
}
async function runTransfer(ctx) {
  const hasMmRole = config.mmRoleId && ctx.member.roles.cache.has(config.mmRoleId);
  if (!hasMmRole && !hasManageGuild(ctx)) return reply(ctx, { content: '❌ Middleman role required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a staff member.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.permissionOverwrites.create(target, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`🔁 Ticket transferred to <@${target.id}>`)] });
}

// MM
async function runMmInfo(ctx) {
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle('🛡️ Middleman Service').setDescription('A Middleman (MM) is a trusted staff member who ensures safe trades.\n\n**How it works:**\n• Seller gives item to MM\n• Buyer pays seller\n• MM gives item to buyer\n\n📋 **Notes:**\n• Both traders must agree first.\n• Troll tickets = punishment.')] });
}
async function runMmFee(ctx) {
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.orange).setTitle('🔒 Middleman Fee').setDescription('• **Split (50/50)** — Both parties pay half\n• **Full (100%)** — One party pays all')], components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('fee_split').setLabel('Split (50/50)').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId('fee_full').setLabel('Full (100%)').setStyle(ButtonStyle.Primary))] });
}
async function runConfirm(ctx) {
  const user = ctx.isSlash ? ctx.interaction.user : ctx.message.author;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Trade Confirmed').setDescription(`**${user.tag}** has confirmed the trade.`)] });
}

// Vouches
async function runVouch(ctx) {
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  const author = ctx.isSlash ? ctx.interaction.user : ctx.message.author;
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (target.id === author.id) return reply(ctx, { content: '❌ Cannot vouch for yourself.' });
  config = loadConfig();
  if (!config.vouchData[target.id]) config.vouchData[target.id] = 0;
  config.vouchData[target.id]++;
  saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Vouch Added').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 User', value: `<@${target.id}>`, inline: true }, { name: '⭐ Total', value: `**${config.vouchData[target.id]}**`, inline: true }, { name: '✍️ By', value: `<@${author.id}>`, inline: true })] });
}
async function runVouches(ctx) {
  const target = ctx.isSlash ? (ctx.getUserOption('user') || ctx.interaction.user) : (ctx.message.mentions.users.first() || ctx.message.author);
  config = loadConfig();
  const count = config.vouchData?.[target.id] || 0;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.orange).setTitle(`📋 Vouches — ${target.username}`).setThumbnail(target.displayAvatarURL()).addFields({ name: '⭐ Count', value: `**${count}**`, inline: true }, { name: 'Rating', value: '⭐'.repeat(Math.min(count, 10)) || '*No vouches yet*', inline: true })] });
}
async function runSetVouches(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  const count = ctx.isSlash ? ctx.getOption('count') : parseInt(ctx.args[1]);
  if (!target || isNaN(count)) return reply(ctx, { content: '❌ Usage: `setvouches @user <number>`' });
  config = loadConfig(); config.vouchData[target.id] = count; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Set vouches for **${target.tag}** to **${count}**.`)] });
}

// Vacation
async function runVacation(ctx) {
  const dur = ctx.isSlash ? ctx.getOption('duration') : ctx.args[0];
  const ms = parseDuration(dur);
  if (!ms) return reply(ctx, { content: '❌ Valid: `1m`, `2h`, `3d`, `1w`' });
  const member = ctx.member;
  const savedRoles = member.roles.cache.filter(r => r.id !== ctx.guild.id).map(r => r.id);
  config = loadConfig(); config.vacationData[member.id] = { roles: savedRoles, active: true }; saveConfig(config);
  try { await member.roles.set([ctx.guild.id]); } catch (e) { return reply(ctx, { content: '⚠️ Could not remove roles.' }); }
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.cyan).setTitle('🏖️ Vacation Started').setDescription(`Enjoy your break! Roles restored in **${dur}**.`)] });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  setTimeout(async () => { config = loadConfig(); if (config.vacationData?.[member.id]?.active) await restoreRoles(ctx.guild, member.id, channel); }, ms);
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
  await channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ <@${userId}> vacation ended — roles restored!`)] });
}

// Moderation
async function runBan(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.BanMembers)) return reply(ctx, { content: '❌ Ban Members permission required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const reason = (ctx.isSlash ? ctx.getOption('reason') : ctx.args.slice(1).join(' ')) || 'No reason provided';
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (!target.bannable) return reply(ctx, { content: '❌ I cannot ban this user.' });
  await target.ban({ reason });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.red).setTitle('🔨 User Banned').setThumbnail(target.user.displayAvatarURL()).addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '📋 Reason', value: reason, inline: true })] });
}
async function runKick(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.KickMembers)) return reply(ctx, { content: '❌ Kick Members permission required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const reason = (ctx.isSlash ? ctx.getOption('reason') : ctx.args.slice(1).join(' ')) || 'No reason provided';
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (!target.kickable) return reply(ctx, { content: '❌ I cannot kick this user.' });
  await target.kick(reason);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.yellow).setTitle('👢 User Kicked').setThumbnail(target.user.displayAvatarURL()).addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '📋 Reason', value: reason, inline: true })] });
}
async function runMute(ctx) {
  if (!hasModPerms(ctx)) return reply(ctx, { content: '❌ Moderate Members permission required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const durStr = ctx.isSlash ? ctx.getOption('duration') : ctx.args[1];
  const reason = (ctx.isSlash ? ctx.getOption('reason') : ctx.args.slice(2).join(' ')) || 'No reason provided';
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  const ms = parseDuration(durStr);
  if (!ms) return reply(ctx, { content: '❌ Invalid duration.' });
  if (ms > 2419200000) return reply(ctx, { content: '❌ Max timeout is 28 days.' });
  await target.timeout(ms, reason);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.yellow).setTitle('🔇 User Timed Out').setThumbnail(target.user.displayAvatarURL()).addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '⏱️ Duration', value: formatDuration(ms), inline: true }, { name: '📋 Reason', value: reason, inline: true })] });
}
async function runUnmute(ctx) {
  if (!hasModPerms(ctx)) return reply(ctx, { content: '❌ Moderate Members permission required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  await target.timeout(null);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Timeout removed from **${target.user.tag}**`)] });
}
async function runWarn(ctx) {
  if (!hasModPerms(ctx)) return reply(ctx, { content: '❌ Moderate Members permission required.' });
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  const reason = (ctx.isSlash ? ctx.getOption('reason') : ctx.args.slice(1).join(' ')) || 'No reason provided';
  const mod = ctx.isSlash ? ctx.interaction.user : ctx.message.author;
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  config = loadConfig();
  if (!config.warnData[target.id]) config.warnData[target.id] = [];
  config.warnData[target.id].push({ reason, mod: mod.tag, date: new Date().toISOString() });
  saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.yellow).setTitle('⚠️ User Warned').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 User', value: target.tag, inline: true }, { name: '⚠️ Warnings', value: `${config.warnData[target.id].length}`, inline: true }, { name: '📋 Reason', value: reason }, { name: '🛡️ Moderator', value: mod.tag, inline: true })] });
}
async function runWarnings(ctx) {
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  config = loadConfig();
  const warns = config.warnData?.[target.id] || [];
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.yellow).setTitle(`⚠️ Warnings — ${target.username}`).setThumbnail(target.displayAvatarURL()).setDescription(warns.length === 0 ? 'No warnings.' : warns.map((w, i) => `**${i + 1}.** ${w.reason} — by ${w.mod}`).join('\n'))] });
}
async function runClearWarnings(ctx) {
  if (!hasModPerms(ctx)) return reply(ctx, { content: '❌ Moderate Members permission required.' });
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  config = loadConfig(); config.warnData[target.id] = []; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Cleared warnings for **${target.tag}**`)] });
}
async function runPurge(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return reply(ctx, { content: '❌ Manage Messages permission required.' });
  const amount = ctx.isSlash ? ctx.getOption('amount') : parseInt(ctx.args[0]);
  if (!amount || amount < 1 || amount > 100) return reply(ctx, { content: '❌ Amount must be 1–100.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.reply({ content: '🗑️ Purging...', ephemeral: true });
  const deleted = await channel.bulkDelete(amount, true).catch(() => null);
  const m = await channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(`🗑️ Deleted **${deleted?.size || 0}** message(s).`)] });
  setTimeout(() => m.delete().catch(() => {}), 3000);
}
async function runLock(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return reply(ctx, { content: '❌ Manage Channels permission required.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.permissionOverwrites.edit(ctx.guild.id, { SendMessages: false });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(`🔒 **${channel.name}** locked.`)] });
}
async function runUnlock(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return reply(ctx, { content: '❌ Manage Channels permission required.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.permissionOverwrites.edit(ctx.guild.id, { SendMessages: null });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`🔓 **${channel.name}** unlocked.`)] });
}
async function runSlowmode(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) return reply(ctx, { content: '❌ Manage Channels permission required.' });
  const seconds = ctx.isSlash ? ctx.getOption('seconds') : parseInt(ctx.args[0]);
  if (isNaN(seconds) || seconds < 0 || seconds > 21600) return reply(ctx, { content: '❌ Seconds must be 0–21600.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.setRateLimitPerUser(seconds);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.cyan).setDescription(seconds === 0 ? `✅ Slowmode disabled in **${channel.name}**` : `✅ Slowmode set to **${seconds}s** in **${channel.name}**`)] });
}

// Fun
async function runAnnounce(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  const msg = ctx.isSlash ? ctx.getOption('message') : ctx.args.join(' ');
  const title = ctx.isSlash ? (ctx.getOption('title') || '📢 Announcement') : '📢 Announcement';
  if (!msg) return reply(ctx, { content: '❌ Please provide a message.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Sent!', ephemeral: true });
  await channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.orange).setTitle(title).setDescription(msg).setTimestamp()] });
}
async function runPoll(ctx) {
  const question = ctx.isSlash ? ctx.getOption('question') : ctx.args.join(' ');
  if (!question) return reply(ctx, { content: '❌ Please provide a question.' });
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Poll created!', ephemeral: true });
  const pollMsg = await channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle('📊 Poll').setDescription(`**${question}**\n\n✅ Yes   ❌ No`).setFooter({ text: 'React to vote!' }).setTimestamp()] });
  await pollMsg.react('✅');
  await pollMsg.react('❌');
}
async function runGiveaway(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  const durStr = ctx.isSlash ? ctx.getOption('duration') : ctx.args[0];
  const prize = ctx.isSlash ? ctx.getOption('prize') : ctx.args.slice(1).join(' ');
  const winnerCount = (ctx.isSlash ? ctx.getOption('winners') : 1) || 1;
  if (!durStr || !prize) return reply(ctx, { content: '❌ Usage: `$giveaway <duration> <prize>`' });
  const ms = parseDuration(durStr);
  if (!ms) return reply(ctx, { content: '❌ Invalid duration.' });
  const endsAt = Date.now() + ms;
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  if (ctx.isSlash) await ctx.interaction.reply({ content: '🎉 Giveaway started!', ephemeral: true });
  const gMsg = await channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.orange).setTitle('🎉 GIVEAWAY 🎉').setDescription(`**Prize:** ${prize}\n**Winners:** ${winnerCount}\n**Ends:** <t:${Math.floor(endsAt / 1000)}:R>\n\nReact with 🎉 to enter!`).setTimestamp(endsAt)] });
  await gMsg.react('🎉');
  setTimeout(async () => {
    const fetched = await gMsg.fetch().catch(() => null);
    if (!fetched) return;
    const reactions = fetched.reactions.cache.get('🎉');
    const users = await reactions?.users.fetch();
    const eligible = users?.filter(u => !u.bot).map(u => u);
    if (!eligible || eligible.length === 0) return gMsg.edit({ embeds: [new EmbedBuilder().setColor(COLORS.red).setTitle('🎉 GIVEAWAY ENDED').setDescription(`**Prize:** ${prize}\n\nNo valid entries.`)] });
    const winners = [], pool = [...eligible.values()];
    for (let i = 0; i < Math.min(winnerCount, pool.length); i++) { const idx = Math.floor(Math.random() * pool.length); winners.push(pool.splice(idx, 1)[0]); }
    const winnerStr = winners.map(w => `<@${w.id}>`).join(', ');
    await gMsg.edit({ embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('🎉 GIVEAWAY ENDED').setDescription(`**Prize:** ${prize}\n**Winner(s):** ${winnerStr}\n\nCongratulations! 🎊`)] });
    await channel.send({ content: `🎉 Congrats ${winnerStr}! You won **${prize}**!` });
  }, ms);
}
async function runRole(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return reply(ctx, { content: '❌ Manage Roles permission required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!target || !role) return reply(ctx, { content: '❌ Please mention a user and a role.' });
  if (target.roles.cache.has(role.id)) { await target.roles.remove(role); await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(`✅ Removed **${role.name}** from **${target.user.tag}**`)] }); }
  else { await target.roles.add(role); await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Gave **${role.name}** to **${target.user.tag}**`)] }); }
}

// Info
async function runServerInfo(ctx) {
  const g = ctx.guild;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle(`📊 ${g.name}`).setThumbnail(g.iconURL()).addFields({ name: '👑 Owner', value: `<@${g.ownerId}>`, inline: true }, { name: '👥 Members', value: `${g.memberCount}`, inline: true }, { name: '🎭 Roles', value: `${g.roles.cache.size}`, inline: true }, { name: '📁 Channels', value: `${g.channels.cache.size}`, inline: true }, { name: '📅 Created', value: `<t:${Math.floor(g.createdTimestamp / 1000)}:F>` })] });
}
async function runUserInfo(ctx) {
  const member = ctx.isSlash ? (ctx.getMemberOption('user') || ctx.member) : (ctx.message.mentions.members.first() || ctx.member);
  const user = member.user;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle(`👤 ${user.tag}`).setThumbnail(user.displayAvatarURL()).addFields({ name: 'ID', value: user.id, inline: true }, { name: 'Nickname', value: member.nickname || 'None', inline: true }, { name: 'Joined', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` }, { name: 'Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>` }, { name: 'Roles', value: member.roles.cache.filter(r => r.id !== ctx.guild.id).map(r => r.toString()).join(', ') || 'None' })] });
}
async function runAvatar(ctx) {
  const user = ctx.isSlash ? (ctx.getUserOption('user') || ctx.interaction.user) : (ctx.message.mentions.users.first() || ctx.message.author);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle(`🖼️ ${user.tag}'s Avatar`).setImage(user.displayAvatarURL({ size: 1024 }))] });
}
async function runBanner(ctx) {
  const user = ctx.isSlash ? (ctx.getUserOption('user') || ctx.interaction.user) : (ctx.message.mentions.users.first() || ctx.message.author);
  const fetched = await user.fetch();
  if (!fetched.banner) return reply(ctx, { content: `❌ **${user.tag}** has no banner.` });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle(`🖼️ ${user.tag}'s Banner`).setImage(fetched.bannerURL({ size: 1024 }))] });
}
async function runMemberCount(ctx) { await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setDescription(`👥 **${ctx.guild.memberCount}** members`)] }); }
async function runPing(ctx) { await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setDescription(`🏓 Pong! **${client.ws.ping}ms**`)] }); }
async function runUptime(ctx) {
  const u = process.uptime();
  const h = Math.floor(u / 3600), m = Math.floor((u % 3600) / 60), s = Math.floor(u % 60);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setDescription(`⏱️ Uptime: **${h}h ${m}m ${s}s**`)] });
}
async function runBotInfo(ctx) {
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setTitle('🤖 Bot Info').addFields({ name: 'Name', value: client.user.tag, inline: true }, { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true }, { name: 'Ping', value: `${client.ws.ping}ms`, inline: true })] });
}
async function runAfk(ctx) {
  const reason = (ctx.isSlash ? ctx.getOption('reason') : ctx.args.join(' ')) || 'AFK';
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  afkUsers.set(userId, { reason, time: Date.now() });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.blue).setDescription(`💤 You are now AFK: **${reason}**`)] });
}
async function runNickname(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageNicknames)) return reply(ctx, { content: '❌ Manage Nicknames permission required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  const name = ctx.isSlash ? (ctx.getOption('name') || null) : (ctx.args.slice(1).join(' ') || null);
  await target.setNickname(name);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(name ? `✅ Nickname set to **${name}** for ${target.user.tag}` : `✅ Nickname reset for ${target.user.tag}`)] });
}
async function runFill(ctx) {
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) return reply(ctx, { content: '❌ Manage Roles permission required.' });
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
  const embed = new EmbedBuilder().setColor(added.length > 0 ? COLORS.green : COLORS.red).setTitle('⚡ Fill Complete')
    .addFields({ name: `✅ Added (${added.length})`, value: added.length ? added.map(r => `• ${r}`).join('\n') : 'None', inline: true }, { name: `❌ Failed (${failed.length})`, value: failed.length ? failed.map(r => `• ${r}`).join('\n') : 'None', inline: true });
  if (ctx.isSlash) await ctx.interaction.editReply({ content: '', embeds: [embed] });
  else await statusMsg.edit({ content: '', embeds: [embed] });
}

// ─────────────────────────────────────────────────────────────
// GAMBLING
// ─────────────────────────────────────────────────────────────
async function runBalance(ctx) {
  const target = ctx.isSlash ? (ctx.getUserOption('user') || ctx.interaction.user) : (ctx.message.mentions.users.first() || ctx.message.author);
  const bal = getBalance(target.id);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.purple).setTitle('💰 Balance').setThumbnail(target.displayAvatarURL()).addFields({ name: '👤 User', value: `<@${target.id}>`, inline: true }, { name: '🪙 Coins', value: `**${bal.toLocaleString()}**`, inline: true })] });
}
async function runGamble(ctx) {
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  const amount = ctx.isSlash ? ctx.getOption('amount') : parseInt(ctx.args[0]);
  if (!amount || amount <= 0) return reply(ctx, { content: '❌ Please provide a valid amount.' });
  const bal = getBalance(userId);
  if (bal < amount) return reply(ctx, { content: `❌ You only have **${bal}** coins.` });
  const win = Math.random() < 0.45;
  const newBal = win ? addBalance(userId, amount) : addBalance(userId, -amount);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(win ? COLORS.green : COLORS.red).setTitle(win ? '🎉 You Won!' : '💸 You Lost!').addFields({ name: win ? '✅ Winnings' : '❌ Lost', value: `**${amount.toLocaleString()}** coins`, inline: true }, { name: '🏦 New Balance', value: `**${newBal.toLocaleString()}** coins`, inline: true }).setFooter({ text: win ? 'Lucky! 🍀' : 'Better luck next time!' })] });
}
async function runFlip(ctx) {
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  const amount = ctx.isSlash ? ctx.getOption('amount') : parseInt(ctx.args[0]);
  const side = (ctx.isSlash ? ctx.getOption('side') : ctx.args[1] || '').toLowerCase();
  if (!amount || amount <= 0) return reply(ctx, { content: '❌ Please provide a valid amount.' });
  if (!['heads', 'tails'].includes(side)) return reply(ctx, { content: '❌ Please choose `heads` or `tails`.' });
  const bal = getBalance(userId);
  if (bal < amount) return reply(ctx, { content: `❌ You only have **${bal}** coins.` });
  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const win = result === side;
  const newBal = win ? addBalance(userId, amount) : addBalance(userId, -amount);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(win ? COLORS.green : COLORS.red).setTitle(`🪙 Coin Flip — ${result === 'heads' ? '🟡 Heads' : '⚪ Tails'}`).setDescription(win ? `✅ You guessed **${side}** and won!` : `❌ You guessed **${side}** but it was **${result}**.`).addFields({ name: win ? '✅ Won' : '❌ Lost', value: `**${amount.toLocaleString()}** coins`, inline: true }, { name: '🏦 Balance', value: `**${newBal.toLocaleString()}** coins`, inline: true })] });
}
const SLOT_EMOJIS = ['🍒', '🍋', '🍊', '🍇', '⭐', '💎', '7️⃣'];
const SLOT_MULTIPLIERS = { '7️⃣': 10, '💎': 7, '⭐': 5, '🍇': 3, '🍊': 2, '🍋': 2, '🍒': 1.5 };
async function runSlots(ctx) {
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  const amount = ctx.isSlash ? ctx.getOption('amount') : parseInt(ctx.args[0]);
  if (!amount || amount <= 0) return reply(ctx, { content: '❌ Please provide a valid amount.' });
  const bal = getBalance(userId);
  if (bal < amount) return reply(ctx, { content: `❌ You only have **${bal}** coins.` });
  const roll = () => SLOT_EMOJIS[Math.floor(Math.random() * SLOT_EMOJIS.length)];
  const s1 = roll(), s2 = roll(), s3 = roll();
  let multiplier = 0;
  if (s1 === s2 && s2 === s3) multiplier = SLOT_MULTIPLIERS[s1] || 2;
  else if (s1 === s2 || s2 === s3 || s1 === s3) multiplier = 0.5;
  let newBal, resultText;
  if (multiplier === 0) { newBal = addBalance(userId, -amount); resultText = `❌ No match. Lost **${amount.toLocaleString()}** coins.`; }
  else if (multiplier < 1) { const won = Math.floor(amount * multiplier); newBal = addBalance(userId, -(amount - won)); resultText = `🎯 Partial match! Got back **${won.toLocaleString()}** coins.`; }
  else { const won = Math.floor(amount * multiplier); newBal = addBalance(userId, won - amount); resultText = multiplier >= 5 ? `🎰 **JACKPOT!** Won **${won.toLocaleString()}** coins! 🎉` : `✅ Winner! Won **${won.toLocaleString()}** coins!`; }
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(multiplier > 1 ? COLORS.green : multiplier > 0 ? COLORS.yellow : COLORS.red).setTitle('🎰 Slot Machine').setDescription(`[ ${s1} | ${s2} | ${s3} ]\n\n${resultText}`).addFields({ name: '🏦 Balance', value: `**${newBal.toLocaleString()}** coins`, inline: true }).setFooter({ text: '7️⃣×10  💎×7  ⭐×5  🍇×3  🍊/🍋×2  🍒×1.5' })] });
}
const robCooldowns = new Map();
const dailyCooldowns = new Map();
async function runRob(ctx) {
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (target.id === userId) return reply(ctx, { content: '❌ Cannot rob yourself.' });
  if (target.bot) return reply(ctx, { content: '❌ Cannot rob a bot.' });
  const cooldown = robCooldowns.get(userId);
  if (cooldown && Date.now() < cooldown) { const left = Math.ceil((cooldown - Date.now()) / 1000); return reply(ctx, { content: `❌ Cooldown! Try in **${left}s**.` }); }
  robCooldowns.set(userId, Date.now() + 60000);
  const targetBal = getBalance(target.id);
  if (targetBal < 50) return reply(ctx, { content: `❌ **${target.username}** is too broke to rob!` });
  const success = Math.random() < 0.4;
  if (success) { const stolen = Math.floor(targetBal * (0.1 + Math.random() * 0.2)); addBalance(target.id, -stolen); const newBal = addBalance(userId, stolen); await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('🦹 Robbery Successful!').setDescription(`You robbed **${stolen.toLocaleString()}** coins from <@${target.id}>!`).addFields({ name: '🏦 Your Balance', value: `**${newBal.toLocaleString()}** coins`, inline: true })] }); }
  else { const fine = Math.floor(getBalance(userId) * 0.1); const newBal = addBalance(userId, -fine); await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.red).setTitle('👮 Caught!').setDescription(`You got caught and paid a **${fine.toLocaleString()}** coin fine!`).addFields({ name: '🏦 Your Balance', value: `**${newBal.toLocaleString()}** coins`, inline: true })] }); }
}
async function runDaily(ctx) {
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  const cooldown = dailyCooldowns.get(userId);
  if (cooldown && Date.now() < cooldown) { const left = Math.ceil((cooldown - Date.now()) / 3600000); return reply(ctx, { content: `❌ Already claimed! Come back in **${left}h**.` }); }
  dailyCooldowns.set(userId, Date.now() + 86400000);
  const newBal = addBalance(userId, 200);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('🎁 Daily Reward!').setDescription('You claimed your daily **200** coins!').addFields({ name: '🏦 Balance', value: `**${newBal.toLocaleString()}** coins`, inline: true }).setFooter({ text: 'Come back in 24 hours!' })] });
}
async function runLeaderboard(ctx) {
  config = loadConfig();
  const entries = Object.entries(config.gamblingData || {}).sort(([, a], [, b]) => b - a).slice(0, 10);
  if (entries.length === 0) return reply(ctx, { content: '❌ No one has any coins yet!' });
  const medals = ['🥇', '🥈', '🥉'];
  const desc = entries.map(([id, bal], i) => `${medals[i] || `**${i + 1}.**`} <@${id}> — **${bal.toLocaleString()}** coins`).join('\n');
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.purple).setTitle('🏆 Coin Leaderboard').setDescription(desc)] });
}
async function runSetCoins(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  const amount = ctx.isSlash ? ctx.getOption('amount') : parseInt(ctx.args[1]);
  if (!target || isNaN(amount)) return reply(ctx, { content: '❌ Usage: `setcoins @user <amount>`' });
  setBalance(target.id, amount);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Set **${target.tag}**'s coins to **${amount.toLocaleString()}**.`)] });
}

// ─────────────────────────────────────────────────────────────
// TICKET CREATION — TRADING
// ─────────────────────────────────────────────────────────────
async function createTradingTicket(interaction) {
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
  const joinLinks = isIngame ? interaction.fields.getTextInputValue('join_links') : null;
  const robloxUsers = isIngame ? (interaction.fields.getTextInputValue('roblox_users') || 'N/A') : null;
  const paymentMethod = !isIngame ? interaction.fields.getTextInputValue('payment_method') : null;

  const embed = new EmbedBuilder().setColor(COLORS.orange).setTitle(config.ticketTitle || 'Ticket Opened')
    .setDescription(`> 👋 Thanks for creating a ticket!\n> A **Middleman** will be with you shortly.\n\n─────────────────────────`)
    .addFields(
      { name: '👤 Opened by', value: `<@${user.id}>`, inline: true },
      { name: '🤝 Trading with', value: tradingWithMember ? `<@${tradingWithMember.id}>` : `\`${tradingWith}\``, inline: true },
      { name: '🏷️ Type', value: typeLabel, inline: true },
      { name: '📋 Trade Details', value: `\`\`\`${tradeDetails}\`\`\`` },
    );
  if (isIngame) embed.addFields({ name: '🔗 Join Links Available?', value: joinLinks, inline: true }, { name: '🎮 Roblox Usernames', value: robloxUsers, inline: true });
  else embed.addFields({ name: '💸 Payment Method', value: paymentMethod, inline: true });
  if (config.ticketImageUrl) embed.setImage(config.ticketImageUrl);
  embed.setThumbnail(user.displayAvatarURL({ size: 256 })).setFooter({ text: 'A middleman will claim this ticket shortly.' }).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('claim_ticket').setLabel('✅ Claim').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
  );

  let ping = `<@${user.id}>`;
  if (tradingWithMember) ping += ` <@${tradingWithMember.id}>`;
  if (config.mmRoleId) ping += ` <@&${config.mmRoleId}>`;

  await ticketChannel.send({ content: ping, embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Ticket created: ${ticketChannel}` });
}

// ─────────────────────────────────────────────────────────────
// TICKET CREATION — SUPPORT
// ─────────────────────────────────────────────────────────────
async function createSupportTicket(interaction, type, typeLabel) {
  config = loadConfig();
  const guild = interaction.guild;
  const user = interaction.user;

  const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}-${Date.now().toString().slice(-4)}`;
  let ticketChannel;
  try {
    const overwrites = [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory] },
    ];
    if (config.mmRoleId) overwrites.push({ id: config.mmRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
    if (config.supportRoleId) overwrites.push({ id: config.supportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
    const opts = { name: channelName, type: ChannelType.GuildText, permissionOverwrites: overwrites };
    // Use supportCategoryId if set, otherwise fall back to ticketCategoryId
    if (config.supportCategoryId) opts.parent = config.supportCategoryId;
    else if (config.ticketCategoryId) opts.parent = config.ticketCategoryId;
    ticketChannel = await guild.channels.create(opts);
  } catch (e) {
    return interaction.editReply({ content: '❌ Could not create ticket channel. Check my **Manage Channels** permission.' });
  }

  const embed = new EmbedBuilder().setColor(COLORS.blue)
    .setTitle(`${config.supportTicketTitle || 'Support Ticket'} — ${typeLabel}`)
    .setDescription(`> 👋 Thanks for opening a support ticket!\n> A **staff member** will be with you shortly.\n\n─────────────────────────`)
    .addFields(
      { name: '👤 Opened by', value: `<@${user.id}>`, inline: true },
      { name: '📋 Category', value: typeLabel, inline: true },
      { name: '📅 Opened At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
    );
  if (config.supportTicketImageUrl) embed.setImage(config.supportTicketImageUrl);
  embed.setThumbnail(user.displayAvatarURL({ size: 256 })).setFooter({ text: 'Please describe your issue and wait for staff.' }).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('claim_ticket').setLabel('✅ Claim').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
  );

  let ping = `<@${user.id}>`;
  if (config.supportRoleId) ping += ` <@&${config.supportRoleId}>`;
  else if (config.mmRoleId) ping += ` <@&${config.mmRoleId}>`;

  await ticketChannel.send({ content: ping, embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Support ticket created: ${ticketChannel}` });
}

// ─────────────────────────────────────────────────────────────
// TICKET CREATION — AI MIDDLEMAN
// ─────────────────────────────────────────────────────────────
async function createAITicket(interaction) {
  config = loadConfig();
  const guild = interaction.guild;
  const user = interaction.user;

  const channelName = `ai-ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16)}-${Date.now().toString().slice(-4)}`;
  let ticketChannel;
  try {
    const overwrites = [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory] },
    ];
    if (config.mmRoleId) overwrites.push({ id: config.mmRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
    if (config.supportRoleId) overwrites.push({ id: config.supportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
    const opts = { name: channelName, type: ChannelType.GuildText, permissionOverwrites: overwrites };
    if (config.aiCategoryId) opts.parent = config.aiCategoryId;
    else if (config.ticketCategoryId) opts.parent = config.ticketCategoryId;
    ticketChannel = await guild.channels.create(opts);
  } catch (e) {
    return interaction.editReply({ content: '❌ Could not create AI ticket channel. Check my **Manage Channels** permission.' });
  }

  // Opening embed
  const openEmbed = new EmbedBuilder()
    .setColor(COLORS.ai)
    .setTitle(config.aiTicketTitle || 'AI Middleman Ticket')
    .setDescription(
      `> 👋 Welcome, <@${user.id}>!\n` +
      `> Your **AI Middleman** is ready to assist you.\n\n` +
      `─────────────────────────\n` +
      `📋 **To get started, please tell the AI:**\n` +
      `• Who you are trading with (mention them or share their username)\n` +
      `• What items/values are being traded\n` +
      `• Your Roblox usernames\n\n` +
      `The AI will guide you step-by-step through the trade process.\n\n` +
      `💡 *Type your first message below to begin.*`
    )
    .addFields(
      { name: '👤 Opened by', value: `<@${user.id}>`, inline: true },
      { name: '📅 Opened At', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
      { name: '🤖 AI Status', value: process.env.ANTHROPIC_API_KEY ? '✅ Online' : '⚠️ No API key set', inline: true },
    )
    .setThumbnail(user.displayAvatarURL({ size: 256 }))
    .setFooter({ text: '🤖 AI Middleman • Roblox Values • Human staff can be requested anytime' })
    .setTimestamp();

  if (config.aiTicketImageUrl) openEmbed.setImage(config.aiTicketImageUrl);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close_ticket_btn').setLabel('🔒 Close Ticket').setStyle(ButtonStyle.Danger),
  );

  let ping = `<@${user.id}>`;
  if (config.mmRoleId) ping += ` <@&${config.mmRoleId}>`;

  await ticketChannel.send({ content: ping, embeds: [openEmbed], components: [row] });

  // AI sends opening greeting
  const systemPrompt = config.aiSystemPrompt || getDefaultAISystemPrompt();
  const greeting = await callAI([{ role: 'user', content: `A new ticket was opened by ${user.username}. Please greet them and ask for their trade details.` }], systemPrompt);

  if (greeting) {
    const greetEmbed = new EmbedBuilder()
      .setColor(COLORS.ai)
      .setDescription(greeting)
      .setFooter({ text: '🤖 AI Middleman • Roblox Values' });
    await ticketChannel.send({ embeds: [greetEmbed] });

    // Save greeting to history
    aiTicketHistory.set(ticketChannel.id, [
      { role: 'user', content: `New ticket opened by ${user.username}. Greet them.` },
      { role: 'assistant', content: greeting },
    ]);
  } else {
    // Fallback if no API key
    const fallbackEmbed = new EmbedBuilder()
      .setColor(COLORS.yellow)
      .setDescription(`👋 Hello <@${user.id}>! Please describe your trade and I'll guide you through it.\n\n*(Note: AI responses require \`ANTHROPIC_API_KEY\` in your .env file)*`)
      .setFooter({ text: '🤖 AI Middleman • Roblox Values' });
    await ticketChannel.send({ embeds: [fallbackEmbed] });
  }

  await interaction.editReply({ content: `✅ AI Middleman ticket created: ${ticketChannel}` });
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
async function reply(ctx, options) {
  try {
    if (ctx.isSlash) {
      if (ctx.interaction.deferred || ctx.interaction.replied) return ctx.interaction.editReply(options);
      return ctx.interaction.reply(options);
    }
    return ctx.message.reply(options);
  } catch (e) { console.error('Reply failed:', e); }
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
function formatTimeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}
function hasAdmin(ctx) { return ctx.member.permissions.has(PermissionsBitField.Flags.Administrator); }
function hasManageGuild(ctx) { return ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild); }
function hasModPerms(ctx) { return ctx.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) || ctx.member.permissions.has(PermissionsBitField.Flags.ManageGuild); }

process.on('unhandledRejection', (err) => { console.error('Unhandled rejection:', err); });
process.on('uncaughtException', (err) => { console.error('Uncaught exception:', err); });

client.login(process.env.DISCORD_TOKEN);
