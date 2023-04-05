import ts from 'typescript'
import fs from 'fs'

const parseFile = ({ filePath, fileContent }) => {
    if (!filePath && !fileContent) {
        console.warn('`parseFile` error: File path and content not found')
    }
    return ts.createSourceFile(
        filePath ? filePath : null,
        fileContent && filePath ? fileContent : fs.readFileSync(filePath, 'utf-8'),
        ts.ScriptTarget.ESNext,
        true
    )
}

const getTestName = (text) => {
    const match = text.match(/(?<=['"`]).+?(?=['"`])/)
    return match ? match[0] : ''
}

const collectTests = (node, testMap) => {
    if (
        node.getFullText().trim().startsWith('it(') ||
        node.getFullText().trim().startsWith('test(')
    ) {
        const testTitle = node
            .getFullText()
            .match(/(?<=['"`]).+?(?=['"`])/)[0]
        testMap.set(testTitle, node.getFullText().trim())
    } else {
        node.forEachChild((child) => collectTests(child, testMap))
    }
}

const findDescribeBlock = (node) => {
    if (node.getFullText().startsWith('describe(')) {
        return node
    } else {
        for (const child of node.getChildren()) {
            const describeBlock = findDescribeBlock(child)
            if (describeBlock) {
                return describeBlock
            }
        }
    }
    return null
}

const mergeTestFiles = (
    generatedTestFileContent,
    existingTestFilePath,
    componentName
) => {
    const generatedTestFile = parseFile({
        filePath: 'dummy_generated_test_file.tsx',
        fileContent: generatedTestFileContent,
    })
    const existingTestFile = parseFile({ filePath: existingTestFilePath })

    const existingTests = new Map()
    existingTestFile.forEachChild((node) => {
        collectTests(node, existingTests)
    })

    const newTests = new Map()
    generatedTestFile.forEachChild((node) => {
        collectTests(node, newTests)
    })

    const combinedTests = new Map([...existingTests, ...newTests])

    // Find the describe block in the existing test file
    const describeBlock = existingTestFile.statements.find((statement) =>
        statement.getFullText().trim().startsWith('describe(')
    )

    if (describeBlock) {
        const describeBlockContent = describeBlock.getFullText()

        // Find the opening curly brace of the describe block
        const describeBlockStart = describeBlockContent.indexOf('{') + 1

        // Insert the new tests just after the opening curly brace
        const newDescribeBlockContent = [
            describeBlockContent.slice(0, describeBlockStart),
            ...Array.from(combinedTests.values()),
            describeBlockContent.slice(describeBlockStart),
        ].join('\n')

        // Replace the old describe block with the updated one
        const returnValue = existingTestFile
            .getText()
            .replace(describeBlockContent, newDescribeBlockContent)

        return returnValue
    } else {
        // If there is no describe block in the existing test file, add one
        const returnValue = [
            existingTestFile.getText(),
            `describe('${componentName} tests', () => {`,
            ...Array.from(combinedTests.values()),
            '})',
        ].join('\n')

        return returnValue
    }
}

export { parseFile, collectTests, findDescribeBlock, mergeTestFiles }
