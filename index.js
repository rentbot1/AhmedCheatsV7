// ngapain bro? edit owner di config.js, yang di file ini ga udah di apa apain, ntar eror
require("./config")
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, generateForwardMessageContent, prepareWAMessageMedia, generateWAMessageFromContent, generateMessageID, downloadContentFromMessage, makeInMemoryStore, jidDecode, getAggregateVotesInPollMessage, proto } = require("@whiskeysockets/baileys")
const fs = require('fs')
const pino = require('pino')
const chalk = require('chalk')
const path = require('path')
const axios = require('axios')
const FileType = require('file-type')
const figlet = require('figlet')
const _ = require('lodash')
const moment = require('moment-timezone')
const readline = require("readline")
const yargs = require('yargs/yargs')
const NodeCache = require("node-cache")
const lodash = require('lodash')
const { Boom } = require('@hapi/boom')
const CFonts = require('cfonts')
const { say } = require('cfonts')
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, imageToWebp3, videoToWebp, writeExifImg, writeExifImgAV, writeExifVid } = require('./lib/general/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetchJson, await, sleep } = require('./lib/general/myfunc2')

var low
try {
low = require('lowdb')
} catch (e) {
low = require('./lib/lowdb')
}

const { Low, JSONFile } = low
const mongoDB = require('./lib/mongoDB')
const { color } = require('./lib/color');

let session = `session`
let usePairingCode = true

// warna sempak bapak kau
const listcolor = ['red', 'blue', 'magenta'];
const randomcolor = listcolor[Math.floor(Math.random() * listcolor.length)];

//Puki

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function question(query) {
  return new Promise(resolve => rl.question(query, resolve))
}

const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

global.db = JSON.parse(fs.readFileSync('./data/afgan-db/database.json'))
if (global.db) global.db.data = {
users: {},
chats: {},
others: {},
settings: {},
...(global.db.data || {})
}

async function connectToWhatsApp() {
    const sessionPath = `./session`;
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
    const afgan = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: !usePairingCode,
        auth: state,
        browser: ["Ubuntu", "Chrome", "91.0.4472.124"],
        generateHighQualityLinkPreview: true,
    })
    
    afgan.ev.on('creds.update', saveCreds);

if (usePairingCode && !afgan.authState.creds.registered) {
say(`Afgan\nDev\n`, {
font: 'block',
align: 'center',
gradient: [randomcolor, randomcolor]
})

say(`SC BY AFGAN`, {
font: 'console',
align: 'center',
gradient: [randomcolor, randomcolor]
})
const phoneNumber = await question(`Masukkan Nomor Anda, Contoh 923070051625\n 🚩 Nomor : `);
 // Request and display the pairing code
 const code = await afgan.requestPairingCode(phoneNumber.trim());
 console.log(color(`[ # ] Kode Pairing Kamu : ${code}`, `${randomcolor}`));
}

// Status 
afgan.public = true

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.db = new Low(
/https?:\/\//.test(opts['db'] || '') ?
new cloudDBAdapter(opts['db']) : /mongodb/.test(opts['db']) ?
new mongoDB(opts['db']) :
new JSONFile(`./lib/lowdb/adapters/basedate/database.json`)
)

global.db = JSON.parse(fs.readFileSync('./data/afgan-db/database.json'))
if (global.db) global.db.data = {
users: {},
chats: {},
others: {},
settings: {},
...(global.db.data || {})
}

afgan.decodeJid = (jid) => {
if (!jid) return jid;
if (/:\d+@/gi.test(jid)) {
let decode = jidDecode(jid) || {};
return decode.user && decode.server && decode.user + '@' + decode.server || jid;
} else return jid;
};

afgan.ev.on('contacts.update', update => {
for (let contact of update) {
let id = afgan.decodeJid(contact.id);
if (store && store.contacts) store.contacts[id] = { id, name: contact.notify };
}
});

afgan.setStatus = (status) => {
afgan.query({
tag: 'iq',
attrs: {
to: '@s.whatsapp.net',
type: 'set',
xmlns: 'status',
},
content: [{
tag: 'status',
attrs: {},
content: Buffer.from(status, 'utf-8')
}]
});
return status;
};

afgan.getName = (jid, withoutContact= false) => {
id = afgan.decodeJid(jid)
withoutContact = afgan.withoutContact || withoutContact 
let v
if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
v = store.contacts[id] || {}
if (!(v.name || v.subject)) v = afgan.groupMetadata(id) || {}
resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
})
else v = id === '0@s.whatsapp.net' ? {
id,
name: 'WhatsApp'
} : id === afgan.decodeJid(afgan.user.id) ?
afgan.user :
(store.contacts[id] || {})
return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international')
}

afgan.sendContact = async (jid, kon, quoted = '', opts = {}) => {
	let list = []
	for (let i of kon) {
	list.push({
		displayName: await afgan.getName(i),
		vcard: `BEGIN:VCARD\nVERSION:3.0\nN:${await afgan.getName(i)}\nFN:${await afgan.getName(i)}\nitem1.TEL;waid=${i.split('@')[0]}:${i.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`
	})
	}
	afgan.sendMessage(jid, { contacts: { displayName: `${list.length} Kontak`, contacts: list }, ...opts }, { quoted })
}

afgan.serializeM = (m) => smsg(afgan, m, store);


 afgan.ev.on('connection.update', async (update) => {
const {
connection,
lastDisconnect
} = update
try {
if (connection === 'close') {
let reason = new Boom(lastDisconnect?.error)?.output.statusCode
if (reason === DisconnectReason.badSession) {
console.log(`Bad Session File, Please Delete Session and Scan Again`);
connectToWhatsApp()
} else if (reason === DisconnectReason.connectionClosed) {
console.log("Connection closed, reconnecting....");
connectToWhatsApp()
} else if (reason === DisconnectReason.connectionLost) {
console.log("Connection Lost from Server, reconnecting...");
connectToWhatsApp()
} else if (reason === DisconnectReason.connectionReplaced) {
console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First");
connectToWhatsApp()
} else if (reason === DisconnectReason.loggedOut) {
console.log(`Device Logged Out, Please Scan Again And Run.`);
connectToWhatsApp()
} else if (reason === DisconnectReason.restartRequired) {
console.log("Restart Required, Restarting...");
connectToWhatsApp()
} else if (reason === DisconnectReason.timedOut) {
console.log("Connection TimedOut, Reconnecting...");
connectToWhatsApp()
} else afgan.end(`Unknown DisconnectReason: ${reason}|${connection}`)
}
if (update.connection == "connecting" || update.receivedPendingNotifications == "false") {
console.log(color(`Mengkoneksikan`,`${randomcolor}`)) //Console-1
}

if (update.connection == "open" || update.receivedPendingNotifications == "true") {
say(`Afgan\nDev\n`, {
font: 'block',
align: 'center',
gradient: [randomcolor, randomcolor]
})
say(`SC BY AFGAN`, {
font: 'console',
align: 'center',
gradient: [randomcolor, randomcolor]
})

await sleep(3000)
afgan.sendMessage(`923070051625@s.whatsapp.net`, { text: `Bot Berhasil Tersambung...`})
}

} catch (err) {
console.log('Error Di Connection.update ' + err);
afganStart()
}

})

afgan.ev.on('messages.upsert', async (chatUpdate) => {
try {
mek = chatUpdate.messages[0]
if (!mek.message) return
mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
if (mek.key && mek.key.remoteJid === 'status@broadcast') return afgan.readMessages([mek.key])
} catch (err) {
console.log(err)
}
})

afgan.ev.on('call', async (user) => {
if (!global.anticall) return
let botNumber = await afgan.decodeJid(afgan.user.id)
for (let ff of user) {
if (ff.isGroup == false) {
if (ff.status == "offer") {
let sendcall = await afgan.sendMessage(ff.from, {text: `Maaf Kamu Akan Saya Block Karna Ownerbot Menyalakan Fitur *Anticall*\nJika Tidak Sengaja Segera Hubungi Owner Untuk Membuka Blokiran Ini`, contextInfo: {mentionedJid: [ff.from], externalAdReply: {thumbnailUrl: global.thumb, title: "乂 Panggilan Terdeteksi", body: "Powered By "+global.namaowner, previewType: "PHOTO"}}}, {quoted: null})
await sleep(3000)
await afgan.updateBlockStatus(ff.from, "block")
}}
}})

/**
*
* @param {*} jid
* @param {*} url
* @param {*} caption
* @param {*} quoted
* @param {*} options
*/
 afgan.sendFileUrl = async (jid, url, caption, quoted, options = {}) => {
let mime = '';
let res = await axios.head(url)
mime = res.headers['content-type']
if (mime.split("/")[1] === "gif") {
 return afgan.sendMessage(jid, { video: await getBuffer(url), caption: caption, gifPlayback: true, ...options}, { quoted: quoted, ...options})
}
let type = mime.split("/")[0]+"Message"
if(mime === "application/pdf"){
 return afgan.sendMessage(jid, { document: await getBuffer(url), mimetype: 'application/pdf', caption: caption, ...options}, { quoted: quoted, ...options })
}
if(mime.split("/")[0] === "image"){
 return afgan.sendMessage(jid, { image: await getBuffer(url), caption: caption, ...options}, { quoted: quoted, ...options})
}
if(mime.split("/")[0] === "video"){
 return afgan.sendMessage(jid, { video: await getBuffer(url), caption: caption, mimetype: 'video/mp4', ...options}, { quoted: quoted, ...options })
}
if(mime.split("/")[0] === "audio"){
 return afgan.sendMessage(jid, { audio: await getBuffer(url), caption: caption, mimetype: 'audio/mpeg', ...options}, { quoted: quoted, ...options })
}
}

 /**
 * 
 * @param {*} jid 
 * @param {*} name 
 * @param [*] values 
 * @returns 
 */
afgan.sendPoll = (jid, name = '', values = [], selectableCount = 1) => { return afgan.sendMessage(jid, { poll: { name, values, selectableCount }}) }


/**
 * 
 * @param {*} jid 
 * @param {*} text 
 * @param {*} quoted 
 * @param {*} options 
 * @returns 
 */
afgan.sendText = (jid, text, quoted = '', options) => afgan.sendMessage(jid, { text: text, ...options }, { quoted, ...options })

/**
 * 
 * @param {*} jid 
 * @param {*} path 
 * @param {*} caption 
 * @param {*} quoted 
 * @param {*} options 
 * @returns 
 */
afgan.sendImage = async (jid, path, caption = '', quoted = '', options) => {
	let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
return await afgan.sendMessage(jid, { image: buffer, caption: caption, ...options }, { quoted })
}

/**
 * 
 * @param {*} jid 
 * @param {*} path 
 * @param {*} caption 
 * @param {*} quoted 
 * @param {*} options 
 * @returns 
 */
afgan.sendVideo = async (jid, path, caption = '', quoted = '', gif = false, options) => {
let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
return await afgan.sendMessage(jid, { video: buffer, caption: caption, gifPlayback: gif, ...options }, { quoted })
}

/**
 * 
 * @param {*} jid 
 * @param {*} path 
 * @param {*} quoted 
 * @param {*} mime 
 * @param {*} options 
 * @returns 
 */
afgan.sendAudio = async (jid, path, quoted = '', ptt = false, options) => {
let buffer = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
return await afgan.sendMessage(jid, { audio: buffer, ptt: ptt, ...options }, { quoted })
}

/**
 * 
 * @param {*} jid 
 * @param {*} text 
 * @param {*} quoted 
 * @param {*} options 
 * @returns 
 */
afgan.sendTextWithMentions = async (jid, text, quoted, options = {}) => afgan.sendMessage(jid, { text: text, mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'), ...options }, { quoted })

/**
 * 
 * @param {*} jid 
 * @param {*} path 
 * @param {*} quoted 
 * @param {*} options 
 * @returns 
 */
afgan.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
let buffer
if (options && (options.packname || options.author)) {
buffer = await writeExifImg(buff, options)
} else {
buffer = await imageToWebp(buff)
}

await afgan.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
return buffer
}

/**
 * 
 * @param {*} jid 
 * @param {*} path 
 * @param {*} quoted 
 * @param {*} options 
 * @returns 
 */
afgan.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0)
let buffer
if (options && (options.packname || options.author)) {
buffer = await writeExifVid(buff, options)
} else {
buffer = await videoToWebp(buff)
}

await afgan.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted })
return buffer
}
	
/**
 * 
 * @param {*} message 
 * @param {*} filename 
 * @param {*} attachExtension 
 * @returns 
 */
afgan.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
let quoted = message.msg ? message.msg : message
let mime = (message.msg || message).mimetype || ''
let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
const stream = await downloadContentFromMessage(quoted, messageType)
let buffer = Buffer.from([])
for await(const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
}
	let type = await FileType.fromBuffer(buffer)
trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
// save to file
await fs.writeFileSync(trueFileName, buffer)
return trueFileName
}

afgan.downloadMediaMessage = async (message) => {
let mime = (message.msg || message).mimetype || ''
let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
const stream = await downloadContentFromMessage(message, messageType)
let buffer = Buffer.from([])
for await(const chunk of stream) {
buffer = Buffer.concat([buffer, chunk])
	}

	return buffer
 } 

/**
 * 
 * @param {*} jid 
 * @param {*} path 
 * @param {*} filename
 * @param {*} caption
 * @param {*} quoted 
 * @param {*} options 
 * @returns 
 */
afgan.sendMedia = async (jid, path, fileName = '', caption = '', quoted = '', options = {}) => {
let types = await afgan.getFile(path, true)
 let { mime, ext, res, data, filename } = types
 if (res && res.status !== 200 || file.length <= 65536) {
 try { throw { json: JSON.parse(file.toString()) } }
 catch (e) { if (e.json) throw e.json }
 }
 let type = '', mimetype = mime, pathFile = filename
 if (options.asDocument) type = 'document'
 if (options.asSticker || /webp/.test(mime)) {
let { writeExif } = require('./lib/exif')
let media = { mimetype: mime, data }
pathFile = await writeExif(media, { packname: options.packname ? options.packname : global.packname, author: options.author ? options.author : global.author, categories: options.categories ? options.categories : [] })
await fs.promises.unlink(filename)
type = 'sticker'
mimetype = 'image/webp'
}
 else if (/image/.test(mime)) type = 'image'
 else if (/video/.test(mime)) type = 'video'
 else if (/audio/.test(mime)) type = 'audio'
 else type = 'document'
 await afgan.sendMessage(jid, { [type]: { url: pathFile }, caption, mimetype, fileName, ...options }, { quoted, ...options })
 return fs.promises.unlink(pathFile)
 }

/**
 * 
 * @param {*} jid 
 * @param {*} message 
 * @param {*} forceForward 
 * @param {*} options 
 * @returns 
 */
afgan.copyNForward = async (jid, message, forceForward = false, options = {}) => {
let vtype
		if (options.readViewOnce) {
			message.message = message.message && message.message.ephemeralMessage && message.message.ephemeralMessage.message ? message.message.ephemeralMessage.message : (message.message || undefined)
			vtype = Object.keys(message.message.viewOnceMessage.message)[0]
			delete(message.message && message.message.ignore ? message.message.ignore : (message.message || undefined))
			delete message.message.viewOnceMessage.message[vtype].viewOnce
			message.message = {
				...message.message.viewOnceMessage.message
			}
		}

let mtype = Object.keys(message.message)[0]
let content = await generateForwardMessageContent(message, forceForward)
let ctype = Object.keys(content)[0]
		let context = {}
if (mtype != "conversation") context = message.message[mtype].contextInfo
content[ctype].contextInfo = {
...context,
...content[ctype].contextInfo
}
const waMessage = await generateWAMessageFromContent(jid, content, options ? {
...content[ctype],
...options,
...(options.contextInfo ? {
contextInfo: {
...content[ctype].contextInfo,
...options.contextInfo
}
} : {})
} : {})
await afgan.relayMessage(jid, waMessage.message, { messageId:waMessage.key.id })
return waMessage
}

afgan.cMod = (jid, copy, text = '', sender = afgan.user.id, options = {}) => {
//let copy = message.toJSON()
		let mtype = Object.keys(copy.message)[0]
		let isEphemeral = mtype === 'ephemeralMessage'
if (isEphemeral) {
mtype = Object.keys(copy.message.ephemeralMessage.message)[0]
}
let msg = isEphemeral ? copy.message.ephemeralMessage.message : copy.message
		let content = msg[mtype]
if (typeof content === 'string') msg[mtype] = text || content
		else if (content.caption) content.caption = text || content.caption
		else if (content.text) content.text = text || content.text
		if (typeof content !== 'string') msg[mtype] = {
			...content,
			...options
}
if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
		else if (copy.key.participant) sender = copy.key.participant = sender || copy.key.participant
		if (copy.key.remoteJid.includes('@s.whatsapp.net')) sender = sender || copy.key.remoteJid
		else if (copy.key.remoteJid.includes('@broadcast')) sender = sender || copy.key.remoteJid
		copy.key.remoteJid = jid
		copy.key.fromMe = sender === afgan.user.id

return proto.WebMessageInfo.fromObject(copy)
}

afgan.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
let type = await afgan.getFile(path, true);
let { res, data: file, filename: pathFile } = type;

if (res && res.status !== 200 || file.length <= 65536) {
try {
throw {
json: JSON.parse(file.toString())
};
} catch (e) {
if (e.json) throw e.json;
}
}

let opt = {
filename
};

if (quoted) opt.quoted = quoted;
if (!type) options.asDocument = true;

let mtype = '',
mimetype = type.mime,
convert;

if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker';
else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image';
else if (/video/.test(type.mime)) mtype = 'video';
else if (/audio/.test(type.mime)) {
convert = await (ptt ? toPTT : toAudio)(file, type.ext);
file = convert.data;
pathFile = convert.filename;
mtype = 'audio';
mimetype = 'audio/ogg; codecs=opus';
} else mtype = 'document';

if (options.asDocument) mtype = 'document';

delete options.asSticker;
delete options.asLocation;
delete options.asVideo;
delete options.asDocument;
delete options.asImage;

let message = { ...options, caption, ptt, [mtype]: { url: pathFile }, mimetype };
let m;

try {
m = await afgan.sendMessage(jid, message, { ...opt, ...options });
} catch (e) {
//console.error(e)
m = null;
} finally {
if (!m) m = await afgan.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options });
file = null;
return m;
}
}


/**
 * 
 * @param {*} path 
 * @returns 
 */
afgan.getFile = async (PATH, save) => {
let res
let data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await getBuffer(PATH)) : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
//if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
let type = await FileType.fromBuffer(data) || {
mime: 'application/octet-stream',
ext: '.bin'
}
filename = path.join(__filename, './src/' + new Date * 1 + '.' + type.ext)
if (data && save) fs.promises.writeFile(filename, data)
return {
res,
filename,
	size: await getSizeMedia(data),
...type,
data
}

}

afgan.ev.on('messages.upsert', async chatUpdate => {
//console.log(JSON.stringify(chatUpdate, undefined, 2))
try {
mek = chatUpdate.messages[0]
if (!mek.message) return
mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') ? mek.message.ephemeralMessage.message : mek.message
if (mek.key && mek.key.remoteJid === 'status@broadcast') return
if (!afgan.public && !mek.key.fromMe && chatUpdate.type === 'notify') return
if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return
if (mek.key.id.startsWith('AfganRaditya_')) return
m = smsg(afgan, mek, store)
require("./baseafgan")(afgan, m, chatUpdate, store)
} catch (err) {
console.log(err)
}
})

async function getMessage(key){
if (store) {
const msg = await store.loadMessage(key.remoteJid, key.id)
return msg?.message
}
return {
conversation: "Hi, I'm Afgan Botz"
}
}
//respon polling
afgan.ev.on('messages.update', async chatUpdate => {
for(const { key, update } of chatUpdate) {
			if(update.pollUpdates && key.fromMe) {
				const pollCreation = await getMessage(key)
				if(pollCreation) {
				const pollUpdate = await getAggregateVotesInPollMessage({
							message: pollCreation,
							pollUpdates: update.pollUpdates,
						})
	var toCmd = pollUpdate.filter(v => v.voters.length !== 0)[0]?.name
	if (toCmd == undefined) return
var prefCmd = prefix+toCmd
	afgan.appenTextMessage(prefCmd, chatUpdate)
				}
			}
		}
})

//Simpan Kredensial
afgan.ev.process(
async (events) => {
if (events['presence.update']) {
await afgan.sendPresenceUpdate('available');
}
if (events['creds.update']) {
await saveCreds();
}
}
)
return afgan
rl.close();
}

connectToWhatsApp()
process.on("uncaughtException", console.error);

let file = require.resolve(__filename)
fs.watchFile(file, () => {
fs.unwatchFile(file)
console.log(`Update ${__filename}`)
delete require.cache[file]
require(file)
})