path = require('path')

module.exports = {
    port: process.env.PORT || 80,
    pubDirPath: path.join(__dirname, '../public'),
    viewsDirPath: path.join(__dirname, 'views'),
    cookieName: 'bla',
    jwtKey: 'jsfhskgksaghskhsyga'
}