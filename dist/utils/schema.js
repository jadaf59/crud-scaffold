import * as ts from "typescript";
import path from "path";
import { promises as fs } from "fs";
function inferFieldType(type) {
    if (type.includes('varchar') || type.includes('text'))
        return "string";
    if (type.includes('int') || type.includes('decimal'))
        return "number";
    if (type.includes('bool'))
        return "boolean";
    if (type.includes('timestamp') || type.includes('date'))
        return "Date";
    if (type.includes('enum'))
        return "enum";
    return "string";
}
function getPlural(word) {
    // Don't add 's' if the word already ends in 's'
    if (word.endsWith('s')) {
        return word;
    }
    // Add 'es' for words ending in 'sh', 'ch', 'x', 'z', 's'
    if (word.match(/[sxz]$/) || word.match(/[^aeiou]h$/)) {
        return word + 'es';
    }
    // Add 's' for all other cases
    return word + 's';
}
async function readDrizzleConfig() {
    const configPath = path.resolve(process.cwd(), './drizzle.config.ts');
    console.log(`Looking for drizzle config at: ${configPath}`);
    try {
        const configContent = await fs.readFile(configPath, 'utf-8');
        const sourceFile = ts.createSourceFile('drizzle.config.ts', configContent, ts.ScriptTarget.Latest, true);
        let schemaPath = '';
        // Parse the config file to get the schema path
        function visit(node) {
            if (ts.isPropertyAssignment(node) &&
                ts.isIdentifier(node.name) &&
                node.name.text === 'schema') {
                schemaPath = node.initializer.getText().replace(/['"`]/g, '');
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
        return { schema: schemaPath };
    }
    catch (error) {
        console.error('Failed to read drizzle config:', error);
        throw new Error('Could not find or parse drizzle.config.ts');
    }
}
async function getAllSchemaFiles(schemaPath) {
    const fullPath = path.resolve(process.cwd(), Array.isArray(schemaPath) ? schemaPath[0] : schemaPath);
    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
        const files = await fs.readdir(fullPath);
        return files
            .filter(file => file.endsWith('.ts'))
            .map(file => path.join(fullPath, file));
    }
    // If it's a file, just return that file path
    return [fullPath + (fullPath.endsWith('.ts') ? '' : '.ts')];
}
export async function parseSchema() {
    const config = await readDrizzleConfig();
    if (!config.schema)
        throw new Error("No schema path found in drizzle config");
    const schemaFiles = await getAllSchemaFiles(config.schema);
    console.log("Schema files to parse:", schemaFiles);
    const entities = [];
    for (const schemaFile of schemaFiles) {
        console.log(`Parsing schema file: ${schemaFile}`);
        const schemaContent = await fs.readFile(schemaFile, 'utf-8');
        const sourceFile = ts.createSourceFile(path.basename(schemaFile), schemaContent, ts.ScriptTarget.Latest, true);
        function visit(node) {
            // Look for type declarations like: export type Company = InferSelectModel<typeof companies>;
            if (ts.isTypeAliasDeclaration(node) &&
                node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword)) {
                const entityName = node.name.text;
                // Only process types that are InferSelectModel types
                if (node.type.getText().includes('InferSelectModel')) {
                    const tableName = node.type.getText().match(/typeof\s+(\w+)/)?.[1] ?? '';
                    if (tableName) {
                        console.log(`Found entity: ${entityName} for table: ${tableName}`);
                        const fields = [];
                        // Parse fields from the table definition
                        // Find the table definition in the same file
                        sourceFile.forEachChild(tableNode => {
                            if (ts.isVariableStatement(tableNode) &&
                                tableNode.declarationList.declarations[0].name.getText() === tableName) {
                                const declaration = tableNode.declarationList.declarations[0];
                                if (declaration.initializer && ts.isCallExpression(declaration.initializer)) {
                                    const tableConfig = declaration.initializer.arguments[1];
                                    if (ts.isObjectLiteralExpression(tableConfig)) {
                                        tableConfig.properties.forEach(prop => {
                                            if (ts.isPropertyAssignment(prop) && ts.isIdentifier(prop.name)) {
                                                const fieldName = prop.name.text;
                                                const fieldType = prop.initializer.getText();
                                                fields.push({
                                                    name: fieldName,
                                                    type: inferFieldType(fieldType),
                                                    isRequired: !fieldType.includes('undefined'),
                                                    isSearchable: fieldType.includes('varchar') || fieldType.includes('text'),
                                                    isSortable: true,
                                                    isFilterable: true
                                                });
                                            }
                                        });
                                    }
                                }
                            }
                        });
                        entities.push({
                            name: entityName, // This is now the singular form (e.g., "Company")
                            pluralName: tableName, // This is the plural form (e.g., "companies")
                            tableName, // Keep the table name as is
                            fields,
                            enums: {}
                        });
                    }
                }
            }
            ts.forEachChild(node, visit);
        }
        visit(sourceFile);
    }
    console.log(`Found ${entities.length} entities`);
    return { entities };
}
