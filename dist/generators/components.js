import path from 'path';
import { promises as fs } from 'fs';
import { pascalCase } from 'pascal-case';
import { paramCase } from 'param-case';
import chalk from 'chalk';
import { loadTemplate } from '../utils/template.js';
import { formatFile } from '../utils/format.js';
export async function generateComponents(options) {
    const { entity, outputDir, force } = options;
    const componentDir = path.join(outputDir, '_components', entity.tableName);
    // Create component directory
    await fs.mkdir(componentDir, { recursive: true });
    // Generate all components
    await Promise.all([
        generateComponent('delete-dialog', entity, componentDir, force),
        generateComponent('feature-flags-provider', entity, componentDir, force),
        generateComponent('feature-flags', entity, componentDir, force),
        generateComponent('table', entity, componentDir, force),
        generateComponent('table-columns', entity, componentDir, force),
        generateComponent('table-floating-bar', entity, componentDir, force),
        generateComponent('table-toolbar-actions', entity, componentDir, force),
        generateComponent('update-sheet', entity, componentDir, force),
    ]);
}
async function generateComponent(templateName, entity, outputDir, force) {
    const fileName = `${entity.tableName}-${templateName}.tsx`;
    const filePath = path.join(outputDir, fileName);
    // Check if file exists and force flag is not set
    if (!force && await fileExists(filePath)) {
        console.log(chalk.yellow(`Skipping ${fileName} - file already exists`));
        return;
    }
    const template = await loadTemplate(`components/${templateName}.hbs`);
    const content = template({
        entity,
        pascalCase,
        paramCase,
    });
    const formatted = await formatFile(content, 'typescript');
    await fs.writeFile(filePath, formatted);
    console.log(chalk.green(`Generated ${fileName}`));
}
async function fileExists(path) {
    try {
        await fs.access(path);
        return true;
    }
    catch {
        return false;
    }
}
