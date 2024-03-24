const Discord = require("discord.js");
const {MessageAttachment, Client, MessageActionRow, MessageButton, MessageEmbed, MessageSelectMenu, Intents, Collection} = require("discord.js");
const db2 = require("pro.db");
const config  = require("./config.js");
const client = new Client({
	intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS],
	partials: ['MESSAGE', 'CHANNEL', 'REACTION'],
});
client.setMaxListeners(9999999);
const ms = require("ms");
const embed_color = config.embed_color;
const embed_color_reply = config.embed_color_reply;
const prefix = config.prefix;

client.on("ready", () => {
  console.log(`${b} \x1b[94m${client.user.username} \x1b[0m`);
  client.user.setStatus(config.status);
  client.user.setActivity(
    `${prefix}${config.activity.name}`,
    { type: config.activity.type, url: config.activity.url }
  );
    console.log(e);
});


const getRolesMentions = (roleIds, Nermin) => {
  return roleIds
    ? roleIds
        .map((roleId) => {
          const role = Nermin.guild.roles.cache.get(roleId);
          return role ? role.toString() : "غير معروف";
        })
        .join(", ")
    : "لا يوجد";
};
client.on('messageCreate', async (Nermin) => {
if (Nermin.author.bot || !Nermin.content.startsWith(prefix)) return;
if (Nermin.content === prefix + "add-reply") {
   if (!Nermin.member.permissions.has('MANAGE_ROLES') || !Nermin.member.permissions.has('MANAGE_MESSAGES')) {
  return Nermin.reply({ content: "لا تمتلك صلاحية المسؤول لاستخدام هذا الأمر", allowedMentions: { parse: [] } });
}


  let confirmEmbed = new MessageEmbed()
    .setAuthor(Nermin.author.tag, Nermin.author.avatarURL({ dynamic: true }))
    .setColor(embed_color)
    .setDescription(`هل أنت متأكد أنك تريد استخدام هذا الأمر؟ أجب بـ':white_check_mark:'للمتابعة و':x:'للإلغاء`)
    .setTimestamp();

  const confirmMsg = await Nermin.channel.send({ embeds: [confirmEmbed] });
  await confirmMsg.react('✅');
  await confirmMsg.react('❌');

  const filterReaction = (reaction, user) => {
    return user.id === Nermin.author.id && ['✅', '❌'].includes(reaction.emoji.name);
  };

  const reactionCollector = confirmMsg.createReactionCollector({ filter: filterReaction, time: 15000 });

  reactionCollector.on('collect', async (reaction) => {
    if (reaction.emoji.name === '✅') {
      let embed1 = new MessageEmbed()
        .setAuthor(Nermin.author.tag, Nermin.author.avatarURL({ dynamic: true }))
        .setColor(embed_color)
        .setDescription(`اكتب الرسالة`)
        .setTimestamp();
      const embedMsg1 = await Nermin.channel.send({ embeds: [embed1] });

      let filter = (msg) => msg.author.id === Nermin.author.id;

      try {
        const collected1 = await Nermin.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        const c = collected1.first();

        var ccc = c.content;

        let database = await db2.fetch(`ar_${Nermin.guild.id}`);
        let embed2 = new MessageEmbed()
          .setAuthor(Nermin.author.tag, Nermin.author.avatarURL({ dynamic: true }))
          .setColor(embed_color)
          .setDescription(`🙄 ** الرد دا موجود في داتا**`)
          .setTimestamp();

        if (database && database.find((x) => x.message === ccc.toLowerCase())) {
          return Nermin.channel.send({ embeds: [embed2] });
        }

        let embed3 = new MessageEmbed()
          .setAuthor(Nermin.author.tag, Nermin.author.avatarURL({ dynamic: true }))
          .setColor(embed_color)
          .setDescription(`اكتب رد البوت`)
          .addField(
            `المتغيرات`,
            `[user] **الإشارة إلى الكاتب**\n[userName] **يظهر اسم العضو بدون الإشارة له**\n[invites] **عدد دعوات العضو**`,
            true
          )
          .setTimestamp();
        const embedMsg2 = await Nermin.channel.send({ embeds: [embed3] });

        const collected2 = await Nermin.channel.awaitMessages({ filter, max: 1, time: 60000, errors: ['time'] });
        const d = collected2.first();

        let databaseEntry = {
          id: database ? database.length + 1 : 1, // Use the length of the database as the new ID
          message: ccc.toLowerCase(),
          res: d.content,
          deleteUserMessage: false,
          disabledRoles: [], // Initialize disabledRoles array for this entry
          enableroles: [], // Initialize enableroles array for this entry
          disabledChannels: [],
          enabledChannels: [],
        };

        if (!Array.isArray(database)) {
          database = [];
        }

        database.push(databaseEntry);

        if (Nermin.channel.permissionsFor(Nermin.author).has('MANAGE_MESSAGES')) {
          let embed4 = new MessageEmbed()
            .setAuthor(Nermin.author.tag, Nermin.author.avatarURL({ dynamic: true }))
            .setColor(embed_color)
            .setDescription(`هل تريد حذف رسالة العضو؟ اضغط على':white_check_mark:'للموافقة أو':x:'للرفض`)
            .setTimestamp();

          const confirmMsg = await Nermin.channel.send({ embeds: [embed4] });
          await confirmMsg.react('✅');
          await confirmMsg.react('❌');

          const filterReaction = (reaction, user) => {
            return user.id === Nermin.author.id && ['✅', '❌'].includes(reaction.emoji.name);
          };

          const reactionCollector = confirmMsg.createReactionCollector({ filter: filterReaction, time: 15000 });

          reactionCollector.on('collect', (reaction) => {
            if (reaction.emoji.name === '✅') {
              let embed5 = new MessageEmbed()
                .setDescription(`
                **ReplyID**: ${database.length + 0}
                ـــــــــــــــــــــــــــــــــــــــــ
                الكلمة: ${c.content}
                ـــــــــــــــــــــــــــــــــــــــــ
                الرد: ${d.content}
                ــــــــــــــــــــــــــــــــــــــــــ
                رسالة العضو: ✅`)
                .setColor(embed_color)
                .setAuthor(Nermin.author.tag, Nermin.author.avatarURL({ dynamic: true }))
                .setFooter(Nermin.guild.name, Nermin.guild.iconURL({ dynamic: true }))
                .setTimestamp();

              Nermin.channel.send({ embeds: [embed5] });
              databaseEntry.deleteUserMessage = true;
              Nermin.delete().catch(console.error);
            } else {
              let embed5 = new MessageEmbed()
                .setDescription(`
                **ReplyID**: ${database.length + 0}
                ـــــــــــــــــــــــــــــــــــــــــ
                الكلمة: ${c.content}
                ـــــــــــــــــــــــــــــــــــــــــ
                الرد: ${d.content}
                ـــــــــــــــــــــــــــــــــــــــــ
                مسح رسالة العضو: ❌`)
                .setColor(embed_color)
                .setAuthor(Nermin.author.tag, Nermin.author.avatarURL({ dynamic: true }))
                .setFooter(Nermin.guild.name, Nermin.guild.iconURL({ dynamic: true }))
                .setTimestamp();

              Nermin.channel.send({ embeds: [embed5] });
              databaseEntry.deleteUserMessage = false;
            }

            confirmMsg.delete().catch(console.error);

            reactionCollector.stop();
          });

          reactionCollector.on('end', () => {
            db2.set(`ar_${Nermin.guild.id}`, database);
          });
        } else {
          db2.set(`ar_${Nermin.guild.id}`, database);
        }
      } catch (error) {
        console.error(error);
        Nermin.channel.send(`لم يتم إضافة بيانات الرد بشكل كامل، يرجى المحاولة مرة أخرى.`);
      }
    } else if (reaction.emoji.name === '❌') {
      let cancelEmbed = new MessageEmbed()
        .setAuthor(Nermin.author.tag, Nermin.author.avatarURL({ dynamic: true }))
        .setColor(embed_color)
        .setDescription(`تم إلغاء الأمر.`)
        .setTimestamp();
      Nermin.channel.send({ embeds: [cancelEmbed] });

      confirmMsg.delete().catch(console.error);
    }
  });
}
else if (Nermin.content.startsWith(prefix + "disable-role")) {
  if (!Nermin.member.permissions.has('MANAGE_ROLES') || !Nermin.member.permissions.has('MANAGE_MESSAGES')) {
  return Nermin.reply({ content: "لا تمتلك صلاحية المسؤول لاستخدام هذا الأمر", allowedMentions: { parse: [] } });
}


  // استخراج الأمر والوسائط المرسلة معه
  const args = Nermin.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "disable-role") {
    if (args.length !== 2 || !args[0].match(/^\d+$/) || !args[1].startsWith("<@&") || !args[1].endsWith(">")) {
      return Nermin.reply({ content: "الاستخدام: " + prefix + "disableRole replyID @Role", allowedMentions: { parse: [] } });
    }

    const replyId = parseInt(args[0]);
    const roleId = args[1].slice(3, -1);

    let database = await db2.fetch(`ar_${Nermin.guild.id}`);
    if (!Array.isArray(database)) {
      database = [];
    }

    const existingEntry = database.find((entry) => entry.id === replyId);
    if (!existingEntry) {
      return Nermin.reply({ content: "لا يوجد رقم رد مطابق في قاعدة البيانات", allowedMentions: { parse: [] } });
    }

    const role = Nermin.guild.roles.cache.get(roleId);
    if (!role) {
      return Nermin.reply({ content: "الرتبة غير موجودة", allowedMentions: { parse: [] } });
    }

    existingEntry.disabledRoles = existingEntry.disabledRoles || [];
    existingEntry.enableroles = existingEntry.enableroles || [];

    // Check if the role is already in the enableroles list
    const enableroleIndex = existingEntry.enableroles.indexOf(roleId);
    if (enableroleIndex !== -1) {
      // If the role is already enabled, remove it from the enableroles array
      existingEntry.enableroles.splice(enableroleIndex, 1);
    }

    // Check if the role is already in the disabledRoles list
    const disabledRoleIndex = existingEntry.disabledRoles.indexOf(roleId);
    if (disabledRoleIndex !== -1) {
      // If the role is already disabled, remove it from the disabledRoles array
      existingEntry.disabledRoles.splice(disabledRoleIndex, 1);
    } else {
      // Add the role to the disabledRoles array if it's not already there
      existingEntry.disabledRoles.push(roleId);
    }

    db2.set(`ar_${Nermin.guild.id}`, database);
    return Nermin.reply({ content: `الرتبة ${role.name} معطلة الآن لرقم الرد ${replyId} `, allowedMentions: { parse: [] } });
  }
}
else if (Nermin.content.startsWith(prefix + "enable-role")) {
 if (!Nermin.member.permissions.has('MANAGE_ROLES') || !Nermin.member.permissions.has('MANAGE_MESSAGES')) {
  return Nermin.reply({ content: "لا تمتلك صلاحية المسؤول لاستخدام هذا الأمر", allowedMentions: { parse: [] } });
}


  // استخراج الأمر والوسائط المرسلة معه
  const args = Nermin.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "enable-role") {
    if (args.length !== 2 || !args[0].match(/^\d+$/) || !args[1].startsWith("<@&") || !args[1].endsWith(">")) {
      return Nermin.reply({ content: "الاستخدام: " + prefix + "enablerole replyID @Role", allowedMentions: { parse: [] } });
    }

    const replyId = parseInt(args[0]);
    const roleId = args[1].slice(3, -1);

    let database = await db2.fetch(`ar_${Nermin.guild.id}`);
    if (!Array.isArray(database)) {
      database = [];
    }

    const existingEntry = database.find((entry) => entry.id === replyId);
    if (!existingEntry) {
      return Nermin.reply({ content: "لا يوجد رقم رد مطابق في قاعدة البيانات", allowedMentions: { parse: [] } });
    }

    const role = Nermin.guild.roles.cache.get(roleId);
    if (!role) {
      return Nermin.reply({ content: "الرتبة غير موجودة", allowedMentions: { parse: [] } });
    }

    existingEntry.disabledRoles = existingEntry.disabledRoles || [];
    existingEntry.enableroles = existingEntry.enableroles || [];

    // Check if the role is already in the disabledRoles list
    const disabledRoleIndex = existingEntry.disabledRoles.indexOf(roleId);
    if (disabledRoleIndex !== -1) {
      // If the role is already disabled, remove it from the disabledRoles array
      existingEntry.disabledRoles.splice(disabledRoleIndex, 1);
    }

    // Check if the role is already in the enableroles list
    const enableroleIndex = existingEntry.enableroles.indexOf(roleId);
    if (enableroleIndex !== -1) {
      // If the role is already enabled, remove it from the enableroles array
      existingEntry.enableroles.splice(enableroleIndex, 1);
    } else {
      // Add the role to the enableroles array if it's not already there
      existingEntry.enableroles.push(roleId);
    }

    db2.set(`ar_${Nermin.guild.id}`, database);
    return Nermin.reply({ content: `الرتبة ${role.name} مفعلة الآن لرقم الرد ${replyId} `, allowedMentions: { parse: [] } });
  }
}
else if (Nermin.content.startsWith(prefix + "disable-reply")) {
 if (!Nermin.member.permissions.has('MANAGE_ROLES') || !Nermin.member.permissions.has('MANAGE_MESSAGES')) {
  return Nermin.reply({ content: "لا تمتلك صلاحية المسؤول لاستخدام هذا الأمر", allowedMentions: { parse: [] } });
}

  // Split the command into arguments
  const args = Nermin.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "disable-reply") {
    if (args.length !== 2 || !args[0].match(/^\d+$/) || !args[1].match(/^<#\d+>$/)) {
      return Nermin.reply({ content: "الاستخدام: " + prefix + "disablereply replyID #channel", allowedMentions: { parse: [] } });
    }

    const replyId = parseInt(args[0]);
    const channelId = args[1].slice(2, -1);

    let database = await db2.fetch(`ar_${Nermin.guild.id}`);
    if (!Array.isArray(database)) {
      database = [];
    }

    const existingEntry = database.find((entry) => entry.id === replyId);
    if (!existingEntry) {
      return Nermin.reply({ content: "لا يوجد رقم رد مطابق في قاعدة البيانات.", allowedMentions: { parse: [] } });
    }

    existingEntry.enabledChannels = existingEntry.enabledChannels || [];
    existingEntry.disabledChannels = existingEntry.disabledChannels || [];
    
    // If the channel is in the enabledChannels array, remove it and add to disabledChannels
    const channelIndex = existingEntry.enabledChannels.indexOf(channelId);
    if (channelIndex !== -1) {
      existingEntry.enabledChannels.splice(channelIndex, 1);
      existingEntry.disabledChannels.push(channelId);
      db2.set(`ar_${Nermin.guild.id}`, database);
      return Nermin.reply({ content: `تم إزالة القناة <#${channelId}> من القنوات المسموح بها للرد رقم ${replyId} وتم إضافتها إلى القنوات المعطلة.`, allowedMentions: { parse: [] } });
    }
    
    // If the channel is in the disabledChannels array, remove it
    const disabledChannelIndex = existingEntry.disabledChannels.indexOf(channelId);
    if (disabledChannelIndex !== -1) {
      existingEntry.disabledChannels.splice(disabledChannelIndex, 1);
      db2.set(`ar_${Nermin.guild.id}`, database);
      return Nermin.reply({ content: `تم إزالة القناة <#${channelId}> من القنوات المعطلة للرد رقم ${replyId}.`, allowedMentions: { parse: [] } });
    }
    
    // If the channel is not in any array, add it to disabledChannels
    existingEntry.disabledChannels.push(channelId);
    db2.set(`ar_${Nermin.guild.id}`, database);
    return Nermin.reply({ content: `تم إضافة القناة <#${channelId}> إلى القنوات المعطلة للرد رقم ${replyId}.`, allowedMentions: { parse: [] } });
  }
}
else if (Nermin.content.startsWith(prefix + "enable-reply")) {
  if (!Nermin.member.permissions.has('MANAGE_ROLES') || !Nermin.member.permissions.has('MANAGE_MESSAGES')) {
  return Nermin.reply({ content: "لا تمتلك صلاحية المسؤول لاستخدام هذا الأمر", allowedMentions: { parse: [] } });
}


  // Split the command into arguments
  const args = Nermin.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "enable-reply") {
    if (args.length !== 2 || !args[0].match(/^\d+$/) || !args[1].match(/^<#\d+>$/)) {
      return Nermin.reply({ content: "الاستخدام: " + prefix + "enablereply replyID #channel", allowedMentions: { parse: [] } });
    }

    const replyId = parseInt(args[0]);
    const channelId = args[1].slice(2, -1);

    let database = await db2.fetch(`ar_${Nermin.guild.id}`);
    if (!Array.isArray(database)) {
      database = [];
    }

    const existingEntry = database.find((entry) => entry.id === replyId);
    if (!existingEntry) {
      return Nermin.reply({ content: "لا يوجد رقم رد مطابق في قاعدة البيانات.", allowedMentions: { parse: [] } });
    }

    existingEntry.enabledChannels = existingEntry.enabledChannels || [];
    existingEntry.disabledChannels = existingEntry.disabledChannels || [];

    // Check if the channel is already in the enabledChannels list
    const enabledChannelIndex = existingEntry.enabledChannels.indexOf(channelId);
    if (enabledChannelIndex !== -1) {
      // If the channel is already enabled, remove it from the enabledChannels array
      existingEntry.enabledChannels.splice(enabledChannelIndex, 1);
      db2.set(`ar_${Nermin.guild.id}`, database);
      return Nermin.reply({ content: `تم إزالة القناة <#${channelId}> من القنوات المفعلة للرد رقم ${replyId}.`, allowedMentions: { parse: [] } });
    }

    // If the channel is in the disabledChannels array, enable it and remove it from disabledChannels
    const channelIndex = existingEntry.disabledChannels.indexOf(channelId);
    if (channelIndex !== -1) {
      existingEntry.disabledChannels.splice(channelIndex, 1);
      existingEntry.enabledChannels.push(channelId);
      db2.set(`ar_${Nermin.guild.id}`, database);
      return Nermin.reply({ content: `تم تفعيل القناة <#${channelId}> للرد رقم ${replyId}.`, allowedMentions: { parse: [] } });
    }

    // If the channel is not in the disabledChannels array, it is already enabled
    return Nermin.reply({ content: `القناة <#${channelId}> مفعلة بالفعل للرد رقم ${replyId}.`, allowedMentions: { parse: [] } });
  }
}
else if (Nermin.content.startsWith(prefix + "setreplytype")) {
   if (!Nermin.member.permissions.has('MANAGE_ROLES') || !Nermin.member.permissions.has('MANAGE_MESSAGES')) {
  return Nermin.reply({ content: "لا تمتلك صلاحية المسؤول لاستخدام هذا الأمر", allowedMentions: { parse: [] } });
}


  const args = Nermin.content.slice(prefix.length).trim().split(/ +/);
  const command = args.shift().toLowerCase();

  if (command === "setreplytype") {
    if (args.length !== 2 || !args[0].match(/^\d+$/) || !["send", "reply", "embed"].includes(args[1].toLowerCase())) {
      return Nermin.reply({ content: "الاستخدام: " + prefix + "setreplytype replyID (send | reply | embed)", allowedMentions: { parse: [] } });
    }

    const replyId = parseInt(args[0]);
    const replyType = args[1].toLowerCase();
    const validReplyTypes = ["send", "reply", "embed"];

    if (!validReplyTypes.includes(replyType)) {
      return Nermin.reply({ content: "Invalid reply type. Available types are: " + validReplyTypes.join(', '), allowedMentions: { parse: [] } });
    }

    let database = await db2.fetch(`ar_${Nermin.guild.id}`);
    if (!Array.isArray(database)) {
      database = [];
    }

    const existingEntry = database.find((entry) => entry.id === replyId);
    if (!existingEntry) {
      return Nermin.reply({ content: "لا يوجد رقم رد مطابق في قاعدة البيانات", allowedMentions: { parse: [] } });
    }

    db2.set(`replyType_${Nermin.guild.id}_${replyId}`, replyType);
    return Nermin.reply({ content: `تم تحديد نوع الرد إلى \`${replyType}\` لرقم الرد ${replyId} `, allowedMentions: { parse: [] } });
  }
}
else if (Nermin.content.startsWith(prefix + 'list-reply')) {
    if (!Nermin.member.permissions.has('MANAGE_ROLES') || !Nermin.member.permissions.has('MANAGE_MESSAGES')) {
      return Nermin.reply({ content: 'لا تمتلك صلاحية المسؤول لاستخدام هذا الأمر', allowedMentions: { parse: [] } });
    }

    const data = await db2.fetch(`ar_${Nermin.guild.id}`);
    if (!data || data.length === 0) {
      let embed1 = new Discord.MessageEmbed()
        .setAuthor({
          name: Nermin.author.tag,
          iconURL: Nermin.author.avatarURL({ dynamic: true }),
        })
        .setColor(`${embed_color}`)
        .setDescription('❌ لا توجد ردود تلقائية')
        .setTimestamp();

      return Nermin.channel.send({ embeds: [embed1] });
    }

    let array = [];
    for (const [index, reply] of data.entries()) {
      let replyId = index + 1;

      // Fetch the mentions of enabled channels
      const enabledChannelsMentions = reply.enabledChannels && reply.enabledChannels.length > 0
        ? reply.enabledChannels
            .map((channelId) => `<#${channelId}>`)
            .join(", ")
        : "لا يوجد";

      // Fetch the mentions of disabled channels
      const disabledChannelsMentions = reply.disabledChannels && reply.disabledChannels.length > 0
        ? reply.disabledChannels
            .map((channelId) => `<#${channelId}>`)
            .join(", ")
        : "لا يوجد";

      // Fetch the mentions of enabled roles
      const enabledRolesMentions = getRolesMentions(reply.enabledRoles, Nermin);

      // Fetch the mentions of disabled roles
      const disabledRolesMentions = reply.disabledRoles && reply.disabledRoles.length > 0
        ? getRolesMentions(reply.disabledRoles, Nermin)
        : "لا يوجد";

      // Fetch the reply type from the database
      let replyType = await db2.fetch(`replyType_${Nermin.guild.id}_${replyId}`);
      if (!replyType) {
        replyType = "send"; // Set the default value to "send" if not present
      }


      array.push(`
        ReplyID: ${replyId}
        
        الكلمة: ${reply.message}
        
        الرد: ${reply.res}
        
        مسح الرسالة: ${reply.deleteUserMessage ? "✅" : "❌"}
        
        الحالة الرسالة: ${replyType}
        
        الأدوار المفعلة: ${enabledRolesMentions}
        
        الأدوار المعطلة: ${disabledRolesMentions}
        
        القنوات المفعلة: ${enabledChannelsMentions}
        
        القنوات المعطلة: ${disabledChannelsMentions}
      **${prefix}cl-reply <ReplyID> لمسح الرد**`);


      
    }

    let description = array.join('\nـــــــــــــــــــــــــــــــــــــــــــ\n');
    if (description.length > 4096) {
      const chunks = description.match(/[\s\S]{1,4000}/g) || [];
      for (let i = 0; i < chunks.length; i++) {
        var embed = new Discord.MessageEmbed()
          .setDescription(chunks[i])
          .setColor(`${embed_color}`)
          .setAuthor({ name: Nermin.author.tag, iconURL: Nermin.author.avatarURL({ dynamic: true }) })
          .setFooter(Nermin.guild.name, Nermin.guild.iconURL({ dynamic: true }))
          .setTimestamp();

        Nermin.channel.send({ embeds: [embed] });
      }
      return;
    }

    var embed = new Discord.MessageEmbed()
      .setDescription(description)
      .setColor(`${embed_color}`)
      .setAuthor({ name: Nermin.author.tag, iconURL: Nermin.author.avatarURL({ dynamic: true }) })
      .setFooter(Nermin.guild.name, Nermin.guild.iconURL({ dynamic: true }))
      .setTimestamp();

    Nermin.channel.send({ embeds: [embed] });
   
  }
else if (Nermin.content.startsWith(prefix + "cl-repl")) {
 if (!Nermin.member.permissions.has('MANAGE_ROLES') || !Nermin.member.permissions.has('MANAGE_MESSAGES')) {
  return Nermin.reply({ content: "لا تمتلك صلاحية المسؤول لاستخدام هذا الأمر", allowedMentions: { parse: [] } });
}


  const replyId = Nermin.content.split(" ")[1];
  if (!replyId) {
    return Nermin.channel.send("❌ يجب تحديد رقم التعريف لحذف الرد.");
  }

  const data = await db2.get(`ar_${Nermin.guild.id}`);
  if (!data || data.length === 0) {
    return Nermin.channel.send("❌ لا توجد ردود تلقائية في قاعدة البيانات.");
  }

  const index = parseInt(replyId) - 1;
  if (isNaN(index) || index < 0 || index >= data.length) {
    return Nermin.channel.send("❌ رقم التعريف غير صحيح أو غير موجود.");
  }

  let removedReply = data[index];
  data.splice(index, 1);
  db2.set(`ar_${Nermin.guild.id}`, data);

  // Delete the reply type data for the deleted reply
  const replyTypeKey = `replyType_${Nermin.guild.id}_${replyId}`;
  if (await db2.has(replyTypeKey)) {
    db2.delete(replyTypeKey);
  }

  // Get the reply type before deleting it from the database
  let replyType = removedReply.replyType || "send";

  let embed = new Discord.MessageEmbed()
    .setTitle("تم حذف الرد التلقائي بنجاح")
    .setDescription(`
      رقم التعريف: ${replyId}
      الكلمة: ${removedReply.message}
      الرد: ${removedReply.res}
      مسح الرسالة: ${removedReply.deleteUserMessage ? "نعم" : "لا"}
     حالة الرسالة: ${replyType}
    `)
    .setColor(embed_color)
    .setFooter(Nermin.guild.name, Nermin.guild.iconURL({ dynamic: true }))
    .setTimestamp();

  return Nermin.channel.send({ embeds: [embed] });
}
});
const e  = "\x1b[36mOm Nura / Nermin\n\x1b[35mhttps://discord.gg/MhWr5N74tW :Girls Server\x1b[0m";
const b = "\x1b[94mis active \x1b[0m";
client.on('messageCreate', async (Nermin) => {
  let data = db2.get(`ar_${Nermin.guild.id}`) || [];
  const channelId = Nermin.channel.id;

  if (data.length === 0) {
    const userMention = `<@${Nermin.author.id}>`;
    const userName = Nermin.author.username;
    const inviter = Nermin.author.id;
    const inviteUses = Nermin.guild.members.cache
      .filter((member) => member.user.id === Nermin.author.id && member.presence && member.presence.activities)
      .map((member) => member.presence.activities)
      .flat()
      .filter((activity) => activity.type === 'CUSTOM_STATUS' && activity.state.includes('Invite'))
      .length;

   
  } else if (data) {
    let word = data.find((x) => x.message === Nermin.content.toLowerCase());
    if (word) {
      const hasEnabledRole = word.enableroles.length === 0 || Nermin.member.roles.cache.some((role) => word.enableroles.includes(role.id));
      const isChannelEnabled = word.enabledChannels && word.enabledChannels.includes(channelId);
      const isChannelDisabled = word.disabledChannels && word.disabledChannels.includes(channelId);

      let replyType = db2.get(`replyType_${Nermin.guild.id}_${word.id}`);
      if (!replyType) {
        replyType = 'send';
      }

      if (hasEnabledRole && (isChannelEnabled || word.enabledChannels.length === 0) && (!word.disabledRoles || !word.disabledRoles.includes(Nermin.member.roles.highest.id)) && !isChannelDisabled) {
        
        Nermin.guild.invites.fetch().then((invites) => {
          const inviter = Nermin.author.id;
          const inviteData = invites.find((invite) => invite.inviter && invite.inviter.id === inviter);
          const inviteUses = inviteData ? inviteData.uses : 0;

          const userMention = `<@${Nermin.author.id}>`;
          const userName = Nermin.author.username;

          
          const reply = word.res.replace('[user]', userMention).replace('[userName]', userName).replace('[invites]', inviteUses);

          const imageUrls = reply.match(/https?:\/\/[^\s]+/g) || [];
const text = reply.replace(/https?:\/\/[^\s]+/g, '');

const imageExtensions = ['gif', 'png', 'jpg', 'jpeg'];
const imageFiles = imageUrls.filter(url => {
  const extension = url.split('.').pop().toLowerCase();
  return imageExtensions.some(ext => extension.startsWith(ext));
});

const nonImageUrls = imageUrls.filter(url => !imageFiles.includes(url));

if (imageFiles.length > 0) {
  const files = imageFiles;

  if (replyType === 'reply' || replyType === 'send') {
    if (text) {
      Nermin.channel.send({ content: text + '\n' + nonImageUrls.join('\n'), files: files });
    } else {
      if (nonImageUrls.length > 0) {
        Nermin.channel.send({ content: nonImageUrls.join('\n'), files: files });
      } else {
        Nermin.channel.send({ files: files });
      }
    }
  } else if (replyType === 'embed') {
    const embed = new MessageEmbed()
      .setColor(embed_color_reply)
      .setAuthor({ name: Nermin.author.tag, iconURL: Nermin.author.avatarURL({ dynamic: true }) })
      .setDescription(text)
      .setImage('attachment://' + imageFiles[0]);

    if (nonImageUrls.length > 0) {
      Nermin.channel.send({ embeds: [embed], content: nonImageUrls.join('\n'), files: files.map(file => ({ attachment: file })) });
    } else {
      Nermin.channel.send({ embeds: [embed], files: files.map(file => ({ attachment: file })) });
    }
  }
} else {
  if (replyType === 'reply' || replyType === 'send') {
    if (text) {
      Nermin.channel.send({ content: text + '\n' + nonImageUrls.join('\n') });
    } else {
      if (nonImageUrls.length > 0) {
        Nermin.channel.send({ content: nonImageUrls.join('\n') });
      }
    }
  } else if (replyType === 'embed') {
    const embed = new MessageEmbed()
      .setColor(embed_color_reply)
      .setAuthor({ name: Nermin.author.tag, iconURL: Nermin.author.avatarURL({ dynamic: true }) })
      .setDescription(reply);

    if (nonImageUrls.length > 0) {
      Nermin.channel.send({ embeds: [embed], content: nonImageUrls.join('\n') });
    } else {
      Nermin.channel.send({ embeds: [embed] });
    }
  }
}

if (word.deleteUserMessage && Nermin.channel.permissionsFor(Nermin.author).has('MANAGE_MESSAGES')) {
  Nermin.delete().catch(console.error);
}

        });
      }
    }
  }
});
client.login(process.env.token)



