const { default: makeWASocket, useMultiFileAuthState } = require('@whiskeysockets/baileys')
const express = require('express')
const qrcode = require('qrcode')
const pino = require('pino')

const app = express()
let sock
let currentQR = null
let isConnected = false

async function connectToWA() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys')
    sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        logger: pino({ level: 'silent' })
    })

    sock.ev.on('creds.update', saveCreds)
    
    sock.ev.on('connection.update', (update) => {
        const { connection, qr } = update
        if (qr) {
            isConnected = false
            qrcode.toDataURL(qr, (err, url) => { currentQR = url })
        }
        if (connection === 'close') {
            isConnected = false
            connectToWA()
        } else if (connection === 'open') {
            isConnected = true
            currentQR = null
        }
    })
}
connectToWA()

app.get('/status', (req, res) => {
    if (isConnected) return res.json({ status: 'connected' })
    if (currentQR) return res.json({ status: 'qr', qr: currentQR })
    return res.json({ status: 'loading' })
})

app.get('/send', async (req, res) => {
    let { target, msg } = req.query
    if(!target || !sock || !isConnected) return res.send('Error: Belum connect WA!')
    let jid = target.replace(/\D/g, '') + '@s.whatsapp.net'
    try {
        await sock.sendMessage(jid, { text: msg })
        res.send('Terkirim!')
    } catch (e) {
        res.send('Gagal: ' + e.message)
    }
})

app.listen(3000, () => { console.log('Server jalan di 3000') })
