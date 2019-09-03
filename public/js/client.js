(function () {
    // get cookie, remove cookie name
    const token = document.cookie.slice(document.cookie.indexOf('=') + 1)
    // init socket.io
    const socket = io({ query: 'token=' + token })
    // init store
    const store = new SignalProtocolStore()
    // init keyhelper
    const keyHelper = libsignal.KeyHelper
    // object that holds individual cyphers
    const sessionCipher ={}
    // no need for multi device support, so hardcoding 0
    const deviceId = 0

    // generate keyId
    // needs to be unique on all machines
    // needs to be number
    const generateKeyId = socketId => {
        let keyId = ''
        for (let i = 0; i < 2; i++) {
            keyId += socketId.charCodeAt(Math.floor(Math.random() * socketId.length))
        }

        const date = String(Date.now()).slice(-3)

        return Number(keyId + date)
    }


    // generate registration id & identity key pair
    const generateIdentity = async () => {
        
        // generate registration id
        const registrationId = keyHelper.generateRegistrationId();
        // store registration id
        store.put('registrationId', registrationId)

        // generate identity key pair
        const identityKeyPair = await keyHelper.generateIdentityKeyPair()
        // store identity key pair
        store.put('identityKey', identityKeyPair)
    }

    const generatePreKeys = async  socketId => {

        // generate keyId
        const keyId = generateKeyId(socketId)

        // get identity key pair
        const identityKeyPair = await store.getIdentityKeyPair()

        // generate signed pre key
        const signedPreKey = await keyHelper.generateSignedPreKey(identityKeyPair, keyId)
        // save signed pre key
        store.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair)

        // generate pre key
        const preKey = await keyHelper.generatePreKey(keyId)
        // save pre key
        store.storePreKey(preKey.keyId, preKey.keyPair)


        // return key bundle to share with other clients
        return {
            registrationId: await store.getLocalRegistrationId(),
            identityKey: identityKeyPair.pubKey,
            signedPreKey: {
                keyId: signedPreKey.keyId,
                publicKey: signedPreKey.keyPair.pubKey,
                signature: signedPreKey.signature
            },
            preKey: {
                keyId: preKey.keyId,
                publicKey: preKey.keyPair.pubKey
            }
        }
    }

    const buildSession = async (username, keyBundle) => {
        // recipient address
        const address = new libsignal.SignalProtocolAddress(username, deviceId)
        // session builder for that address
        const sessionBuilder = new libsignal.SessionBuilder(store, address)
        // create session
        await sessionBuilder.processPreKey(keyBundle)
        // return session cipher for that address
        return new libsignal.SessionCipher(store, address)

    }

    const userList = new Set()
    const $usersList = document.querySelector('#user-list')
    
    const renderUserList = () => {
        $usersList.innerHTML = ''
        userList.forEach(user => {
            const $li = document.createElement('li')
            $li.innerHTML = user
            $usersList.append($li)
        })
    }

    const addUser = username => {
        userList.add(username)
        renderUserList()
    }

    const removeUser = username => {
        userList.delete(username)
        renderUserList()
    }

    const $roomName = document.querySelector('#room-name')
    // when client connects
    socket.on('join', async room => {
        $roomName.innerHTML = room
        // generate identity
        await generateIdentity()
        // generate pre keys
        const keyBundle = await generatePreKeys(socket.id)
        // send key request to other clients
        socket.emit('newSession', keyBundle)
    })

    // when client recives request for new session
    socket.on('newSession', async data => {
        addUser(data.from)
        // generate pre keys
        const keyBundle = await generatePreKeys(socket.id)
        // create session
        sessionCipher[data.from] = await buildSession(data.from, data.body)
        // send own keys to requester
        socket.emit('newSessionReplay', {
            to: data.from,
            body: keyBundle
        })
    })

    // build session from recived keys
    socket.on('newSessionReplay', async data => {
        addUser(data.from)
        sessionCipher[data.from] = await buildSession(data.from, data.body)
        
    })


    const $controlls = document.querySelector('#controlls')
    const $message = $controlls.querySelector('input')
    const $submit = $controlls.querySelector('button')
    const $messages = document.querySelector('#messages')

    const renderMessage = message => {
        const $p = document.createElement('p')
        $p.textContent = message
        $messages.append($p)
        $messages.scrollTo(0, $messages.scrollHeight)
        return $p
    }

    const renderError = message => {
        p = renderMessage(message)
        p.classList.add('error')
    }

    const sendMessage = async event => {
        event.preventDefault()
        const message = $message.value
        renderMessage('me: ' + message)
        for (let id in sessionCipher) {
            const encrypted = await sessionCipher[id].encrypt(message)
            socket.emit('message', {
                to: id,
                body: encrypted,
            })
        }
        $message.value = ''  
    }

    $submit.addEventListener('click', sendMessage)
    $submit.addEventListener('ontouchstart', sendMessage)
    window.addEventListener('keydown', event => {
        if (event.keyCode === 13) {
            sendMessage(event)
        }
    })

    socket.on('message', async data => {        
        let decrypted
        // if message is pre key whisper message 
        if (data.body.type === 3) {
            decrypted = await sessionCipher[data.from].decryptPreKeyWhisperMessage(data.body.body, 'binary')
        } else {
            decrypted = await sessionCipher[data.from].decryptWhisperMessage(data.body.body, 'binary')
        }
        
        renderMessage(data.from + ': ' + String.fromCharCode.apply(null, new Uint8Array(decrypted)))
        
    })
    
    socket.on('userDisc', async username => {
        removeUser(username)
        renderMessage(username + ' disconnected')
        await store.removeSession(username  + '.' + deviceId)
        delete sessionCipher[username]
    })

    socket.on('error', error => {
        renderError('error: ' + error)
    })

})()