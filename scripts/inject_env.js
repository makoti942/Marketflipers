const fs = require('fs');
const path = require('path');

// Target files in the built dist directory
const distDir = path.join(__dirname, '..', 'dist');
const jsFile = path.join(distDir, 'static', 'js', 'index.39f61533.js');
const chunkFile = path.join(distDir, 'static', 'js', 'async', '698.5f7f5ff5.js');

// Default placeholder values currently in the codebase
const PLACEHOLDER_APP_ID = '34J0u7zObmeCX5lnl8zm7';
const PLACEHOLDER_REFERRAL = 'https://t.deriv.link?t=33VBNTNRX9DY';

// Load variables from .env file if it exists
const envPath = path.join(__dirname, '..', '.env');
const envConfig = {};

if (fs.existsSync(envPath)) {
    const envLines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of envLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const parts = trimmed.split('=');
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
            envConfig[key] = value;
        }
    }
    console.log('[ENV] Loaded local .env configuration.');
}

// Extract variables (with process.env/Vercel variables taking precedence)
const appId = process.env.NEXT_PUBLIC_DERIV_APP_ID || process.env.VITE_DERIV_APP_ID || envConfig.NEXT_PUBLIC_DERIV_APP_ID || envConfig.VITE_DERIV_APP_ID;
const referralLink = process.env.NEXT_PUBLIC_DERIV_REFERRAL_LINK || envConfig.NEXT_PUBLIC_DERIV_REFERRAL_LINK;

console.log(`[ENV] Target APP_ID: ${appId || 'Use Placeholder'}`);
console.log(`[ENV] Target REFERRAL: ${referralLink || 'Use Placeholder'}`);

// Replace in target files
function replaceInFile(filePath, targets) {
    if (!fs.existsSync(filePath)) {
        console.warn(`[WARN] File not found: ${filePath}`);
        return;
    }
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    for (const t of targets) {
        if (t.value && content.includes(t.placeholder) && t.placeholder !== t.value) {
            content = content.split(t.placeholder).join(t.value);
            console.log(`[ENV] Injected config into ${path.basename(filePath)}: ${t.placeholder} -> ${t.value}`);
            modified = true;
        }
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

const replacementTargets = [
    { placeholder: PLACEHOLDER_APP_ID, value: appId },
    { placeholder: PLACEHOLDER_REFERRAL, value: referralLink }
];

replaceInFile(jsFile, replacementTargets);
replaceInFile(chunkFile, replacementTargets);

console.log('[ENV] Environment injection completed successfully.');
