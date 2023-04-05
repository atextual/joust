import path from "path"
import ts from 'typescript'

import { getRandomValueForType } from "./styleHelpers.mjs"

const kebabCase = (str) => str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, ($, ofs) => (ofs ? "-" : "") + $.toLowerCase())

const getComponentType = (node, typeChecker) => {
    const type = typeChecker.getTypeAtLocation(node.initializer.parameters[0].type)
    const declaredType = typeChecker.getDeclaredTypeOfSymbol(type.aliasSymbol || type.symbol)
    const typeName = (type.aliasSymbol || type.symbol).escapedName
    return { declaredType, typeName }
}
const generateTests = (componentInfo, componentName, filePath) => {
    const tests = []
    const props = componentInfo.mainComponent.props
    const childComponents = componentInfo.childComponents
    const sanitizedName = componentName.replace(/Prefix/, '').replace(/([A-Z])/g, " $1").trim()

    Object.entries(props).forEach(([propName, propInfo]) => {
        const { usageContext, hasTestID, value, type } = propInfo
        let assertion = 'toBeTruthy'
        let selector = 'findByObjectOrText'
        let element = 'element'
        let requiresValue = false

        switch (usageContext) {
            case 'asText':
                if (type === 'string') selector = 'getByText'
                break
            case 'styleOrClassName':
                assertion = 'toMatchObject'
                element = 'element.props.style'
                requiresValue = true
                break
            case 'eventHandlerOrFunction':
                assertion = 'toHaveBeenCalled'
                requiresValue = true
                break
            default:
                break
        }

        if (hasTestID) selector = 'getByTestId'

        const testIDValue = selector === 'getByTestId' ? `'${propName}-testID'` : null

        if (assertion && selector) {
            tests.push(`
    it('${componentName} renders \`${propName}\`', async () => {
        const propName = '${propName}'
        const propValue = ${value}

        const { ${selector === 'findByObjectOrText' ? 'container' : selector }} = render${sanitizedName}Component({ [propName]: propValue })
        const element = ${selector === 'findByObjectOrText' ? `await ${selector}(container, propName, propValue)` : `${selector}(${testIDValue || value})`}
        expect(${element}).${assertion}(${requiresValue ? 'propValue' : ''})
    })`)
        }
    })

    function generateChildComponentsTest(mainComponent, childComponents) {
        return childComponents.length > 0 ? childComponents.map(childComponent => {
            return `it('${componentName} renders ${childComponent.name} component correctly', () => {
                const { getByTestId } = render${childComponent.name}Component({})
                const element = getByTestId('${kebabCase(childComponent.name)}_test')
                expect(element).toBeTruthy()
            })
        `
        }).join('\n') : null;
    }

    const importLines = [
        `import { render } from '@testing-library/react-native'`,
        `import { findByObjectOrText } from '${path.relative(filePath, path.join(process.cwd(), '/src/utils/jest/helpers'))}'`
    ]

    const interfaceGroups = {}

    // Main component interface
    if (interfaceGroups[componentInfo.mainComponent.interface.location]) {
        interfaceGroups[componentInfo.mainComponent.interface.location].interfaces.push(
            componentInfo.mainComponent.interface.name
        )
    } else {
        interfaceGroups[componentInfo.mainComponent.interface.location] = {
            interfaces: [componentInfo.mainComponent.interface.name],
            components: [componentName],
        }
    }

    // Child component interfaces
    componentInfo.childComponents.forEach((childComponent) => {
        if (interfaceGroups[childComponent.interface.location]) {
            interfaceGroups[childComponent.interface.location].interfaces.push(
                childComponent.interface.name
            )
        } else if (childComponent.interface.name) {
            interfaceGroups[childComponent.interface.location] = {
                interfaces: [childComponent.interface.name]
            }
        }
        if (interfaceGroups[componentInfo.mainComponent.interface.location]) {
            interfaceGroups[componentInfo.mainComponent.interface.location].components.push(
                childComponent.name
            )
        } else if (childComponent.interface.name) {
            interfaceGroups[componentInfo.mainComponent.interface.location] = {
                components: [childComponent.interface.name]
            }
        }
    })

    // Create import lines from grouped interfaces
    Object.entries(interfaceGroups).forEach(([location, data]) => {
        importLines.push(
            `import { ${data.components ? data.components.join(', ') : ''}${data.interfaces ? `${data.components ? ', ' : ''}${data.interfaces.join(', ')}` : ''} } from '.${location}'`
        )
    })

    const childTests = generateChildComponentsTest(componentInfo.mainComponent, componentInfo.childComponents)

    const describeBlock = `
    describe('${sanitizedName} Component', () => {
        ${tests.join('\n')}
        ${childTests ? childTests : ''}
    })
`;

    const renderBlock = () => {
        let components = [{ name: componentName, props: componentInfo.mainComponent.props, type: componentInfo.mainComponent.interface }]

        componentInfo.childComponents.forEach(child => {
            components.push({ name: child.name, props: child.props, type: child.interface })
        })

        const template = ({ name, props, type }) => {
            return `const render${name}Component = (values: any) => {
    const defaultProps${type ? `: ${type.name}` : ''} = {${Object.entries(props).filter(([_name, info]) => info.required).map(([propName, propInfo]) => {
        return `
        ${propName}: ${propInfo.value}`
    }).join(',')},
        testID: '${kebabCase(name)}_test'
    }
    const props${type ? `: ${type.name}` : ''} = { ...defaultProps, ...values }
    return render(<${name} {...props} />)\n}`}

    return components.map(c => template(c)).join('\n')
    }

    return `${importLines.join('\n')}\n\n${renderBlock()}\n\n${describeBlock}`
}


const getDefaultProps = (node) => {
    // Extract the default values of the props
    const props = {}
    node.initializer.parameters.forEach((param) => {
        param.name.elements.forEach((prop) => {
            if (prop.initializer) {
                props[prop.name.escapedText] = prop.initializer.text
            }
        })
    })

    return props
}


const getImportLocation = (sourceFile, componentType) => {
    // Find the import location of the type/interface
    let importLocation = './'
    let absoluteImportLocation

    ts.forEachChild(sourceFile, (node) => {
        if (ts.isImportDeclaration(node) && node.importClause.namedBindings) {
            node.importClause.namedBindings.elements.forEach((element) => {
                if (element.name.escapedText === componentType) {
                    importLocation = node.moduleSpecifier.text
                    const sourceFilePath = sourceFile.fileName
                    absoluteImportLocation = path.join(path.dirname(sourceFilePath), importLocation) + '.ts'
                }
            })
        }
    })

    return { importLocation, absoluteImportLocation }
}

const getProps = (members, typeChecker) => {
    const props = {}

    members.forEach((member) => {
        if (ts.isPropertySignature(member)) {
            const propName = member.name.escapedText
            const propTypeNode = member.type
            let propTypeName
            const required = !member.questionToken

            try {
                if (
                    propTypeNode.kind >= ts.SyntaxKind.FirstKeyword &&
                    propTypeNode.kind <= ts.SyntaxKind.LastKeyword
                ) {
                    propTypeName = ts.tokenToString(propTypeNode.kind)
                } else {
                    const propType = typeChecker.getTypeAtLocation(propTypeNode)
                    const symbol = propType.aliasSymbol || propType.symbol

                    if (symbol) {
                        propTypeName = symbol.escapedName
                    } else {
                        propTypeName = 'string'
                    }
                }
            } catch (error) {
                propTypeName = member.type?.typeName?.escapedText ? member.type?.typeName?.escapedText : 'string'
            }

            props[propName] = { type: propTypeName, required, value: getRandomValueForType(propTypeName) }
        }
    })

    return props
}

 const analyzePropsUsage = (props, node, componentName) => {

     const hasTestId = (parentNode) => {
         return parentNode.properties?.some(child => child.name.escapedText === 'testID') || false
     }
     const visit = (node, componentName, propName, depth = 0) => {
         const propInfo = props[propName]
         if (!propInfo) {
             return
         }
         const parent = node.parent

         if (node.getFullText().includes(propName)) {
             propInfo.hasTestID = hasTestId(parent)
             if (ts.isJsxAttribute(node)) {
                 if (node.name.escapedText === 'style') {
                     propInfo.usageContext = 'styleOrClassName'
                 } else {
                     propInfo.usageContext = 'asProp'
                 }
             } else if (ts.isJsxElement(parent)) {
                 if (ts.isJsxExpression(node)) {
                     propInfo.usageContext = 'asText'
                 } else if (ts.isCallExpression(node) || ts.isFunctionLike(node)) {
                     propInfo.usageContext = 'eventHandlerOrFunction'
                 } else if (ts.isConditionalExpression(node) || (ts.isBinaryExpression(node) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken)) {
                     propInfo.usageContext = 'conditionalRendering'
                 }
             } else if (node.parent.name?.escapedText === componentName) {
                 propInfo.usageContext = 'container'
             }
         }
         ts.forEachChild(node, (child) => visit(child, componentName, propName, depth + 1))
     }

    Object.keys(props).forEach((propName) => {
        visit(node, componentName, propName)
    })

    return props
}

export { analyzePropsUsage, getComponentType, generateTests, getDefaultProps, getImportLocation, getProps }
