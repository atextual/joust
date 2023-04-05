import fs from 'fs'
import path from 'path'
import { processComponent } from './processComponent.mjs'

const processComponentsInDirectory = async (componentDir) => {
    fs.readdir(componentDir, (err, categories) => {
        for (const category of categories) {
            if (!/^\..*/.test(category)) {
                const categoryPath = path.join(componentDir, category)
                fs.readdir(categoryPath, (err, components) => {
                    for (const componentName of components) {
                        if (!/^\..*/.test(componentName)) {
                            const componentPath = path.join(categoryPath, componentName, 'index.tsx')
                            if (fs.existsSync(componentPath)) {
                                processComponent(componentPath, componentName)
                            }
                        }
                    }
                })
            }
        }
    })
}

export { processComponentsInDirectory }
