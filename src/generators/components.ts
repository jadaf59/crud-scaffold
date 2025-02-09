import path from 'path';
import { promises as fs } from 'fs';
import { pascalCase } from 'pascal-case';
import { paramCase } from 'param-case';
import chalk from 'chalk';
import { loadTemplate } from '../utils/template.js';
import { formatFile } from '../utils/format.js';
import { GeneratorOptions, EntityConfig } from '../types/index.js';

export async function generateComponents(options: GeneratorOptions) {
  const { entity, outputDir, force } = options;
  const componentDir = path.join(outputDir, '_components', entity.pluralName);

  // Create component directory
  await fs.mkdir(componentDir, { recursive: true });

  // Generate all components with new naming convention
  await Promise.all([
    generateComponent('delete-{{lowercase entity.name}}-dialog', entity, componentDir, force),
    generateComponent('{{lowercase entity.pluralName}}-feature-flags-provider', entity, componentDir, force),
    generateComponent('{{lowercase entity.pluralName}}-feature-flags', entity, componentDir, force),
    generateComponent('{{lowercase entity.pluralName}}-table', entity, componentDir, force),
    generateComponent('{{lowercase entity.pluralName}}-table-columns', entity, componentDir, force),
    generateComponent('{{lowercase entity.pluralName}}-table-floating-bar', entity, componentDir, force),
    generateComponent('{{lowercase entity.pluralName}}-table-toolbar', entity, componentDir, force),
    generateComponent('update-{{lowercase entity.name}}-sheet', entity, componentDir, force),
  ]);
}

async function generateComponent(
  templateName: string,
  entity: EntityConfig,
  outputDir: string,
  force: boolean
): Promise<void> {
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

async function fileExists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}