const path = require('path')
const express = require('express')
const jwt = require('jsonwebtoken')
const config = require('./config')

const router = express.Router()

router.get('/', (req, res) => {
    res.sendFile(path.join(config.viewsDirPath, 'index.html'))
})

router.post('/join', (req, res) => {
    req.body.username = req.body.username.trim()
    req.body.roomname = req.body.roomname.trim()
    if (req.body.username && req.body.roomname) {
        
        const token = jwt.sign({
            username: req.body.username,
            roomname: req.body.roomname
        }, config.jwtKey)

        res.cookie(config.cookieName, token)
        return res.redirect('/chat')
    }

    res.redirect('/')
})

router.get('/chat', async (req, res) => {
    res.sendFile(path.join(config.viewsDirPath, 'chat.html'))
})

module.exports = router
