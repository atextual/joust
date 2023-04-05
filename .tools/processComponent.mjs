import ts from 'typescript'
import fs from 'fs'
import prettier from 'prettier'
import path from 'path'
import {
    getComponentType,
    getProps,
    getImportLocation,
    analyzePropsUsage,
    generateTests,
} from './componentUtils.mjs'
import {
    parseFile,
    mergeTestFiles,
} from './testHelpers.mjs'
import {
    isFunctionalComponent,
    getComponentName,
} from './componentHelpers.mjs'

const processComponent = (filePath, componentName) => {
    const sourceFile = parseFile({filePath})

    const program = ts.createProgram([sourceFile.fileName], {})
    const typeChecker = program.getTypeChecker()

    const componentInfo = {
        mainComponent: null,
        childComponents: [],
    }
    const componentNodes = {
        mainComponent: null,
        childComponents: [],
    }

    const exportedComponents = new Set()

    // Create a new object to store the interfaces and their export status
    const interfaces = {}

    // Create a new array to store functional components for later processing
    const functionalComponents = []

    let mainComponentName = null

    let generatedTests = null

    const processMetadata = (node, functionName, typeName, isMainComponent, importLocation) => {
        if (interfaces[typeName] && exportedComponents.has(functionName)) {
            const props = getProps(interfaces[typeName].node.members, typeChecker)
            const analyzedProps = analyzePropsUsage(props, node, functionName)

            const metadata = {
                name: functionName,
                props: analyzedProps,
                interface: {
                    location: importLocation,
                    name: typeName,
                    exported: interfaces[typeName].exported,
                },
            }

            if (isMainComponent) {
                componentInfo.mainComponent = metadata
                componentNodes.mainComponent = node
            } else {
                componentInfo.childComponents = componentInfo.childComponents || []
                componentNodes.childComponents = componentNodes.childComponents || []

                componentInfo.childComponents.push(metadata)
                componentNodes.childComponents.push(node)
            }
        }
        if (!interfaces[typeName]) {
            console.warn(`Cannot locate ${typeName}. Have you exported it correctly?`)
        }
    }

    const processImportedType = (sourceFile, typeName) => {
        try {
            const { absoluteImportLocation } = getImportLocation(sourceFile, typeName)
            const relativePath = path.relative(process.cwd(), absoluteImportLocation)
            const typeSource = ts.createSourceFile(
                relativePath,
                fs.readFileSync(relativePath, 'utf-8'),
                ts.ScriptTarget.ESNext,
                true
            )
            visit(typeSource)
        } catch (err) {
            console.warn(`Import path for ${typeName} is invalid.`)
        }
    }

    const processFunctionalComponents = () => {
        functionalComponents.forEach(({ node, functionName }) => {
            const isMainComponent = functionName === componentName;

            if (isMainComponent || exportedComponents.has(functionName)) {
                const { typeName } = getComponentType(node, typeChecker);
                const { importLocation } = getImportLocation(sourceFile, typeName);

                if (!interfaces[typeName]) {
                    processImportedType(sourceFile, typeName);
                }
                processMetadata(node, functionName, typeName, isMainComponent, importLocation);
            }
        });
    };


    const visit = (node) => {
        if (ts.isInterfaceDeclaration(node)) {
            const interfaceName = node.name.text

            // Store the interface and its export status
            interfaces[interfaceName] = {
                node: node,
                exported: !!(node.modifiers && node.modifiers.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)),
            }
        } else if (isFunctionalComponent(node, typeChecker)) {
            const funcName = getComponentName(node)
            if (funcName) {
                if (funcName === componentName) {
                    mainComponentName = funcName
                }
                functionalComponents.push({ node, functionName: funcName })
            }
        } else if (ts.isExportDeclaration(node)) {
            const exportClause = node.exportClause
            if (exportClause && ts.isNamedExports(exportClause)) {
                exportClause.elements.forEach((element) => {
                    exportedComponents.add(element.name.text)
                })
            }
        }

        ts.forEachChild(node, visit)
    }

    visit(sourceFile)

    try {
        processFunctionalComponents()
        generatedTests = generateTests(componentInfo, componentName, filePath)

        // Call the new module to merge and save the test files
        if (fs.existsSync(path.join(filePath, '../', `/__tests__/${componentName}.test.tsx`))) {
            generatedTests = mergeTestFiles(
                generatedTests,
                path.join(filePath, '../', `/__tests__/${componentName}.test.tsx`),
                componentName
            )
        }
        const writeFilePath = path.join(filePath, '../', `/__tests__/${componentName}.test.tsx`)
        const formattedTest = prettier.format(generatedTests, { parser: 'typescript', singleQuote: true, jsxSingleQuote: true, singleAttributePerLine: false, tabWidth: 4 })
        fs.writeFileSync(writeFilePath, formattedTest)
        console.log(`Successfully generated test at: ${writeFilePath}`)
    } catch(err) {
        console.log('error', err)
    }

    // Return generatedTests along with componentInfo and componentNodes
    return { componentInfo, componentNodes }
}

export { processComponent }
