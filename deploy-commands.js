const { REST, Routes } = require('discord.js');
const { token, guildId, CLIENT_ID } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');
const { SlashCommandBuilder } = require('discord.js');

// التحقق من التوكن والمعرفات
if (!token || token === 'your-bot-token') {
    console.error('❌ خطأ: التوكن غير صحيح في ملف config.json');
    process.exit(1);
}

if (!CLIENT_ID || CLIENT_ID === 'your-bot-client-id') {
    console.error('❌ خطأ: معرف البوت غير صحيح في ملف config.json');
    process.exit(1);
}

if (!guildId || guildId === 'your-server-id') {
    console.error('❌ خطأ: معرف السيرفر غير صحيح في ملف config.json');
    process.exit(1);
}

const commands = [
    new SlashCommandBuilder()
        .setName('scgroup')
        .setDescription('إنشاء كلان جديد')
        .addStringOption(option =>
            option.setName('name')
                .setDescription('اسم الكلان')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('owner')
                .setDescription('مالك الكلان')
                .setRequired(true))
        .addUserOption(option =>
            option.setName('deputy')
                .setDescription('نائب الكلان')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('رابط صورة الكلان')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('rules')
                .setDescription('قوانين الكلان')
                .setRequired(false)
                .setMinLength(1)
                .setMaxLength(1024))
        .toJSON(),
    require('./commands/help.js').data,
    require('./commands/clanpoints.js').data,
    require('./commands/top.js').data,
    require('./commands/promote.js').data,
    require('./commands/rename.js').data,
    require('./commands/deleteclan.js').data,
    require('./commands/setlimit.js').data,
    require('./commands/kick.js').data,
    require('./commands/leave.js').data
];

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

console.log('⌛ جاري تحميل الأوامر...');

for (const file of commandFiles) {
    try {
        const command = require(`./commands/${file}`);
        if (command.data && command.data.toJSON) {
            commands.push(command.data.toJSON());
            console.log(`✅ تم تحميل الأمر: ${command.data.name}`);
        }
    } catch (error) {
        console.error(`❌ خطأ في تحميل الأمر ${file}:`, error);
    }
}

const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('⌛ جاري تسجيل أوامر السلاش...');
        console.log(`📋 عدد الأوامر: ${commands.length}`);

        // تسجيل الأوامر عالمياً
        const data = await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );

        console.log(`✅ تم تسجيل ${data.length} أمر بنجاح!`);
    } catch (error) {
        console.error('❌ حدث خطأ:', error);
    }
})(); 