import path from "path"
import { promises as fs } from "fs"
import Handlebars from "handlebars"
import type { GeneratorConfig } from "../types/index.js"

export class CRUDGenerator {
  private config: GeneratorConfig
  
  constructor(config: GeneratorConfig) {
    this.config = config
    this.registerHelpers()
  }

  private registerHelpers() {
    Handlebars.registerHelper("lowercase", (str) => str.toLowerCase())
    Handlebars.registerHelper("uppercase", (str) => str.toUpperCase())
    Handlebars.registerHelper("pascalCase", (str) => {
      return str
        .split(/[-_\s]+/)
        .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
        .join("")
    })
    Handlebars.registerHelper('eq', function(arg1, arg2) {
      return arg1 === arg2;
    });
    // Add more helpers as needed
  }

  private async generateFile(templateName: string, outputPath: string): Promise<void> {
    try {
      // Adjust template path to match our directory structure
      const templatePath = path.join(this.config.templatesDir, `${templateName}.hbs`);
      console.log(`Looking for template at: ${templatePath}`);
      
      // Check if template exists
      try {
        await fs.access(templatePath);
      } catch {
        throw new Error(`Template ${templateName} not found at ${templatePath}`);
      }

      const templateContent = await fs.readFile(templatePath, 'utf-8');
      const template = Handlebars.compile(templateContent);
      
      // Create output directory if it doesn't exist
      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      
      const content = template({ entity: this.config.entity });
      await fs.writeFile(outputPath, content);
      
      console.log(`Generated ${outputPath}`);
    } catch (error) {
      console.error(`Error generating ${outputPath}:`, error);
      throw error;
    }
  }

  private async generateLibFiles(): Promise<void> {
    // Update template paths to match directory structure
    await this.generateFile('lib/actions', path.join(this.config.outputDir, `_lib/${this.config.entity.tableName}/actions.ts`));
    await this.generateFile('lib/queries', path.join(this.config.outputDir, `_lib/${this.config.entity.tableName}/queries.ts`));
    await this.generateFile('lib/validations', path.join(this.config.outputDir, `_lib/${this.config.entity.tableName}/validations.ts`));
    await this.generateFile('lib/utils', path.join(this.config.outputDir, `_lib/${this.config.entity.tableName}/utils.ts`));
    await this.generateFile('lib/seeds', path.join(this.config.outputDir, `_lib/${this.config.entity.tableName}/seeds.ts`));
  }

  public async generate(): Promise<void> {
    try {
      await this.config.hooks?.beforeGenerate?.()

      // Generate lib files
      await this.generateLibFiles()

      // Generate component files with updated paths
      const componentsDir = path.join(this.config.outputDir, `_components/${this.config.entity.tableName}`)
      
      // Generate feature flags provider as a shared component
      await this.generateFile("components/feature-flags-provider", path.join(componentsDir, "feature-flags-provider.tsx"))
      
      // Generate entity-specific components
      await this.generateFile("components/table", path.join(componentsDir, `${this.config.entity.pluralName.toLowerCase()}-table.tsx`))
      await this.generateFile("components/table-columns", path.join(componentsDir, `${this.config.entity.pluralName.toLowerCase()}-table-columns.tsx`))
      await this.generateFile("components/table-toolbar-actions", path.join(componentsDir, `${this.config.entity.pluralName.toLowerCase()}-table-toolbar-actions.tsx`))
      await this.generateFile("components/table-floating-bar", path.join(componentsDir, `${this.config.entity.pluralName.toLowerCase()}-table-floating-bar.tsx`))
      await this.generateFile("components/update-sheet", path.join(componentsDir, `update-${this.config.entity.name.toLowerCase()}-sheet.tsx`))
      await this.generateFile("components/delete-dialog", path.join(componentsDir, `delete-${this.config.entity.name.toLowerCase()}-dialog.tsx`))
      await this.generateFile("components/feature-flags", path.join(componentsDir, `${this.config.entity.pluralName.toLowerCase()}-feature-flags.tsx`))
      
      if (this.config.options?.tests) {
        // Generate test files
        const testsDir = path.join(this.config.outputDir, `__tests__/${this.config.entity.tableName}`)
        await this.generateFile("tests/actions.test", path.join(testsDir, "actions.test.ts"))
        await this.generateFile("tests/queries.test", path.join(testsDir, "queries.test.ts"))
      }

      if (this.config.options?.documentation) {
        // Generate documentation
        const docsDir = path.join(this.config.outputDir, "docs")
        await this.generateFile("docs/entity", path.join(docsDir, `${this.config.entity.tableName}.md`))
      }

      await this.config.hooks?.afterGenerate?.()
      
      console.log("CRUD generation completed successfully!")
    } catch (error) {
      console.error("Error during CRUD generation:", error)
      throw error
    }
  }
}