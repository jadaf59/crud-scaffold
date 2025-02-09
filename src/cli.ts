#!/usr/bin/env node

import { Command } from "commander"
import chalk from "chalk"
import ora from "ora"
import path from "path"
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import inquirer from "inquirer"
import { CRUDGenerator } from './generators/index.js'
import type { GeneratorConfig } from "./types/index.js"
import { parseSchema } from './utils/schema.js'

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Define available icon names
const LUCIDE_ICON_NAMES = [
    "Activity",
    "AlertCircle",
    "AlertTriangle",
    "ArrowDown",
    "ArrowUp",
    "Check",
    "CheckCircle",
    "Circle",
    "File",
    "FileText",
    "Flag",
    "Home",
    "Info",
    "Mail",
    "Plus",
    "Settings",
    "Star",
    "User",
    // Add more icon names as needed
] as const

const program = new Command()

program
    .name("crud-scaffold")
    .description("Generate CRUD scaffolding for your Next.js application")
    .version("1.0.0")
    .option("-c, --config <path>", "Path to config file")
    .option("-o, --output <dir>", "Output directory", "./src/app")
    .option("-t, --typescript", "Generate TypeScript files", true)
    .option("--tests", "Generate test files", false)
    .option("--docs", "Generate documentation", false)
    .action(async (options: CLIOptions) => {
        console.log(chalk.blue("Starting CRUD scaffold generation..."));
        const spinner = ora("Initializing...").start();
        
        try {
            console.log(chalk.yellow("Parsing schema file..."));
            const { entities } = await parseSchema();
            
            console.log(chalk.yellow(`Found ${entities.length} entities in schema`));
            
            if (entities.length === 0) {
                throw new Error("No entities found in schema");
            }

            spinner.stop();

            const { mode } = await inquirer.prompt([{
                type: 'list',
                name: 'mode',
                message: 'How would you like to generate tables?',
                choices: ['All Tables', 'Select Tables']
            }]);

            let selectedEntities = entities;
            
            if (mode === 'Select Tables') {
                const { selected } = await inquirer.prompt([{
                    type: 'checkbox',
                    name: 'selected',
                    message: 'Select tables to generate:',
                    choices: entities.map(e => ({
                        name: e.name,
                        value: e
                    }))
                }]);
                
                if (!selected || selected.length === 0) {
                    spinner.fail(chalk.red("No tables selected for generation"));
                    process.exit(1);
                }
                
                selectedEntities = selected;
            }

            spinner.start("Generating files...");

            for (const entity of selectedEntities) {
                console.log(chalk.yellow(`Generating scaffolding for entity: ${entity.name}`));
                
                const generatorOptions: GeneratorConfig = {
                    outputDir: options.output,
                    entity,
                    templatesDir: path.join(__dirname, 'templates'),
                    options: {
                        typescript: options.typescript,
                        tests: options.tests,
                        documentation: options.docs,
                        prettier: true,
                        eslint: false,
                        force: false
                    }
                };

                console.log(chalk.yellow("Creating generator instance..."));
                const generator = new CRUDGenerator(generatorOptions);
                
                console.log(chalk.yellow("Starting generation..."));
                await generator.generate();
                
                console.log(chalk.green(`Completed generation for ${entity.name}`));
            }

            spinner.succeed(chalk.green("CRUD scaffolding generated successfully!"))
        } catch (error) {
            spinner.fail(chalk.red("Error generating CRUD scaffolding"))
            console.error(chalk.red("Error details:"), error)
            process.exit(1)
        }
    })

console.log(chalk.blue("Parsing command line arguments..."));
program.parse(process.argv)

interface CLIOptions {
    config?: string;
    output: string;
    typescript: boolean;
    tests: boolean;
    docs: boolean;
}