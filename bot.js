require("./keepAlive");
require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const channelUsername = process.env.TELEGRAM_CHANNEL_USERNAME;
const youtubeURL = process.env.YOUTUBE_CHANNEL_URL;
const cryptoChannelLink = process.env.CRYPTO_CHANNEL_LINK;

const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL; // URL du script Apps Script déployé

const bot = new TelegramBot(token, { polling: true });

const proofSentUsers = new Map();

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const username = msg.from.username || msg.from.first_name || "Utilisateur";

  const welcomeText = `Bienvenue ${username}, comment puis-je t'aider ?`;

  const options = {
    reply_markup: {
      keyboard: [
        ['Je veux Canva Pro gratuit'],
        ['Je veux obtenir la crypto à bas prix']
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  };

  bot.sendMessage(chatId, welcomeText, options);
});

async function appendProofToSheet(userId, username, photoFileId) {
  const payload = { userId, username, photoFileId };
  try {
    const response = await axios.post(googleAppsScriptUrl, payload);
    return response.data;
  } catch (error) {
    console.error("Erreur appel Google Apps Script : ", error.message);
    throw error;
  }
}

async function checkValidation(userId) {
  try {
    const response = await axios.get(googleAppsScriptUrl, { params: { userId }});
    return response.data.status;
  } catch (error) {
    console.error("Erreur lors de la vérification de validation : ", error.message);
    return null;
  }
}

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const username = msg.from.username || '';
  const text = msg.text ? msg.text.toLowerCase() : "";

  if (text === "je veux canva pro gratuit") {
    try {
      const member = await bot.getChatMember(channelUsername, userId);
      if (['member', 'creator', 'administrator'].includes(member.status)) {
        bot.sendMessage(chatId, "✅ Tu es bien abonné à notre canal Telegram !");
        bot.sendMessage(chatId, "📸 Maintenant, envoie une capture d’écran de ton abonnement et like sur la chaine YouTube : https://youtube.com/@cryptoflash14?si=S9FqiCU2u1Y0DQ--. Une fois envoyée, clique sur *J’ai liké et je suis abonné*.", {
          reply_markup: {
            keyboard: [['J’ai liké et je suis abonné']],
            resize_keyboard: true,
            one_time_keyboard: true,
          },
          parse_mode: "Markdown",
        });
      } else {
        bot.sendMessage(chatId, "❌ Tu dois d'abord t'abonner à notre canal Telegram avant de continuer : " + channelUsername);
      }
    } catch (error) {
      bot.sendMessage(chatId, "⚠️ Erreur lors de la vérification de ton abonnement : " + error.message);
    }
  } 
  else if (text === "je veux obtenir la crypto à bas prix") {
    bot.sendMessage(chatId, `Voici le lien du canal crypto : https://t.me/flashcryptoG3`);
  } 
  else if (text === "j’ai liké et je suis abonné" || text === "jai liké et je suis abonné") {
    if (proofSentUsers.has(userId)) {
      const status = await checkValidation(userId);
      if (status === "Validé") {
        await bot.sendMessage(chatId, "Super ! Merci pour ta preuve et ton abonnement.", { reply_markup: { remove_keyboard: true } });
        await bot.sendMessage(chatId, "Voici ton lien d’accès à Canva Pro pour 1 mois :\n\n[https://www.canva.com/brand/join?token=_oRDFGFjnMK9O9xjFhX4cQ&referrer=team-invite]", { parse_mode: "Markdown" });
        proofSentUsers.delete(userId);
      } else {
        let firstMessageId;
        bot.sendMessage(chatId, "⏳ Ta preuve est en cours de validation, merci de patienter.").then((sentMessage) => {
  firstMessageId = sentMessage.message_id;


        setTimeout(() => {
        bot.deleteMessage(chatId, firstMessageId).catch(console.error);

        bot.sendMessage(chatId, `🎉 *Félicitations !*  \n\
        Tu as mérité ton lien d'accès gratuit à *Canva Pro* 💼✨  \n\
        ➡️ Connecte-toi à ton compte Canva avant de cliquer sur le lien.  \n\
        🎨 Profite ensuite de toutes les fonctionnalités premium sans limite !  \n\
        🚀 Amuse-toi bien et crée sans frontières !`, { parse_mode: "Markdown" });
      }, 20000);
      

        setTimeout(() => {
          bot.sendMessage(chatId, "[https://www.canva.com/brand/join?token=_oRDFGFjnMK9O9xjFhX4cQ&referrer=team-invite]");
        }, 22000);
      });
      }
    } else {
      bot.sendMessage(chatId, "⚠️ Merci d’abord d’envoyer une capture d’écran prouvant ton abonnement et like sur la chaîne YouTube avant de valider.", {
        reply_markup: {
          keyboard: [['J’ai liké et je suis abonné']],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
        parse_mode: "Markdown",
      });
    }
  } 
  else if (msg.photo) {
    const photoFileId = msg.photo[msg.photo.length - 1].file_id;
    try {
      await appendProofToSheet(userId, username, photoFileId);
      proofSentUsers.set(userId, true);
      bot.sendMessage(chatId, "Merci pour ta capture d’écran ! Tu peux maintenant cliquer sur *J’ai liké et je suis abonné* pour finaliser.", {
        reply_markup: {
          keyboard: [['J’ai liké et je suis abonné']],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
        parse_mode: "Markdown",
      });
    } catch (error) {
      bot.sendMessage(chatId, "Erreur lors de l'enregistrement de ta preuve, merci de réessayer.");
    }
  } 
  else if (text && text.startsWith('/')) {
    // Autres commandes si besoin
  } 
  else {
    bot.sendMessage(chatId, "Je n'ai pas compris. Tape /start pour recommencer.");
  }
});
