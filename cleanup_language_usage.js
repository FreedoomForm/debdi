
const fs = require('fs');
const path = require('path');

const walk = (dir, callback) => {
    const files = fs.readdirSync(dir);
    files.forEach((file) => {
        const filepath = path.join(dir, file);
        const stats = fs.statSync(filepath);
        if (stats.isDirectory()) {
            walk(filepath, callback);
        } else if (stats.isFile()) {
            callback(filepath);
        }
    });
};

const srcDir = path.join(process.cwd(), 'src');

walk(srcDir, (filepath) => {
    if (!filepath.endsWith('.tsx') && !filepath.endsWith('.ts')) return;

    let content = fs.readFileSync(filepath, 'utf8');
    let originalContent = content;

    // 1. Remove duplicate declarations
    // Pattern: const { language } = useLanguage(); \n const { t, language } = useLanguage()
    // We want to keep the one with 't'
    const duplicateRegex1 = /const\s+\{\s*language\s*\}\s*=\s*useLanguage\(\);?\s*const\s+\{\s*t,\s*language\s*\}\s*=\s*useLanguage\(\)/g;
    content = content.replace(duplicateRegex1, "const { t, language } = useLanguage()");
    
    const duplicateRegex2 = /const\s+\{\s*language\s*\}\s*=\s*useLanguage\(\);?\s*const\s+\{\s*language,\s*t\s*\}\s*=\s*useLanguage\(\)/g;
    content = content.replace(duplicateRegex2, "const { language, t } = useLanguage()");

    // Also handle cases where they might be separated by newlines
     const duplicateRegex3 = /const\s+\{\s*language\s*\}\s*=\s*useLanguage\(\);?\s*const\s+\{\s*t\s*\}\s*=\s*useLanguage\(\)/g;
    content = content.replace(duplicateRegex3, "const { t, language } = useLanguage()");
    
    // In rare cases: const { language } = useLanguage(); ... const { t } = useLanguage()
    // We shouldn't merge if they are far apart, but usually they are adjacent in imports.
    
    // 2. Replace language.t(...) with t(...)
    // Regex to match language.t( and replace with t(
    content = content.replace(/language\.t\(/g, 't(');

    // 3. Ensure 't' is destructured if we just created a usage of 't(' but it wasn't there
    // If we replaced language.t with t, we must ensure 't' is in the destructured variables.
    // Case: const { language } = useLanguage() -> used language.t -> now uses t.
    // We need to change const { language } = useLanguage() to const { language, t } = useLanguage()
    if (content.includes('t(') && !content.includes('const { t, language }') && !content.includes('const { language, t }')) {
          const singleLanguageRegex = /const\s+\{\s*language\s*\}\s*=\s*useLanguage\(\)/g;
          content = content.replace(singleLanguageRegex, "const { language, t } = useLanguage()");
    }

    if (content !== originalContent) {
        console.log(`Updating ${filepath}`);
        fs.writeFileSync(filepath, content, 'utf8');
    }
});
