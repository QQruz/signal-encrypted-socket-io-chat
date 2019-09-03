const socket = io({ query: "username=bar&bar=foo" })

const $form = document.querySelector('form')
const $message = $form.querySelector('textarea')
const $submit = $form.querySelector('button')

// init store
const store = new SignalProtocolStore();
// init key id - number only
// TODO:MAKE THIS MORE RANDOM


// create private and public keys
const generateKeys = async (store, keyId) => {
    // keyhelper
    const keyHelper = libsignal.KeyHelper;
    
    // generate registration id
    const registrationId = keyHelper.generateRegistrationId();
    // store registration id
    store.put('registrationId', registrationId)

    // generate identity key pair
    const identityKeyPair = await keyHelper.generateIdentityKeyPair()
    // store identity key pair
    store.put('identityKey', identityKeyPair)

    // generate signed pre key
    const signedPreKey = await keyHelper.generateSignedPreKey(identityKeyPair, keyId)
    // save signed pre key
    store.storeSignedPreKey(signedPreKey.keyId, signedPreKey.keyPair)

    // generate pre key
    const preKey = await keyHelper.generatePreKey(keyId)
    // save pre key
    store.storePreKey(preKey.keyId, preKey.keyPair)

    // return key bundle to share with other clients
    console.log(preKey.keyId)
    return {
        registrationId,
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

const buildSession = async (store, socketId, keyBundle) => {
    // no need for multi device support, so hardcoding 0
    let deviceId = 0
    // recipient address
    const address = new libsignal.SignalProtocolAddress(socketId, deviceId)
    // session builder for that address
    const sessionBuilder = new libsignal.SessionBuilder(store, address)
    // create session
    await sessionBuilder.processPreKey(keyBundle)
    // return session cipher for that address
    return new libsignal.SessionCipher(store, address)

}

// APP
// SHARE KEYS


let keyBundle 
let keyId = Math.floor(Math.random()*100000)
socket.on('connect', async () => {
    keyBundle = await generateKeys(store, keyId)
    socket.emit('newSession', keyBundle)
})

let sessionCipher
socket.on('newSession', async data => {
    sessionCipher = await buildSession(store, data.from, data.body)
    // socket.emit('newSessionReplay', {
    //     to: data.from,
    //     body: keyBundle
    // })
})

socket.on('newSessionReplay', async data => {
    sessionCipher = await buildSession(store, data.from, data.body)
    // const message = 'something'
    // const encrypted = await sessionCipher[data.from].encrypt(message)
    // socket.emit('preKeyWhisper', {
    //     to: data.from,
    //     body: encrypted.body
    // })
})

// socket.on('preKeyWhisper', async data => {
//     await sessionCipher[data.from].decryptPreKeyWhisperMessage(data.body, 'binary')
//     const replay = 'something'
//     const encrypted = await sessionCipher[data.from].encrypt(replay)
//     socket.emit('preKeyWhisperReplay', {
//         to: data.from,
//         body: encrypted.body
//     })
// })

// socket.on('preKeyWhisperReplay', async data => {
//     console.log(data.from)
//     await sessionCipher[data.from].decryptWhisperMessage(data.body, 'binary')
// })


//
$form.addEventListener('submit', async event => {
    event.preventDefault()
    const message = $message.value
    const encrypted = await sessionCipher.encrypt(message)
        socket.emit('message', {
            to: id,
            body: encrypted
    })
    
    // console.log(encrypted.body)

    // socket.emit('message', encrypted, error => {
    //     if (error) {
    //         return console.log(error)
    //     }

    //     console.log('Message delivered!')
    // })
})

socket.on('message', async data => {
    let decrypted
    if (data.body.type === 3) {
        decrypted = await sessionCipher.decryptPreKeyWhisperMessage(data.body.body, 'binary')
    } else {
        decrypted = await sessionCipher.decryptWhisperMessage(data.body.body, 'binary')
    }
    
    console.log(String.fromCharCode.apply(null, new Uint8Array(decrypted)))
    
})