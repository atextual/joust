import ts from 'typescript'

const isFunctionalComponent = (node, typeChecker) => {
    if (
        ts.isVariableDeclaration(node) &&
        node.initializer &&
        (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer)) &&
        node.initializer.parameters.length > 0 &&
        ts.isObjectBindingPattern(node.initializer.parameters[0].name)
    ) {
        const parameter = node.initializer.parameters[0]
        const arePropsTyped = parameter.name.elements.every((prop) => {
            return (
                ts.isBindingElement(prop) &&
                ts.isIdentifier(prop.name) &&
                typeChecker.getTypeAtLocation(prop.name)
            )
        })
        if (arePropsTyped) {
            return true
        }
    }
    return false
}

const getComponentName = (node) => {
    if (ts.isFunctionDeclaration(node) && node.name) {
        return node.name.text
    } else if (ts.isVariableDeclaration(node) && node.name) {
        return ts.isIdentifier(node.name) ? node.name.text : undefined
    }
    return undefined
}

export { getComponentName, isFunctionalComponent }
