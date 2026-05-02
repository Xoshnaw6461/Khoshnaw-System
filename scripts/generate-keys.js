const crypto = require('crypto');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Path to keys database (relative to this script's location)
const KEYS_DB_PATH = path.join(__dirname, '..', 'data', 'data_keys.json');

// Ensure data directory exists
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadKeysData() {
  try {
    if (fs.existsSync(KEYS_DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(KEYS_DB_PATH, 'utf8'));
      // Ensure allKeys exists
      if (!data.allKeys) {
        data.allKeys = [];
      }
      return data;
    }
  } catch (err) {
    console.error('Error loading keys data:', err.message);
  }
  // Default structure
  return { 
    allKeys: [
      {
        key: "KH0SHN4W-D3V-K3Y-2026",
        type: "developer",
        createdAt: new Date().toISOString(),
        used: false,
        usedBy: null,
        usedAt: null,
        isDeveloper: true
      }
    ] 
  };
}

function saveKeysData(data) {
  // Ensure allKeys exists before saving
  if (!data.allKeys) {
    data.allKeys = [];
  }
  fs.writeFileSync(KEYS_DB_PATH, JSON.stringify(data, null, 2));
  console.log(`✅ Keys saved to: ${KEYS_DB_PATH}`);
}

function generateRandomString(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').toLowerCase().substring(0, length);
}

function generateNormalKey() {
  // Format: Khoshnaw-System-xxxxxx (6 random characters)
  const randomPart = generateRandomString(6);
  return `Khoshnaw-System-${randomPart}`;
}

function generateSpecialKey(username) {
  // Format: Khoshnaw-System-username-xxxx (custom for user)
  const randomPart = generateRandomString(4);
  return `Khoshnaw-System-${username}-${randomPart}`;
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
  const developerKeys = db.allKeys.filter(k => k.isDeveloper === true);
  
  // Show developer keys first
  if (developerKeys.length > 0) {
    console.log(`👑 Developer Keys: ${developerKeys.length}`);
    developerKeys.forEach((k, i) => {
      console.log(`   ${i+1}. ${k.key} (Type: ${k.type})`);
    });
    console.log('');
  }
  
  console.log(`🟢 Unused Keys: ${unusedKeys.length}`);
  unusedKeys.forEach((k, i) => {
    console.log(`   ${i+1}. ${k.key} (Type: ${k.type})`);
  });
  
  console.log(`\n🔴 Used Keys: ${usedKeys.length}`);
  usedKeys.forEach((k, i) => {
    console.log(`   ${i+1}. ${k.key} - Used by: ${k.usedBy} at ${new Date(k.usedAt).toLocaleDateString()}`);
  });
  
  console.log('\n=========================================');
  console.log(`📊 Total Keys: ${db.allKeys.length}`);
  console.log('=========================================\n');
}

async function deleteKey() {
  const db = loadKeysData();
  const unusedKeys = db.allKeys.filter(k => !k.used && !k.isDeveloper);
  
  if (unusedKeys.length === 0) {
    console.log('❌ No unused keys to delete.');
    return;
  }
  
  console.log('\n📋 Unused Keys:');
  unusedKeys.forEach((k, i) => {
    console.log(`   ${i+1}. ${k.key} (Type: ${k.type})`);
  });
  
  const choice = await question('\n👉 Enter the number of the key to delete (or 0 to cancel): ');
  const index = parseInt(choice) - 1;
  
  if (index >= 0 && index < unusedKeys.length) {
    const keyToDelete = unusedKeys[index].key;
    const confirm = await question(`⚠️ Are you sure you want to delete key: ${keyToDelete}? (y/n): `);
    if (confirm.toLowerCase() === 'y') {
      const keyIndex = db.allKeys.findIndex(k => k.key === keyToDelete);
      if (keyIndex !== -1) {
        db.allKeys.splice(keyIndex, 1);
        saveKeysData(db);
        console.log(`✅ Key deleted: ${keyToDelete}`);
      }
    } else {
      console.log('❌ Deletion cancelled.');
    }
  } else if (choice !== '0') {
    console.log('❌ Invalid choice.');
  }
}

async function clearAllKeys() {
  const confirm = await question('⚠️⚠️⚠️ DANGER: This will delete ALL keys including developer keys! Type "CONFIRM" to proceed: ');
  if (confirm === 'CONFIRM') {
    // Keep only the developer key
    const db = { 
      allKeys: [
        {
          key: "KH0SHN4W-D3V-K3Y-2026",
          type: "developer",
          createdAt: new Date().toISOString(),
          used: false,
          usedBy: null,
          usedAt: null,
          isDeveloper: true
        }
      ] 
    };
    saveKeysData(db);
    console.log('✅ All keys cleared. Developer key preserved.');
  } else {
    console.log('❌ Operation cancelled.');
  }
}

async function main() {
  console.log('\n=========================================');
  console.log('🔐 KHOSHNAW SYSTEM - KEY MANAGER');
  console.log('=========================================\n');
  console.log('1. Generate Normal Keys');
  console.log('2. Generate Special Key (for specific user)');
  console.log('3. Show All Keys');
  console.log('4. Delete an Unused Key');
  console.log('5. Clear All Keys (DANGER)');
  console.log('6. Exit');
  console.log('\n=========================================\n');
  
  const choice = await question('👉 Enter your choice (1-6): ');
  
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
        usedAt: null
      });
      console.log(`   ✅ ${i+1}. ${key}`);
    }
    
    saveKeysData(db);
    
    console.log('\n=========================================');
    console.log(`✅ ${count} Normal Keys Generated & Saved!`);
    console.log('=========================================\n');
    
    const filename = path.join(__dirname, '..', 'exports', `keys_normal_${Date.now()}.txt`);
    const exportDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
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
      usedAt: null
    });
    
    saveKeysData(db);
    
    console.log('\n=========================================');
    console.log('✅ Special Key Generated:');
    console.log('=========================================');
    console.log(`🔑 Key: ${specialKey}`);
    console.log(`👤 Assigned to: ${sanitizedUsername}`);
    console.log(`📅 Created: ${new Date().toLocaleString()}`);
    console.log('\n=========================================\n');
    
    const exportDir = path.join(__dirname, '..', 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }
    const filename = path.join(exportDir, `keys_special_${sanitizedUsername}_${Date.now()}.txt`);
    fs.writeFileSync(filename, `Key: ${specialKey}\nUser: ${sanitizedUsername}\nCreated: ${new Date().toISOString()}`);
    console.log(`📁 Saved to: ${filename}`);
    
  } else if (choice === '3') {
    showAllKeys();
  } else if (choice === '4') {
    await deleteKey();
  } else if (choice === '5') {
    await clearAllKeys();
  } else {
    console.log('\n👋 Goodbye!');
    rl.close();
    return;
  }
  
  console.log('\n');
  rl.close();
}

// Handle graceful exit
process.on('exit', () => {
  console.log('\n👋 Key Manager Closed');
});

main().catch(console.error);