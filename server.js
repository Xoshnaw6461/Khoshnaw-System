const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ========== MongoDB Connection ==========
// لینکەکەی خۆت لێرە دابنێ (پاسۆردەکەی خۆت لەبری <password> بنووسە)
const MONGODB_URI = 'mongodb+srv://khoshnaw:khoshnaw101@khoshnaw.09ne9pq.mongodb.net/?appName=khoshnaw';

// Connect to MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('✅ MongoDB Connected Successfully');
}).catch(err => {
  console.error('❌ MongoDB Connection Error:', err.message);
});

// ========== Models ==========

// User Schema (without username requirement for key-only login)
const userSchema = new mongoose.Schema({
  machineId: { type: String, unique: true, required: true },
  accountId: { type: String, required: true },
  usedKey: { type: String, required: true },
  repairKey: { type: String, required: true },
  recoveryCode: { type: String, required: true },
  discordId: String,
  discordUsername: String,
  tokens: [{
    token: String,
    userInfo: String,
    savedAt: { type: Date, default: Date.now },
    lastUsed: Date,
    usageCount: { type: Number, default: 0 }
  }],
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  isBanned: { type: Boolean, default: false },
  banReason: String,
  bannedAt: Date
});

// Key Schema
const keySchema = new mongoose.Schema({
  key: { type: String, unique: true, required: true },
  type: { type: String, default: 'normal' },
  used: { type: Boolean, default: false },
  usedBy: String,
  usedAt: Date,
  machineId: String,
  createdAt: { type: Date, default: Date.now }
});

// Activity Log Schema
const activitySchema = new mongoose.Schema({
  machineId: String,
  action: String,
  details: String,
  ip: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
const Key = mongoose.model('Key', keySchema);
const Activity = mongoose.model('Activity', activitySchema);

// ========== Helper Functions ==========
function generateAccountId() {
  return Math.floor(Math.random() * 9000) + 1000;
}

function generateRepairKey() {
  return crypto.randomBytes(12).toString('hex').toUpperCase();
}

function generateRecoveryCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 16; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Developer key for API access
const DEVELOPER_API_KEY = "KH0SHN4W-API-KEY-2026";
const DEVELOPER_LICENSE_KEY = "KH0SHN4W-D3V-K3Y-2026";

// ========== API Endpoints ==========

// 1. Verify License Key (No username required)
app.post('/api/verify-key', async (req, res) => {
  const { key, machineId } = req.body;
  
  try {
    // Check if machine is banned
    const bannedUser = await User.findOne({ machineId, isBanned: true });
    if (bannedUser) {
      return res.json({ 
        success: false, 
        error: `🚫 Your device has been banned. Reason: ${bannedUser.banReason || 'No reason'}. Contact support.` 
      });
    }
    
    // Developer key check
    if (key === DEVELOPER_LICENSE_KEY) {
      let user = await User.findOne({ machineId });
      
      if (!user) {
        user = new User({
          machineId,
          accountId: generateAccountId(),
          usedKey: key,
          repairKey: generateRepairKey(),
          recoveryCode: generateRecoveryCode(),
          lastSeen: new Date()
        });
        await user.save();
      } else {
        user.lastSeen = new Date();
        await user.save();
      }
      
      await Activity.create({ machineId, action: 'Developer Login', ip: req.ip });
      
      return res.json({ 
        success: true, 
        isDeveloper: true,
        message: '✅ Developer access granted!',
        accountId: user.accountId,
        repairKey: user.repairKey,
        recoveryCode: user.recoveryCode
      });
    }
    
    // Check key in database
    const foundKey = await Key.findOne({ key });
    
    if (!foundKey) {
      return res.json({ success: false, error: '❌ Invalid license key!' });
    }
    
    // Check if key is already used by another machine
    if (foundKey.used && foundKey.machineId !== machineId) {
      return res.json({ success: false, error: '⚠️ This key has already been used on another device!' });
    }
    
    // Find or create user
    let user = await User.findOne({ machineId });
    
    if (!user) {
      // Create new user
      user = new User({
        machineId,
        accountId: generateAccountId(),
        usedKey: key,
        repairKey: generateRepairKey(),
        recoveryCode: generateRecoveryCode(),
        lastSeen: new Date()
      });
      await user.save();
      
      // Mark key as used if not already
      if (!foundKey.used) {
        foundKey.used = true;
        foundKey.usedBy = machineId;
        foundKey.usedAt = new Date();
        foundKey.machineId = machineId;
        await foundKey.save();
      }
    } else {
      // Update existing user
      user.lastSeen = new Date();
      if (!user.usedKey) {
        user.usedKey = key;
        await user.save();
        
        // Mark key as used
        if (!foundKey.used) {
          foundKey.used = true;
          foundKey.usedBy = machineId;
          foundKey.usedAt = new Date();
          foundKey.machineId = machineId;
          await foundKey.save();
        }
      }
      await user.save();
    }
    
    // Log activity
    await Activity.create({ machineId, action: 'Login', ip: req.ip });
    
    res.json({ 
      success: true, 
      isDeveloper: false,
      message: '✅ Key activated successfully!',
      accountId: user.accountId,
      repairKey: user.repairKey,
      recoveryCode: user.recoveryCode
    });
    
  } catch (error) {
    console.error('Verify key error:', error);
    res.json({ success: false, error: error.message });
  }
});

// 2. Repair Key using repair code
app.post('/api/repair-key', async (req, res) => {
  const { repairCode, newKey, machineId } = req.body;
  
  try {
    // Find user by repair code
    const user = await User.findOne({ repairKey: repairCode });
    
    if (!user) {
      return res.json({ success: false, error: '❌ Invalid repair code!' });
    }
    
    let keyToUse = newKey;
    
    if (!keyToUse) {
      // Generate a new key
      const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
      keyToUse = `Khoshnaw-System-${randomPart}`;
    }
    
    // Check if the key is valid and unused
    const existingKey = await Key.findOne({ key: keyToUse });
    
    if (existingKey && existingKey.used && existingKey.machineId !== machineId) {
      return res.json({ success: false, error: '❌ This key is already used on another device!' });
    }
    
    // Mark old key as unused
    if (user.usedKey) {
      const oldKey = await Key.findOne({ key: user.usedKey });
      if (oldKey) {
        oldKey.used = false;
        oldKey.usedBy = null;
        oldKey.usedAt = null;
        oldKey.machineId = null;
        await oldKey.save();
      }
    }
    
    // Add or update new key
    if (existingKey) {
      existingKey.used = true;
      existingKey.usedBy = machineId;
      existingKey.usedAt = new Date();
      existingKey.machineId = machineId;
      await existingKey.save();
    } else {
      const newKeyDoc = new Key({
        key: keyToUse,
        type: 'normal',
        used: true,
        usedBy: machineId,
        usedAt: new Date(),
        machineId: machineId
      });
      await newKeyDoc.save();
    }
    
    // Update user
    const newRepairKey = generateRepairKey();
    user.usedKey = keyToUse;
    user.repairKey = newRepairKey;
    user.machineId = machineId;
    user.lastSeen = new Date();
    await user.save();
    
    await Activity.create({ machineId: user.machineId, action: 'Key Repaired', details: `New key: ${keyToUse}` });
    
    res.json({ 
      success: true, 
      message: '✅ Key repaired successfully!',
      newKey: keyToUse,
      newRepairKey: newRepairKey
    });
    
  } catch (error) {
    console.error('Repair key error:', error);
    res.json({ success: false, error: error.message });
  }
});

// 3. Get repair key for a machine
app.post('/api/get-repair-key', async (req, res) => {
  const { machineId } = req.body;
  
  try {
    const user = await User.findOne({ machineId });
    if (user) {
      res.json({ success: true, repairKey: user.repairKey });
    } else {
      res.json({ success: false, error: 'User not found' });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 4. Save Token
app.post('/api/save-token', async (req, res) => {
  const { machineId, token, userInfo } = req.body;
  
  try {
    const user = await User.findOne({ machineId });
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    if (!user.tokens) user.tokens = [];
    
    const exists = user.tokens.some(t => t.token === token);
    if (!exists) {
      user.tokens.push({
        token: token,
        userInfo: userInfo,
        savedAt: new Date()
      });
      await user.save();
    }
    
    await Activity.create({ machineId, action: 'Save Token', details: `Saved token for ${userInfo}` });
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 5. Get User Tokens
app.post('/api/get-tokens', async (req, res) => {
  const { machineId } = req.body;
  
  try {
    const user = await User.findOne({ machineId });
    if (!user) {
      return res.json({ success: true, tokens: [] });
    }
    res.json({ success: true, tokens: user.tokens || [] });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 6. Clear User Tokens
app.post('/api/clear-tokens', async (req, res) => {
  const { machineId } = req.body;
  
  try {
    const user = await User.findOne({ machineId });
    if (user) {
      user.tokens = [];
      await user.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 7. Get User Profile
app.post('/api/user-profile', async (req, res) => {
  const { machineId } = req.body;
  
  try {
    const user = await User.findOne({ machineId });
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    res.json({
      success: true,
      profile: {
        id: user.accountId,
        username: 'User',
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        createdAt: user.createdAt,
        tokensCount: user.tokens?.length || 0,
        lastSeen: user.lastSeen,
        repairKey: user.repairKey
      }
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 8. Update Discord User Info
app.post('/api/update-discord-user', async (req, res) => {
  const { machineId, discordId, discordUsername } = req.body;
  
  try {
    const user = await User.findOne({ machineId });
    if (user) {
      user.discordId = discordId;
      user.discordUsername = discordUsername;
      user.lastSeen = new Date();
      await user.save();
    }
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// ========== Developer Only Endpoints ==========

// 9. Get All Users (Developer only)
app.get('/api/all-users', async (req, res) => {
  const { devKey } = req.headers;
  
  if (devKey !== DEVELOPER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const users = await User.find({}).select('-tokens');
    res.json({ success: true, users });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 10. Get All Keys (Developer only)
app.get('/api/all-keys', async (req, res) => {
  const { devKey } = req.headers;
  
  if (devKey !== DEVELOPER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const keys = await Key.find({});
    res.json({ success: true, keys });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 11. Generate New Key (Developer only)
app.post('/api/generate-key', async (req, res) => {
  const { type, devKey } = req.body;
  
  if (devKey !== DEVELOPER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase();
    const newKey = `Khoshnaw-System-${randomPart}`;
    
    const key = new Key({
      key: newKey,
      type: type || 'normal'
    });
    await key.save();
    
    res.json({ success: true, key: newKey });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 12. Ban User (Developer only)
app.post('/api/ban-user', async (req, res) => {
  const { machineId, reason, devKey } = req.body;
  
  if (devKey !== DEVELOPER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const user = await User.findOne({ machineId });
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    user.isBanned = true;
    user.banReason = reason || 'No reason provided';
    user.bannedAt = new Date();
    await user.save();
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 13. Unban User (Developer only)
app.post('/api/unban-user', async (req, res) => {
  const { machineId, devKey } = req.body;
  
  if (devKey !== DEVELOPER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const user = await User.findOne({ machineId });
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    user.isBanned = false;
    user.banReason = null;
    user.bannedAt = null;
    await user.save();
    
    res.json({ success: true });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 14. Get User Details by Machine ID (Developer only)
app.post('/api/user-details', async (req, res) => {
  const { machineId, devKey } = req.body;
  
  if (devKey !== DEVELOPER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const user = await User.findOne({ machineId });
    if (!user) {
      return res.json({ success: false, error: 'User not found' });
    }
    
    const activities = await Activity.find({ machineId }).sort({ createdAt: -1 }).limit(50);
    
    res.json({
      success: true,
      user: {
        machineId: user.machineId,
        accountId: user.accountId,
        usedKey: user.usedKey,
        repairKey: user.repairKey,
        recoveryCode: user.recoveryCode,
        discordId: user.discordId,
        discordUsername: user.discordUsername,
        createdAt: user.createdAt,
        lastSeen: user.lastSeen,
        isBanned: user.isBanned,
        banReason: user.banReason,
        tokensCount: user.tokens?.length || 0,
        tokens: user.tokens || []
      },
      activities
    });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 15. Get Activity Logs (Developer only)
app.get('/api/activities', async (req, res) => {
  const { devKey } = req.headers;
  
  if (devKey !== DEVELOPER_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const activities = await Activity.find({}).sort({ createdAt: -1 }).limit(100);
    res.json({ success: true, activities });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

// 16. Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start Server
app.listen(PORT, () => {
  console.log('\n=========================================');
  console.log('🚀 KHOSHNAW SYSTEM API SERVER');
  console.log('=========================================');
  console.log(`📍 Server running on: http://localhost:${PORT}`);
  console.log(`🔑 Developer API Key: ${DEVELOPER_API_KEY}`);
  console.log(`👑 Developer License Key: ${DEVELOPER_LICENSE_KEY}`);
  console.log('=========================================\n');
});