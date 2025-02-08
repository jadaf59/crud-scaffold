import * as ts from "typescript";
import path from "path";
import { promises as fs } from "fs";
import type { EntityConfig, EntityEnum, EntityField } from '../types/index.js';

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

export async function parseSchema(): Promise<{ entities: EntityConfig[] }> {
  console.log("Looking for schema file...");
  const schemaPath = path.resolve(process.cwd(), './lib/db/schema/schema.ts');
  console.log(`Attempting to parse schema at: ${schemaPath}`);

  const schemaContent = await fs.readFile(schemaPath, 'utf-8');
  const sourceFile = ts.createSourceFile(
    'schema.ts',
    schemaContent,
    ts.ScriptTarget.Latest,
    true
  );

  const entities: EntityConfig[] = [];

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
  console.log(`Found ${entities.length} entities`);
  return { entities };
}