module.exports = {
    presets: [
        ['module:metro-react-native-babel-preset'],
        [
            '@babel/preset-env', {
                loose: true
            },
        ],
        [
            '@babel/preset-react', { runtime: 'automatic' }
        ],
        '@babel/preset-typescript'
    ]
}
