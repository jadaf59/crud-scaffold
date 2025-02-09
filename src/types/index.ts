import prettier from "prettier"

// Core entity field definition
export interface EntityField {
  name: string;
  type: "string" | "number" | "boolean" | "Date" | "enum";
  isRequired: boolean;
  isSearchable: boolean;
  isSortable: boolean;
  isFilterable: boolean;
  isEnum?: boolean;
  enumValues?: string[];
  icons?: Record<string, string>;
  validation?: EntityFieldValidation;
  description?: string;
}

// Entity configuration
export interface Entity {
  name: string
  pluralName: string
  tableName: string
  description?: string
  fields: EntityField[]
  timestamps?: boolean
  softDelete?: boolean
  
  enums: Record<string, {
    values: string[]
    icons?: Record<string, string>
    colors?: Record<string, string>
  }>
  
  features?: {
    search?: boolean
    filter?: boolean
    sort?: boolean
    export?: boolean
    import?: boolean
    bulkActions?: boolean
    advancedFilter?: boolean
    pagination?: boolean
  }
  
  relationships?: {
    hasMany?: Array<{
      entity: string
      foreignKey: string
      as?: string
    }>
    belongsTo?: Array<{
      entity: string
      foreignKey: string
      as?: string
    }>
    manyToMany?: Array<{
      entity: string
      through: string
      as?: string
    }>
  }
  
  ui?: {
    icon?: string
    color?: string
    defaultSort?: {
      field: string
      direction: "asc" | "desc"
    }
    rowActions?: Array<"view" | "edit" | "delete" | "duplicate">
    bulkActions?: Array<"delete" | "export" | "update">
    layout?: "table" | "grid" | "list"
    perPage?: number
    searchPlaceholder?: string
  }
}

// Generator configuration
export interface GeneratorConfig {
  outputDir: string
  templatesDir: string
  entity: Entity
  options: {
    typescript: boolean
    tests: boolean
    documentation: boolean
    prettier: boolean
    eslint: boolean
    force: boolean
    page: boolean
  }
  hooks?: {
    beforeGenerate?: () => Promise<void>
    afterGenerate?: () => Promise<void>
    beforeEachFile?: (filePath: string) => Promise<void>
    afterEachFile?: (filePath: string) => Promise<void>
  }
  formatOptions?: prettier.Options
}

export interface EntityEnum {
  name: string;
  values: string[];
  icons?: Record<string, string>;
}

export interface EntityConfig {
  name: string;
  pluralName: string;
  tableName: string;
  fields: EntityField[];
  sourceFile: string;
  enums: Record<string, {
    values: string[];
    icons?: Record<string, string>;
    colors?: Record<string, string>;
  }>;
  features?: {
    search?: boolean;
    sort?: boolean;
    filter?: boolean;
    pagination?: boolean;
  };
}

export interface GeneratorOptions {
  entity: EntityConfig;
  outputDir: string;
  force: boolean;
}

export interface EntityFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
}