const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config.json');
const { EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const database = require('./utils/database');
const { addClanPoints } = require('./utils/points');
const Constants = require('./utils/constants');

// إضافة متغير لتخزين آخر وقت تم فيه إضافة نقاط
const lastPointsTime = new Map();

// تهيئة البوت
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences
    ],
    partials: [Partials.Channel, Partials.Message, Partials.User, Partials.GuildMember]
});

// تهيئة المجموعات كـ Collection
client.groups = new Collection();
client.commands = new Collection();
client.buttons = new Collection();
client.Constants = Constants;

// تحميل الملفات
const loadHandlers = async () => {
    // تحميل معالجات الأحداث
    const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
    for (const file of eventFiles) {
        const event = require(`./events/${file}`);
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }

    // تحميل الأوامر والأزرار
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        try {
            const command = require(`./commands/${file}`);
            if (command.data) {
                client.commands.set(command.data.name, command);
                console.log(`✅ تم تحميل الأمر: ${command.data.name}`);
            }
        } catch (error) {
            console.error(`❌ خطأ في تحميل الأمر ${file}:`, error);
        }
    }

    const buttonsPath = path.join(__dirname, 'buttons');
    const buttonFiles = fs.readdirSync(buttonsPath).filter(file => file.endsWith('.js'));

    for (const file of buttonFiles) {
        try {
            const button = require(`./buttons/${file}`);
            if (button.name) {
                client.buttons.set(button.name, button);
                console.log(`✅ تم تحميل الزر: ${button.name}`);
            }
        } catch (error) {
            console.error(`❌ خطأ في تحميل الزر ${file}:`, error);
        }
    }
};

// تحميل الملفات والبيانات
async function initialize() {
    try {
        // تحميل الأوامر والأزرار
        await loadHandlers();
        
        // تسجيل الدخول
        await client.login(config.token);
        console.log('✅ تم تسجيل الدخول بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تهيئة البوت:', error);
        process.exit(1);
    }
}

// حدث الجاهزية
client.once('ready', async () => {
    console.log(`🤖 ${client.user.tag} جاهز للعمل!`);
    
    // تعيين حالة البوت
    client.user.setPresence({
        activities: [{ 
            name: 'osaka on top',
            type: 1,
            url: 'https://www.twitch.tv/osaka'
        }],
        status: 'online'
    });

    // تحميل البيانات والأنظمة
    try {
        await loadData();
        startPointsSystem();
        startClanUpdates();
        console.log('✅ تم تهيئة النظام بنجاح');
    } catch (error) {
        console.error('❌ خطأ في تهيئة النظام:', error);
    }
});

// معالجة الأخطاء
process.on('unhandledRejection', error => {
    console.error('خطأ غير معالج:', error);
});

client.on('error', error => {
    console.error('خطأ في البوت:', error);
});

// تصدير
module.exports = {
    database,
    Constants
};

// بدء البوت
initialize().catch(error => {
    console.error('❌ خطأ في تشغيل البوت:', error);
    process.exit(1);
});

// تحميل البيانات
const loadData = async () => {
    try {
        const data = await database.loadData();
        if (data && typeof data === 'object') {
            // تحويل البيانات إلى Collection
            for (const [name, group] of Object.entries(data)) {
                client.groups.set(name, group);
            }
        }
        console.log(`✅ تم تحميل ${client.groups.size} مجموعة`);
        return client.groups;
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات:', error);
        return client.groups;
    }
};

// تحديث جميع رسائل العرض
const updateAllPanels = async () => {
    try {
        if (!client || !client.groups) {
            console.log('⌛ جاري انتظار تهيئة البوت...');
            return;
        }

        const guild = client.guilds.cache.first();
        if (!guild) return;

        const clanChannel = guild.channels.cache.get(Constants.CLAN_INFO_CHANNEL);
        if (!clanChannel) return;

        for (const [name, clan] of client.groups) {
            if (clan.panelMessageId) {
                try {
                    const message = await clanChannel.messages.fetch(clan.panelMessageId).catch(() => null);
                    if (message) {
                        const clanRole = guild.roles.cache.get(clan.clanRoleId);
                        const embed = new EmbedBuilder()
                            .setTitle(`🎮 كلان ${name}`)
                            .setColor('Random')
                            .setDescription(
                                `> 👑 **المالك**: <@${clan.owner}>\n` +
                                `> 🛡️ **النائب**: <@${clan.deputy}>\n` +
                                `> 📊 **النقاط**: ${clan.totalPoints || 0}\n` +
                                `> 👥 **الأعضاء**: ${clanRole?.members.size || 0}/${clan.memberLimit}\n\n` +
                                `> 💬 **شات الكلان**: <#${clan.textChannelId}>\n` +
                                `> 🎤 **روم الصوتي**: <#${clan.voiceChannelId}>\n\n` +
                                `> 📅 **تاريخ الإنشاء**: <t:${Math.floor(clan.createdAt / 1000)}:R>`
                            )
                            .setImage(clan.imageUrl)
                            .setThumbnail(guild.iconURL({ dynamic: true }))
                            .setFooter({ 
                                text: `آخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}`,
                                iconURL: guild.iconURL({ dynamic: true })
                            })
                            .setTimestamp();

                        const joinButton = new ButtonBuilder()
                            .setCustomId(`join_clan_${name}`)
                            .setLabel('انضمام للكلان')
                            .setStyle(ButtonStyle.Success)
                            .setEmoji('➕');

                        const row = new ActionRowBuilder()
                            .addComponents(joinButton);

                        await message.edit({
                            embeds: [embed],
                            components: [row]
                        });
                    }
                } catch (error) {
                    console.error(`❌ خطأ في تحديث لوحة ${name}:`, error);
                }
            }
        }

        await database.saveData(client.groups);
    } catch (error) {
        console.error('❌ خطأ في تحديث اللوحات:', error);
    }
};

// دالة لبدء نظام النقاط
function startPointsSystem() {
    setInterval(async () => {
        try {
            // تأكد من وجود client.groups
            if (!client.groups || !(client.groups instanceof Collection)) {
                client.groups = new Collection();
                await loadData();
                return;
            }

            const guild = client.guilds.cache.first();
            if (!guild) return;

            let dataChanged = false;

            // التحقق من كل روم صوتي للكلانات
            for (const [clanName, clan] of client.groups.entries()) {
                const voiceChannel = guild.channels.cache.get(clan.voiceChannelId);
                if (voiceChannel && voiceChannel.members.size > 1) {
                    // تهيئة نقاط الكلان إذا لم تكن موجودة
                    clan.points = clan.points || {};
                    clan.totalPoints = clan.totalPoints || 0;

                    // إضافة نقاط لكل عضو في الروم
                    const members = voiceChannel.members.filter(member => !member.user.bot);
                    if (members.size > 0) {
                        for (const [memberId, member] of members) {
                            const now = Date.now();
                            // التحقق من مرور دقيقة على آخر إضافة نقاط
                            if (!lastPointsTime.has(memberId) || (now - lastPointsTime.get(memberId)) >= 60000) {
                                const pointsToAdd = Math.floor(Math.random() * 3) + 1; // 1-3 نقاط
                                clan.points[memberId] = (clan.points[memberId] || 0) + pointsToAdd;
                                clan.totalPoints += pointsToAdd;
                                lastPointsTime.set(memberId, now);
                                dataChanged = true;
                                console.log(`✅ تم إضافة ${pointsToAdd} نقطة لـ ${member.user.tag} في كلان ${clanName}`);
                            }
                        }
                    }
                }
            }

            // حفظ البيانات فقط إذا تم التغيير
            if (dataChanged) {
                const dataToSave = {};
                for (const [name, clan] of client.groups.entries()) {
                    dataToSave[name] = clan;
                }
                await database.saveData(dataToSave);
                await updateAllPanels();
            }
        } catch (error) {
            console.error('❌ خطأ في نظام النقاط:', error);
        }
    }, 60000); // كل دقيقة
}

// دالة لتحديث لوحة كلان محدد
async function updateClanPanel(clanName, clan, guild) {
    try {
        const clanChannel = guild.channels.cache.get(Constants.CLAN_INFO_CHANNEL);
        if (!clanChannel || !clan.panelMessageId) return;

        const message = await clanChannel.messages.fetch(clan.panelMessageId).catch(() => null);
        if (!message) return;

        const clanRole = guild.roles.cache.get(clan.clanRoleId);
        const level = Math.floor((clan.totalPoints || 0) / 100) + 1;
        const progress = (clan.totalPoints || 0) % 100;

        // ترتيب الأعضاء حسب النقاط وأخذ أفضل 5 فقط
        const sortedMembers = Object.entries(clan.points || {})
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5); // تعديل هنا لأخذ أفضل 5 أعضاء فقط

        let membersText = '';
        for (let i = 0; i < sortedMembers.length; i++) {
            const [userId, points] = sortedMembers[i];
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`;
            membersText += `${medal} <@${userId}> - **${points}** نقطة\n`;
        }

        const embed = new EmbedBuilder()
            .setTitle(`🎮 كلان ${clanName}`)
            .setColor('Random')
            .setDescription(
                `> 👑 **المالك**: <@${clan.owner}>\n` +
                `> 🛡️ **النائب**: <@${clan.deputy}>\n` +
                `> 📊 **النقاط**: ${clan.totalPoints || 0}\n` +
                `> 📈 **المستوى**: ${level} (${progress}/100)\n` +
                `> 👥 **الأعضاء**: ${clanRole?.members.size || 0}/${clan.memberLimit}\n\n` +
                `**🏆 أفضل 5 أعضاء**\n${membersText || '> لا يوجد نقاط بعد'}\n\n` +
                `> 💬 **شات الكلان**: <#${clan.textChannelId}>\n` +
                `> 🎤 **روم الصوتي**: <#${clan.voiceChannelId}>\n\n` +
                `> 📅 **تاريخ الإنشاء**: <t:${Math.floor(clan.createdAt / 1000)}:R>`
            )
            .setImage(clan.imageUrl)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .setFooter({ 
                text: `آخر تحديث: ${new Date().toLocaleTimeString('ar-SA')}`,
                iconURL: guild.iconURL({ dynamic: true })
            })
            .setTimestamp();

        const joinButton = new ButtonBuilder()
            .setCustomId(`join_clan_${clanName}`)
            .setLabel('انضمام للكلان')
            .setStyle(ButtonStyle.Success)
            .setEmoji('➕');

        const row = new ActionRowBuilder()
            .addComponents(joinButton);

        await message.edit({
            embeds: [embed],
            components: [row]
        });
    } catch (error) {
        console.error(`❌ خطأ في تحديث لوحة ${clanName}:`, error);
    }
}

// دالة لبدء تحديثات الكلانات
function startClanUpdates() {
    setInterval(async () => {
        try {
            const guild = client.guilds.cache.first();
            if (!guild) {
                console.log('❌ لم يتم العثور على السيرفر');
                return;
            }

            const clanChannel = guild.channels.cache.get(Constants.CLAN_INFO_CHANNEL);
            if (!clanChannel) {
                console.log('❌ لم يتم العثور على قناة الكلانات');
                return;
            }

            if (!client.groups) {
                console.log('⌛ جاري تهيئة المجموعات...');
                client.groups = new Collection();
                await loadData();
            }

            // تحديث رسائل الكلانات
            await updateAllPanels();
            
        } catch (error) {
            console.error('❌ خطأ في تحديث الكلانات:', error);
        }
    }, 60000);
}

// إضافة معالج الرسائل
client.on('messageCreate', async message => {
    try {
        if (message.author.bot) return;
        if (!message.content.startsWith('#')) return;

        const command = message.content.slice(1).toLowerCase();

        // معالجة الأوامر
        if (command === 'help') {
            const helpCommand = require('./commands/help.js');
            await helpCommand.executeMessage(message);
        }
        else if (command === 'clanpoints') {
            // التحقق من أن الأمر تم تنفيذه في شات كلان
            const clan = Array.from(message.client.groups.values())
                .find(c => c.textChannelId === message.channel.id);

            if (!clan) {
                return await message.reply('❌ يمكن استخدام هذا الأمر في شات الكلان فقط!');
            }

            // ترتيب الأعضاء حسب النقاط
            const sortedMembers = Object.entries(clan.points || {})
                .sort(([, a], [, b]) => b - a);

            let membersText = '';
            for (let i = 0; i < sortedMembers.length; i++) {
                const [userId, points] = sortedMembers[i];
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
                membersText += `${medal} <@${userId}> - **${points}** نقطة\n`;
            }

            const level = Math.floor((clan.totalPoints || 0) / 100) + 1;
            const progress = (clan.totalPoints || 0) % 100;

            const embed = new EmbedBuilder()
                .setColor('Blue')
                .setTitle(`📊 نقاط كلان ${clan.name}`)
                .setDescription(
                    `> 📈 **المستوى الحالي**: ${level}\n` +
                    `> ⭐ **مجموع النقاط**: ${clan.totalPoints || 0}\n` +
                    `> 📊 **التقدم للمستوى التالي**: ${progress}/100\n\n` +
                    `**🏆 ترتيب الأعضاء**\n` +
                    (membersText || '> لا يوجد نقاط بعد')
                )
                .setThumbnail(message.guild.iconURL({ dynamic: true }))
                .setTimestamp();

            await message.reply({ embeds: [embed] });
        }
        else if (command === 'top') {
            const topCommand = require('./commands/top.js');
            await topCommand.executeMessage(message);
        }
        else if (command.startsWith('promote')) {
            const promoteCommand = require('./commands/promote.js');
            // الحصول على العضو المذكور
            const member = message.mentions.members.first();
            if (!member) {
                return message.reply('❌ يرجى ذكر العضو المراد ترقيته!');
            }
            // تنفيذ الأمر
            await promoteCommand.executeMessage(message, member);
        }
        else if (command.startsWith('rename')) {
            const args = message.content.slice(7).trim().split(/ +/);
            if (args.length < 2) {
                return message.reply('❌ الاستخدام الصحيح: `#rename اسم_الكلان_الحالي الاسم_الجديد`');
            }
            const renameCommand = require('./commands/rename.js');
            await renameCommand.executeMessage(message, args[0], args[1]);
        }
        else if (command.startsWith('deleteclan')) {
            const args = message.content.slice(11).trim().split(/ +/);
            if (args.length < 1) {
                return message.reply('❌ الاستخدام الصحيح: `#deleteclan اسم_الكلان`');
            }
            const deleteCommand = require('./commands/deleteclan.js');
            await deleteCommand.executeMessage(message, args[0]);
        }
        else if (command.startsWith('scgroup')) {
            const args = message.content.slice(9).trim().split(/ +/);
            if (args.length < 4) {
                return message.reply('❌ الاستخدام الصحيح: `#scgroup الاسم @المالك @النائب رابط_الصورة`');
            }
            const scgroupCommand = require('./commands/scgroup.js');
            await scgroupCommand.executeMessage(message, args);
        }
        else if (command.startsWith('setlimit')) {
            const args = message.content.slice(9).trim().split(/ +/);
            if (args.length < 2) {
                return message.reply('❌ الاستخدام الصحيح: `#setlimit اسم_الكلان الحد_الجديد`');
            }
            const setlimitCommand = require('./commands/setlimit.js');
            await setlimitCommand.executeMessage(message, args[0], parseInt(args[1]));
        }
        else if (command.startsWith('kick')) {
            const member = message.mentions.members.first();
            if (!member) {
                return message.reply('❌ يرجى ذكر العضو المراد طرده!');
            }
            const kickCommand = require('./commands/kick.js');
            await kickCommand.executeMessage(message, member);
        }
        else if (command === 'leave') {
            const leaveCommand = require('./commands/leave.js');
            await leaveCommand.executeMessage(message);
        }
    } catch (error) {
        console.error('Error handling message command:', error);
    }
});

// إضافة نظام النقاط المستمر
setInterval(async () => {
    try {
        // التحقق من تهيئة النظام
        if (!client?.groups || !(client.groups instanceof Collection)) {
            console.log('⌛ في انتظار تهيئة النظام...');
            return;
        }

        const guild = client.guilds.cache.first();
        if (!guild) return;

        // التحقق من كل كلان
        for (const [clanName, clan] of client.groups) {
            const voiceChannel = guild.channels.cache.get(clan.voiceChannelId);
            
            // التحقق من وجود أكثر من عضو في الروم
            if (voiceChannel && voiceChannel.members.size > 1) {
                // تهيئة نقاط الكلان إذا لم تكن موجودة
                if (!clan.points) clan.points = {};
                if (!clan.totalPoints) clan.totalPoints = 0;

                // إضافة نقاط لكل عضو في الروم
                const members = voiceChannel.members.filter(member => !member.user.bot);
                if (members.size > 0) {
                    let updated = false;

                    for (const [memberId, member] of members) {
                        const now = Date.now();
                        // التحقق من مرور دقيقة على آخر إضافة نقاط
                        if (!lastPointsTime.has(memberId) || (now - lastPointsTime.get(memberId)) >= 60000) {
                            const pointsToAdd = Math.floor(Math.random() * 3) + 1; // 1-3 نقاط
                            clan.points[memberId] = (clan.points[memberId] || 0) + pointsToAdd;
                            clan.totalPoints += pointsToAdd;
                            lastPointsTime.set(memberId, now);
                            updated = true;
                            console.log(`✅ تم إضافة ${pointsToAdd} نقطة لـ ${member.user.tag} في كلان ${clanName}`);
                        }
                    }

                    // حفظ التغييرات وتحديث اللوحة
                    if (updated) {
                        await database.saveData(client.groups);
                        const clanChannel = guild.channels.cache.get(Constants.CLAN_INFO_CHANNEL);
                        if (clanChannel && clan.panelMessageId) {
                            try {
                                const message = await clanChannel.messages.fetch(clan.panelMessageId);
                                if (message) {
                                    await updateClanPanel(clanName, clan, guild);
                                }
                            } catch (error) {
                                console.error(`❌ خطأ في تحديث لوحة ${clanName}:`, error);
                            }
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ خطأ في نظام النقاط:', error);
    }
}, 60000); // كل دقيقة

// إضافة معالج الأوامر السلاش
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        const errorMessage = {
            content: '❌ حدث خطأ أثناء تنفيذ الأمر!',
            ephemeral: true
        };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// إضافة معالج الأزرار
client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;

    try {
        const customId = interaction.customId;
        const action = customId.startsWith('join_clan') ? 'join_clan' : customId.split('_')[0];
        
        console.log('Button Interaction:', {
            customId: customId,
            action: action,
            availableButtons: Array.from(client.buttons.keys())
        });
        
        const button = client.buttons.get(action);
        if (!button) {
            console.error(`Button handler not found for: ${action}`);
            console.log('Available buttons:', Array.from(client.buttons.keys()));
            return;
        }

        await button.execute(interaction);
    } catch (error) {
        console.error('Error handling button:', error);
        if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({ 
                content: '❌ حدث خطأ أثناء معالجة الزر',
                flags: [4096]
            });
        }
    }
});

// تحديث رسائل الكلانات بشكل مستمر
async function updateClanMessages() {
    try {
        const guild = client.guilds.cache.first();
        if (!guild) return;

        const clanChannel = guild.channels.cache.get(Constants.CLAN_INFO_CHANNEL);
        if (!clanChannel) return;

        for (const [name, clan] of client.groups) {
            if (!clan.panelMessageId) continue;

            try {
                const message = await clanChannel.messages.fetch(clan.panelMessageId);
                if (!message) continue;

                const clanRole = guild.roles.cache.get(clan.clanRoleId);
                if (!clanRole) continue;

                const embed = new EmbedBuilder()
                    .setTitle(`🎮 كلان ${name}`)
                    .setColor('Random')
                    .setDescription(
                        `> 👑 **المالك**: <@${clan.owner}>\n` +
                        `> 🛡️ **النائب**: <@${clan.deputy}>\n` +
                        `> 📊 **النقاط**: ${clan.totalPoints || 0}\n` +
                        `> 👥 **الأعضاء**: ${clanRole.members.size}/${clan.memberLimit}\n\n` +
                        `> 💬 **شات الكلان**: <#${clan.textChannelId}>\n` +
                        `> 🎤 **روم الصوتي**: <#${clan.voiceChannelId}>\n\n` +
                        `> 📅 **تاريخ الإنشاء**: <t:${Math.floor(clan.createdAt / 1000)}:R>`
                    )
                    .setImage(clan.imageUrl)
                    .setThumbnail(guild.iconURL({ dynamic: true }))
                    .setTimestamp();

                const joinButton = new ButtonBuilder()
                    .setCustomId(`join_clan_${name}`)
                    .setLabel('انضمام للكلان')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕');

                const row = new ActionRowBuilder()
                    .addComponents(joinButton);

                await message.edit({
                    embeds: [embed],
                    components: [row]
                });
            } catch (error) {
                console.error(`Error updating message for clan ${name}:`, error);
            }
        }
    } catch (error) {
        console.error('Error updating clan messages:', error);
    }
}

// تشغيل التحديث كل دقيقة
setInterval(updateClanMessages, 60000);

// إضافة معالج خروج الأعضاء
client.on('guildMemberRemove', async member => {
    try {
        // البحث عن الكلان الذي كان العضو فيه
        for (const [name, clan] of client.groups) {
            const clanRole = member.guild.roles.cache.get(clan.clanRoleId);
            if (clanRole && member.roles.cache.has(clanRole.id)) {
                // إذا كان العضو هو المالك
                if (clan.owner === member.id) {
                    // البحث عن النائب لترقيته إلى مالك
                    if (clan.deputy) {
                        clan.owner = clan.deputy;
                        clan.deputy = null;
                        
                        // إرسال إشعار في شات الكلان
                        const textChannel = member.guild.channels.cache.get(clan.textChannelId);
                        if (textChannel) {
                            await textChannel.send({
                                embeds: [
                                    new EmbedBuilder()
                                        .setColor('Yellow')
                                        .setTitle('👑 تغيير ملكية الكلان')
                                        .setDescription(
                                            `غادر مالك الكلان <@${member.id}> السيرفر\n` +
                                            `تمت ترقية <@${clan.owner}> إلى مالك الكلان الجديد`
                                        )
                                        .setTimestamp()
                                ]
                            });
                        }
                    }
                }
                // إذا كان العضو هو النائب
                else if (clan.deputy === member.id) {
                    clan.deputy = null;
                    
                    // إرسال إشعار في شات الكلان
                    const textChannel = member.guild.channels.cache.get(clan.textChannelId);
                    if (textChannel) {
                        await textChannel.send({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('Yellow')
                                    .setTitle('👋 مغادرة نائب الكلان')
                                    .setDescription(`غادر نائب الكلان <@${member.id}> السيرفر`)
                                    .setTimestamp()
                            ]
                        });
                    }
                }

                // حذف نقاط العضو
                if (clan.points && clan.points[member.id]) {
                    clan.totalPoints -= clan.points[member.id];
                    delete clan.points[member.id];
                }

                // حفظ التغييرات
                await database.saveData(client.groups);
                break;
            }
        }
    } catch (error) {
        console.error('Error handling member leave:', error);
    }
});

