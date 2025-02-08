import prettier from 'prettier';
export async function formatFile(content, parser) {
    try {
        return await prettier.format(content, {
            parser,
            semi: false,
            singleQuote: true,
            trailingComma: 'es5',
        });
    }
    catch (error) {
        console.warn('Formatting failed:', error);
        return content;
    }
}
