const {
  Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle, ChannelType,
  SlashCommandBuilder, REST, Routes, AttachmentBuilder, Role
} = require('discord.js');
const fs = require('fs');
const https = require('https');

// ═══════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════
const CONFIG_FILE = './config.json';
function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    const d = {
      prefix: '$', mmRoleId: null, ticketCategoryId: null,
      supportCategoryId: null, vouchData: {}, vacationData: {},
      panelMessages: [], yukicMessages: [], warnData: {}, giveaways: [],
      yukicMessage: null, yukicTriggerRoleId: null, yukicAcceptRoleId: null,
      panelImageUrl: null,
      tpanelImageUrl: null, spanelImageUrl: null,
      ticketImageUrl: null, supportTicketImageUrl: null,
      tpanelTitle: 'Middleman Service',
      tpanelDescription: null,
      spanelTitle: 'Support Ticket',
      spanelDescription: null,
      ticketTitle: 'Ticket Opened',
      supportTicketTitle: 'Support Ticket',
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
      tpanelEmbedIds: [], spanelEmbedIds: [],
      helpRoleId: null,
      // NEW FEATURES
      ticketMode: 'channel', // 'channel' or 'thread'
      cryptoAddresses: {}, // userId -> { btc, eth, ltc, sol, usdt, usdc }
      escrowData: {}, // active escrow deals
      spamProtection: true,
      banKickProtection: true,
      autoVouchEnabled: false,
      modRoleIds: { ban: null, kick: null, roleadd: null },
      viewTicketsRoleId: null,
      promoteLogChannelId: null,
      promoteMinRoleId: null,
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
    gamblingData: {}, tpanelEmbedIds: [], spanelEmbedIds: [],
    yukicMessage: null, yukicTriggerRoleId: null, yukicAcceptRoleId: null,
    welcomeChannelId: null, welcomeEnabled: false,
    welcomeTitle: 'Welcome to the server!', welcomeMessage: 'We hope you enjoy your stay.',
    rulesChannelId: null, mmRequestChannelId: null,
    yukicCommandName: 'yukic', autoRoleId: null,
    transcriptChannelId: null, supportRoleId: null,
    panelText: 'Roblox Values',
    tpanelImageUrl: null, spanelImageUrl: null,
    ticketImageUrl: null, supportTicketImageUrl: null,
    tpanelTitle: 'Middleman Service', tpanelDescription: null,
    spanelTitle: 'Support Ticket', spanelDescription: null,
    ticketTitle: 'Ticket Opened', supportTicketTitle: 'Support Ticket',
    helpRoleId: null,
    ticketMode: 'channel',
    cryptoAddresses: {},
    escrowData: {},
    spamProtection: true,
    banKickProtection: true,
    autoVouchEnabled: false,
    modRoleIds: { ban: null, kick: null, roleadd: null },
    viewTicketsRoleId: null,
    promoteLogChannelId: null,
    promoteMinRoleId: null,
  };
  for (const [k, v] of Object.entries(defaults)) {
    if (cfg[k] === undefined || (cfg[k] === null && v !== null)) {
      if (cfg[k] === undefined) cfg[k] = v;
    }
  }
  if (!cfg.tpanelImageUrl) cfg.tpanelImageUrl = cfg.panelImageUrl || null;
  if (!cfg.spanelImageUrl) cfg.spanelImageUrl = cfg.panelImageUrl || null;
  if (!cfg.ticketImageUrl) cfg.ticketImageUrl = cfg.panelImageUrl || null;
  if (!cfg.supportTicketImageUrl) cfg.supportTicketImageUrl = cfg.panelImageUrl || null;
  return cfg;
}
function saveConfig(cfg) { fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2)); }
let config = loadConfig();

// ═══════════════════════════════════════════════════════════════
// COLORS & UTILS
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  orange: 0xf5a623, green: 0x57f287, red: 0xed4245,
  blue: 0x5865f2, cyan: 0x00b0f4, purple: 0x9b59b6,
  yellow: 0xffa500, pink: 0xff6b9d, gold: 0xFFD700,
  dark: 0x2f3136, crypto: 0x00ff88, thread: 0x9b59b6,
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

// ═══════════════════════════════════════════════════════════════
// EMBED BUILDER SESSION STORE
// ═══════════════════════════════════════════════════════════════
const embedSessions = {};
function sessionEmbed(userId) {
  if (!embedSessions[userId]) {
    embedSessions[userId] = { title: null, description: null, color: COLORS.orange, author: null, authorIcon: null, footer: null, footerIcon: null, image: null, thumbnail: null, fields: [], roleButtons: [] };
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
      new ButtonBuilder().setCustomId(`eb_addrolebtn_${userId}`).setLabel('Add Role Btn').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`eb_send_${userId}`).setLabel('Send').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`eb_save_${userId}`).setLabel('Save Only').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`eb_cancel_${userId}`).setLabel('Cancel').setStyle(ButtonStyle.Danger),
    ),
  ];
}

// ═══════════════════════════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════════════════════════
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// ═══════════════════════════════════════════════════════════════
// SLASH COMMANDS
// ═══════════════════════════════════════════════════════════════
const slashCommands = [
  new SlashCommandBuilder().setName('help').setDescription('Show all commands'),
  new SlashCommandBuilder().setName('tpanel').setDescription('Send the trading/middleman ticket panel'),
  new SlashCommandBuilder().setName('spanel').setDescription('Send the support ticket panel'),
  new SlashCommandBuilder().setName('panel').setDescription('Send the trading ticket panel (alias)'),
  new SlashCommandBuilder().setName('setmmrole').setDescription('Set the middleman role').addRoleOption(o => o.setName('role').setDescription('MM role').setRequired(true)),
  new SlashCommandBuilder().setName('setcategory').setDescription('Set trading ticket category').addChannelOption(o => o.setName('category').setDescription('Category').setRequired(true)),
  new SlashCommandBuilder().setName('setsupportcategory').setDescription('Set support ticket category').addChannelOption(o => o.setName('category').setDescription('Category').setRequired(true)),
  new SlashCommandBuilder().setName('settranscriptchannel').setDescription('Set channel for ticket transcripts').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
  new SlashCommandBuilder().setName('setsupportrole').setDescription('Set the role pinged for support tickets').addRoleOption(o => o.setName('role').setDescription('Support role').setRequired(true)),
  new SlashCommandBuilder().setName('setprefix').setDescription('Change the bot prefix').addStringOption(o => o.setName('prefix').setDescription('New prefix').setRequired(true)),
  new SlashCommandBuilder().setName('settradingpanelimage').setDescription('Set image on the trading panel embed').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setsupportpanelimage').setDescription('Set image on the support panel embed').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setticketimage').setDescription('Set image inside trading ticket channels').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setsupportticketimage').setDescription('Set image inside support ticket channels').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('setpicture').setDescription('Set image on ALL panels and tickets at once').addAttachmentOption(o => o.setName('image').setDescription('Image').setRequired(true)),
  new SlashCommandBuilder().setName('settpanetitle').setDescription('Set the trading panel title').addStringOption(o => o.setName('title').setDescription('New title').setRequired(true)),
  new SlashCommandBuilder().setName('settpaneldesc').setDescription('Set the trading panel description').addStringOption(o => o.setName('description').setDescription('New description').setRequired(true)),
  new SlashCommandBuilder().setName('setspanetitle').setDescription('Set the support panel title').addStringOption(o => o.setName('title').setDescription('New title').setRequired(true)),
  new SlashCommandBuilder().setName('setspaneldesc').setDescription('Set the support panel description').addStringOption(o => o.setName('description').setDescription('New description').setRequired(true)),
  new SlashCommandBuilder().setName('settickettitle').setDescription('Set the trading ticket embed title').addStringOption(o => o.setName('title').setDescription('New title').setRequired(true)),
  new SlashCommandBuilder().setName('setsupporttickettitle').setDescription('Set the support ticket embed title').addStringOption(o => o.setName('title').setDescription('New title').setRequired(true)),
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
  // NEW COMMANDS
  new SlashCommandBuilder().setName('escrowpanel').setDescription('Send the crypto escrow panel'),
  new SlashCommandBuilder().setName('btc').setDescription('Check Bitcoin price'),
  new SlashCommandBuilder().setName('eth').setDescription('Check Ethereum price'),
  new SlashCommandBuilder().setName('ltc').setDescription('Check Litecoin price'),
  new SlashCommandBuilder().setName('sol').setDescription('Check Solana price'),
  new SlashCommandBuilder().setName('bal').setDescription('Check wallet balance').addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(true)),
  new SlashCommandBuilder().setName('setaddy').setDescription('Save your wallet address').addStringOption(o => o.setName('coin').setDescription('btc/eth/ltc/sol/usdt/usdc').setRequired(true)).addStringOption(o => o.setName('address').setDescription('Wallet address').setRequired(true)),
  new SlashCommandBuilder().setName('addy').setDescription('View your saved wallets'),
  new SlashCommandBuilder().setName('mybal').setDescription('Check your saved wallet balances'),
  new SlashCommandBuilder().setName('search').setDescription('View someone\'s saved wallets').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('coinflip').setDescription('Flip a coin'),
  new SlashCommandBuilder().setName('dice').setDescription('Roll dice').addStringOption(o => o.setName('roll').setDescription('e.g. 2d6, 3d20').setRequired(true)),
  new SlashCommandBuilder().setName('8ball').setDescription('Ask the magic 8ball').addStringOption(o => o.setName('question').setDescription('Your question').setRequired(true)),
  new SlashCommandBuilder().setName('roast').setDescription('Roast someone').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)),
  new SlashCommandBuilder().setName('dih').setDescription('Do I have? Ask the bot'),
  new SlashCommandBuilder().setName('steal').setDescription('Copy a custom emoji to your server').addStringOption(o => o.setName('emoji').setDescription('Emoji to steal').setRequired(true)),
  new SlashCommandBuilder().setName('whopinged').setDescription('See who recently pinged you'),
  new SlashCommandBuilder().setName('promote').setDescription('Promote a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role to give').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('demote').setDescription('Demote a user').addUserOption(o => o.setName('user').setDescription('User').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role to remove').setRequired(true)).addStringOption(o => o.setName('reason').setDescription('Reason')),
  new SlashCommandBuilder().setName('revamp').setDescription('Revamp bot & server branding').addStringOption(o => o.setName('type').setDescription('botname/boticon/botbanner/servername/servericon').setRequired(true)).addStringOption(o => o.setName('value').setDescription('New value or URL').setRequired(true)),
  new SlashCommandBuilder().setName('settings').setDescription('Bot settings').addStringOption(o => o.setName('setting').setDescription('ticketmode/spam/bankick/autovouch').setRequired(true)).addStringOption(o => o.setName('value').setDescription('value').setRequired(true)),
  new SlashCommandBuilder().setName('setmodrole').setDescription('Set mod role for a command').addStringOption(o => o.setName('command').setDescription('ban/kick/roleadd').setRequired(true)).addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('setviewtickets').setDescription('Set role that can view tickets').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('setpromoteminrole').setDescription('Set minimum role for promote/demote').addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)),
  new SlashCommandBuilder().setName('setpromotelog').setDescription('Set promote/demote log channel').addChannelOption(o => o.setName('channel').setDescription('Channel').setRequired(true)),
];

async function registerSlashCommands() {
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    console.log('Registering slash commands...');
    await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: slashCommands.map(c => c.toJSON()) });
    console.log('Slash commands registered');
  } catch (e) { console.error('Failed to register slash commands:', e); }
}

client.once('ready', async () => {
  console.log(`Bot online as ${client.user.tag}`);
  await registerSlashCommands();
});

// ═══════════════════════════════════════════════════════════════
// AFK TRACKING
// ═══════════════════════════════════════════════════════════════
const afkUsers = new Map();
const pingHistory = new Map(); // userId -> [{pinger, time, channel}]

// ═══════════════════════════════════════════════════════════════
// SPAM & RATE LIMIT PROTECTION
// ═══════════════════════════════════════════════════════════════
const messageTracker = new Map(); // userId -> [{time, mentions}]
const banKickTracker = new Map(); // userId -> [timestamps]

function checkSpam(userId, mentionCount) {
  config = loadConfig();
  if (!config.spamProtection) return false;
  const now = Date.now();
  if (!messageTracker.has(userId)) messageTracker.set(userId, []);
  const logs = messageTracker.get(userId).filter(t => now - t.time < 10000);
  logs.push({ time: now, mentions: mentionCount });
  messageTracker.set(userId, logs);
  const totalMentions = logs.reduce((a, b) => a + b.mentions, 0);
  return totalMentions > 15;
}

function checkBanKickSpam(userId) {
  config = loadConfig();
  if (!config.banKickProtection) return false;
  const now = Date.now();
  if (!banKickTracker.has(userId)) banKickTracker.set(userId, []);
  const logs = banKickTracker.get(userId).filter(t => now - t < 60000);
  logs.push(now);
  banKickTracker.set(userId, logs);
  return logs.length > 5;
}

// ═══════════════════════════════════════════════════════════════
// AUTO ROLE ON JOIN
// ═══════════════════════════════════════════════════════════════
client.on('guildMemberAdd', async (member) => {
  config = loadConfig();
  if (config.autoRoleId) {
    const role = member.guild.roles.cache.get(config.autoRoleId);
    if (role) { try { await member.roles.add(role); } catch (e) { console.error('Auto-role failed:', e); } }
  }
  if (config.autoVouchEnabled) {
    config = loadConfig();
    if (!config.vouchData[member.id]) config.vouchData[member.id] = 0;
    config.vouchData[member.id]++;
    saveConfig(config);
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

// ═══════════════════════════════════════════════════════════════
// MESSAGE CREATE
// ═══════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  config = loadConfig();
  const PREFIX = config.prefix;

  // Spam protection
  const mentionCount = message.mentions.users.size + message.mentions.roles.size;
  if (mentionCount > 0 && checkSpam(message.author.id, mentionCount)) {
    try { await message.delete(); } catch(e){}
    const warn = await message.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(`⚠️ <@${message.author.id}> Stop spamming mentions!`)] });
    setTimeout(() => warn.delete().catch(()=>{}), 5000);
    return;
  }

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

  // Ping tracking
  if (message.mentions.users.size > 0) {
    for (const [uid] of message.mentions.users) {
      if (!pingHistory.has(uid)) pingHistory.set(uid, []);
      pingHistory.get(uid).push({ pinger: message.author.id, time: Date.now(), channel: message.channel.id });
      if (pingHistory.get(uid).length > 20) pingHistory.get(uid).shift();
    }
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
    help: runHelp, tpanel: runTPanel, spanel: runSPanel, panel: runTPanel,
    setmmrole: runSetMMRole, setcategory: runSetCategory,
    setsupportcategory: runSetSupportCategory,
    settranscriptchannel: runSetTranscriptChannel,
    setsupportrole: runSetSupportRole, setprefix: runSetPrefix,
    settradingpanelimage: runSetTradingPanelImage,
    setsupportpanelimage: runSetSupportPanelImage,
    setticketimage: runSetTicketImage,
    setsupportticketimage: runSetSupportTicketImage,
    setpicture: runSetPicture,
    settpanetitle: runSetTPaneTitle, settpaneldesc: runSetTPaneDesc,
    setspanetitle: runSetSPaneTitle, setspaneldesc: runSetSPaneDesc,
    settickettitle: runSetTicketTitle, setsupporttickettitle: runSetSupportTicketTitle,
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
    // NEW
    escrowpanel: runEscrowPanel,
    btc: runCryptoPrice, eth: runCryptoPrice, ltc: runCryptoPrice, sol: runCryptoPrice,
    bal: runWalletBal,
    setaddy: runSetAddy, addy: runAddy, mybal: runMyBal, search: runSearch,
    coinflip: runCoinFlip, dice: runDice, '8ball': run8Ball, roast: runRoast, dih: runDih,
    steal: runSteal,
    whopinged: runWhoPinged,
    promote: runPromote, demote: runDemote,
    revamp: runRevamp,
    settings: runSettings,
    setmodrole: runSetModRole,
    setviewtickets: runSetViewTickets,
    setpromoteminrole: runSetPromoteMinRole,
    setpromotelog: runSetPromoteLog,
  };
  if (cmds[command]) {
    try { await cmds[command](ctx); } catch(e) { console.error(e); message.reply({ embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription('❌ Something went wrong.')] }).catch(()=>{}); }
  }
});

// ═══════════════════════════════════════════════════════════════
// INTERACTION HANDLER
// ═══════════════════════════════════════════════════════════════
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
      help: runHelp, tpanel: runTPanel, spanel: runSPanel, panel: runTPanel,
      setmmrole: runSetMMRole, setcategory: runSetCategory,
      setsupportcategory: runSetSupportCategory,
      settranscriptchannel: runSetTranscriptChannel,
      setsupportrole: runSetSupportRole, setprefix: runSetPrefix,
      settradingpanelimage: runSetTradingPanelImage,
      setsupportpanelimage: runSetSupportPanelImage,
      setticketimage: runSetTicketImage,
      setsupportticketimage: runSetSupportTicketImage,
      setpicture: runSetPicture,
      settpanetitle: runSetTPaneTitle, settpaneldesc: runSetTPaneDesc,
      setspanetitle: runSetSPaneTitle, setspaneldesc: runSetSPaneDesc,
      settickettitle: runSetTicketTitle, setsupporttickettitle: runSetSupportTicketTitle,
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
      // NEW
      escrowpanel: runEscrowPanel,
      btc: runCryptoPrice, eth: runCryptoPrice, ltc: runCryptoPrice, sol: runCryptoPrice,
      bal: runWalletBal,
      setaddy: runSetAddy, addy: runAddy, mybal: runMyBal, search: runSearch,
      coinflip: runCoinFlip, dice: runDice, '8ball': run8Ball, roast: runRoast, dih: runDih,
      steal: runSteal,
      whopinged: runWhoPinged,
      promote: runPromote, demote: runDemote,
      revamp: runRevamp,
      settings: runSettings,
      setmodrole: runSetModRole,
      setviewtickets: runSetViewTickets,
      setpromoteminrole: runSetPromoteMinRole,
      setpromotelog: runSetPromoteLog,
    };
    if (cmds[interaction.commandName]) {
      try { await cmds[interaction.commandName](ctx); } catch(e) { console.error(e); interaction.reply({ embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription('❌ Something went wrong.')], ephemeral: true }).catch(()=>{}); }
    }
    return;
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

  // ── Escrow crypto select ──
  if (interaction.isStringSelectMenu() && interaction.customId === 'escrow_coin_select') {
    const coin = interaction.values[0];
    const modal = new ModalBuilder().setCustomId(`escrow_modal_${coin}`).setTitle(`Escrow — ${coin.toUpperCase()}`);
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('escrow_amount').setLabel('Amount').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('escrow_buyer').setLabel('Buyer Discord ID or @mention').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('escrow_seller').setLabel('Seller Discord ID or @mention').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('escrow_item').setLabel('What is being traded?').setStyle(TextInputStyle.Paragraph).setRequired(true)),
    );
    return interaction.showModal(modal);
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
    saveConfig(config);
    delete embedSessions[`panel_pick_${userId}`];
    const labels = { tpanel: 'Trading Panel', spanel: 'Support Panel' };
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
    saveConfig(config);
    delete embedSessions[`panel_pick_${userId}`];
    const labels = { tpanel: 'Trading Panel', spanel: 'Support Panel' };
    return interaction.update({ content: `✅ Embed **${embedName}** detached from **${labels[panelType] || panelType}**!`, embeds: [], components: [] });
  }

  // ── Role buttons ──
  if (interaction.isButton() && interaction.customId.startsWith('rolebtn_')) {
    const roleId = interaction.customId.replace('rolebtn_', '');
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) return interaction.reply({ content: '❌ Role not found.', ephemeral: true });
    const member = interaction.member;
    if (member.roles.cache.has(role.id)) {
      await member.roles.remove(role);
      return interaction.reply({ content: `❌ Removed **${role.name}**`, ephemeral: true });
    } else {
      await member.roles.add(role);
      return interaction.reply({ content: `✅ Added **${role.name}**`, ephemeral: true });
    }
  }

  // ── Escrow buttons ──
  if (interaction.isButton() && interaction.customId.startsWith('escrow_')) {
    return handleEscrowButton(interaction);
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
  if (interaction.isModalSubmit() && interaction.customId.startsWith('escrow_modal_')) {
    await interaction.deferReply({ ephemeral: true });
    return createEscrow(interaction);
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'claim_ticket') {
      config = loadConfig();
      const hasMmRole = config.mmRoleId && interaction.member.roles.cache.has(config.mmRoleId);
      const canView = config.viewTicketsRoleId && interaction.member.roles.cache.has(config.viewTicketsRoleId);
      if (!hasMmRole && !canView && !interaction.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
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

// ═══════════════════════════════════════════════════════════════
// TRANSCRIPT HELPER
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// SAVED EMBEDS MENU
// ═══════════════════════════════════════════════════════════════
function buildEmbedsMenuPayload(userId, selectedName) {
  config = loadConfig();
  const saved = config.savedEmbeds || {};
  const names = Object.keys(saved);
  const tpE = config.tpanelEmbedIds || [], spE = config.spanelEmbedIds || [];

  let listLines = names.length === 0 ? ['*No saved embeds yet.*'] : names.map(n => {
    const tags = [];
    if (tpE.includes(n)) tags.push('**[Trading]**');
    if (spE.includes(n)) tags.push('**[Support]**');
    return `\`${n}\` — *${saved[n].title || 'untitled'}*${tags.length ? ' — ' + tags.join(' ') : ''}`;
  });
  listLines.push('─────────────────────────');
  listLines.push('`trading-panel` — *Trading Panel Embed*');
  listLines.push('`support-panel` — *Support Panel Embed*');
  listLines.push('─────────────────────────');
  listLines.push(selectedName ? `— selected: **${selectedName}**, or click Create New` : '— select one below, or click Create New');

  const options = names.slice(0, 21).map(n => ({ label: n, description: (saved[n].title || 'untitled').slice(0, 50), value: n }));
  options.push({ label: '🎫 Trading Panel', description: 'Edit trading panel embed', value: 'trading-panel', emoji: '🎫' });
  options.push({ label: '🎟️ Support Panel', description: 'Edit support panel embed', value: 'support-panel', emoji: '🎟️' });

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
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`panel_detach_tpanel_${userId}`).setLabel('Detach from Trading').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`panel_detach_spanel_${userId}`).setLabel('Detach from Support').setStyle(ButtonStyle.Danger),
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
    embedSessions[userId] = { title: null, description: null, color: COLORS.orange, author: null, authorIcon: null, footer: null, footerIcon: null, image: null, thumbnail: null, fields: [], roleButtons: [] };
    const previewEmbed = new EmbedBuilder().setColor(COLORS.orange).setTitle('New Embed').setDescription('Click the buttons below to customize this embed.');
    return interaction.update({ content: '🛠️ **Embed Builder**', embeds: [previewEmbed], components: embedBuilderRows(userId) });
  }
  if (!selectedName) return interaction.reply({ content: '❌ Please select an embed first.', ephemeral: true });

  const panelEditMap = {
    'trading-panel': { configTitle: 'tpanelTitle', configDesc: 'tpanelDescription', configImg: 'tpanelImageUrl', defaultTitle: 'Middleman Service', defaultDescFn: getDefaultTPanelDesc, storeKey: '__tpanel__' },
    'support-panel': { configTitle: 'spanelTitle', configDesc: 'spanelDescription', configImg: 'spanelImageUrl', defaultTitle: 'Support Ticket', defaultDescFn: getDefaultSPanelDesc, storeKey: '__spanel__' },
  };
  if (panelEditMap[selectedName]) {
    const pm = panelEditMap[selectedName];
    if (action === 'edit') {
      embedSessions[userId] = { title: config[pm.configTitle] || pm.defaultTitle, description: config[pm.configDesc] || pm.defaultDescFn(), color: COLORS.orange, author: null, authorIcon: null, footer: null, footerIcon: null, image: config[pm.configImg] || null, thumbnail: null, fields: [], roleButtons: [] };
      embedSessions[`editing_${userId}`] = pm.storeKey;
      return interaction.update({ content: `🛠️ **Editing: ${selectedName}**`, embeds: [buildEmbedFromSession(embedSessions[userId])], components: embedBuilderRows(userId) });
    }
    if (action === 'send') return interaction.reply({ content: `❌ Use the panel command to send this panel.`, ephemeral: true });
    if (action === 'delete') return interaction.reply({ content: '❌ You cannot delete panel embeds.', ephemeral: true });
  }

  const savedSession = config.savedEmbeds[selectedName];
  if (!savedSession) return interaction.reply({ content: '❌ Embed not found.', ephemeral: true });
  if (action === 'send') {
    const components = buildRoleButtonRows(savedSession.roleButtons);
    await interaction.channel.send({ embeds: [buildEmbedFromSession(savedSession)], components });
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
    saveConfig(config);
    delete embedSessions[`pick_${userId}`];
    return interaction.update({ content: `🗑️ Deleted embed **${selectedName}**.`, embeds: [], components: [] });
  }
}

function buildRoleButtonRows(roleButtons) {
  if (!roleButtons || roleButtons.length === 0) return [];
  const rows = [];
  let currentRow = new ActionRowBuilder();
  for (let i = 0; i < roleButtons.length; i++) {
    if (currentRow.components.length >= 5) { rows.push(currentRow); currentRow = new ActionRowBuilder(); }
    currentRow.addComponents(
      new ButtonBuilder().setCustomId(`rolebtn_${roleButtons[i].roleId}`).setLabel(roleButtons[i].label).setStyle(ButtonStyle[roleButtons[i].style] || ButtonStyle.Primary)
    );
  }
  if (currentRow.components.length > 0) rows.push(currentRow);
  return rows;
}

// ═══════════════════════════════════════════════════════════════
// EMBED BUILDER
// ═══════════════════════════════════════════════════════════════
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
    const components = buildRoleButtonRows(session.roleButtons);
    await interaction.channel.send({ embeds: [built], components });
    const editingName = embedSessions[`editing_${userId}`];
    if (editingName) {
      config = loadConfig();
      if (editingName === '__tpanel__') { config.tpanelTitle = session.title || config.tpanelTitle; config.tpanelDescription = session.description || null; if (session.image) config.tpanelImageUrl = session.image; }
      else if (editingName === '__spanel__') { config.spanelTitle = session.title || config.spanelTitle; config.spanelDescription = session.description || null; if (session.image) config.spanelImageUrl = session.image; }
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
  if (action === 'addrolebtn') {
    const modal = new ModalBuilder().setCustomId(`ebm_addrolebtn_${userId}`).setTitle('Add Role Button');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rolebtn_role').setLabel('Role ID or @mention').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rolebtn_label').setLabel('Button label').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('rolebtn_style').setLabel('Style: Primary/Secondary/Success/Danger').setStyle(TextInputStyle.Short).setRequired(false)),
    );
    return interaction.showModal(modal);
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
  if (action === 'addrolebtn') {
    const roleInput = interaction.fields.getTextInputValue('rolebtn_role');
    const label = interaction.fields.getTextInputValue('rolebtn_label');
    const style = interaction.fields.getTextInputValue('rolebtn_style') || 'Primary';
    const roleMatch = roleInput.match(/^<@&(\d+)>$/) || roleInput.match(/^(\d+)$/);
    const roleId = roleMatch ? roleMatch[1] : roleInput;
    if (!session.roleButtons) session.roleButtons = [];
    session.roleButtons.push({ roleId, label, style });
    return interaction.update({ content: '🛠️ **Embed Builder**', embeds: [buildEmbedFromSession(session)], components: embedBuilderRows(userId) });
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

// ═══════════════════════════════════════════════════════════════
// DEFAULT DESCRIPTIONS
// ═══════════════════════════════════════════════════════════════
function getDefaultTPanelDesc() {
  const pt = config.panelText || 'Roblox Values';
  return `Welcome to **${pt}** Middleman Service Centre.\n\nAt **${pt}**, we value and provide a safe and secure way to exchange your goods.\n\n**If you've found a trade and want to ensure your safety, use our middleman service.**\n\n───\n**Usage Conditions:**\n• Both parties agree to trade before requesting a middleman.\n• State the trade and value.\n• Fake or troll tickets will result in punishments.`;
}
function getDefaultSPanelDesc() {
  const pt = config.panelText || 'Roblox Values';
  return `Welcome to **${pt}**.\n\nThis panel is for Staff Applications, Reports, and General Assistance.\n\n───\n**Usage Conditions:**\n• Select the correct category.\n• Provide complete and honest information.\n• Treat staff with respect at all times.`;
}

// ═══════════════════════════════════════════════════════════════
// HELP
// ═══════════════════════════════════════════════════════════════
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
        { name: `${P}settranscriptchannel #ch`, desc: 'Set channel for auto-transcripts' },
        { name: `${P}settings ticketmode channel/thread`, desc: 'Toggle ticket mode' },
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
    crypto: {
      emoji: '💎', name: 'Crypto', color: COLORS.crypto,
      commands: [
        { name: `${P}btc / /btc`, desc: 'Check Bitcoin price' },
        { name: `${P}eth / /eth`, desc: 'Check Ethereum price' },
        { name: `${P}ltc / /ltc`, desc: 'Check Litecoin price' },
        { name: `${P}sol / /sol`, desc: 'Check Solana price' },
        { name: `${P}bal <address>`, desc: 'Check any wallet balance' },
        { name: `${P}setaddy <coin> <address>`, desc: 'Save your wallet' },
        { name: `${P}addy`, desc: 'View your saved wallets' },
        { name: `${P}mybal`, desc: 'Check your saved wallet balances' },
        { name: `${P}search @user`, desc: 'View someone\'s saved wallets' },
        { name: `${P}escrowpanel / /escrowpanel`, desc: 'Send crypto escrow panel' },
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
        { name: `${P}promote @user @role [reason]`, desc: 'Promote a user' },
        { name: `${P}demote @user @role [reason]`, desc: 'Demote a user' },
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
        { name: `${P}coinflip`, desc: 'Flip a coin' },
        { name: `${P}dice <2d6>`, desc: 'Roll dice' },
        { name: `${P}8ball <question>`, desc: 'Magic 8ball' },
        { name: `${P}roast @user`, desc: 'Roast someone' },
        { name: `${P}dih`, desc: 'Do I have?' },
        { name: `${P}steal <emoji>`, desc: 'Copy custom emoji' },
        { name: `${P}whopinged`, desc: 'See who pinged you' },
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
        { name: `${P}settranscriptchannel #ch`, desc: 'Set transcript log channel' },
        { name: `${P}setprefix <char>`, desc: 'Change prefix' },
        { name: `${P}setpicture`, desc: 'Set one image on ALL panels & tickets' },
        { name: `${P}renamep <text>`, desc: 'Rename "Roblox Values" text everywhere' },
        { name: `${P}panelconfig`, desc: 'View current panel config' },
        { name: `${P}setautorole @role`, desc: 'Auto-give role on join' },
        { name: `${P}backup <name>`, desc: 'Backup server config' },
        { name: `${P}restore <name>`, desc: 'Restore a backup' },
        { name: `${P}revamp`, desc: 'Revamp bot & server branding' },
        { name: `${P}settings`, desc: 'Toggle bot settings' },
        { name: `${P}setmodrole`, desc: 'Set mod roles for commands' },
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
      { name: '💎 Crypto', value: 'Prices, wallets & escrow', inline: true },
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
      new ButtonBuilder().setCustomId('help_crypto').setLabel('💎 Crypto').setStyle(ButtonStyle.Primary),
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

// ═══════════════════════════════════════════════════════════════
// COMMANDS
// ═══════════════════════════════════════════════════════════════
async function runHelp(ctx) {
  if (!hasHelpAccess(ctx)) return reply(ctx, { content: '❌ You do not have permission to use the help command.', ephemeral: true });
  await reply(ctx, { embeds: [buildHelpMenuEmbed()], components: buildHelpMenuRows() });
}

async function runEmbed(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need **Manage Server** permission.', ephemeral: true });
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  embedSessions[userId] = { title: null, description: null, color: COLORS.orange, author: null, authorIcon: null, footer: null, footerIcon: null, image: null, thumbnail: null, fields: [], roleButtons: [] };
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
  config.ticketTitle = replaceInStr(config.ticketTitle);
  config.supportTicketTitle = replaceInStr(config.supportTicketTitle);
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
  config.panelImageUrl = config.tpanelImageUrl = config.spanelImageUrl = config.ticketImageUrl = config.supportTicketImageUrl = imageUrl;
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
      { name: '🎫 Trading Ticket Title', value: config.ticketTitle || 'Ticket Opened', inline: true },
      { name: '🎫 Support Ticket Title', value: config.supportTicketTitle || 'Support Ticket', inline: true },
      { name: '🖼️ Trading Panel Image', value: config.tpanelImageUrl ? '✅ Set' : '❌ Not set', inline: true },
      { name: '🖼️ Support Panel Image', value: config.spanelImageUrl ? '✅ Set' : '❌ Not set', inline: true },
      { name: '🤝 MM Role', value: config.mmRoleId ? `<@&${config.mmRoleId}>` : '❌ Not set', inline: true },
      { name: '🆘 Support Role', value: config.supportRoleId ? `<@&${config.supportRoleId}>` : '❌ Not set', inline: true },
      { name: '📁 Trading Category', value: config.ticketCategoryId ? `<#${config.ticketCategoryId}>` : '❌ Not set', inline: true },
      { name: '📁 Support Category', value: config.supportCategoryId ? `<#${config.supportCategoryId}>` : '❌ Not set', inline: true },
      { name: '📄 Transcript Channel', value: config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : '❌ Not set', inline: true },
      { name: '🧵 Ticket Mode', value: config.ticketMode || 'channel', inline: true },
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
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  const name = (ctx.isSlash ? ctx.getOption('name') : ctx.args[0] || '').toLowerCase().replace(/\s+/g, '');
  if (!name) return reply(ctx, { content: '❌ Please provide a name.', ephemeral: true });
  config = loadConfig(); config.yukicCommandName = name; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Offer command renamed to \`${config.prefix}${name}\``)] });
}
async function runSetRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.', ephemeral: true });
  config = loadConfig(); config.yukicTriggerRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Yukic trigger role: **${role.name}**.`)] });
}
async function runSetYukicRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Please mention a role.', ephemeral: true });
  config = loadConfig(); config.yukicAcceptRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Yukic accept role: **${role.name}**.`)] });
}
async function runSetYukicMessage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  config = loadConfig();
  if (config.yukicMessage) return reply(ctx, { content: `❌ Already set. Use \`${config.prefix}resetyukicmessage\` to reset.`, ephemeral: true });
  const msg = ctx.isSlash ? ctx.getOption('message') : ctx.args.join(' ');
  if (!msg) return reply(ctx, { content: '❌ Please provide a message.', ephemeral: true });
  config.yukicMessage = msg; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Yukic Message Set').setDescription(msg)] });
}
async function runResetYukicMessage(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  config = loadConfig();
  if (!config.yukicMessage) return reply(ctx, { content: '❌ No yukic message set.', ephemeral: true });
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
  if (!config.yukicMessage) return reply(ctx, { content: `❌ No offer message set.`, ephemeral: true });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.', ephemeral: true });
  if (target.user.bot) return reply(ctx, { content: '❌ Cannot send to a bot.', ephemeral: true });
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
  if (!channel.name.startsWith('ticket-')) return reply(ctx, { content: '❌ This command can only be used inside a ticket channel.' });
  await reply(ctx, { content: '📄 Saving transcript and closing in 5 seconds...' });
  await saveTranscript(channel, ctx.guild);
  setTimeout(() => channel.delete().catch(() => {}), 5000);
}
async function runClaim(ctx) {
  const hasMmRole = config.mmRoleId && ctx.member.roles.cache.has(config.mmRoleId);
  const canView = config.viewTicketsRoleId && ctx.member.roles.cache.has(config.viewTicketsRoleId);
  if (!hasMmRole && !canView && !hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need the Middleman role to claim a ticket.' });
  const user = ctx.isSlash ? ctx.interaction.user : ctx.message.author;
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('✅ Ticket Claimed').setDescription(`Claimed by <@${user.id}>. They will assist you shortly.`).setThumbnail(user.displayAvatarURL()).setTimestamp()] });
}
async function runUnclaim(ctx) {
  const hasMmRole = config.mmRoleId && ctx.member.roles.cache.has(config.mmRoleId);
  const canView = config.viewTicketsRoleId && ctx.member.roles.cache.has(config.viewTicketsRoleId);
  if (!hasMmRole && !canView && !hasManageGuild(ctx)) return reply(ctx, { content: '❌ You need the Middleman role to unclaim.' });
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
  const stars = '⭐'.repeat(Math.min(config.vouchData[target.id], 10));
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle('✅ Vouch Added').setThumbnail(target.displayAvatarURL()).addFields(
    { name: '👤 User', value: `<@${target.id}>`, inline: true },
    { name: '⭐ Total', value: `**${config.vouchData[target.id]}**`, inline: true },
    { name: 'Rating', value: stars || '⭐', inline: true },
    { name: '✍️ By', value: `<@${author.id}>`, inline: true }
  )] });
}
async function runVouches(ctx) {
  const target = ctx.isSlash ? (ctx.getUserOption('user') || ctx.interaction.user) : (ctx.message.mentions.users.first() || ctx.message.author);
  config = loadConfig();
  const count = config.vouchData?.[target.id] || 0;
  const stars = '⭐'.repeat(Math.min(count, 10)) || '*No vouches yet*';
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle(`📋 Vouches — ${target.username}`).setThumbnail(target.displayAvatarURL()).addFields(
    { name: '⭐ Count', value: `**${count}**`, inline: true },
    { name: 'Rating', value: stars, inline: true }
  )] });
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
  config = loadConfig();
  const modRoleId = config.modRoleIds?.ban;
  const hasModRole = modRoleId && ctx.member.roles.cache.has(modRoleId);
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.BanMembers) && !hasModRole && !hasAdmin(ctx)) return reply(ctx, { content: '❌ Ban Members permission or mod role required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const reason = (ctx.isSlash ? ctx.getOption('reason') : ctx.args.slice(1).join(' ')) || 'No reason provided';
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (!target.bannable) return reply(ctx, { content: '❌ I cannot ban this user.' });
  if (checkBanKickSpam(ctx.member.id)) return reply(ctx, { content: '⚠️ Slow down! You are banning/kicking too fast.' });
  await target.ban({ reason });
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.red).setTitle('🔨 User Banned').setThumbnail(target.user.displayAvatarURL()).addFields({ name: '👤 User', value: target.user.tag, inline: true }, { name: '📋 Reason', value: reason, inline: true })] });
}
async function runKick(ctx) {
  config = loadConfig();
  const modRoleId = config.modRoleIds?.kick;
  const hasModRole = modRoleId && ctx.member.roles.cache.has(modRoleId);
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.KickMembers) && !hasModRole && !hasAdmin(ctx)) return reply(ctx, { content: '❌ Kick Members permission or mod role required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const reason = (ctx.isSlash ? ctx.getOption('reason') : ctx.args.slice(1).join(' ')) || 'No reason provided';
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  if (!target.kickable) return reply(ctx, { content: '❌ I cannot kick this user.' });
  if (checkBanKickSpam(ctx.member.id)) return reply(ctx, { content: '⚠️ Slow down! You are banning/kicking too fast.' });
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
  if (!ms) return reply(ctx, { content: '❌ Invalid duration. Use: `10m`, `1h`, `1d`' });
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
  config = loadConfig();
  const modRoleId = config.modRoleIds?.roleadd;
  const hasModRole = modRoleId && ctx.member.roles.cache.has(modRoleId);
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !hasModRole && !hasAdmin(ctx)) return reply(ctx, { content: '❌ Manage Roles permission or mod role required.' });
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

// ═══════════════════════════════════════════════════════════════
// GAMBLING
// ═══════════════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════════════
// CRYPTO COMMANDS
// ═══════════════════════════════════════════════════════════════
const CRYPTO_IDS = { btc: 'bitcoin', eth: 'ethereum', ltc: 'litecoin', sol: 'solana', usdt: 'tether', usdc: 'usd-coin' };

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'Accept': 'application/json' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => { try { resolve(JSON.parse(data)); } catch(e) { reject(e); } });
    }).on('error', reject);
  });
}

async function runCryptoPrice(ctx) {
  const coin = ctx.isSlash ? ctx.interaction.commandName : ctx.args[0];
  const id = CRYPTO_IDS[coin];
  if (!id) return reply(ctx, { content: '❌ Unsupported coin.' });
  try {
    const data = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`);
    const price = data[id]?.usd;
    const change = data[id]?.usd_24h_change;
    if (!price) return reply(ctx, { content: '❌ Could not fetch price.' });
    const changeStr = change !== undefined ? (change >= 0 ? `📈 +${change.toFixed(2)}%` : `📉 ${change.toFixed(2)}%`) : '';
    const embed = new EmbedBuilder().setColor(COLORS.crypto).setTitle(`💎 ${coin.toUpperCase()} Price`).addFields(
      { name: '💵 Price', value: `$${price.toLocaleString()}`, inline: true },
      { name: '📊 24h Change', value: changeStr || 'N/A', inline: true },
    ).setFooter({ text: 'Powered by CoinGecko' }).setTimestamp();
    const msg = await reply(ctx, { embeds: [embed] });
    if (!ctx.isSlash && msg) setTimeout(() => msg.delete().catch(()=>{}), 300000);
  } catch (e) { reply(ctx, { content: '❌ Failed to fetch price. Try again later.' }); }
}

async function runWalletBal(ctx) {
  const address = ctx.isSlash ? ctx.getOption('address') : ctx.args[0];
  if (!address) return reply(ctx, { content: '❌ Please provide a wallet address.' });
  // Simple ETH/BSC balance check via Etherscan-style (using blockcypher for BTC, etc would need API keys)
  // For now, show a clean embed with the address
  const embed = new EmbedBuilder().setColor(COLORS.crypto).setTitle('💳 Wallet Lookup')
    .setDescription(`**Address:** \`${address}\`\n\n🔗 [View on Etherscan](https://etherscan.io/address/${address})\n🔗 [View on BscScan](https://bscscan.com/address/${address})\n🔗 [View on Solscan](https://solscan.io/account/${address})`)
    .setFooter({ text: 'Use block explorers for full balance details' });
  const msg = await reply(ctx, { embeds: [embed] });
  if (!ctx.isSlash && msg) setTimeout(() => msg.delete().catch(()=>{}), 300000);
}

async function runSetAddy(ctx) {
  const coin = (ctx.isSlash ? ctx.getOption('coin') : ctx.args[0])?.toLowerCase();
  const address = ctx.isSlash ? ctx.getOption('address') : ctx.args[1];
  if (!coin || !address || !CRYPTO_IDS[coin]) return reply(ctx, { content: '❌ Usage: `setaddy <btc/eth/ltc/sol/usdt/usdc> <address>`' });
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  config = loadConfig();
  if (!config.cryptoAddresses[userId]) config.cryptoAddresses[userId] = {};
  config.cryptoAddresses[userId][coin] = address;
  saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.crypto).setDescription(`✅ Saved **${coin.toUpperCase()}** address.`)] });
}

async function runAddy(ctx) {
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  config = loadConfig();
  const addys = config.cryptoAddresses?.[userId];
  if (!addys || Object.keys(addys).length === 0) return reply(ctx, { content: '❌ No saved wallets. Use `$setaddy` first.' });
  const embed = new EmbedBuilder().setColor(COLORS.crypto).setTitle('💼 Your Wallets');
  for (const [coin, addr] of Object.entries(addys)) {
    embed.addFields({ name: coin.toUpperCase(), value: `\`${addr}\``, inline: true });
  }
  await reply(ctx, { embeds: [embed] });
}

async function runMyBal(ctx) {
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  config = loadConfig();
  const addys = config.cryptoAddresses?.[userId];
  if (!addys || Object.keys(addys).length === 0) return reply(ctx, { content: '❌ No saved wallets. Use `$setaddy` first.' });
  const embed = new EmbedBuilder().setColor(COLORS.crypto).setTitle('💰 Your Saved Balances');
  for (const [coin, addr] of Object.entries(addys)) {
    let explorer = '';
    if (coin === 'btc') explorer = `https://www.blockchain.com/explorer/addresses/btc/${addr}`;
    else if (coin === 'eth' || coin === 'usdt' || coin === 'usdc') explorer = `https://etherscan.io/address/${addr}`;
    else if (coin === 'ltc') explorer = `https://blockchair.com/litecoin/address/${addr}`;
    else if (coin === 'sol') explorer = `https://solscan.io/account/${addr}`;
    embed.addFields({ name: `${coin.toUpperCase()}`, value: `\`${addr}\`\n[View Balance](${explorer})`, inline: true });
  }
  await reply(ctx, { embeds: [embed] });
}

async function runSearch(ctx) {
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  if (!target) return reply(ctx, { content: '❌ Please mention a user.' });
  config = loadConfig();
  const addys = config.cryptoAddresses?.[target.id];
  if (!addys || Object.keys(addys).length === 0) return reply(ctx, { content: `❌ **${target.tag}** has no saved wallets.` });
  const embed = new EmbedBuilder().setColor(COLORS.crypto).setTitle(`💼 ${target.username}'s Wallets`).setThumbnail(target.displayAvatarURL());
  for (const [coin, addr] of Object.entries(addys)) {
    embed.addFields({ name: coin.toUpperCase(), value: `\`${addr}\``, inline: true });
  }
  await reply(ctx, { embeds: [embed] });
}

// ═══════════════════════════════════════════════════════════════
// ESCROW SYSTEM
// ═══════════════════════════════════════════════════════════════
async function runEscrowPanel(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.', ephemeral: true });
  const embed = new EmbedBuilder().setColor(COLORS.crypto).setTitle('🔒 Crypto Escrow')
    .setDescription('Select a cryptocurrency to start an escrow deal.\n\n**Supported:** BTC, ETH, LTC, SOL, USDT, USDC\n\nThe bot will track the deal status for both buyer and seller.')
    .setFooter({ text: 'Automated Escrow System' });
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder().setCustomId('escrow_coin_select').setPlaceholder('Select coin...').addOptions(
      { label: 'Bitcoin', value: 'btc', emoji: '₿' },
      { label: 'Ethereum', value: 'eth', emoji: 'Ξ' },
      { label: 'Litecoin', value: 'ltc', emoji: 'Ł' },
      { label: 'Solana', value: 'sol', emoji: '◎' },
      { label: 'USDT', value: 'usdt', emoji: '💵' },
      { label: 'USDC', value: 'usdc', emoji: '💵' },
    )
  );
  const channel = ctx.isSlash ? ctx.interaction.channel : ctx.channel;
  await channel.send({ embeds: [embed], components: [row] });
  if (ctx.isSlash) await ctx.interaction.reply({ content: '✅ Escrow panel sent!', ephemeral: true });
  else await ctx.message.reply('✅ Escrow panel sent!');
}

async function createEscrow(interaction) {
  const coin = interaction.customId.replace('escrow_modal_', '');
  const amount = interaction.fields.getTextInputValue('escrow_amount');
  const buyerInput = interaction.fields.getTextInputValue('escrow_buyer');
  const sellerInput = interaction.fields.getTextInputValue('escrow_seller');
  const item = interaction.fields.getTextInputValue('escrow_item');

  const buyerMatch = buyerInput.match(/^<@!?(\d+)>$/) || buyerInput.match(/^(\d+)$/);
  const sellerMatch = sellerInput.match(/^<@!?(\d+)>$/) || sellerInput.match(/^(\d+)$/);
  const buyerId = buyerMatch ? buyerMatch[1] : null;
  const sellerId = sellerMatch ? sellerMatch[1] : null;

  if (!buyerId || !sellerId) return interaction.editReply({ content: '❌ Invalid buyer or seller ID.' });

  const escrowId = `escrow-${Date.now()}`;
  config = loadConfig();
  config.escrowData[escrowId] = {
    coin, amount, buyerId, sellerId, item,
    status: 'pending', createdAt: Date.now(), guildId: interaction.guild.id,
    buyerConfirmed: false, sellerConfirmed: false,
  };
  saveConfig(config);

  const embed = new EmbedBuilder().setColor(COLORS.crypto).setTitle(`🔒 Escrow Deal — ${coin.toUpperCase()}`)
    .setDescription(`**Item:** ${item}\n**Amount:** ${amount} ${coin.toUpperCase()}`)
    .addFields(
      { name: '👤 Buyer', value: `<@${buyerId}>`, inline: true },
      { name: '👤 Seller', value: `<@${sellerId}>`, inline: true },
      { name: '⏳ Status', value: 'Pending confirmation from both parties', inline: true },
    )
    .setFooter({ text: `Escrow ID: ${escrowId}` }).setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`escrow_buyer_confirm_${escrowId}`).setLabel('✅ Buyer Confirm').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`escrow_seller_confirm_${escrowId}`).setLabel('✅ Seller Confirm').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`escrow_cancel_${escrowId}`).setLabel('❌ Cancel').setStyle(ButtonStyle.Danger),
  );

  await interaction.editReply({ content: `🔒 Escrow created!`, embeds: [embed], components: [row] });
}

async function handleEscrowButton(interaction) {
  const parts = interaction.customId.split('_');
  const action = parts[1];
  const escrowId = parts[2];
  config = loadConfig();
  const escrow = config.escrowData?.[escrowId];
  if (!escrow) return interaction.reply({ content: '❌ Escrow not found.', ephemeral: true });

  if (action === 'cancel') {
    if (interaction.user.id !== escrow.buyerId && interaction.user.id !== escrow.sellerId && !hasAdmin({ member: interaction.member })) {
      return interaction.reply({ content: '❌ Only buyer, seller, or admin can cancel.', ephemeral: true });
    }
    escrow.status = 'cancelled';
    saveConfig(config);
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('done').setLabel('❌ Cancelled').setStyle(ButtonStyle.Danger).setDisabled(true),
    );
    await interaction.update({ components: [disabledRow] });
    return interaction.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.red).setDescription(`❌ Escrow **${escrowId}** has been cancelled.`)] });
  }

  if (action === 'buyer' && parts[2] === 'confirm') {
    if (interaction.user.id !== escrow.buyerId) return interaction.reply({ content: '❌ Only the buyer can confirm.', ephemeral: true });
    escrow.buyerConfirmed = true;
  } else if (action === 'seller' && parts[2] === 'confirm') {
    if (interaction.user.id !== escrow.sellerId) return interaction.reply({ content: '❌ Only the seller can confirm.', ephemeral: true });
    escrow.sellerConfirmed = true;
  }

  saveConfig(config);

  if (escrow.buyerConfirmed && escrow.sellerConfirmed) {
    escrow.status = 'confirmed';
    saveConfig(config);
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('done').setLabel('✅ Both Confirmed').setStyle(ButtonStyle.Success).setDisabled(true),
    );
    await interaction.update({ components: [disabledRow] });
    return interaction.channel.send({ embeds: [new EmbedBuilder().setColor(COLORS.green).setTitle('🔒 Escrow Confirmed').setDescription(`Both parties have confirmed the escrow deal.\n\n**Item:** ${escrow.item}\n**Amount:** ${escrow.amount} ${escrow.coin.toUpperCase()}\n\nProceed with the transaction safely!`)] });
  }

  await interaction.reply({ content: `✅ Your confirmation has been recorded. Waiting for the other party...`, ephemeral: true });
}

// ═══════════════════════════════════════════════════════════════
// NEW FUN COMMANDS
// ═══════════════════════════════════════════════════════════════
async function runCoinFlip(ctx) {
  const result = Math.random() < 0.5 ? 'Heads' : 'Tails';
  const emoji = result === 'Heads' ? '🟡' : '⚪';
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.gold).setTitle(`🪙 ${emoji} ${result}!`).setDescription(`The coin landed on **${result}**!`)] });
}

async function runDice(ctx) {
  const rollStr = ctx.isSlash ? ctx.getOption('roll') : ctx.args[0];
  if (!rollStr || !rollStr.match(/^\d+d\d+$/i)) return reply(ctx, { content: '❌ Usage: `dice 2d6` or `dice 3d20`' });
  const [count, sides] = rollStr.toLowerCase().split('d').map(Number);
  if (count > 100 || sides > 1000) return reply(ctx, { content: '❌ Max 100 dice, 1000 sides.' });
  const rolls = [];
  let total = 0;
  for (let i = 0; i < count; i++) { const r = Math.floor(Math.random() * sides) + 1; rolls.push(r); total += r; }
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.purple).setTitle(`🎲 ${rollStr}`).setDescription(`**Rolls:** ${rolls.join(', ')}\n**Total:** **${total}**`)] });
}

const EIGHT_BALL = ['It is certain.', 'It is decidedly so.', 'Without a doubt.', 'Yes definitely.', 'You may rely on it.', 'As I see it, yes.', 'Most likely.', 'Outlook good.', 'Yes.', 'Signs point to yes.', 'Reply hazy, try again.', 'Ask again later.', 'Better not tell you now.', 'Cannot predict now.', 'Concentrate and ask again.', 'Don\'t count on it.', 'My reply is no.', 'My sources say no.', 'Outlook not so good.', 'Very doubtful.'];
async function run8Ball(ctx) {
  const q = ctx.isSlash ? ctx.getOption('question') : ctx.args.join(' ');
  if (!q) return reply(ctx, { content: '❌ Ask a question!' });
  const answer = EIGHT_BALL[Math.floor(Math.random() * EIGHT_BALL.length)];
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.purple).setTitle('🎱 Magic 8-Ball').addFields({ name: 'Question', value: q }, { name: 'Answer', value: `**${answer}**` })] });
}

const ROASTS = [
  'You bring everyone so much joy... when you leave the room.',
  'I\'d agree with you but then we\'d both be wrong.',
  'You\'re like a cloud. When you disappear, it\'s a beautiful day.',
  'I\'m not saying I hate you, but I would unplug your life support to charge my phone.',
  'You\'re the reason the gene pool needs a lifeguard.',
  'I\'d explain it to you but I left my crayons at home.',
  'You\'re not stupid; you just have bad luck thinking.',
  'I\'d roast you but my mom said I\'m not allowed to burn trash.',
];
async function runRoast(ctx) {
  const target = ctx.isSlash ? ctx.getUserOption('user') : ctx.message.mentions.users.first();
  if (!target) return reply(ctx, { content: '❌ Mention someone to roast!' });
  const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
  await reply(ctx, { content: `<@${target.id}> ${roast}` });
}

async function runDih(ctx) {
  const answers = ['Yes, absolutely.', 'No, definitely not.', 'Maybe...', 'Ask again later.', 'I doubt it.', '100% yes!', 'Not a chance.', 'Probably.'];
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.pink).setTitle('🤔 Do I Have?').setDescription(`**${answers[Math.floor(Math.random() * answers.length)]}**`)] });
}

async function runSteal(ctx) {
  if (!hasManageGuild(ctx)) return reply(ctx, { content: '❌ Manage Server only.' });
  const emojiStr = ctx.isSlash ? ctx.getOption('emoji') : ctx.args[0];
  if (!emojiStr) return reply(ctx, { content: '❌ Provide an emoji to steal!' });
  const match = emojiStr.match(/<a?:(\w+):(\d+)>/);
  if (!match) return reply(ctx, { content: '❌ Invalid emoji format. Use a custom emoji.' });
  const [, name, id] = match;
  const isAnimated = emojiStr.startsWith('<a:');
  const url = `https://cdn.discordapp.com/emojis/${id}.${isAnimated ? 'gif' : 'png'}`;
  try {
    const newEmoji = await ctx.guild.emojis.create({ attachment: url, name });
    await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Stolen emoji: ${newEmoji}`)] });
  } catch (e) { reply(ctx, { content: '❌ Could not steal emoji. Check emoji slots and permissions.' }); }
}

async function runWhoPinged(ctx) {
  const userId = ctx.isSlash ? ctx.interaction.user.id : ctx.message.author.id;
  const pings = pingHistory.get(userId);
  if (!pings || pings.length === 0) return reply(ctx, { content: '❌ No one has pinged you recently.' });
  const recent = pings.slice(-5).reverse().map(p => `• <@${p.pinger}> in <#${p.channel}> — ${formatTimeAgo(p.time)}`).join('\n');
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.cyan).setTitle('🔔 Recent Pings').setDescription(recent)] });
}

// ═══════════════════════════════════════════════════════════════
// PROMOTE / DEMOTE
// ═══════════════════════════════════════════════════════════════
async function runPromote(ctx) {
  config = loadConfig();
  const minRole = config.promoteMinRoleId ? ctx.guild.roles.cache.get(config.promoteMinRoleId) : null;
  if (minRole && ctx.member.roles.highest.position < minRole.position && !hasAdmin(ctx)) return reply(ctx, { content: `❌ You need **${minRole.name}** or higher.` });
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !hasAdmin(ctx)) return reply(ctx, { content: '❌ Manage Roles permission required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  const reason = (ctx.isSlash ? ctx.getOption('reason') : ctx.args.slice(2).join(' ')) || 'No reason';
  if (!target || !role) return reply(ctx, { content: '❌ Mention a user and a role.' });
  await target.roles.add(role);
  const embed = new EmbedBuilder().setColor(COLORS.green).setTitle('📈 Promoted').setDescription(`**${target.user.tag}** has been promoted to **${role.name}**.\n📋 Reason: ${reason}`);
  await reply(ctx, { embeds: [embed] });
  if (config.promoteLogChannelId) {
    const logCh = ctx.guild.channels.cache.get(config.promoteLogChannelId);
    if (logCh) logCh.send({ embeds: [embed.setFooter({ text: `By: ${ctx.member.user.tag}` }).setTimestamp()] });
  }
}

async function runDemote(ctx) {
  config = loadConfig();
  const minRole = config.promoteMinRoleId ? ctx.guild.roles.cache.get(config.promoteMinRoleId) : null;
  if (minRole && ctx.member.roles.highest.position < minRole.position && !hasAdmin(ctx)) return reply(ctx, { content: `❌ You need **${minRole.name}** or higher.` });
  if (!ctx.member.permissions.has(PermissionsBitField.Flags.ManageRoles) && !hasAdmin(ctx)) return reply(ctx, { content: '❌ Manage Roles permission required.' });
  const target = ctx.isSlash ? ctx.getMemberOption('user') : ctx.message.mentions.members.first();
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  const reason = (ctx.isSlash ? ctx.getOption('reason') : ctx.args.slice(2).join(' ')) || 'No reason';
  if (!target || !role) return reply(ctx, { content: '❌ Mention a user and a role.' });
  await target.roles.remove(role);
  const embed = new EmbedBuilder().setColor(COLORS.red).setTitle('📉 Demoted').setDescription(`**${target.user.tag}** has been demoted from **${role.name}**.\n📋 Reason: ${reason}`);
  await reply(ctx, { embeds: [embed] });
  if (config.promoteLogChannelId) {
    const logCh = ctx.guild.channels.cache.get(config.promoteLogChannelId);
    if (logCh) logCh.send({ embeds: [embed.setFooter({ text: `By: ${ctx.member.user.tag}` }).setTimestamp()] });
  }
}

// ═══════════════════════════════════════════════════════════════
// REVAMP
// ═══════════════════════════════════════════════════════════════
async function runRevamp(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.' });
  const type = (ctx.isSlash ? ctx.getOption('type') : ctx.args[0])?.toLowerCase();
  const value = ctx.isSlash ? ctx.getOption('value') : ctx.args.slice(1).join(' ');
  if (!type || !value) return reply(ctx, { content: '❌ Usage: `revamp <botname/boticon/botbanner/servername/servericon> <value>`' });
  try {
    if (type === 'botname') { await client.user.setUsername(value); return reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Bot name changed to **${value}**`)] }); }
    if (type === 'boticon') { await client.user.setAvatar(value); return reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Bot icon updated!')] }); }
    if (type === 'botbanner') { await client.user.setBanner(value); return reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Bot banner updated!')] }); }
    if (type === 'servername') { await ctx.guild.setName(value); return reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Server name changed to **${value}**`)] }); }
    if (type === 'servericon') { await ctx.guild.setIcon(value); return reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription('✅ Server icon updated!')] }); }
    return reply(ctx, { content: '❌ Invalid type. Use: botname, boticon, botbanner, servername, servericon' });
  } catch (e) { reply(ctx, { content: `❌ Failed: ${e.message}` }); }
}

// ═══════════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════════
async function runSettings(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  const setting = (ctx.isSlash ? ctx.getOption('setting') : ctx.args[0])?.toLowerCase();
  const value = (ctx.isSlash ? ctx.getOption('value') : ctx.args[1])?.toLowerCase();
  if (!setting || !value) return reply(ctx, { content: '❌ Usage: `settings <ticketmode/spam/bankick/autovouch> <value>`', ephemeral: true });
  config = loadConfig();
  if (setting === 'ticketmode') {
    if (!['channel', 'thread'].includes(value)) return reply(ctx, { content: '❌ Value must be `channel` or `thread`.', ephemeral: true });
    config.ticketMode = value;
    saveConfig(config);
    return reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Ticket mode set to **${value}**.`)] });
  }
  if (setting === 'spam') {
    config.spamProtection = value === 'on' || value === 'true';
    saveConfig(config);
    return reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Spam protection **${config.spamProtection ? 'enabled' : 'disabled'}**.`)] });
  }
  if (setting === 'bankick') {
    config.banKickProtection = value === 'on' || value === 'true';
    saveConfig(config);
    return reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Ban/kick protection **${config.banKickProtection ? 'enabled' : 'disabled'}**.`)] });
  }
  if (setting === 'autovouch') {
    config.autoVouchEnabled = value === 'on' || value === 'true';
    saveConfig(config);
    return reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Auto-vouch on join **${config.autoVouchEnabled ? 'enabled' : 'disabled'}**.`)] });
  }
  return reply(ctx, { content: '❌ Unknown setting.', ephemeral: true });
}

async function runSetModRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  const cmd = (ctx.isSlash ? ctx.getOption('command') : ctx.args[0])?.toLowerCase();
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!['ban', 'kick', 'roleadd'].includes(cmd)) return reply(ctx, { content: '❌ Command must be ban, kick, or roleadd.', ephemeral: true });
  if (!role) return reply(ctx, { content: '❌ Mention a role.', ephemeral: true });
  config = loadConfig();
  if (!config.modRoleIds) config.modRoleIds = {};
  config.modRoleIds[cmd] = role.id;
  saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ **${cmd}** mod role set to **${role.name}**.`)] });
}

async function runSetViewTickets(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Mention a role.', ephemeral: true });
  config = loadConfig(); config.viewTicketsRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ View tickets role set to **${role.name}**.`)] });
}

async function runSetPromoteMinRole(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  const role = ctx.isSlash ? ctx.getRoleOption('role') : ctx.message.mentions.roles.first();
  if (!role) return reply(ctx, { content: '❌ Mention a role.', ephemeral: true });
  config = loadConfig(); config.promoteMinRoleId = role.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Promote/demote minimum role set to **${role.name}**.`)] });
}

async function runSetPromoteLog(ctx) {
  if (!hasAdmin(ctx)) return reply(ctx, { content: '❌ Administrator only.', ephemeral: true });
  const ch = ctx.isSlash ? ctx.getChannelOption('channel') : ctx.message.mentions.channels.first();
  if (!ch) return reply(ctx, { content: '❌ Mention a channel.', ephemeral: true });
  config = loadConfig(); config.promoteLogChannelId = ch.id; saveConfig(config);
  await reply(ctx, { embeds: [new EmbedBuilder().setColor(COLORS.green).setDescription(`✅ Promote/demote log channel set to <#${ch.id}>.`)] });
}

// ═══════════════════════════════════════════════════════════════
// TICKET CREATION — TRADING
// ═══════════════════════════════════════════════════════════════
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

  const ticketName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`;

  let ticketChannel;
  try {
    const overwrites = [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory] },
    ];
    if (config.mmRoleId) overwrites.push({ id: config.mmRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
    if (config.supportRoleId) overwrites.push({ id: config.supportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
    if (tradingWithMember) overwrites.push({ id: tradingWithMember.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });

    if (config.ticketMode === 'thread') {
      const parentChannel = interaction.channel;
      if (parentChannel.type !== ChannelType.GuildText) return interaction.editReply({ content: '❌ Threads can only be created in text channels.' });
      ticketChannel = await parentChannel.threads.create({ name: ticketName, type: ChannelType.PrivateThread });
      for (const ow of overwrites) {
        if (ow.id === guild.id) continue;
        const member = await guild.members.fetch(ow.id).catch(() => null);
        if (member) await ticketChannel.members.add(member.id);
      }
    } else {
      const opts = { name: `${ticketName}-${Date.now().toString().slice(-4)}`, type: ChannelType.GuildText, permissionOverwrites: overwrites };
      if (config.ticketCategoryId) opts.parent = config.ticketCategoryId;
      ticketChannel = await guild.channels.create(opts);
    }
  } catch (e) {
    return interaction.editReply({ content: '❌ Could not create ticket. Check my permissions.' });
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

// ═══════════════════════════════════════════════════════════════
// TICKET CREATION — SUPPORT
// ═══════════════════════════════════════════════════════════════
async function createSupportTicket(interaction, type, typeLabel) {
  config = loadConfig();
  const guild = interaction.guild;
  const user = interaction.user;

  const ticketName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 20)}`;
  let ticketChannel;
  try {
    const overwrites = [
      { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] },
      { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory] },
    ];
    if (config.mmRoleId) overwrites.push({ id: config.mmRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
    if (config.supportRoleId) overwrites.push({ id: config.supportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });

    if (config.ticketMode === 'thread') {
      const parentChannel = interaction.channel;
      if (parentChannel.type !== ChannelType.GuildText) return interaction.editReply({ content: '❌ Threads can only be created in text channels.' });
      ticketChannel = await parentChannel.threads.create({ name: ticketName, type: ChannelType.PrivateThread });
      for (const ow of overwrites) {
        if (ow.id === guild.id) continue;
        const member = await guild.members.fetch(ow.id).catch(() => null);
        if (member) await ticketChannel.members.add(member.id);
      }
    } else {
      const opts = { name: `${ticketName}-${Date.now().toString().slice(-4)}`, type: ChannelType.GuildText, permissionOverwrites: overwrites };
      if (config.supportCategoryId) opts.parent = config.supportCategoryId;
      else if (config.ticketCategoryId) opts.parent = config.ticketCategoryId;
      ticketChannel = await guild.channels.create(opts);
    }
  } catch (e) {
    return interaction.editReply({ content: '❌ Could not create ticket channel. Check my permissions.' });
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

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════
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
