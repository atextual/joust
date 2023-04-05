import { processComponentsInDirectory } from './fileProcessor.mjs'
import path from 'path'

const COMPONENTS_DIR = path.join(process.cwd(), 'src', 'components')

await processComponentsInDirectory(COMPONENTS_DIR)
