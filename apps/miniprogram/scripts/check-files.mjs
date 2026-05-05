import { access, readFile, readdir } from 'node:fs/promises';
import { createRequire } from 'node:module';

const requiredFiles = [
  'app.js',
  'app.json',
  'app.wxss',
  'project.config.json',
  'pages/login/login.js',
  'pages/chat/chat.js',
  'pages/evidence/evidence.js',
  'pages/favorites/favorites.js',
];

async function collectFiles(directory) {
  const entries = await readdir(new URL(`../${directory}`, import.meta.url), { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = directory ? `${directory}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(path)));
    } else if (/\.(js|wxml)$/.test(entry.name)) {
      files.push(path);
    }
  }

  return files;
}

for (const file of requiredFiles) {
  await access(new URL(`../${file}`, import.meta.url));
}

for (const file of ['app.json', 'project.config.json', 'sitemap.json']) {
  const content = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  JSON.parse(content);
}

globalThis.wx = {
  getStorageSync() {
    return '';
  },
  setStorageSync() {},
};

const require = createRequire(import.meta.url);
const { buildUrl, DEFAULT_BASE_URL } = require('../utils/config.js');
const loginUrl = buildUrl('/api/auth/login');

if (!/^https?:\/\/.+\/api\/auth\/login$/.test(loginUrl)) {
  throw new Error(`登录接口 URL 非法: ${loginUrl}`);
}

if (!/^https?:\/\//.test(DEFAULT_BASE_URL)) {
  throw new Error(`DEFAULT_BASE_URL 必须是绝对地址: ${DEFAULT_BASE_URL}`);
}

const uiFiles = [
  ...(await collectFiles('pages')),
  ...(await collectFiles('components')),
  ...(await collectFiles('stores')),
  'app.js',
];

for (const file of uiFiles) {
  const content = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  if (/require\(['"]\.\.\/.*services\//.test(content) || /require\(['"]\.\.\/\.\.\/services\//.test(content)) {
    throw new Error(`页面、组件和 store 不允许直接引用 services，请改走 SDK façade: ${file}`);
  }
}

const wxssFiles = await collectFiles('').then((files) => files.filter((file) => file.endsWith('.wxss')));
const unstableWxssPattern = /display:\s*grid|grid-template|gap:|place-items|inset:|calc\(|env\(|linear-gradient|rgba\(|box-shadow/;

for (const file of wxssFiles) {
  const content = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  if (unstableWxssPattern.test(content)) {
    throw new Error(`WXSS 包含不稳定的 Web 样式写法，请改成小程序稳态布局: ${file}`);
  }
}

console.log('miniprogram files check passed');
