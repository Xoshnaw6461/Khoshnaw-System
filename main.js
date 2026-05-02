const { app, BrowserWindow, ipcMain, shell, dialog } = require('electron');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const WebSocket = require('ws');
const { autoUpdater } = require('electron-updater');
const { execSync } = require('child_process');

let mainWindow;
let qrInterval = null;

// ========== ڕێڕەوەکان بۆ پرۆدەکشن ==========
const isDev = !app.isPackaged;
const baseAppPath = isDev ? __dirname : path.join(app.getPath('userData'), 'khoshnaw-system');
const dataDir = path.join(baseAppPath, 'data');
const profilePicturesPath = path.join(baseAppPath, 'profiles');

const userDataPath = path.join(dataDir, 'userdata.json');
const keysDbPath = path.join(dataDir, 'data_keys.json');
const sessionPath = path.join(baseAppPath, 'session.json');

// چاپکردنی ڕێڕەوەکان بۆ دێبەگ کردن
console.log('=========================================');
console.log('🔧 KHOSHNAW SYSTEM STARTING');
console.log('=========================================');
console.log('📁 Base App Path:', baseAppPath);
console.log('📁 Data Directory:', dataDir);
console.log('📁 User Data Path:', userDataPath);
console.log('📁 Keys DB Path:', keysDbPath);
console.log('📁 Session Path:', sessionPath);
console.log('📁 Profile Pictures Path:', profilePicturesPath);
console.log('=========================================');

// Ensure data directory exists
if (!fs.existsSync(baseAppPath)) {
  fs.mkdirSync(baseAppPath, { recursive: true });
  console.log('✅ Created base app directory');
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('✅ Created data directory');
}
if (!fs.existsSync(profilePicturesPath)) {
  fs.mkdirSync(profilePicturesPath, { recursive: true });
  console.log('✅ Created profiles directory');
}

// Developer key
const DEVELOPER_KEY = "KH0SHN4W-D3V-K3Y-2026";

// ========== Helper Functions ==========
function getMachineId() {
  try {
    if (process.platform === 'win32') {
      const output = execSync('wmic csproduct get uuid', { encoding: 'utf8', windowsHide: true });
      const lines = output.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 1) {
        const uuid = lines[1];
        if (uuid && uuid.length > 10 && !uuid.includes('FFFFFFFF')) {
          return crypto.createHash('sha256').update(uuid).digest('hex').substring(0, 16);
        }
      }
    }
  } catch (e) {}
  try {
    const hostname = os.hostname() || 'unknown';
    const username = os.userInfo().username || 'unknown';
    const combined = `${hostname}-${username}`;
    return crypto.createHash('sha256').update(combined).digest('hex').substring(0, 16);
  } catch (e) {
    return 'default-fallback-machine-id';
  }
}

function parseDiscordEmoji(emojiStr) {
  const match = emojiStr.match(/<a?:([^:]+):(\d+)>/);
  if (match) {
    return `${match[1]}:${match[2]}`;
  }
  return emojiStr;
}

// ========== Session Management ==========
function loadSession() {
  try {
    if (fs.existsSync(sessionPath)) {
      const data = fs.readFileSync(sessionPath, 'utf8');
      if (data && data.trim() !== '') {
        const session = JSON.parse(data);
        if (session && session.isUnlocked) {
          return session;
        }
      }
    }
  } catch(e) {
    console.error('Error loading session:', e.message);
  }
  return null;
}

function saveSession(session) {
  try {
    fs.writeFileSync(sessionPath, JSON.stringify(session, null, 2));
    console.log('💾 Session saved');
  } catch(e) {
    console.error('Error saving session:', e.message);
  }
}

function clearSession() {
  try {
    if (fs.existsSync(sessionPath)) fs.unlinkSync(sessionPath);
    console.log('🗑️ Session cleared');
  } catch(e) {}
}

// ========== User Data Management ==========
function loadUserData() {
  try {
    if (!fs.existsSync(userDataPath)) {
      const defaultData = { users: [] };
      fs.writeFileSync(userDataPath, JSON.stringify(defaultData, null, 2));
      console.log('✅ Created new user data file');
      return defaultData;
    }
    let data = JSON.parse(fs.readFileSync(userDataPath, 'utf8'));
    if (!data || !Array.isArray(data.users)) {
      data = data || {};
      data.users = [];
    }
    return data;
  } catch (err) {
    console.error('Error loading user data:', err);
    return { users: [] };
  }
}

function saveUserData(data) {
  fs.writeFileSync(userDataPath, JSON.stringify(data, null, 2));
  console.log('💾 User data saved');
}

function getUserByUsername(username) {
  const userData = loadUserData();
  return userData.users.find(u => u.username === username);
}

function getUserByMachineId(machineId) {
  const userData = loadUserData();
  return userData.users.find(u => u.machineId === machineId);
}

function getUserTokens(username) {
  const user = getUserByUsername(username);
  return user ? user.tokens || [] : [];
}

function addTokenToUser(username, token, userInfo) {
  const userData = loadUserData();
  const userIndex = userData.users.findIndex(u => u.username === username);
  
  if (userIndex !== -1) {
    if (!userData.users[userIndex].tokens) userData.users[userIndex].tokens = [];
    
    const exists = userData.users[userIndex].tokens.some(t => t.token === token);
    if (!exists) {
      userData.users[userIndex].tokens.unshift({
        token: token,
        user: userInfo,
        savedAt: new Date().toISOString()
      });
      saveUserData(userData);
      return true;
    }
  }
  return false;
}

function clearUserTokens(username) {
  const userData = loadUserData();
  const userIndex = userData.users.findIndex(u => u.username === username);
  if (userIndex !== -1) {
    userData.users[userIndex].tokens = [];
    saveUserData(userData);
    return true;
  }
  return false;
}

function updateUserProfile(username, updates) {
  const userData = loadUserData();
  const userIndex = userData.users.findIndex(u => u.username === username);
  if (userIndex !== -1) {
    Object.assign(userData.users[userIndex], updates);
    saveUserData(userData);
    return true;
  }
  return false;
}

// ========== Keys Management ==========
let cachedKeysData = null;

function loadKeys() {
  if (cachedKeysData) return cachedKeysData;
  try {
    if (!fs.existsSync(keysDbPath)) {
      const defaultData = { 
        allKeys: [
          {
            key: DEVELOPER_KEY,
            type: "developer",
            createdAt: new Date().toISOString(),
            used: false,
            usedBy: null,
            usedAt: null,
            machineId: null
          }
        ] 
      };
      fs.writeFileSync(keysDbPath, JSON.stringify(defaultData, null, 2));
      console.log('✅ Created new keys database with developer key');
      cachedKeysData = defaultData;
      return cachedKeysData;
    }
    const data = JSON.parse(fs.readFileSync(keysDbPath, 'utf8'));
    console.log('📚 Loaded keys from database, total:', data.allKeys.length);
    cachedKeysData = data;
    return cachedKeysData;
  } catch (err) {
    console.error('Error loading keys:', err);
    return { allKeys: [] };
  }
}

function saveKeys(data) {
  cachedKeysData = data;
  fs.promises.writeFile(keysDbPath, JSON.stringify(data, null, 2))
    .then(() => console.log('💾 Keys saved asynchronously to database, total:', data.allKeys.length))
    .catch(err => console.error('Error saving keys:', err));
}

// ========== Profile Picture Functions ==========
function saveProfilePicture(username, base64Data) {
  try {
    const isGif = base64Data.startsWith('data:image/gif');
    const ext = isGif ? 'gif' : 'png';
    const filename = `${username}_avatar.${ext}`;
    const filepath = path.join(profilePicturesPath, filename);
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filepath, base64Image, 'base64');
    return `data:image/${ext};base64,${base64Image}`;
  } catch (error) {
    console.error('Error saving profile picture:', error);
    return null;
  }
}

function saveProfileBanner(username, base64Data) {
  try {
    const isGif = base64Data.startsWith('data:image/gif');
    const ext = isGif ? 'gif' : 'png';
    const filename = `${username}_banner.${ext}`;
    const filepath = path.join(profilePicturesPath, filename);
    const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filepath, base64Image, 'base64');
    return `data:image/${ext};base64,${base64Image}`;
  } catch (error) {
    console.error('Error saving banner:', error);
    return null;
  }
}

// ========== API Functions ==========
async function getUserInfo(token) {
  try {
    const response = await axios.get('https://discord.com/api/v9/users/@me', {
      headers: { 'Authorization': token, 'User-Agent': 'Mozilla/5.0' }
    });
    return response.data;
  } catch(e) {
    return null;
  }
}

// ========== IPC HANDLERS ==========

// Session
ipcMain.handle('check-session', async () => {
  let session = loadSession();
  
  // گەر کێشەیەک لە خوێندنەوەی فایلەکە هەبوو بۆ ساتێک، با کەمێک چاوەڕێ بکات و دووبارە تاقی بکاتەوە
  if (!session) {
    await new Promise(r => setTimeout(r, 500));
    session = loadSession();
  }
  
  if (session && session.isUnlocked) {
    return { 
      isUnlocked: true, 
      isDeveloper: session.isDeveloper || false, 
      isPremium: session.isPremium || false,
      username: session.username,
      userId: session.userId
    };
  }
  
  // ===== سیستەمی بەهێزکراو بۆ گێڕانەوەی سێشن (Fallback Auto-Login) =====
  try {
    const machineId = getMachineId();
    const userData = loadUserData();
    // گەڕان بۆ بەکارهێنەرێک کە لەسەر ئەم ئامێرەیە و کلیلەکەی کارایە وە دەرنەچووە (Logout)ی نەکردووە
    const user = userData.users.find(u => u.machineId === machineId && u.usedKey && !u.isLoggedOut);
    
    if (user) {
      const db = loadKeys();
      const keyInfo = db.allKeys.find(k => k.key === user.usedKey);
      
      if (keyInfo || user.isDeveloper) {
        const isPremium = keyInfo ? (keyInfo.type === 'premium' || keyInfo.type === 'special') : false;
        
        const recoveredSession = {
          isUnlocked: true,
          isDeveloper: user.isDeveloper || false,
          isPremium: isPremium || user.isDeveloper || false,
          username: user.username,
          machineId: machineId,
          expiresAt: Date.now() + (3650 * 24 * 60 * 60 * 1000)
        };
        
        saveSession(recoveredSession);
        console.log('🔄 Session recovered from database!');
        
        return { 
          isUnlocked: true, 
          isDeveloper: recoveredSession.isDeveloper, 
          isPremium: recoveredSession.isPremium,
          username: recoveredSession.username,
          userId: user.accountId || '-'
        };
      }
    }
  } catch(e) {
    console.error('Session recovery failed:', e);
  }
  
  return { isUnlocked: false };
});

ipcMain.handle('logout', async () => {
  const session = loadSession();
  if (session && session.username) {
    updateUserProfile(session.username, { isLoggedOut: true });
  }
  clearSession();
  return { success: true };
});

// License
ipcMain.handle('verify-key-only', async (event, { key, username }) => {
  const session = loadSession();
  const machineId = getMachineId();
  const cleanUsername = username ? username.toLowerCase().trim() : '';
  
  console.log('=========================================');
  console.log('🔐 VERIFY KEY CALLED');
  console.log('📝 Key:', key);
  console.log('👤 Username:', cleanUsername);
  console.log('🖥️ Machine ID:', machineId);
  console.log('=========================================');
  
  if (!cleanUsername) {
    return { success: false, error: '❌ Username is required!' };
  }
  
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(cleanUsername)) {
    return { success: false, error: '❌ Username can only contain English letters, numbers, _ and -' };
  }
  
  if (session && session.isUnlocked && session.username === cleanUsername) {
    return { 
      success: true, 
      isDeveloper: session.isDeveloper || false, 
      username: session.username,
      userId: session.userId
    };
  }
  
  if (!key || key.trim() === '') {
    return { success: false, error: 'License key is required!' };
  }
  
  const db = loadKeys();
  
  // Developer key check
  if (key === DEVELOPER_KEY) {
    if (cleanUsername !== 'khoshnaw') {
      return { success: false, error: '❌ Developer key can only be used with username "khoshnaw"' };
    }
    
    let user = getUserByUsername('khoshnaw');
    if (!user) {
      const userData = loadUserData();
      userData.users.push({
        username: 'khoshnaw',
        machineId: machineId,
        usedKey: key,
        repairKey: crypto.randomBytes(12).toString('hex').toUpperCase(),
        tokens: [],
        createdAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        isDeveloper: true,
        avatar: null,
        banner: null
      });
      saveUserData(userData);
      console.log('✅ New developer user created');
    } else {
      if (user.machineId && user.machineId !== machineId) {
        return { success: false, error: '❌ This username is already registered on another device!' };
      }
      updateUserProfile('khoshnaw', {
        lastSeen: new Date().toISOString(),
        machineId: machineId,
        isDeveloper: true,
        isLoggedOut: false
      });
      console.log('✅ Existing developer user updated');
    }
    saveSession({
      isUnlocked: true,
      isDeveloper: true,
      isPremium: true,
      username: 'khoshnaw',
      machineId: machineId,
      expiresAt: Date.now() + (3650 * 24 * 60 * 60 * 1000)
    });
    
    return { 
      success: true, 
      isDeveloper: true, 
      message: 'Developer access granted!', 
      username: 'khoshnaw' 
    };
  }
  
  // Normal key check
  const foundKey = db.allKeys.find(k => k.key === key);
  
  if (!foundKey) {
    return { success: false, error: '❌ Invalid license key!' };
  }
  
  if (foundKey.used && foundKey.machineId && foundKey.machineId !== machineId) {
    return { success: false, error: '❌ This key is permanently locked to another device!' };
  }

  if (foundKey.used && foundKey.usedBy !== cleanUsername) {
    return { success: false, error: '⚠️ This key has already been used by another user!' };
  }
  
  const userWithSameName = getUserByUsername(cleanUsername);
  if (userWithSameName && userWithSameName.machineId !== machineId) {
    return { success: false, error: '❌ This username is already taken by another device!' };
  }
  
  const existingUser = getUserByMachineId(machineId);
  if (existingUser && existingUser.username !== cleanUsername) {
    return { success: false, error: '❌ This device is registered to another user!' };
  }
  
  let user = getUserByUsername(cleanUsername);
  
  const isPremium = foundKey.type === 'premium' || foundKey.type === 'special';
  
  if (!user) {
    const userData = loadUserData();
    userData.users.push({
      username: cleanUsername,
      machineId: machineId,
      usedKey: key,
      repairKey: crypto.randomBytes(12).toString('hex').toUpperCase(),
      tokens: [],
      createdAt: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      isDeveloper: false,
      isLoggedOut: false,
      avatar: null,
      banner: null
    });
    saveUserData(userData);
    console.log('✅ New user created:', cleanUsername);
    
    if (!foundKey.used) {
      foundKey.used = true;
      foundKey.usedBy = cleanUsername;
      foundKey.machineId = machineId;
      foundKey.usedAt = new Date().toISOString();
      saveKeys(db);
    }
  } else {
    updateUserProfile(cleanUsername, {
      lastSeen: new Date().toISOString(),
      machineId: machineId,
      usedKey: key,
      isLoggedOut: false
    });
    console.log('✅ Existing user updated:', cleanUsername);
  }
  
  saveSession({
    isUnlocked: true,
    isDeveloper: false,
    isPremium: isPremium,
    username: cleanUsername,
    machineId: machineId,
    expiresAt: Date.now() + (3650 * 24 * 60 * 60 * 1000)
  });
  
  return { success: true, isDeveloper: false, message: 'Key activated successfully!', username: cleanUsername };
});

// User Profile & Tokens
ipcMain.handle('get-user-profile', async () => {
  const session = loadSession();
  if (!session || !session.isUnlocked) return null;
  
  const user = getUserByUsername(session.username);
  
  if (user) {
    const accountId = Math.floor(Math.random() * 9000) + 1000;
    
    const db = loadKeys();
    const keyInfo = db.allKeys.find(k => k.key === user.usedKey);
    const isPremium = keyInfo ? (keyInfo.type === 'premium' || keyInfo.type === 'special') : false;
    
    return {
      username: user.username,
      machineId: user.machineId,
      usedKey: user.usedKey,
      repairKey: user.repairKey,
      tokensCount: user.tokens?.length || 0,
      createdAt: user.createdAt,
      lastSeen: user.lastSeen,
      isDeveloper: user.isDeveloper || false,
      isPremium: isPremium || user.isDeveloper || false,
      avatar: user.avatar,
      banner: user.banner,
      accountId: accountId
    };
  }
  return null;
});

ipcMain.handle('get-user-tokens', async () => {
  const session = loadSession();
  if (!session || !session.isUnlocked) return [];
  
  return getUserTokens(session.username);
});

ipcMain.handle('save-user-token', async (event, { token, userInfo }) => {
  const session = loadSession();
  if (!session || !session.isUnlocked) return { success: false };
  
  const success = addTokenToUser(session.username, token, userInfo);
  return { success };
});

ipcMain.handle('clear-user-tokens', async () => {
  const session = loadSession();
  if (!session || !session.isUnlocked) return { success: false };
  
  const success = clearUserTokens(session.username);
  return { success };
});

// Profile Picture & Banner
ipcMain.handle('save-profile-avatar', async (event, { imageData }) => {
  const session = loadSession();
  if (!session || !session.isUnlocked) return { success: false };
  
  const imagePath = saveProfilePicture(session.username, imageData);
  if (imagePath) {
    updateUserProfile(session.username, { avatar: imagePath });
    return { success: true, path: imagePath };
  }
  return { success: false };
});

ipcMain.handle('save-profile-banner', async (event, { imageData }) => {
  const session = loadSession();
  if (!session || !session.isUnlocked) return { success: false };
  
  const imagePath = saveProfileBanner(session.username, imageData);
  if (imagePath) {
    updateUserProfile(session.username, { banner: imagePath });
    return { success: true, path: imagePath };
  }
  return { success: false };
});

// ========== DISCORD LOGIN ==========
ipcMain.handle('login-with-axios', async (event, { email, password, totpCode, backupCode, ticket }) => {
  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Origin': 'https://discord.com',
      'Referer': 'https://discord.com/login'
    };
    
    let currentTicket = ticket;
    
    if (!currentTicket) {
      const loginData = {
        login: email,
        password: password,
        login_source: null,
        gift_code_sku_id: null
      };
      
      const response = await axios.post('https://discord.com/api/v9/auth/login', loginData, { headers, timeout: 15000 });
      
      if (response.data.token) {
        const userInfo = await getUserInfo(response.data.token);
        return { success: true, token: response.data.token, user: userInfo };
      }
      
      if (response.data.ticket) {
        currentTicket = response.data.ticket;
        if ((!totpCode || totpCode.trim() === '') && (!backupCode || backupCode.trim() === '')) {
          return { success: false, needMFA: true, ticket: currentTicket };
        }
      }
    }
    
    if (currentTicket) {
      if (backupCode && backupCode.trim() !== '') {
        try {
          const backupResponse = await axios.post('https://discord.com/api/v9/auth/mfa/backup', {
            code: backupCode.trim(),
            ticket: currentTicket,
            login_source: null,
            gift_code_sku_id: null
          }, { headers });
          
          if (backupResponse.data.token) {
            const userInfo = await getUserInfo(backupResponse.data.token);
            return { success: true, token: backupResponse.data.token, user: userInfo };
          }
        } catch (err) {
          return { success: false, error: 'Backup code error: ' + (err.response?.data?.message || err.message) };
        }
      }
      
      if (totpCode && totpCode.trim() !== '') {
        try {
          const totpResponse = await axios.post('https://discord.com/api/v9/auth/mfa/totp', {
            code: totpCode.trim(),
            ticket: currentTicket,
            login_source: null,
            gift_code_sku_id: null
          }, { headers });
          
          if (totpResponse.data.token) {
            const userInfo = await getUserInfo(totpResponse.data.token);
            return { success: true, token: totpResponse.data.token, user: userInfo };
          }
        } catch (err) {
          return { success: false, error: '2FA code error: ' + (err.response?.data?.message || err.message) };
        }
      }
      
      return { success: false, error: 'Invalid 2FA code!' };
    }
    
    return { success: false, error: 'Invalid email or password!' };
    
  } catch (error) {
    if (error.response?.data?.captcha_key) {
      return { success: false, error: 'Captcha required by Discord! Please use QR Code or direct Token.' };
    }
    if (error.response?.data?.message) {
      return { success: false, error: 'Login failed: ' + error.response.data.message };
    }
    if (error.response?.status === 400) {
      return { success: false, error: 'Wrong email or password!' };
    } else if (error.response?.status === 429) {
      return { success: false, error: 'Too many attempts! Please try again later.' };
    }
    return { success: false, error: 'Login failed: ' + (error.response?.data?.message || error.message) };
  }
});

// Token Check
ipcMain.handle('check-token', async (event, token) => {
  try {
    const response = await axios.get('https://discord.com/api/v9/users/@me', {
      headers: { 'Authorization': token, 'User-Agent': 'Mozilla/5.0' }
    });
    return { valid: true, user: response.data, message: `✅ Valid! User: ${response.data.username}` };
  } catch (error) {
    return { valid: false, message: '❌ Invalid token!' };
  }
});

ipcMain.handle('check-token-full', async (event, token) => {
  try {
    const userResponse = await axios.get('https://discord.com/api/v9/users/@me', {
      headers: { 'Authorization': token, 'User-Agent': 'Mozilla/5.0' }
    });
    
    const user = userResponse.data;
    const flags = user.public_flags || 0;
    const badges = [];
    if (flags & 1) badges.push('Discord Employee');
    if (flags & 2) badges.push('Discord Partner');
    if (flags & 4) badges.push('HypeSquad Events');
    if (flags & 64) badges.push('HypeSquad Bravery');
    if (flags & 128) badges.push('HypeSquad Brilliance');
    if (flags & 256) badges.push('HypeSquad Balance');
    if (flags & 512) badges.push('Early Supporter');
    if (flags & 131072) badges.push('Verified Bot Developer');
    
    let nitroType = 'None';
    try {
      const subResponse = await axios.get('https://discord.com/api/v9/users/@me/billing/subscriptions', {
        headers: { 'Authorization': token }
      });
      if (subResponse.data.length > 0) {
        const sub = subResponse.data[0];
        if (sub.plan_id === '511651880837840896') nitroType = 'Nitro Basic';
        else if (sub.plan_id === '521846918637420545') nitroType = 'Nitro Classic';
        else if (sub.plan_id === '521847234246082599') nitroType = 'Nitro Boost';
        else nitroType = 'Nitro Premium';
      }
    } catch(e) {}
    
    let avatarUrl = '';
    if (user.avatar) {
      avatarUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`;
    } else {
      const isPomelo = user.discriminator === '0';
      const defaultAvatarIndex = isPomelo ? Number((BigInt(user.id) >> 22n) % 6n) : parseInt(user.discriminator) % 5;
      avatarUrl = `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
    }
    
    const createdAt = new Date((user.id / 4194304) + 1420070400000);
    
    return {
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        discriminator: user.discriminator || '0',
        email: user.email || 'Not visible',
        nitroType: nitroType,
        badges: badges,
        createdAt: createdAt.toISOString(),
        avatarUrl: avatarUrl
      }
    };
  } catch (error) {
    if (error.response?.status === 401) {
      return { valid: false, message: '❌ Invalid or expired token!' };
    }
    return { valid: false, message: '❌ Error checking token!' };
  }
});

ipcMain.handle('get-user-info', async (event, token) => {
  return await getUserInfo(token);
});

// DM Deleter
ipcMain.handle('delete-messages', async (event, { token, channelId, limit }) => {
  try {
    let deleted = 0;
    const messages = await axios.get(`https://discord.com/api/v9/channels/${channelId}/messages?limit=${Math.min(limit, 100)}`, {
      headers: { 'Authorization': token }
    });
    
    for (const msg of messages.data) {
      try {
        await axios.delete(`https://discord.com/api/v9/channels/${channelId}/messages/${msg.id}`, {
          headers: { 'Authorization': token }
        });
        deleted++;
        await new Promise(r => setTimeout(r, 1000));
      } catch(e) {
        if (e.response && e.response.status === 429) {
          const retryAfter = (e.response.data.retry_after * 1000) || 5000;
          await new Promise(r => setTimeout(r, retryAfter));
        }
      }
    }
    
    return { success: true, deleted: deleted };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Guild Leaver
ipcMain.handle('leave-guild', async (event, { token, guildId }) => {
  try {
    await axios.delete(`https://discord.com/api/v9/users/@me/guilds/${guildId}`, {
      headers: { 'Authorization': token }
    });
    return { success: true, message: '✅ Left guild!' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Voice Functions
let activeVoiceWS = null;
let activeHeartbeat = null;

ipcMain.handle('voice-join', async (event, { token, guildId, channelId }) => {
  if (activeHeartbeat) {
    clearInterval(activeHeartbeat);
    activeHeartbeat = null;
  }
  if (activeVoiceWS && activeVoiceWS.readyState === WebSocket.OPEN) {
    activeVoiceWS.close();
    activeVoiceWS = null;
  }

  return new Promise((resolve) => {
    let resolved = false;
    
    const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');
    
    ws.on('open', () => {
      ws.send(JSON.stringify({
        op: 2,
        d: {
          token: token,
          properties: {
            os: "Windows",
            browser: "KhoshnawVoiceClient",
            device: "KhoshnawSystem"
          }
        }
      }));
    });
    
    ws.on('message', (data) => {
      const packet = JSON.parse(data);
      
      if (packet.op === 10) {
        const heartbeat = packet.d.heartbeat_interval;
        activeHeartbeat = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ op: 1, d: null }));
          }
        }, heartbeat);
      }
      
      if (packet.op === 0 && packet.t === 'READY' && !resolved) {
        ws.send(JSON.stringify({
          op: 4,
          d: {
            guild_id: guildId,
            channel_id: channelId,
            self_mute: false,
            self_deaf: false
          }
        }));
        
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            activeVoiceWS = ws;
            resolve({ success: true, message: '✅ Joined voice channel!' });
          }
        }, 2000);
      }
      
      if (packet.op === 0 && packet.t === 'VOICE_STATE_UPDATE') {
        if (packet.d.channel_id === channelId && !resolved) {
          resolved = true;
          activeVoiceWS = ws;
          resolve({ success: true, message: '✅ Joined voice channel!' });
        }
      }
    });
    
    ws.on('error', (err) => {
      if (!resolved) {
        resolved = true;
        resolve({ success: false, error: `WebSocket error: ${err.message}` });
      }
    });
    
    ws.on('close', () => {
      if (activeHeartbeat) clearInterval(activeHeartbeat);
    });
    
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (activeHeartbeat) clearInterval(activeHeartbeat);
        ws.close();
        resolve({ success: false, error: 'Connection timeout!' });
      }
    }, 15000);
  });
});

ipcMain.handle('voice-leave', async (event, { token, guildId }) => {
  try {
    if (activeVoiceWS && activeVoiceWS.readyState === WebSocket.OPEN) {
      activeVoiceWS.send(JSON.stringify({
        op: 4,
        d: {
          guild_id: guildId,
          channel_id: null,
          self_mute: false,
          self_deaf: false
        }
      }));
      
      setTimeout(() => {
        if (activeHeartbeat) clearInterval(activeHeartbeat);
        activeVoiceWS.close();
        activeVoiceWS = null;
        activeHeartbeat = null;
      }, 500);
    }
    
    await axios.patch(`https://discord.com/api/v9/guilds/${guildId}/voice-states/@me`, {
      channel_id: null,
      self_mute: false,
      self_deaf: false
    }, {
      headers: { 'Authorization': token }
    });
    
    return { success: true, message: '✅ Left voice channel!' };
  } catch (error) {
    return { success: true, message: 'Left voice channel!' };
  }
});

ipcMain.handle('get-voice-channels', async (event, { token, guildId }) => {
  try {
    const response = await axios.get(`https://discord.com/api/v9/guilds/${guildId}/channels`, {
      headers: { 'Authorization': token }
    });
    const voiceChannels = response.data.filter(c => c.type === 2);
    return { success: true, channels: voiceChannels };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

let bulkVoiceConnections = [];

ipcMain.handle('voice-join-bulk', async (event, { tokens, guildId, channelId }) => {
  // دادخستنی پەیوەندییە کۆنەکان بۆ ڕێگریکردن لە کێشەی میمۆری و دووبارەبوونەوە
  bulkVoiceConnections.forEach(conn => {
    if (conn.heartbeat) clearInterval(conn.heartbeat);
    if (conn.ws && conn.ws.readyState === WebSocket.OPEN) conn.ws.close();
    if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.send(JSON.stringify({
        op: 4,
        d: { guild_id: conn.guildId, channel_id: null, self_mute: false, self_deaf: false }
      }));
      setTimeout(() => { try { conn.ws.close(); } catch(e){} }, 500);
    }
  });
  bulkVoiceConnections = [];

  const results = [];
  for (const token of tokens) {
    try {
      const result = await new Promise((resolve) => {
        let resolved = false;
        let activeHeartbeat = null;
        const ws = new WebSocket('wss://gateway.discord.gg/?v=9&encoding=json');
        
        ws.on('open', () => {
          ws.send(JSON.stringify({
            op: 2,
            d: {
              token: token,
              properties: { os: "Windows", browser: "KhoshnawVoiceClient", device: "KhoshnawSystem" }
            }
          }));
        });
        
        ws.on('message', (data) => {
          const packet = JSON.parse(data);
          if (packet.op === 10) {
            activeHeartbeat = setInterval(() => {
              if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 1, d: null }));
            }, packet.d.heartbeat_interval);
          }
          if (packet.op === 0 && packet.t === 'READY' && !resolved) {
            ws.send(JSON.stringify({
              op: 4,
              d: { guild_id: guildId, channel_id: channelId, self_mute: false, self_deaf: false }
            }));
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                bulkVoiceConnections.push({ ws, heartbeat: activeHeartbeat });
                bulkVoiceConnections.push({ ws, heartbeat: activeHeartbeat, guildId, token });
                resolve({ success: true });
              }
            }, 2000);
          }
        });
        
        ws.on('error', (err) => {
          if (!resolved) {
            resolved = true;
            resolve({ success: false, error: err.message });
          }
        });
        
        ws.on('close', () => {
          if (activeHeartbeat) clearInterval(activeHeartbeat);
        });
        
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            if (activeHeartbeat) clearInterval(activeHeartbeat);
            ws.close();
            resolve({ success: false, error: 'Timeout' });
          }
        }, 15000);
      });
      results.push(result);
    } catch (error) {
      results.push({ success: false, error: error.message });
    }
    // کەمێک چاوەڕێ بکە پێش چوونەژوورەوەی تۆکنی داهاتوو بۆ ئەوەی ڕیت لیمیت (Rate Limit) نەکرێیت
    await new Promise(r => setTimeout(r, 1000));
  }
  return { results };
});

ipcMain.handle('voice-leave-bulk', async () => {
  let count = 0;
  bulkVoiceConnections.forEach(conn => {
    if (conn.heartbeat) clearInterval(conn.heartbeat);
    if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
      conn.ws.close();
      conn.ws.send(JSON.stringify({
        op: 4,
        d: { guild_id: conn.guildId, channel_id: null, self_mute: false, self_deaf: false }
      }));
      setTimeout(() => { try { conn.ws.close(); } catch(e){} }, 500);
      count++;
    }
    try {
      axios.patch(`https://discord.com/api/v9/guilds/${conn.guildId}/voice-states/@me`, {
        channel_id: null,
        self_mute: false,
        self_deaf: false
      }, {
        headers: { 'Authorization': conn.token }
      });
    } catch(e) {}
  });
  bulkVoiceConnections = [];
  return { success: true, count };
});

// Reactions
ipcMain.handle('add-reaction', async (event, { token, channelId, messageId, emoji }) => {
  try {
    const parsedEmoji = parseDiscordEmoji(emoji);
    const encodedEmoji = encodeURIComponent(parsedEmoji);
    await axios.put(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`, {}, {
      headers: { 'Authorization': token }
    });
    return { success: true, message: '✅ Reaction added!' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('remove-reaction', async (event, { token, channelId, messageId, emoji }) => {
  try {
    const parsedEmoji = parseDiscordEmoji(emoji);
    const encodedEmoji = encodeURIComponent(parsedEmoji);
    await axios.delete(`https://discord.com/api/v9/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`, {
      headers: { 'Authorization': token }
    });
    return { success: true, message: '✅ Reaction removed!' };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Auto Chat Send Message
ipcMain.handle('send-message', async (event, { token, channelId, content }) => {
  try {
    const response = await axios.post(`https://discord.com/api/v9/channels/${channelId}/messages`, {
      content: content
    }, {
      headers: { 'Authorization': token, 'Content-Type': 'application/json' }
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
});

// Discord Generic API POST (For Quests & Others)
ipcMain.handle('discord-api-post', async (event, { token, url, body }) => {
  try {
    const response = await axios.post(`https://discord.com/api/v9${url}`, body || {}, {
      headers: { 'Authorization': token, 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' }
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message, status: error.response?.status };
  }
});

ipcMain.handle('discord-api-get', async (event, { token, url }) => {
  try {
    const response = await axios.get(`https://discord.com/api/v9${url}`, {
      headers: { 'Authorization': token, 'User-Agent': 'Mozilla/5.0' }
    });
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { success: false, error: error.response?.data?.message || error.message, status: error.response?.status };
  }
});

// Join Server
ipcMain.handle('join-server', async (event, { token, inviteCode }) => {
  try {
    const response = await axios.post(`https://discord.com/api/v9/invites/${inviteCode}`, {}, {
      headers: { 'Authorization': token, 'Content-Type': 'application/json' }
    });
    return { success: true, message: `✅ Joined ${response.data.guild.name}` };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// QR Code Login
let qrWs = null;
let qrHeartbeat = null;

ipcMain.handle('start-qr-login', async (event) => {
  return new Promise((resolve) => {
    try {
      if (qrWs) {
        qrWs.close();
        if (qrHeartbeat) clearInterval(qrHeartbeat);
      }

      const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: { type: 'spki', format: 'der' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
      });

      const encoded_public_key = publicKey.toString('base64');
      qrWs = new WebSocket('wss://remote-auth-gateway.discord.gg/?v=2', {
        origin: 'https://discord.com',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
        }
      });

      let resolved = false;
      
      const fallbackTimeout = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve({ success: false, error: 'Connection timeout! Discord did not respond.' });
        }
      }, 10000);

      qrWs.on('message', (data) => {
        const packet = JSON.parse(data);
        
        if (packet.op === 'hello') {
          qrHeartbeat = setInterval(() => {
            if (qrWs && qrWs.readyState === WebSocket.OPEN) {
              qrWs.send(JSON.stringify({ op: 'heartbeat' }));
            }
          }, packet.heartbeat_interval);

          qrWs.send(JSON.stringify({
            op: 'init',
            encoded_public_key: encoded_public_key
          }));
        }
        
        if (packet.op === 'nonce') {
          const nonce = packet.nonce;
          const qrUrl = `https://discord.com/ra/${nonce}`;
          if (!resolved) {
            resolved = true;
            clearTimeout(fallbackTimeout);
            resolve({ success: true, qrUrl: qrUrl });
          }
        }
        
        if (packet.op === 'pending_remote_init') {
          if (mainWindow) {
            mainWindow.webContents.send('qr-status-update', 'scanned');
          }
        }
        
        if (packet.op === 'finish') {
          try {
            const decryptedToken = crypto.privateDecrypt({
              key: privateKey,
              padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
              oaepHash: 'sha256'
            }, Buffer.from(packet.encrypted_token, 'base64')).toString();
            
            if (mainWindow) {
              mainWindow.webContents.send('qr-login-success', decryptedToken);
            }
            qrWs.close();
          } catch(e) {
            console.error('QR Decrypt error', e);
          }
        }
      });
      
      qrWs.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(fallbackTimeout);
          resolve({ success: false, error: err.message });
        }
      });
      
      qrWs.on('unexpected-response', (req, res) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(fallbackTimeout);
          resolve({ success: false, error: `Unexpected server response: ${res.statusCode}` });
        }
      });

      qrWs.on('close', () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(fallbackTimeout);
          resolve({ success: false, error: 'Connection closed unexpectedly!' });
        }
        if (qrHeartbeat) clearInterval(qrHeartbeat);
      });

    } catch (err) {
      resolve({ success: false, error: err.message });
    }
  });
});

ipcMain.handle('stop-qr-login', async () => {
  if (qrWs) {
    qrWs.close();
    qrWs = null;
  }
  if (qrHeartbeat) {
    clearInterval(qrHeartbeat);
    qrHeartbeat = null;
  }
  return { success: true };
});

// ========== DEVELOPER IPC HANDLERS ==========

ipcMain.handle('get-all-keys', async () => {
  const db = loadKeys();
  return db;
});

ipcMain.handle('get-all-users', async () => {
  const userData = loadUserData();
  const db = loadKeys();
  
  return userData.users.map(u => {
    const userObj = { ...u };
    if (userObj.usedKey) {
      const keyInfo = db.allKeys.find(k => k.key === userObj.usedKey);
      userObj.keyType = keyInfo ? keyInfo.type : 'normal';
    }
    return userObj;
  });
});

ipcMain.handle('generate-new-key', async (event, { type }) => {
  try {
    console.log('🔑 Generate new key called with type:', type);
    
    const db = loadKeys();
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const newKey = `KHOSHNAW-${type.toUpperCase()}-${randomPart}-${timestamp.slice(-4)}`;
    
    console.log('📝 Generated new key:', newKey);
    
    db.allKeys.push({
      key: newKey,
      type: type || 'normal',
      createdAt: new Date().toISOString(),
      used: false,
      usedBy: null,
      usedAt: null,
      machineId: null
    });
    
    saveKeys(db);
    console.log('✅ Key saved, total keys now:', db.allKeys.length);
    
    return { success: true, key: newKey };
  } catch (error) {
    console.error('❌ Error generating key:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-key', async (event, key) => {
  const db = loadKeys();
  const keyIndex = db.allKeys.findIndex(k => k.key === key);
  
  if (keyIndex !== -1 && !db.allKeys[keyIndex].used) {
    db.allKeys.splice(keyIndex, 1);
    saveKeys(db);
    return { success: true };
  }
  return { success: false, error: 'Key not found or already used!' };
});

ipcMain.handle('repair-user-key-by-admin', async (event, { username, newKey }) => {
  const userData = loadUserData();
  const user = userData.users.find(u => u.username === username);
  
  if (!user) {
    return { success: false, error: 'User not found!' };
  }
  
  let keyToUse = newKey;
  if (!keyToUse) {
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    keyToUse = `KHOSHNAW-REPAIR-${randomPart}-${timestamp.slice(-4)}`;
  }
  
  const db = loadKeys();
  
  if (user.usedKey) {
    const oldKey = db.allKeys.find(k => k.key === user.usedKey);
    if (oldKey) {
      oldKey.used = false;
      oldKey.usedBy = null;
      oldKey.machineId = null;
    }
  }
  
  const existingKey = db.allKeys.find(k => k.key === keyToUse);
  if (existingKey) {
    existingKey.used = true;
    existingKey.usedBy = username;
    existingKey.usedAt = new Date().toISOString();
    existingKey.machineId = user.machineId;
  } else {
    db.allKeys.push({
      key: keyToUse,
      type: 'repaired',
      createdAt: new Date().toISOString(),
      used: true,
      usedBy: username,
      usedAt: new Date().toISOString(),
      machineId: user.machineId
    });
  }
  
  saveKeys(db);
  
  user.usedKey = keyToUse;
  user.repairKey = crypto.randomBytes(12).toString('hex').toUpperCase();
  saveUserData(userData);
  
  return { success: true, message: 'Key repaired successfully!', newKey: keyToUse };
});

ipcMain.handle('reset-user-key-by-admin', async (event, { username }) => {
  const userData = loadUserData();
  const user = userData.users.find(u => u.username === username);
  
  if (!user) {
    return { success: false, error: 'User not found!' };
  }
  
  const db = loadKeys();
  
  if (user.usedKey) {
    const oldKey = db.allKeys.find(k => k.key === user.usedKey);
    if (oldKey) {
      oldKey.used = false;
      oldKey.usedBy = null;
      oldKey.machineId = null;
    }
  }
  
  user.usedKey = null;
  user.repairKey = crypto.randomBytes(12).toString('hex').toUpperCase();
  saveUserData(userData);
  saveKeys(db);
  
  return { success: true, message: 'User key reset successfully!' };
});

// ========== Create Window ==========
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    resizable: true,
    backgroundColor: '#0e0e12',
    title: 'Khoshnaw System',
    show: false
  });
  
  mainWindow.loadFile('index.html');
  mainWindow.setMenuBarVisibility(false);
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // پشکنینی خۆکارانە بۆ ئەپدەیت لە کاتی کردنەوەی بەرنامەکە
    if (!isDev) {
      try {
        autoUpdater.checkForUpdatesAndNotify();
      } catch (err) {
        console.error('Auto-updater error:', err.message);
      }
    }
  });
  
  // ئیڤێنتەکانی ئەپدەیت بۆ دڵنیابوونەوە لە کارکردنی
  autoUpdater.on('update-available', () => {
    console.log('🔄 Update available! Downloading in background...');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'ئەپدەیتی نوێ / New Update',
      message: 'ئەپدەیتێکی نوێ هەیە! ئێستا لە پشتی پەردەوە (Background) داونلۆد دەبێت، تکایە بەرنامەکە دامەخە و چاوەڕێ بکە.'
    });
  });
  
  autoUpdater.on('update-downloaded', () => {
    console.log('✅ Update downloaded! It will be installed on restart.');
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'ئەپدەیتەکە ئامادەیە / Update Ready',
      message: 'ئەپدەیتەکە بە سەرکەوتوویی داونلۆد بوو، ئێستا بەرنامەکە خۆکارانە ڕیستارت دەبێت بۆ ئەوەی ڤێرژنە نوێیەکە جێگیر بکات.',
      buttons: ['باشە / OK']
    }).then(() => {
      autoUpdater.quitAndInstall();
    });
  });
  
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('=========================================');
    console.log('✅ KHOSHNAW SYSTEM STARTED SUCCESSFULLY');
    console.log('=========================================');
    console.log('👑 Developer Key:', DEVELOPER_KEY);
    console.log('📁 Data Path:', baseAppPath);
    console.log('=========================================');
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});