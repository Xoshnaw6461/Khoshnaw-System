const fs = require('fs');
const readline = require('readline');
const path = require('path');
const axios = require('axios');
const { ipcRenderer } = require('electron');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const USERDATA_PATH = path.join(__dirname, '..', 'data', 'userdata.json');
const KEYS_PATH = path.join(__dirname, '..', 'data', 'data_keys.json');

function loadUserData() {
  try {
    if (!fs.existsSync(USERDATA_PATH)) {
      return { users: [] };
    }
    return JSON.parse(fs.readFileSync(USERDATA_PATH, 'utf8'));
  } catch (err) {
    return { users: [] };
  }
}

function saveUserData(data) {
  fs.writeFileSync(USERDATA_PATH, JSON.stringify(data, null, 2));
}

function loadKeys() {
  try {
    if (!fs.existsSync(KEYS_PATH)) {
      return { allKeys: [] };
    }
    return JSON.parse(fs.readFileSync(KEYS_PATH, 'utf8'));
  } catch (err) {
    return { allKeys: [] };
  }
}

function saveKeys(data) {
  fs.writeFileSync(KEYS_PATH, JSON.stringify(data, null, 2));
}

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n=========================================');
  console.log('🔧 KHOSHNAW SYSTEM - REPAIR KEY');
  console.log('=========================================\n');
  
  const username = await question('👤 Enter your username: ');
  if (!username) {
    console.log('❌ Username is required!');
    rl.close();
    return;
  }
  
  const repairKey = await question('🔑 Enter your repair key: ');
  if (!repairKey) {
    console.log('❌ Repair key is required!');
    rl.close();
    return;
  }
  
  const newKey = await question('🔐 Enter your new license key: ');
  if (!newKey) {
    console.log('❌ New license key is required!');
    rl.close();
    return;
  }
  
  const userData = loadUserData();
  const user = userData.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  
  if (!user) {
    console.log('❌ User not found!');
    rl.close();
    return;
  }
  
  if (user.repairKey !== repairKey) {
    console.log('❌ Invalid repair key!');
    rl.close();
    return;
  }
  
  const keysData = loadKeys();
  const existingKey = keysData.allKeys.find(k => k.key === newKey);
  
  if (existingKey && existingKey.used && existingKey.usedBy !== username) {
    console.log('❌ This key is already used by another user!');
    rl.close();
    return;
  }
  
  // Remove old key
  const oldKey = keysData.allKeys.find(k => k.key === user.usedKey);
  if (oldKey) {
    oldKey.used = false;
    oldKey.usedBy = null;
    oldKey.usedAt = null;
  }
  
  // Add new key
  if (!existingKey) {
    keysData.allKeys.push({
      key: newKey,
      type: "normal",
      createdAt: new Date().toISOString(),
      used: true,
      usedBy: username,
      usedAt: new Date().toISOString()
    });
  } else {
    existingKey.used = true;
    existingKey.usedBy = username;
    existingKey.usedAt = new Date().toISOString();
  }
  
  saveKeys(keysData);
  
  // Update user
  user.usedKey = newKey;
  saveUserData(userData);
  
  console.log('\n✅ Key repaired successfully!');
  console.log(`📌 Username: ${username}`);
  console.log(`🔑 New Key: ${newKey}`);
  console.log('\n⚠️ You can now login with your new key on any device!');
  
  rl.close();
}

main().catch(console.error);