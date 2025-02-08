import * as ts from "typescript";
import path from "path";
import { promises as fs } from "fs";
import type { EntityConfig, EntityEnum, EntityField } from '../types/index.js';
import type { Config } from 'drizzle-kit';

function inferFieldType(type: string): "string" | "number" | "boolean" | "Date" | "enum" {
  if (type.includes('varchar') || type.includes('text')) return "string";
  if (type.includes('int') || type.includes('decimal')) return "number";
  if (type.includes('bool')) return "boolean";
  if (type.includes('timestamp') || type.includes('date')) return "Date";
  if (type.includes('enum')) return "enum";
  return "string";
}

function getPlural(word: string): string {
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

async function readDrizzleConfig(): Promise<Config> {
  const configPath = path.resolve(process.cwd(), './drizzle.config.ts');
  console.log(`Looking for drizzle config at: ${configPath}`);
  
  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const sourceFile = ts.createSourceFile(
      'drizzle.config.ts',
      configContent,
      ts.ScriptTarget.Latest,
      true
    );

    let schemaPath = '';
    
    // Parse the config file to get the schema path
    function visit(node: ts.Node) {
      if (ts.isPropertyAssignment(node) && 
          ts.isIdentifier(node.name) && 
          node.name.text === 'schema') {
        schemaPath = node.initializer.getText().replace(/['"`]/g, '');
      }
      ts.forEachChild(node, visit);
    }
    
    visit(sourceFile);
    return { schema: schemaPath } as Config;
  } catch (error) {
    console.error('Failed to read drizzle config:', error);
    throw new Error('Could not find or parse drizzle.config.ts');
  }
}

async function getAllSchemaFiles(schemaPath: string | string[]): Promise<string[]> {
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

export async function parseSchema(): Promise<{ entities: EntityConfig[] }> {
  const config = await readDrizzleConfig();
  if (!config.schema) throw new Error("No schema path found in drizzle config");
  const schemaFiles = await getAllSchemaFiles(config.schema);
  console.log("Schema files to parse:", schemaFiles);

  const entities: EntityConfig[] = [];

  for (const schemaFile of schemaFiles) {
    console.log(`Parsing schema file: ${schemaFile}`);
    const schemaContent = await fs.readFile(schemaFile, 'utf-8');
    const sourceFile = ts.createSourceFile(
      path.basename(schemaFile),
      schemaContent,
      ts.ScriptTarget.Latest,
      true
    );

    function visit(node: ts.Node) {
      if (ts.isVariableStatement(node)) {
        const declaration = node.declarationList.declarations[0];
        if (ts.isIdentifier(declaration.name)) {
          const tableName = declaration.name.text;
          const initializer = declaration.initializer?.getText() || '';
          
          if (initializer.includes('pgTable(')) {
            console.log(`Found table: ${tableName}`);
            const entityName = tableName.charAt(0).toUpperCase() + tableName.slice(1);
            
            const fields: EntityField[] = [];
            // Parse fields from the table definition
            if (declaration.initializer && ts.isCallExpression(declaration.initializer)) {
              const tableConfig = declaration.initializer.arguments[1] as ts.ObjectLiteralExpression;
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

            entities.push({
              name: entityName,
              pluralName: getPlural(entityName),
              tableName,
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