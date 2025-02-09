#!/usr/bin/env node
import { Command } from 'commander';
import { parseSchema } from './utils/schema.js';
import { CRUDGenerator } from './generators/index.js';
import chalk from 'chalk';
import path from 'path';
const program = new Command();
program
    .name('crud-scaffold')
    .description('Generate CRUD data table components from Drizzle schema')
    .argument('<entity>', 'Name of the Drizzle entity to scaffold')
    .option('-o, --output <dir>', 'Output directory', './app')
    .option('-f, --force', 'Overwrite existing files', false)
    .option('-p, --page', 'Generate Next.js page', true)
    .action(async (entityName, options) => {
    try {
        // Load and validate schema
        const schema = await parseSchema();
        const entity = schema.entities.find(e => e.name.toLowerCase() === entityName.toLowerCase());
        if (!entity) {
            throw new Error(`Entity "${entityName}" not found in schema`);
        }
        const generatorOptions = {
            outputDir: options.output,
            entity,
            templatesDir: path.join(__dirname, 'templates'),
            options: {
                typescript: true,
                tests: false,
                documentation: false,
                prettier: true,
                eslint: false,
                force: options.force,
                page: options.page
            }
        };
        const generator = new CRUDGenerator(generatorOptions);
        await generator.generate();
        console.log(chalk.green('✨ CRUD components generated successfully!'));
    }
    catch (error) {
        console.error(chalk.red('Error:'), error);
        process.exit(1);
    }
});
program.parse();
