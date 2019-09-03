const http = require('http')
const express = require('express')
const cookieParser = require('cookie-parser')
const socketio = require('socket.io')
const config = require('./config')
const router = require('./routes')


const app = express()
const server = http.createServer(app)
const io = socketio(server)
require('./chat/chat')(io)


app.use(express.static(config.pubDirPath))
app.use(cookieParser())
app.use((express.urlencoded({ extended: false })))
app.use(router)



server.listen(config.port, () => {
    console.log('Server is up on port ' + config.port)
})

