// Builds dist/Numera.html: the whole app in one file, for emailing,
// AirDropping to an iPad, or hosting anywhere. Run: node build.mjs
import fs from 'node:fs';
const read = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8');
let html = read('./index.html');
html = html.replace('<link rel="stylesheet" href="css/app.css">', () => `<style>\n${read('./css/app.css')}\n</style>`);
html = html.replace(/<script src="(js\/[\w.]+)"><\/script>/g, (_, f) => `<script>\n${read('./' + f).replace(/<\/script/gi, '<\\/script')}\n</script>`);
html = html.replace(/<link rel="manifest"[^>]*>\n/, '').replace(/<link rel="(apple-touch-)?icon"[^>]*>\n/g, '');
const icon = 'data:image/svg+xml,' + encodeURIComponent(read('./icons/icon.svg').trim());
html = html.replace('</title>', `</title>\n<link rel="icon" href="${icon}">`);
fs.mkdirSync(new URL('./dist/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('./dist/Numera.html', import.meta.url), html);
console.log('dist/Numera.html', (html.length / 1024).toFixed(0) + ' KB');

// Artifact variant: page content only (the host adds doctype/head/body).
const head = html.match(/<title>[\s\S]*?<\/head>/)[0].replace('</head>', '').replace(/<meta name="theme-color"[^>]*>\n/g, '');
const body = html.match(/<body>([\s\S]*)<\/body>/)[1];
fs.writeFileSync(new URL('./dist/artifact.html', import.meta.url), head + body);
