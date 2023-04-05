export const getRandomValueForType = (type) => {
    switch (true) {
        case /string/.test(type):
            return `'${randomString()}'`
        case /number/.test(type):
            return randomNumber()
        case /boolean/.test(type):
            return randomBoolean()
        case /object/.test(type):
            return randomObject()
        case /Array/.test(type):
            return randomArray()
        case /ViewStyle|Style/.test(type):
            return randomStyle();
        default:
            return `null`
    }
}
export const randomBoolean = () => {
    return Math.random() < 0.5
}

export const randomObject = () => {
    const key = randomString()
    const value = randomString()
    return `{ '${key}': '${value}' }`
}

export const randomArray = () => {
    const item1 = randomString()
    const item2 = randomString()
    return [`['${item1}', '${item2}']`]
}
export const randomColor = () => {
    const letters = '0123456789ABCDEF'
    let color = '#'
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)]
    }
    return color
}

export const randomNumber = (min = 0, max = 100) => {
    return Math.floor(Math.random() * (max - min + 1)) + min
}

export const randomString = () => {
    return Math.random().toString(36).substring(2, 15)
}

export const randomStyle = () => {
    const styles = [
        {backgroundColor: randomColor()},
        {borderWidth: randomNumber(1, 5)},
        {borderRadius: randomNumber(1, 20)},
        {padding: randomNumber(1, 20)},
        {margin: randomNumber(1, 20)},
    ]
    return JSON.stringify(styles[Math.floor(Math.random() * styles.length)]).replace(/\"/g, '\'')
}
