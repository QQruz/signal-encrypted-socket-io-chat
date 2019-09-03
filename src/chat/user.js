const users = []

const findByUsername = username => users.find(user => user.name === username)
const findById = socketId => users.find(user => user.id === socketId)
const findByRoom = room => users.filter(user => user.room === room)

const renameIfExists = username => {
    let uname = username
    let counter = 1
    while (findByUsername(uname)) {
        uname = `${username} (${counter})`
        counter++
    }

    return uname
}


const add = (socket, token) => {
    const user = {
        id: socket.id,
        name: token.username,
        room: token.roomname,
    }

    user.name = renameIfExists(user.name)
    
    users.push(user)
}

const remove = socketId => {
    const index = users.findIndex(user => user.id === socketId)
    return users.splice(index, 1)[0]
}



module.exports = {
    findByUsername,
    findById,
    findByRoom,
    add,
    remove,
}
