const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// ڕێڕەوی فایلی data_keys.json (لە هەمان شوێنی ئەپەکەدا)
const KEYS_DB_PATH = path.join(__dirname, 'data', 'data_keys.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadKeysData() {
  try {
    if (fs.existsSync(KEYS_DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(KEYS_DB_PATH, 'utf8'));
      if (!data.allKeys) data.allKeys = [];
      return data;
    }
  } catch (err) {
    console.error('Error loading keys data:', err.message);
  }
  return { allKeys: [] };
}

function saveKeysData(data) {
  fs.writeFileSync(KEYS_DB_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ Keys saved to: ${KEYS_DB_PATH}`);
}

function generateNormalKey() {
  const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `KHOSHNAW-NORMAL-${randomPart}`;
}

function generateSpecialKey(username) {
  const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `KHOSHNAW-SPECIAL-${username}-${randomPart}`;
}

function generatePremiumKey() {
  const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `KHOSHNAW-PREMIUM-${randomPart}`;
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function showAllKeys() {
  const db = loadKeysData();
  console.log('\n=========================================');
  console.log('📋 ALL KEYS IN DATABASE');
  console.log('=========================================\n');
  
  const unusedKeys = db.allKeys.filter(k => !k.used);
  const usedKeys = db.allKeys.filter(k => k.used);
  
  console.log(`🟢 UNUSED KEYS: ${unusedKeys.length}`);
  unusedKeys.forEach((k, i) => {
    console.log(`   ${i+1}. ${k.key} (Type: ${k.type})`);
  });
  
  console.log(`\n🔴 USED KEYS: ${usedKeys.length}`);
  usedKeys.forEach((k, i) => {
    console.log(`   ${i+1}. ${k.key} - Used by: ${k.usedBy} at ${new Date(k.usedAt).toLocaleDateString()}`);
  });
  
  console.log('\n=========================================');
  console.log(`📊 Total Keys: ${db.allKeys.length}`);
  console.log('=========================================\n');
}

async function main() {
  console.log('\n=========================================');
  console.log('🔐 KHOSHNAW SYSTEM - KEY GENERATOR');
  console.log('=========================================\n');
  console.log('1. Generate Normal Keys');
  console.log('2. Generate Special Key');
  console.log('3. Generate Premium Keys (💎)');
  console.log('4. Show All Keys');
  console.log('5. Exit');
  console.log('\n=========================================\n');
  
  const choice = await question('👉 Enter your choice (1-5): ');
  
  if (choice === '1') {
    const amount = await question('📝 How many keys to generate? (default: 10, max: 100): ');
    let count = Math.min(parseInt(amount) || 10, 100);
    
    const db = loadKeysData();
    const keys = [];
    
    console.log('\n🔄 Generating keys...\n');
    
    for (let i = 0; i < count; i++) {
      const key = generateNormalKey();
      keys.push(key);
      db.allKeys.push({
        key: key,
        type: 'normal',
        createdAt: new Date().toISOString(),
        used: false,
        usedBy: null,
        usedAt: null,
        machineId: null
      });
      console.log(`   ✅ ${i+1}. ${key}`);
    }
    
    saveKeysData(db);
    
    console.log('\n=========================================');
    console.log(`✅ ${count} Normal Keys Generated & Saved!`);
    console.log('=========================================\n');
    
    const filename = `keys_normal_${Date.now()}.txt`;
    fs.writeFileSync(filename, keys.join('\n'));
    console.log(`📁 Also saved to: ${filename}`);
    
  } else if (choice === '2') {
    const username = await question('👤 Enter username for special key: ');
    if (!username || username.trim() === '') {
      console.log('❌ Username required!');
      rl.close();
      return;
    }
    
    const sanitizedUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    const specialKey = generateSpecialKey(sanitizedUsername);
    const db = loadKeysData();
    
    db.allKeys.push({
      key: specialKey,
      type: 'special',
      assignedTo: sanitizedUsername,
      createdAt: new Date().toISOString(),
      used: false,
      usedBy: null,
      usedAt: null,
      machineId: null
    });
    
    saveKeysData(db);
    
    console.log('\n=========================================');
    console.log('✅ Special Key Generated:');
    console.log('=========================================');
    console.log(`🔑 Key: ${specialKey}`);
    console.log(`👤 Assigned to: ${sanitizedUsername}`);
    console.log(`📅 Created: ${new Date().toLocaleString()}`);
    console.log('\n=========================================\n');
    
    const filename = `keys_special_${sanitizedUsername}_${Date.now()}.txt`;
    fs.writeFileSync(filename, `Key: ${specialKey}\nUser: ${sanitizedUsername}\nCreated: ${new Date().toISOString()}`);
    console.log(`📁 Saved to: ${filename}`);
    
  } else if (choice === '3') {
    const amount = await question('📝 How many PREMIUM keys to generate? (default: 10, max: 100): ');
    let count = Math.min(parseInt(amount) || 10, 100);
    
    const db = loadKeysData();
    const keys = [];
    
    console.log('\n🔄 Generating premium keys...\n');
    
    for (let i = 0; i < count; i++) {
      const key = generatePremiumKey();
      keys.push(key);
      db.allKeys.push({
        key: key,
        type: 'premium',
        createdAt: new Date().toISOString(),
        used: false,
        usedBy: null,
        usedAt: null,
        machineId: null
      });
      console.log(`   💎 ${i+1}. ${key}`);
    }
    
    saveKeysData(db);
    
    console.log('\n=========================================');
    console.log(`💎 ${count} Premium Keys Generated & Saved!`);
    console.log('=========================================\n');
  } else if (choice === '4') {
    showAllKeys();
  } else {
    console.log('\n👋 Goodbye!');
  }
  
  rl.close();
}

main().catch(console.error);