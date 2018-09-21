const path = require('path');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'pomelo-webclient-js.js',
        library: 'pomelo',
        libraryTarget: "umd"
    }
};