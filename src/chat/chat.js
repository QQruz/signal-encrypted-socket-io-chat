const jwt = require('jsonwebtoken')
const config = require('../config')
const User = require('./user')

module.exports = (io) => {
    io.use((socket, next) => {
        try {
            const token = socket.handshake.query.token
            decoded = jwt.verify(token, config.jwtKey)
            User.add(socket, decoded)
            next()
        } catch (error) {
            next(new Error('Please login to continue'))
        }

    })
    .on('connection', socket => {
        
        const broadcastEvent = eventName => {
            socket.on(eventName, data => {
                const user = User.findById(socket.id)
                socket.broadcast.to(user.room).emit(eventName, {
                    from: user.name,
                    body: data
                })
            })      
        }

        const sendToEvent = eventName=> {
            socket.on(eventName, data => {
                socket.to(User.findByUsername(data.to).id).emit(eventName, {
                    from: User.findById(socket.id).name,
                    body: data.body,
                })
            })     
        }
        
        const user = User.findById(socket.id)
        socket.join(user.room, () => {
            socket.emit('join', user.room)
        })

        socket.on('disconnecting', () => {
            const user = User.remove(socket.id)
            io.to(user.room).emit('userDisc', user.name)
        })
        
        broadcastEvent('newSession')
        sendToEvent('newSessionReplay')
        sendToEvent('message')
        
    })
}

