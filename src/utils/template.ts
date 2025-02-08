import Handlebars from 'handlebars';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadTemplate(templatePath: string): Promise<HandlebarsTemplateDelegate> {
  const fullPath = path.join(__dirname, '../templates', templatePath);
  const template = await fs.readFile(fullPath, 'utf-8');
  return Handlebars.compile(template);
}

// Register custom helpers
Handlebars.registerHelper('lowercase', (str: string) => str.toLowerCase());
Handlebars.registerHelper('uppercase', (str: string) => str.toUpperCase());

Handlebars.registerHelper('eq', function(a, b) {
    return a === b;
  });
  
  Handlebars.registerHelper('pascalCase', (str: string) => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  });
  
  Handlebars.registerHelper('lowercase', (str: string) => {
    return str.toLowerCase();
  });