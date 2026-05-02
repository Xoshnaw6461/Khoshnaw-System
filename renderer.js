const { ipcRenderer, shell } = window.electron;

// ========== گۆڕاوە سەرەکییەکان ==========
let savedTokens = [];
let lastFetchedToken = null;
let lastUserInfo = null;
let currentUsername = null;
let tokenSearchQuery = '';
let qrCheckInterval = null;
let currentQrCode = null;
let isDeveloper = false;
let isPremium = false;
let currentAuthTicket = null;

// ========== زمان ==========
let currentLang = 'en';

// ========== وەرگێڕانەکان ==========
const translations = {
  en: {
    appTitle: "Khoshnaw System",
    logout: "Logout",
    unlockMessage: "Enter your username and license key",
    usernamePlaceholder: "Username (English only, lowercase)",
    licensePlaceholder: "License Key",
    unlockBtn: "Unlock System",
    supportLink: "Need help? Join Support Server",
    tabProfile: "Profile",
    tabTokens: "Tokens",
    tabCheck: "Check Token",
    tabDm: "DM Deleter",
    tabGuild: "Guild Leaver",
    tabVoice: "Voice",
    tabReact: "React",
    tabSupport: "Support",
    getTokenTitle: "Get Discord Token",
    qrLogin: "QR Code Login",
    checkToken: "Check Token",
    emailPasswordTitle: "Email & Password Login",
    emailPlaceholder: "Email Address",
    passwordPlaceholder: "Password",
    totpPlaceholder: "2FA Code (6 digits)",
    backupPlaceholder: "Backup Code",
    getToken: "Get Token",
    pasteTokenTitle: "Or Paste Token Directly",
    pastePlaceholder: "Paste your token here...",
    useToken: "Use Token",
    savedTokensTitle: "Saved Tokens",
    saveToken: "Save Current Token",
    bulkImport: "Bulk Import",
    exportAll: "Export All",
    eraseAll: "Erase All",
    noTokens: "No tokens saved yet.",
    checkTokenTitle: "Token Information",
    enterToken: "Enter Token",
    checkTokenFull: "Check Token",
    saveThisToken: "Save This Token",
    dmDeleterTitle: "DM Message Deleter",
    dmWarning: "Warning: Delete max 100 messages every 5 minutes",
    selectToken: "Select Token",
    channelId: "Channel ID",
    messagesToDelete: "Messages to Delete",
    startDeleting: "Start Deleting",
    guildLeaverTitle: "Leave Guild",
    guildId: "Guild ID",
    leaveGuild: "Leave Guild",
    voiceTitle: "Voice Channel",
    tabAutoChat: "Auto Chat",
    autoChatTitle: "Auto Chat",
    startAutoChat: "Start Auto Chat",
    stopAutoChat: "Stop Auto Chat",
    tabQuest: "Quests",
    questTitle: "Quest Completer",
    questDesc: "Complete Discord quests easily by pasting a script into the Discord Desktop App.",
    questInstTitle: "📜 Instructions:",
    questInst1: "Open the Discord Desktop App on your computer.",
    questInst2: "Press <b>Ctrl + Shift + I</b> together to open the Inspector.",
    questInst3: "Go to the <b>Console</b> tab.",
    questInst4: "Type <code style=\"background: #2b2d31; padding: 2px 6px; border-radius: 4px; color: #ff73fa;\">allow pasting</code> at the bottom and press Enter.",
    questInst5: "Click the Copy Script button below, paste the code into the Console, and press Enter.",
    copyQuestScript: "📋 Copy Script",
    scriptCopied: "✅ Copied!",
    guildIdVoice: "Guild ID",
    loadChannels: "Load Voice Channels",
    voiceChannelId: "Voice Channel ID",
    joinVoice: "Join Voice",
    leaveVoice: "Leave Voice",
    bulkVoiceTitle: "Bulk Voice Joiner",
    bulkVoiceLeaveBtn: "Leave All Voice",
    reactTitle: "React to Message",
    messageId: "Message ID",
    emoji: "Emoji",
    addReaction: "Add Reaction",
    removeReaction: "Remove Reaction",
    supportTitle: "About Developer",
    joinSupport: "Join Support Server",
    tokenSaved: "Token saved!",
    tokenRemoved: "Token removed",
    allTokensErased: "All tokens erased",
    tokensExported: "Tokens exported!",
    tokensImported: "Tokens imported!",
    check: "Check",
    removeToken: "Remove",
    invalidToken: "Invalid token!",
    tokenValid: "Token is valid!",
    leftGuild: "Left guild!",
    joinedVoice: "Joined voice channel!",
    leftVoice: "Left voice channel!",
    reactionAdded: "Reaction added!",
    reactionRemoved: "Reaction removed!",
    selectTokenFirst: "Please select a token first!",
    fillAllFields: "Please fill all fields!",
    ready: "Ready",
    loading: "Loading...",
    success: "Success",
    error: "Error",
    warning: "Warning",
    close: "Close",
    scanQR: "Scan QR Code",
    keyActivated: "Key activated!",
    invalidKey: "Invalid key!",
    profileUsername: "User",
    userIdLabel: "Account ID",
    memberSinceLabel: "Member Since",
    tokensLabel: "Tokens",
    editAvatar: "📷",
    editBanner: "📷"
  },
  ckb: {
    appTitle: "سیستەمی خۆشناو",
    logout: "دەرچوون",
    unlockMessage: "ناوی بەکارهێنەر و کلیلی مۆڵەت داخل بکە",
    usernamePlaceholder: "ناوی بەکارهێنەر (تەنها ئینگلیزی، بچووک)",
    licensePlaceholder: "کلیلی مۆڵەت",
    unlockBtn: "کردنەوەی سیستەم",
    supportLink: "پێویستت بە یارمەتییە؟",
    tabProfile: "پرۆفایل",
    tabTokens: "تۆکنەکان",
    tabCheck: "پشکنینی تۆکن",
    tabDm: "سڕینەوەی نامە",
    tabGuild: "جێهێشتنی سێرڤەر",
    tabVoice: "دەنگ",
    tabReact: "کاردانەوە",
    tabSupport: "پشتیوانی",
    getTokenTitle: "وەرگرتنی تۆکن",
    qrLogin: "چوونە ژوورەوە بە QR",
    checkToken: "پشکنینی تۆکن",
    emailPasswordTitle: "چوونە ژوورەوە بە ئیمەیڵ",
    emailPlaceholder: "ئیمەیڵ",
    passwordPlaceholder: "پاسۆرد",
    totpPlaceholder: "کۆدی 2FA",
    backupPlaceholder: "کۆدی پشتیوانی",
    getToken: "وەرگرتنی تۆکن",
    pasteTokenTitle: "یان تۆکنەکە بلکێنە",
    pastePlaceholder: "تۆکنەکەت لێرە بلکێنە",
    useToken: "بەکارهێنانی تۆکن",
    savedTokensTitle: "تۆکنە پاشەکەوتکراوەکان",
    saveToken: "پاشەکەوتکردن",
    bulkImport: "هاوردەکردن",
    exportAll: "هەناردەکردن",
    eraseAll: "سڕینەوەی هەموو",
    noTokens: "هیچ تۆکنێک نییە",
    checkTokenTitle: "زانیاری تۆکن",
    enterToken: "تۆکن داخل بکە",
    checkTokenFull: "پشکنینی تۆکن",
    saveThisToken: "پاشەکەوتکردن",
    dmDeleterTitle: "سڕینەوەی نامەکان",
    dmWarning: "ئاگاداری: زۆرترین 100 نامە بسڕەوە",
    selectToken: "تۆکن هەڵبژێرە",
    channelId: "ناسنامەی کەناڵ",
    messagesToDelete: "ژمارەی نامەکان",
    startDeleting: "دەستپێکردن",
    guildLeaverTitle: "جێهێشتنی سێرڤەر",
    guildId: "ناسنامەی سێرڤەر",
    leaveGuild: "جێهێشتن",
    voiceTitle: "کەناڵی دەنگ",
    tabAutoChat: "ئەوتۆ چات",
    autoChatTitle: "ئەوتۆ چات",
    startAutoChat: "دەستپێکردنی چات",
    stopAutoChat: "وەستاندنی چات",
    tabQuest: "تەواوکردنی کوێست",
    questTitle: "تەواوکردنی کوێست",
    questDesc: "بە ئاسانی کوێستەکانی دیسکۆرد تەواو بکە بە پەیست کردنی کۆدێک لەناو دیسکۆرد.",
    questInstTitle: "📜 ڕێنماییەکان:",
    questInst1: "دیسکۆردی سەر کۆمپیوتەرەکەت (Discord Desktop) بکەرەوە.",
    questInst2: "دوگمەکانی <b>Ctrl + Shift + I</b> دابگرە بەیەکەوە بۆ کردنەوەی ئینسپێکت (Inspector).",
    questInst3: "بڕۆ بۆ بەشی <b>Console</b>.",
    questInst4: "لە خوارەوە بنووسە <code style=\"background: #2b2d31; padding: 2px 6px; border-radius: 4px; color: #ff73fa;\">allow pasting</code> و ئینتەر (Enter) دابگرە.",
    questInst5: "دوگمەی کۆپیکردنی خوارەوە دابگرە و کۆدەکە لە کۆنسۆڵەکە پەیست (Paste) بکە و ئینتەر دابگرە.",
    copyQuestScript: "📋 کۆپیکردنی کۆد",
    scriptCopied: "✅ کۆپیکرا!",
    guildIdVoice: "ناسنامەی سێرڤەر",
    loadChannels: "بارکردن",
    voiceChannelId: "ناسنامەی کەناڵ",
    joinVoice: "چوونە ژوورەوە",
    leaveVoice: "دەرچوون",
    bulkVoiceTitle: "چوونە ژوورەوەی کۆمەڵ",
    bulkVoiceLeaveBtn: "دەرچوونی هەمووان",
    reactTitle: "کاردانەوە",
    messageId: "ناسنامەی نامە",
    emoji: "ئیمۆجی",
    addReaction: "زیادکردن",
    removeReaction: "لابردن",
    supportTitle: "دەربارەی دروستکەر",
    joinSupport: "چوونە ناو سێرڤەر",
    tokenSaved: "تۆکنەکە پاشەکەوت کرا!",
    tokenRemoved: "تۆکنەکە سڕایەوە",
    allTokensErased: "هەموو تۆکنەکان سڕایەوە",
    tokensExported: "تۆکنەکان هەناردە کرا!",
    tokensImported: "تۆکنەکان هاوردە کرا!",
    check: "پشکنین",
    removeToken: "سڕینەوە",
    invalidToken: "تۆکنەکە نادروستە!",
    tokenValid: "تۆکنەکە دروستە!",
    leftGuild: "سێرڤەرەکەت جێهێشت!",
    joinedVoice: "چوویتە ناو کەناڵی دەنگ!",
    leftVoice: "لە کەناڵی دەنگ دەرچووت!",
    reactionAdded: "کاردانەوە زیاد کرا!",
    reactionRemoved: "کاردانەوە لابرا!",
    selectTokenFirst: "تکایە یەکەمجار تۆکنێک هەڵبژێرە!",
    fillAllFields: "تکایە هەموو خانەکان پڕ بکەرەوە!",
    ready: "ئامادەیە",
    loading: "بارکردن...",
    success: "سەرکەوتوو",
    error: "هەڵە",
    warning: "ئاگاداری",
    close: "داخستن",
    scanQR: "سکان کردنی QR کۆد",
    keyActivated: "کلیلی مۆڵەت چالاک کرا!",
    invalidKey: "کلیلی مۆڵەت نادروستە!",
    profileUsername: "بەکارهێنەر",
    userIdLabel: "ناسنامە",
    memberSinceLabel: "ئەندام لە",
    tokensLabel: "تۆکنەکان",
    editAvatar: "📷",
    editBanner: "📷"
  },
  ar: {
    appTitle: "نظام خوشناو",
    logout: "تسجيل الخروج",
    unlockMessage: "أدخل اسم المستخدم ومفتاح الترخيص",
    usernamePlaceholder: "اسم المستخدم (إنجليزي فقط، صغير)",
    licensePlaceholder: "مفتاح الترخيص",
    unlockBtn: "فتح النظام",
    supportLink: "بحاجة إلى مساعدة؟",
    tabProfile: "الملف الشخصي",
    tabTokens: "الرموز",
    tabCheck: "فحص الرمز",
    tabDm: "حذف الرسائل",
    tabGuild: "مغادرة السيرفر",
    tabVoice: "الصوت",
    tabReact: "التفاعل",
    tabSupport: "الدعم",
    getTokenTitle: "الحصول على رمز",
    qrLogin: "دخول QR",
    checkToken: "فحص الرمز",
    emailPasswordTitle: "دخول بالبريد",
    emailPlaceholder: "البريد الإلكتروني",
    passwordPlaceholder: "كلمة المرور",
    totpPlaceholder: "رمز 2FA",
    backupPlaceholder: "رمز النسخ",
    getToken: "الحصول على الرمز",
    pasteTokenTitle: "أو الصق الرمز",
    pastePlaceholder: "الصق الرمز هنا",
    useToken: "استخدام الرمز",
    savedTokensTitle: "الرموز المحفوظة",
    saveToken: "حفظ الرمز",
    bulkImport: "استيراد متعدد",
    exportAll: "تصدير الكل",
    eraseAll: "مسح الكل",
    noTokens: "لا توجد رموز محفوظة",
    checkTokenTitle: "معلومات الرمز",
    enterToken: "أدخل الرمز",
    checkTokenFull: "فحص الرمز",
    saveThisToken: "حفظ هذا الرمز",
    dmDeleterTitle: "حذف الرسائل",
    dmWarning: "تحذير: احذف 100 رسالة كحد أقصى",
    selectToken: "اختر رمزاً",
    channelId: "معرف القناة",
    messagesToDelete: "عدد الرسائل",
    startDeleting: "بدء الحذف",
    guildLeaverTitle: "مغادرة السيرفر",
    guildId: "معرف السيرفر",
    leaveGuild: "مغادرة",
    voiceTitle: "قناة الصوت",
    tabAutoChat: "محادثة تلقائية",
    autoChatTitle: "محادثة تلقائية",
    startAutoChat: "بدء المحادثة",
    stopAutoChat: "إيقاف المحادثة",
    tabQuest: "إكمال المهام",
    questTitle: "إكمال المهام (Quests)",
    questDesc: "أكمل مهام ديسكورد بسهولة عن طريق لصق كود في تطبيق ديسكورد للكمبيوتر.",
    questInstTitle: "📜 التعليمات:",
    questInst1: "افتح تطبيق ديسكورد للكمبيوتر (Discord Desktop).",
    questInst2: "اضغط على <b>Ctrl + Shift + I</b> معاً لفتح نافذة الفحص (Inspector).",
    questInst3: "اذهب إلى علامة التبويب <b>Console</b>.",
    questInst4: "اكتب <code style=\"background: #2b2d31; padding: 2px 6px; border-radius: 4px; color: #ff73fa;\">allow pasting</code> في الأسفل واضغط إنتر (Enter).",
    questInst5: "اضغط على زر نسخ الكود بالأسفل، والصقه في الـ Console ثم اضغط إنتر.",
    copyQuestScript: "📋 نسخ الكود",
    scriptCopied: "✅ تم النسخ!",
    guildIdVoice: "معرف السيرفر",
    loadChannels: "تحميل القنوات",
    voiceChannelId: "معرف قناة الصوت",
    joinVoice: "انضمام",
    leaveVoice: "مغادرة",
    bulkVoiceTitle: "انضمام متعدد",
    bulkVoiceLeaveBtn: "مغادرة الكل",
    reactTitle: "تفاعل مع الرسالة",
    messageId: "معرف الرسالة",
    emoji: "إيموجي",
    addReaction: "إضافة",
    removeReaction: "إزالة",
    supportTitle: "عن المطور",
    joinSupport: "انضم للسيرفر",
    tokenSaved: "تم حفظ الرمز!",
    tokenRemoved: "تم حذف الرمز",
    allTokensErased: "تم مسح جميع الرموز",
    tokensExported: "تم تصدير الرموز!",
    tokensImported: "تم استيراد الرموز!",
    check: "فحص",
    removeToken: "إزالة",
    invalidToken: "رمز غير صالح!",
    tokenValid: "الرمز صالح!",
    leftGuild: "تم مغادرة السيرفر!",
    joinedVoice: "تم الانضمام للقناة!",
    leftVoice: "تم مغادرة القناة!",
    reactionAdded: "تم إضافة التفاعل!",
    reactionRemoved: "تم إزالة التفاعل!",
    selectTokenFirst: "الرجاء اختيار رمز أولاً!",
    fillAllFields: "الرجاء ملء جميع الحقول!",
    ready: "جاهز",
    loading: "جاري التحميل...",
    success: "نجاح",
    error: "خطأ",
    warning: "تحذير",
    close: "إغلاق",
    scanQR: "امسح رمز QR",
    keyActivated: "تم تفعيل المفتاح!",
    invalidKey: "مفتاح غير صالح!",
    profileUsername: "المستخدم",
    userIdLabel: "معرف الحساب",
    memberSinceLabel: "عضو منذ",
    tokensLabel: "الرموز",
    editAvatar: "📷",
    editBanner: "📷"
  }
};

function t(key) {
  return translations[currentLang][key] || translations.en[key] || key;
}

function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, function(m) {
    if (m === '&') return '&amp;';
    if (m === '<') return '&lt;';
    if (m === '>') return '&gt;';
    return m;
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return `${date.getMonth() + 1}/${date.getFullYear()}`;
}

// ========== PROFILE FUNCTIONS ==========
async function loadProfileData() {
  try {
    const profile = await ipcRenderer.invoke('get-user-profile');
    if (profile) {
      const displayNameEl = document.getElementById('profileDisplayName');
      const usernameEl = document.getElementById('profileUsernameDisplay');
      if (displayNameEl) displayNameEl.textContent = profile.username || t('profileUsername');
      if (usernameEl) usernameEl.textContent = `@${profile.username || 'user'}`;
      
      if (profile.avatar) {
        const avatarImg = document.getElementById('avatarImg');
        if (avatarImg) avatarImg.src = profile.avatar;
      }
      if (profile.banner) {
        const bannerDiv = document.getElementById('profileBanner');
        if (bannerDiv) bannerDiv.style.background = `url('${profile.banner}') center/cover no-repeat`;
      }
      
      const tokensCountEl = document.getElementById('profileTokensCount');
      const accountIdEl = document.getElementById('profileAccountId');
      const memberSinceEl = document.getElementById('profileMemberSince');
      const machineIdEl = document.getElementById('profileMachineId');
      const licenseKeyEl = document.getElementById('profileLicenseKey');
      const badgeEl = document.getElementById('profileBadge');
      
      if (tokensCountEl) tokensCountEl.textContent = savedTokens.length;
      if (accountIdEl) accountIdEl.textContent = profile.accountId || '----';
      if (memberSinceEl && profile.createdAt) memberSinceEl.textContent = formatDate(profile.createdAt);
      if (machineIdEl) machineIdEl.textContent = profile.machineId || '-';
      if (licenseKeyEl) {
        const key = profile.usedKey || '-';
        licenseKeyEl.innerHTML = key.length > 25 ? key.substring(0, 20) + '...' : key;
      }
      if (badgeEl) badgeEl.textContent = profile.isDeveloper ? '👑 Developer' : 'User';
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

// Avatar and Banner handlers
const profileAvatar = document.getElementById('profileAvatar');
const editAvatarBtn = document.getElementById('editAvatarBtn');
const avatarInput = document.getElementById('avatarInput');

if (profileAvatar) {
  profileAvatar.addEventListener('click', () => avatarInput?.click());
}
if (editAvatarBtn) {
  editAvatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    avatarInput?.click();
  });
}
if (avatarInput) {
  avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'image/gif' && !isPremium) {
        showNotification('⭐ GIF Avatars are a Premium feature!', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = await ipcRenderer.invoke('save-profile-avatar', { imageData: event.target.result });
        if (result.success) {
          document.getElementById('avatarImg').src = result.path;
          showNotification('Profile picture updated!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

const profileBanner = document.getElementById('profileBanner');
const editBannerBtn = document.getElementById('editBannerBtn');
const bannerInput = document.getElementById('bannerInput');

if (profileBanner) {
  profileBanner.addEventListener('click', () => bannerInput?.click());
}
if (editBannerBtn) {
  editBannerBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    bannerInput?.click();
  });
}
if (bannerInput) {
  bannerInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type === 'image/gif' && !isPremium) {
        showNotification('⭐ GIF Banners are a Premium feature!', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const result = await ipcRenderer.invoke('save-profile-banner', { imageData: event.target.result });
        if (result.success) {
          document.getElementById('profileBanner').style.background = `url('${result.path}') center/cover no-repeat`;
          showNotification('Banner updated!', 'success');
        }
      };
      reader.readAsDataURL(file);
    }
  });
}

// ========== TOKEN MANAGEMENT ==========
async function loadTokens() {
  try {
    const tokens = await ipcRenderer.invoke('get-user-tokens');
    savedTokens = tokens || [];
    console.log('✅ Loaded tokens:', savedTokens.length);
    updateTokensUI();
    updateTokenSelects();
    const profileTokens = document.getElementById('profileTokensCount');
    if (profileTokens) profileTokens.textContent = savedTokens.length;
  } catch (error) {
    console.error('Error loading tokens:', error);
    savedTokens = [];
  }
}

async function saveTokensToStorage() {
  try {
    await ipcRenderer.invoke('clear-user-tokens');
    for (const token of savedTokens) {
      await ipcRenderer.invoke('save-user-token', { 
        token: token.token, 
        userInfo: token.user 
      });
    }
    console.log('✅ Saved tokens:', savedTokens.length);
    updateTokensUI();
    updateTokenSelects();
    const profileTokens = document.getElementById('profileTokensCount');
    if (profileTokens) profileTokens.textContent = savedTokens.length;
  } catch (error) {
    console.error('Error saving tokens:', error);
    showNotification('Error saving tokens: ' + error.message, 'error');
  }
}

async function addNewToken(token, userInfo) {
  if (!token || token.trim() === '') {
    showNotification('❌ ' + t('invalidToken'), 'error');
    return false;
  }
  
  const exists = savedTokens.some(t => t.token === token);
  if (exists) {
    showNotification('⚠️ ' + t('warning'), 'warning');
    return false;
  }
  
  const displayName = userInfo || `Token_${savedTokens.length + 1}`;
  savedTokens.unshift({
    token: token,
    user: displayName,
    savedAt: new Date().toISOString()
  });
  
  await saveTokensToStorage();
  showNotification(`✅ ${t('tokenSaved')}`, 'success');
  return true;
}

async function removeToken(index) {
  if (index >= 0 && index < savedTokens.length) {
    const removed = savedTokens.splice(index, 1);
    await saveTokensToStorage();
    showNotification(`🗑️ ${t('tokenRemoved')}: ${removed[0].user}`, 'success');
    return true;
  }
  return false;
}

async function clearAllTokens() {
  if (confirm(t('eraseAll') + '?')) {
    savedTokens = [];
    await saveTokensToStorage();
    showNotification(t('allTokensErased'), 'success');
  }
}

function updateTokensUI() {
  const container = document.getElementById('savedTokensListContainer');
  if (!container) return;
  
  const searchInput = document.getElementById('tokenSearch');
  if (searchInput) tokenSearchQuery = searchInput.value.toLowerCase();
  
  const filteredTokens = savedTokens.filter(tokenData => {
    if (!tokenSearchQuery) return true;
    return tokenData.token.toLowerCase().includes(tokenSearchQuery) || 
           (tokenData.user || '').toLowerCase().includes(tokenSearchQuery);
  });
  
  if (filteredTokens.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 20px; color: #aaa;">💾 ${t('noTokens')}</div>`;
    return;
  }
  
  container.innerHTML = '';
  filteredTokens.forEach((tokenData) => {
    const originalIdx = savedTokens.findIndex(t => t.token === tokenData.token);
    const shortToken = tokenData.token.substring(0, 45) + '...';
    const displayUser = tokenData.user || 'Unknown';
    const savedDate = tokenData.savedAt ? new Date(tokenData.savedAt).toLocaleString() : 'Unknown';
    
    const div = document.createElement('div');
    div.className = 'token-entry';
    div.innerHTML = `
      <div style="flex: 1;">
        <div style="color: #57f287; font-weight: bold; margin-bottom: 4px;">👤 ${escapeHtml(displayUser)}</div>
        <div style="font-family: monospace; font-size: 11px; color: #aaa; word-break: break-all;">🔑 ${escapeHtml(shortToken)}</div>
        <div style="font-size: 10px; color: #666; margin-top: 4px;">📅 ${savedDate}</div>
      </div>
      <div style="display: flex; gap: 8px; margin-top: 8px;">
        <button class="check-token-btn" data-token="${escapeHtml(tokenData.token)}" style="background: #5865f2; padding: 6px 12px;">🔍 ${t('check')}</button>
        <button class="delete-token-btn" data-index="${originalIdx}" style="background: #da373c; padding: 6px 12px;">🗑️ ${t('removeToken')}</button>
      </div>
    `;
    container.appendChild(div);
  });
  
  document.querySelectorAll('.check-token-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const token = btn.getAttribute('data-token');
      const result = await ipcRenderer.invoke('check-token', token);
      showNotification(result.message, result.valid ? 'success' : 'error');
    });
  });
  
  document.querySelectorAll('.delete-token-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const index = parseInt(btn.getAttribute('data-index'));
      await removeToken(index);
    });
  });
}

function updateTokenSelects() {
  const selects = ['dmTokenSelect', 'guildTokenSelect', 'voiceTokenSelect', 'reactTokenSelect', 'supportTokenSelect', 'checkTokenSelect', 'autoChatTokenSelect'];
  
  selects.forEach(selectId => {
    const select = document.getElementById(selectId);
    if (select) {
      select.innerHTML = '<option value="">-- ' + t('selectToken') + ' --</option>';
      savedTokens.forEach((tokenData, idx) => {
        const option = document.createElement('option');
        option.value = tokenData.token;
        option.textContent = `${tokenData.user || `Token ${idx+1}`} (${tokenData.token.substring(0, 20)}...)`;
        select.appendChild(option);
      });
    }
  });
  
  const bulkSelect = document.getElementById('bulkVoiceTokenSelect');
  if (bulkSelect) {
    bulkSelect.innerHTML = '';
    savedTokens.forEach((tokenData, idx) => {
      const option = document.createElement('option');
      option.value = tokenData.token;
      option.textContent = tokenData.user || `Token ${idx+1}`;
      bulkSelect.appendChild(option);
    });
    if (bulkSelect.options.length > 0) bulkSelect.multiple = true;
  }
  
  const bulkReactSelect = document.getElementById('bulkReactTokenSelect');
  if (bulkReactSelect) {
    bulkReactSelect.innerHTML = '';
    savedTokens.forEach((tokenData, idx) => {
      const option = document.createElement('option');
      option.value = tokenData.token;
      option.textContent = tokenData.user || `Token ${idx+1}`;
      bulkReactSelect.appendChild(option);
    });
    if (bulkReactSelect.options.length > 0) bulkReactSelect.multiple = true;
  }
}

function getSelectedToken(toolType) {
  const selectMap = {
    dm: 'dmTokenSelect',
    guild: 'guildTokenSelect',
    voice: 'voiceTokenSelect',
    react: 'reactTokenSelect',
    support: 'supportTokenSelect',
    check: 'checkTokenSelect',
    autochat: 'autoChatTokenSelect'
  };
  const manualMap = {
    dm: 'dmManualToken',
    guild: 'guildManualToken',
    voice: 'voiceManualToken',
    react: 'reactManualToken',
    support: 'supportManualToken',
    check: 'inspectTokenInput',
    autochat: 'autoChatManualToken'
  };
  
  const select = document.getElementById(selectMap[toolType]);
  const manual = document.getElementById(manualMap[toolType]);
  
  if (manual && manual.value && manual.value.trim() !== '') {
    return manual.value.trim();
  }
  if (select && select.value && select.value !== '') {
    return select.value;
  }
  return null;
}

function getSelectedTokensForBulk() {
  const select = document.getElementById('bulkVoiceTokenSelect');
  const textarea = document.getElementById('bulkVoiceTokens');
  const tokens = [];
  
  if (textarea && textarea.value.trim()) {
    const lines = textarea.value.split('\n');
    for (const line of lines) {
      const token = line.trim();
      if (token) tokens.push(token);
    }
  } else if (select) {
    const selectedOptions = Array.from(select.selectedOptions);
    for (const opt of selectedOptions) {
      if (opt.value) tokens.push(opt.value);
    }
  }
  return tokens;
}

// ========== SESSION & LICENSE ==========
async function checkSession() {
  try {
    const splashText = document.getElementById('splashLoadingText');
    if (splashText) splashText.textContent = 'Checking session...';

    // پشکنینی میمۆری شاشەکە (LocalStorage) بۆ ئەوەی هەرگیز تووشی کێشەی قوفڵبوونی فایل نەبێت
    const localSessionStr = localStorage.getItem('app_session_backup');
    let session = null;
    
    if (localSessionStr) {
      try {
        session = JSON.parse(localSessionStr);
        console.log('♻️ Loaded session from LocalStorage backup:', session);
      } catch(e) {}
    }
    
    // هەوڵدان بۆ هێنانی زانیاری نوێ لە بەشی سەرەکی
    const mainSession = await ipcRenderer.invoke('check-session');
    console.log('📡 Session check result (Main):', mainSession);
    
    if (mainSession && mainSession.isUnlocked) {
      session = mainSession; // ئەگەر سەرەکییەکە کێشەی نەبوو، با ئەوە بەکاربێت
      localStorage.setItem('app_session_backup', JSON.stringify(session)); // نوێکردنەوەی باکئەپ
    } else if (session && session.isUnlocked) {
      console.log('⚠️ Main session failed, trusting LocalStorage backup!');
    }
    
    // ==== Fallback Auto-Login (BULLETPROOF) ====
    if (!session || !session.isUnlocked) {
      const autoUser = localStorage.getItem('auto_login_user');
      const autoKey = localStorage.getItem('auto_login_key');
      if (autoUser && autoKey) {
        if (splashText) splashText.textContent = 'Recovering connection...';
        console.log('🔄 Attempting silent auto-login recovery...');
        const recoverResult = await ipcRenderer.invoke('verify-key-only', { key: autoKey, username: autoUser });
        if (recoverResult.success) {
          session = recoverResult;
          session.isUnlocked = true;
          localStorage.setItem('app_session_backup', JSON.stringify(session));
        }
      }
    }

    if (session && session.isUnlocked) {
      if (splashText) splashText.textContent = 'Loading user data...';
      currentUsername = session.username;
      isDeveloper = session.isDeveloper || false;
      isPremium = session.isPremium || isDeveloper || false;
      
      console.log('👤 User:', currentUsername);
      console.log('👑 Is Developer:', isDeveloper);
      console.log('💎 Is Premium:', isPremium);
      
      // HIDE/SHOW PREMIUM FEATURES
      const premiumElements = [
        'qrLoginBtn', 'premiumVoiceHr', 'premiumVoiceSection',
        'premiumReactHr', 'premiumReactSection', 'autoChatTabBtn', 'questTabBtn'
      ];
      premiumElements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.style.display = isPremium ? ((id === 'qrLoginBtn' || id === 'autoChatTabBtn' || id === 'questTabBtn') ? 'inline-block' : 'block') : 'none';
        }
      });
      
      document.getElementById('licenseOverlay').style.display = 'none';
      document.getElementById('appContainer').style.display = 'block';
      
      const devTabs = document.getElementById('developerTabs');
      if (devTabs) {
        if (isDeveloper) {
          devTabs.style.display = 'block';
          console.log('✅ Developer panel shown');
          await loadAllKeys();
          await loadAllUsers();
        } else {
          devTabs.style.display = 'none';
          console.log('❌ Developer panel hidden');
        }
      }
      
      await loadTokens();
      await loadProfileData();
      
      // شاردنەوەی شاشەی لۆدین بە ئەنیمەیشنەوە
      setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if (splash) {
          splash.style.opacity = '0';
          setTimeout(() => splash.style.display = 'none', 500);
        }
      }, 1500);
    } else {
      document.getElementById('licenseOverlay').style.display = 'flex';
      document.getElementById('appContainer').style.display = 'none';
      const splash = document.getElementById('splashScreen');
      if (splash) splash.style.display = 'none';
      console.log('🔐 No active session');
    }
  } catch (error) {
    console.error('Error checking session:', error);
    document.getElementById('licenseOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    const splash = document.getElementById('splashScreen');
    if (splash) splash.style.display = 'none';
  }
}

document.getElementById('activateLicenseBtn').onclick = async () => {
  const username = document.getElementById('loginUsername').value.trim().toLowerCase();
  const key = document.getElementById('licenseKeyInput').value.trim();
  const errorDiv = document.getElementById('licenseMsg');
  
  console.log('🔓 Activate button clicked, username:', username, 'key:', key);
  
  if (!username) {
    errorDiv.innerHTML = '❌ Username is required!';
    errorDiv.className = 'key-error';
    return;
  }
  
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    errorDiv.innerHTML = '❌ Username can only contain English letters, numbers, _ and -';
    errorDiv.className = 'key-error';
    return;
  }
  
  if (!key) {
    errorDiv.innerHTML = t('fillAllFields');
    errorDiv.className = 'key-error';
    return;
  }
  
  errorDiv.innerHTML = t('loading');
  errorDiv.className = 'key-error';
  
  const result = await ipcRenderer.invoke('verify-key-only', { key, username });
  console.log('📝 Verify result:', result);
  
  if (result.success) {
    errorDiv.innerHTML = t('keyActivated');
    errorDiv.className = 'key-success';
    
    // پاراستنی داتا بۆ ئەوەی هەرگیز توشی دەرچوون نەبیت
    localStorage.setItem('auto_login_user', username);
    localStorage.setItem('auto_login_key', key);
    
    setTimeout(() => {
      document.getElementById('licenseOverlay').style.display = 'none';
      document.getElementById('appContainer').style.display = 'block';
      checkSession();
    }, 1000);
  } else {
    errorDiv.innerHTML = result.error;
    errorDiv.className = 'key-error';
    showNotification(result.error, 'error');
  }
};

document.getElementById('globalLogout').onclick = async () => {
  if (confirm(t('logout') + '?')) {
    await ipcRenderer.invoke('logout');
    localStorage.removeItem('app_session_backup'); // سڕینەوەی باکئەپی ناو شاشەکە
    localStorage.removeItem('auto_login_user'); // سڕینەوەی داتای ئۆتۆ-لۆگین
    localStorage.removeItem('auto_login_key'); // سڕینەوەی داتای ئۆتۆ-لۆگین
    savedTokens = [];
    document.getElementById('licenseOverlay').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginUsername').value = '';
    document.getElementById('licenseKeyInput').value = '';
    document.getElementById('licenseMsg').innerHTML = '';
    showNotification(t('success'), 'success');
  }
};

// Auto logout if trial expires while app is open
setInterval(() => {
  const localSessionStr = localStorage.getItem('app_session_backup');
  if (localSessionStr) {
    try {
      const session = JSON.parse(localSessionStr);
      if (session.expiresAt && Date.now() > session.expiresAt) {
        document.getElementById('globalLogout').click();
      }
    } catch(e) {}
  }
}, 60000);

// ========== TAB SWITCHING ==========
document.querySelectorAll('.tab-button').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active-tab'));
    const tabId = btn.getAttribute('data-tab');
    const selectedContent = document.getElementById(tabId);
    if (selectedContent) selectedContent.classList.add('active-tab');
  });
});

// ========== LANGUAGE ==========
const langSelect = document.getElementById('globalLangSwitcher');
if (langSelect) {
  langSelect.value = currentLang;
  langSelect.addEventListener('change', (e) => {
    currentLang = e.target.value;
    updateAllTexts();
    updateTokensUI();
    updateTokenSelects();
    showNotification(t('success'), 'success');
  });
}

function updateAllTexts() {
  const setText = (id, value, premium = false) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = escapeHtml(value) + (premium ? ' <span style="font-size:0.8em">💎</span>' : '');
  };
  const setPlaceholder = (id, value) => {
    const el = document.getElementById(id);
    if (el && el.placeholder !== undefined) el.placeholder = value;
  };
  const setHtml = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  };

  setText('appTitle', t('appTitle'));
  setText('globalLogout', t('logout'));
  setText('unlockMessage', t('unlockMessage'));
  setPlaceholder('loginUsername', t('usernamePlaceholder'));
  setPlaceholder('licenseKeyInput', t('licensePlaceholder'));
  setText('activateLicenseBtn', t('unlockBtn'));
  
  const supportLink = document.getElementById('supportLink');
  if (supportLink) supportLink.textContent = t('supportLink');

  const tabButtons = document.querySelectorAll('.tab-button:not(.dev-tab)');
  const tabKeys = ['tabProfile', 'tabTokens', 'tabCheck', 'tabDm', 'tabGuild', 'tabVoice', 'tabReact', 'tabAutoChat', 'tabQuest', 'tabSupport'];
  tabButtons.forEach((btn, idx) => {
    if (tabKeys[idx]) btn.textContent = t(tabKeys[idx]);
  });

  setText('getTokenTitle', t('getTokenTitle'));
  setText('qrLoginBtn', t('qrLogin'), true);
  setText('checkTokenBtn', t('checkToken'));
  setText('emailPasswordTitle', t('emailPasswordTitle'));
  setPlaceholder('loginEmail', t('emailPlaceholder'));
  setPlaceholder('loginPassword', t('passwordPlaceholder'));
  setPlaceholder('mfaCode', t('totpPlaceholder'));
  setPlaceholder('backupCode', t('backupPlaceholder'));
  setText('getTokenBtn', t('getToken'));
  setText('pasteTokenTitle', t('pasteTokenTitle'));
  setPlaceholder('directTokenInput', t('pastePlaceholder'));
  setText('useDirectTokenBtn', t('useToken'));
  setText('savedTokensTitle', t('savedTokensTitle'));
  setText('saveTokenBtn', t('saveToken'));
  setText('bulkImportBtn', t('bulkImport'));
  setText('exportTokensBtn', t('exportAll'));
  setText('eraseAllTokensBtn', t('eraseAll'));
  setPlaceholder('manualTokenInput', t('pastePlaceholder'));
  setText('saveManualTokenBtn', t('saveToken'));
  
  setText('checkTokenTitle', t('checkTokenTitle'));
  setText('enterTokenTitle', t('enterToken'));
  setText('checkTokenFullBtn', t('checkTokenFull'));
  setText('saveCheckedTokenBtn', t('saveThisToken'));
  
  setText('dmDeleterTitle', t('dmDeleterTitle'));
  setText('dmWarning', t('dmWarning'));
  setText('selectTokenTitle', t('selectToken'));
  setText('channelIdTitle', t('channelId'));
  setText('messagesToDeleteTitle', t('messagesToDelete'));
  setText('startDeleteBtn', t('startDeleting'));
  
  setText('guildLeaverTitle', t('guildLeaverTitle'));
  setText('selectTokenGuildTitle', t('selectToken'));
  setText('guildIdTitle', t('guildId'));
  setText('leaveGuildBtn', t('leaveGuild'));
  
  setText('voiceTitle', t('voiceTitle'));
  setText('selectTokenVoiceTitle', t('selectToken'));
  setText('guildIdVoiceTitle', t('guildIdVoice'));
  setText('loadVoiceChannelsBtn', t('loadChannels'));
  setText('voiceChannelTitle', t('voiceChannelId'));
  setText('voiceJoinBtn', t('joinVoice'));
  setText('voiceLeaveBtn', t('leaveVoice'));
  setText('bulkVoiceTitle', t('bulkVoiceTitle'), true);
  setText('bulkVoiceLeaveBtn', t('bulkVoiceLeaveBtn'));
  
  setText('autoChatTitle', t('autoChatTitle'), true);
  setText('startAutoChatBtn', t('startAutoChat'));
  setText('stopAutoChatBtn', t('stopAutoChat'));
  
  setText('questTitle', t('questTitle'), true);
  setText('questDesc', t('questDesc'));
  setText('questInstTitle', t('questInstTitle'));
  setHtml('questInst1', t('questInst1'));
  setHtml('questInst2', t('questInst2'));
  setHtml('questInst3', t('questInst3'));
  setHtml('questInst4', t('questInst4'));
  setHtml('questInst5', t('questInst5'));
  setText('copyQuestScriptBtn', t('copyQuestScript'));

  setText('reactTitle', t('reactTitle'));
  setText('selectTokenReactTitle', t('selectToken'));
  setText('channelIdReactTitle', t('channelId'));
  setText('messageIdTitle', t('messageId'));
  setText('emojiTitle', t('emoji'));
  setText('addReactionBtn', t('addReaction'));
  setText('removeReactionBtn', t('removeReaction'));
  
  setText('supportTitle', t('supportTitle'));
  setText('joinSupportBtn', t('joinSupport'));
  setText('selectTokenSupportTitle', t('selectToken'));
  
  setText('statTokensLabel', t('tokensLabel'));
  setText('labelUserId', t('userIdLabel'));
  setText('labelMemberSince', t('memberSinceLabel'));
  setText('editAvatarBtn', t('editAvatar'));
  setText('editBannerBtn', t('editBanner'));
}

// ========== LOGIN METHODS ==========

document.getElementById('qrLoginBtn').onclick = async () => {
  if (!isPremium) {
    showNotification('⭐ QR Code Login is a Premium feature!', 'warning');
    return;
  }

  const qrModal = document.getElementById('qrModal');
  const qrImage = document.getElementById('qrImage');
  const qrStatus = document.getElementById('qrStatus');
  
  qrModal.style.display = 'flex';
  qrStatus.innerHTML = t('loading');
  qrImage.src = '';
  
  const result = await ipcRenderer.invoke('start-qr-login');
  
  if (result.success && result.qrUrl) {
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(result.qrUrl)}`;
    qrStatus.innerHTML = '📱 ' + t('scanQR');
  } else {
    qrStatus.innerHTML = '❌ ' + (result.error || t('error'));
  }
};

document.getElementById('closeQrBtn').onclick = () => {
  ipcRenderer.invoke('stop-qr-login');
  document.getElementById('qrModal').style.display = 'none';
};

if (!window._qrListenersAdded) {
  window.electron.ipcRenderer.on('qr-status-update', (status) => {
    const qrStatus = document.getElementById('qrStatus');
    if (status === 'scanned') {
      qrStatus.innerHTML = '✅ Scanned! Please confirm on your phone...';
    }
  });

  window.electron.ipcRenderer.on('qr-login-success', async (token) => {
    const userInfo = await ipcRenderer.invoke('get-user-info', token);
    await addNewToken(token, userInfo ? userInfo.username : 'QR User');
    showNotification(`✅ ${t('success')}: ${userInfo ? userInfo.username : 'Logged in'}`, 'success');
    document.getElementById('tokenFetchResult').innerHTML = `✅ ${t('tokenValid')}<br><span style="font-size:11px">${token.substring(0, 50)}...</span>`;
    document.getElementById('qrModal').style.display = 'none';
  });
  window._qrListenersAdded = true;
}

document.getElementById('fetchTokenBtn').onclick = async () => {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  const mfaCode = document.getElementById('mfaCode').value;
  const backupCode = document.getElementById('backupCode').value;
  
  if (!email || !password) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  showNotification(t('loading'), 'info');
  
  const result = await ipcRenderer.invoke('login-with-axios', { 
    email, password, totpCode: mfaCode, backupCode, ticket: currentAuthTicket 
  });
  
  if (result.success) {
    currentAuthTicket = null;
    lastFetchedToken = result.token;
    lastUserInfo = result.user;
    showNotification(`${t('success')}: ${result.user.username}`, 'success');
    document.getElementById('tokenFetchResult').innerHTML = `✅ ${t('success')}<br><span style="font-size:11px">${result.token.substring(0, 50)}...</span>`;
    document.getElementById('mfaWrapper').style.display = 'none';
    document.getElementById('mfaCode').value = '';
    document.getElementById('backupCode').value = '';
    await addNewToken(result.token, result.user.username);
  } else if (result.needMFA) {
    currentAuthTicket = result.ticket;
    showNotification('🔐 2FA Required!', 'warning');
    document.getElementById('mfaWrapper').style.display = 'block';
  } else {
    showNotification(result.error, 'error');
  }
};

const loginEmailInput = document.getElementById('loginEmail');
if (loginEmailInput) loginEmailInput.addEventListener('input', () => { currentAuthTicket = null; });

const loginPasswordInput = document.getElementById('loginPassword');
if (loginPasswordInput) loginPasswordInput.addEventListener('input', () => { currentAuthTicket = null; });

document.getElementById('useDirectTokenBtn').onclick = async () => {
  const token = document.getElementById('directTokenInput').value.trim();
  if (!token) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  const result = await ipcRenderer.invoke('check-token', token);
  if (result.valid) {
    await addNewToken(token, result.user.username);
    document.getElementById('directTokenInput').value = '';
  } else {
    showNotification(t('invalidToken'), 'error');
  }
};

document.getElementById('saveTokenBtn').onclick = async () => {
  if (!lastFetchedToken) {
    showNotification(t('selectTokenFirst'), 'warning');
    return;
  }
  const displayUser = lastUserInfo ? lastUserInfo.username : 'Unknown';
  await addNewToken(lastFetchedToken, displayUser);
};

document.getElementById('saveManualTokenBtn').onclick = async () => {
  const token = document.getElementById('manualTokenInput').value.trim();
  if (!token) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  const result = await ipcRenderer.invoke('check-token', token);
  if (result.valid) {
    await addNewToken(token, result.user.username);
    document.getElementById('manualTokenInput').value = '';
  } else {
    showNotification(t('invalidToken'), 'error');
  }
};

document.getElementById('checkTokenBtn').onclick = async () => {
  const token = localStorage.getItem('lastToken') || (savedTokens[0]?.token);
  if (!token) {
    showNotification('No token found!', 'warning');
    return;
  }
  const result = await ipcRenderer.invoke('check-token', token);
  showNotification(result.message, result.valid ? 'success' : 'error');
};

document.getElementById('bulkImportBtn').onclick = () => {
  const area = document.getElementById('bulkImportArea');
  if (area) area.style.display = area.style.display === 'none' ? 'block' : 'none';
};

document.getElementById('confirmBulkImport').onclick = async () => {
  const tokensText = document.getElementById('bulkTokens')?.value || '';
  const tokens = tokensText.split('\n').filter(t => t.trim());
  
  let newCount = 0;
  for (const token of tokens) {
    const user = await ipcRenderer.invoke('get-user-info', token.trim());
    const exists = savedTokens.some(t => t.token === token.trim());
    if (!exists) {
      savedTokens.push({
        token: token.trim(),
        user: user ? user.username : 'Unknown',
        savedAt: new Date().toISOString()
      });
      newCount++;
    }
  }
  
  await saveTokensToStorage();
  if (document.getElementById('bulkTokens')) document.getElementById('bulkTokens').value = '';
  const area = document.getElementById('bulkImportArea');
  if (area) area.style.display = 'none';
  showNotification(`${t('tokensImported')} ${newCount}`, 'success');
};

document.getElementById('cancelBulkImport').onclick = () => {
  if (document.getElementById('bulkTokens')) document.getElementById('bulkTokens').value = '';
  const area = document.getElementById('bulkImportArea');
  if (area) area.style.display = 'none';
};

document.getElementById('exportTokensBtn').onclick = () => {
  if (savedTokens.length === 0) {
    showNotification(t('selectTokenFirst'), 'warning');
    return;
  }
  const tokenText = savedTokens.map(t => `${t.user}:${t.token}`).join('\n');
  navigator.clipboard.writeText(tokenText);
  showNotification(t('tokensExported'), 'success');
};

document.getElementById('eraseAllTokensBtn').onclick = clearAllTokens;

// ========== CHECK TOKEN FULL ==========
document.getElementById('inspectTokenBtn').onclick = async () => {
  const token = getSelectedToken('check');
  if (!token) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  showNotification(t('loading'), 'info');
  const result = await ipcRenderer.invoke('check-token-full', token);
  
  if (result.valid) {
    const profileArea = document.getElementById('inspectProfileArea');
    if (profileArea) profileArea.style.display = 'block';
    document.getElementById('inspectStatusMsg').innerHTML = `<span style="color:#57f287">✅ ${t('tokenValid')}</span>`;
    
    const user = result.user;
    const badgesHtml = user.badges.map(b => `<span class="badge-icon">${b}</span>`).join('') || 'None';
    
    document.getElementById('inspectUsername').innerHTML = `${user.username}#${user.discriminator}`;
    document.getElementById('inspectUserId').innerHTML = user.id;
    document.getElementById('inspectAvatar').src = user.avatarUrl;
    document.getElementById('inspectCreated').innerHTML = formatDate(user.createdAt);
    document.getElementById('inspectEmail').innerHTML = user.email;
    document.getElementById('inspectPhone').innerHTML = user.phone || 'Not set';
    document.getElementById('inspectNitro').innerHTML = user.nitroType;
    document.getElementById('inspectHype').innerHTML = user.badges.find(b => b.includes('HypeSquad')) || 'None';
    document.getElementById('inspectBadges').innerHTML = badgesHtml;
    
    const saveBtn = document.getElementById('saveCheckedTokenBtn');
    if (saveBtn) {
      saveBtn.onclick = async () => {
        await addNewToken(token, user.username);
      };
    }
    
    showNotification(t('tokenValid'), 'success');
  } else {
    const profileArea = document.getElementById('inspectProfileArea');
    if (profileArea) profileArea.style.display = 'none';
    document.getElementById('inspectStatusMsg').innerHTML = result.message;
    showNotification(result.message, 'error');
  }
};

// ========== DM DELETER ==========
document.getElementById('executeDeleteMessagesBtn').onclick = async () => {
  const token = getSelectedToken('dm');
  const channelId = document.getElementById('dmChannelId').value;
  const limit = parseInt(document.getElementById('dmDeleteLimit').value);
  
  if (!token || !channelId) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  showNotification(t('loading'), 'info');
  const result = await ipcRenderer.invoke('delete-messages', { token, channelId, limit });
  if (result.success) {
    showNotification(`${t('success')}: ${result.deleted} messages deleted`, 'success');
  } else {
    showNotification(result.error, 'error');
  }
};

// ========== GUILD LEAVER ==========
document.getElementById('leaveServerBtn').onclick = async () => {
  const token = getSelectedToken('guild');
  const guildId = document.getElementById('guildIdInput').value;
  
  if (!token || !guildId) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  showNotification(t('loading'), 'info');
  const result = await ipcRenderer.invoke('leave-guild', { token, guildId });
  showNotification(result.success ? t('leftGuild') : result.error, result.success ? 'success' : 'error');
};

// ========== VOICE FUNCTIONS ==========
document.getElementById('loadVoiceChannelsBtn').onclick = async () => {
  const token = getSelectedToken('voice');
  const guildId = document.getElementById('voiceGuildIdField').value;
  
  if (!token || !guildId) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  const result = await ipcRenderer.invoke('get-voice-channels', { token, guildId });
  if (result.success) {
    const select = document.getElementById('voiceChannelSelect');
    if (select) {
      select.innerHTML = '<option value="">-- ' + t('selectToken') + ' --</option>';
      result.channels.forEach(ch => {
        select.innerHTML += `<option value="${ch.id}">${ch.name}</option>`;
      });
    }
    showNotification(t('success'), 'success');
  } else {
    showNotification(result.error, 'error');
  }
};

document.getElementById('joinVoiceBtn').onclick = async () => {
  const token = getSelectedToken('voice');
  const guildId = document.getElementById('voiceGuildIdField').value;
  let channelId = document.getElementById('voiceChannelSelect')?.value;
  if (!channelId) channelId = document.getElementById('voiceChannelIdField').value;
  
  if (!token || !guildId || !channelId) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  showNotification(t('loading'), 'info');
  const result = await ipcRenderer.invoke('voice-join', { token, guildId, channelId });
  showNotification(result.success ? t('joinedVoice') : result.error, result.success ? 'success' : 'error');
};

document.getElementById('leaveVoiceBtn').onclick = async () => {
  const token = getSelectedToken('voice');
  const guildId = document.getElementById('voiceGuildIdField').value;
  
  if (!token || !guildId) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  const result = await ipcRenderer.invoke('voice-leave', { token, guildId });
  showNotification(result.success ? t('leftVoice') : result.error, result.success ? 'success' : 'error');
};

document.getElementById('voiceJoinBulkBtn').onclick = async () => {
  if (!isPremium) {
    showNotification('⭐ Bulk Voice Joiner is a Premium feature!', 'warning');
    return;
  }

  const tokens = getSelectedTokensForBulk();
  const guildId = document.getElementById('bulkVoiceGuildId').value;
  const channelId = document.getElementById('bulkVoiceChannelId').value;
  
  if (tokens.length === 0 || !guildId || !channelId) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  const result = await ipcRenderer.invoke('voice-join-bulk', { tokens, guildId, channelId });
  const successCount = result.results.filter(r => r.success).length;
  showNotification(`✅ ${successCount}/${tokens.length} ${t('joinedVoice')}`, successCount > 0 ? 'success' : 'error');
};

// دروستکردنی دوگمەکە بەشێوەی ئۆتۆماتیکی ئەگەر لە HTML ەکەدا نەبوو
let bulkVoiceLeaveBtn = document.getElementById('bulkVoiceLeaveBtn');
if (!bulkVoiceLeaveBtn) {
  const joinBtn = document.getElementById('voiceJoinBulkBtn');
  if (joinBtn && joinBtn.parentNode) {
    bulkVoiceLeaveBtn = document.createElement('button');
    bulkVoiceLeaveBtn.id = 'bulkVoiceLeaveBtn';
    bulkVoiceLeaveBtn.style.cssText = 'background: #da373c; margin-top: 10px; width: 100%; padding: 10px; border-radius: 5px; color: white; border: none; cursor: pointer; font-family: inherit; font-size: 14px;';
    bulkVoiceLeaveBtn.textContent = t('bulkVoiceLeaveBtn') || 'Leave All Voice';
    joinBtn.parentNode.insertBefore(bulkVoiceLeaveBtn, joinBtn.nextSibling);
  }
}

if (bulkVoiceLeaveBtn) {
  bulkVoiceLeaveBtn.onclick = async () => {
    if (!isPremium) {
      showNotification('⭐ Bulk Voice is a Premium feature!', 'warning');
      return;
    }
    const result = await ipcRenderer.invoke('voice-leave-bulk');
    showNotification(`✅ ${result.count} ${t('leftVoice')}`, 'success');
  };
}

// ========== REACTIONS ==========
document.querySelectorAll('.emoji-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.getElementById('reactEmojiField').value = btn.dataset.emoji;
  });
});

document.getElementById('addReactionBtn').onclick = async () => {
  const token = getSelectedToken('react');
  const channelId = document.getElementById('reactChannelIdField').value;
  const messageId = document.getElementById('reactMessageIdField').value;
  const emoji = document.getElementById('reactEmojiField').value;
  
  if (!token || !channelId || !messageId || !emoji) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  const result = await ipcRenderer.invoke('add-reaction', { token, channelId, messageId, emoji });
  showNotification(result.success ? t('reactionAdded') : result.error, result.success ? 'success' : 'error');
};

document.getElementById('removeReactionBtn').onclick = async () => {
  const token = getSelectedToken('react');
  const channelId = document.getElementById('reactChannelIdField').value;
  const messageId = document.getElementById('reactMessageIdField').value;
  const emoji = document.getElementById('reactEmojiField').value;
  
  if (!token || !channelId || !messageId || !emoji) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  const result = await ipcRenderer.invoke('remove-reaction', { token, channelId, messageId, emoji });
  showNotification(result.success ? t('reactionRemoved') : result.error, result.success ? 'success' : 'error');
};

// ========== BULK REACTIONS ==========
function getSelectedTokensForBulkReact() {
  const select = document.getElementById('bulkReactTokenSelect');
  const textarea = document.getElementById('bulkReactTokens');
  const tokens = [];
  
  if (textarea && textarea.value.trim()) {
    const lines = textarea.value.split('\n');
    for (const line of lines) {
      const token = line.trim();
      if (token) tokens.push(token);
    }
  } else if (select) {
    const selectedOptions = Array.from(select.selectedOptions);
    for (const opt of selectedOptions) {
      if (opt.value) tokens.push(opt.value);
    }
  }
  return tokens;
}

document.getElementById('bulkAddReactionBtn').onclick = async () => {
  if (!isPremium) {
    showNotification('⭐ Bulk React is a Premium feature!', 'warning');
    return;
  }

  const tokens = getSelectedTokensForBulkReact();
  const channelId = document.getElementById('reactChannelIdField').value;
  const messageId = document.getElementById('reactMessageIdField').value;
  const emoji = document.getElementById('reactEmojiField').value;
  const delay = parseFloat(document.getElementById('bulkReactDelay').value) || 5;
  
  if (tokens.length === 0 || !channelId || !messageId || !emoji) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  const statusBox = document.getElementById('bulkReactResultStatus');
  statusBox.innerHTML = `Starting bulk reactions for ${tokens.length} tokens...<br>`;
  
  let successCount = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    statusBox.innerHTML += `⏳ Reacting with token ${i+1}/${tokens.length}...<br>`;
    statusBox.scrollTop = statusBox.scrollHeight;
    
    const result = await ipcRenderer.invoke('add-reaction', { token, channelId, messageId, emoji });
    if (result.success) {
      successCount++;
      statusBox.innerHTML += `✅ Token ${i+1} success!<br>`;
    } else {
      statusBox.innerHTML += `❌ Token ${i+1} failed: ${result.error}<br>`;
    }
    
    if (i < tokens.length - 1) {
      await new Promise(r => setTimeout(r, delay * 1000));
    }
  }
  statusBox.innerHTML += `<strong>Done! ${successCount}/${tokens.length} successful.</strong>`;
  statusBox.scrollTop = statusBox.scrollHeight;
  showNotification(`✅ ${successCount}/${tokens.length} ${t('reactionAdded')}`, successCount > 0 ? 'success' : 'error');
};

document.getElementById('bulkRemoveReactionBtn').onclick = async () => {
  if (!isPremium) {
    showNotification('⭐ Bulk React is a Premium feature!', 'warning');
    return;
  }

  const tokens = getSelectedTokensForBulkReact();
  const channelId = document.getElementById('reactChannelIdField').value;
  const messageId = document.getElementById('reactMessageIdField').value;
  const emoji = document.getElementById('reactEmojiField').value;
  const delay = parseFloat(document.getElementById('bulkReactDelay').value) || 5;
  
  if (tokens.length === 0 || !channelId || !messageId || !emoji) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }
  
  const statusBox = document.getElementById('bulkReactResultStatus');
  statusBox.innerHTML = `Removing bulk reactions for ${tokens.length} tokens...<br>`;
  
  let successCount = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    statusBox.innerHTML += `⏳ Removing reaction with token ${i+1}/${tokens.length}...<br>`;
    statusBox.scrollTop = statusBox.scrollHeight;
    
    const result = await ipcRenderer.invoke('remove-reaction', { token, channelId, messageId, emoji });
    if (result.success) {
      successCount++;
      statusBox.innerHTML += `✅ Token ${i+1} success!<br>`;
    } else {
      statusBox.innerHTML += `❌ Token ${i+1} failed: ${result.error}<br>`;
    }
    
    if (i < tokens.length - 1) {
      await new Promise(r => setTimeout(r, delay * 1000));
    }
  }
  statusBox.innerHTML += `<strong>Done! ${successCount}/${tokens.length} successful.</strong>`;
  statusBox.scrollTop = statusBox.scrollHeight;
  showNotification(`✅ ${successCount}/${tokens.length} ${t('reactionRemoved')}`, successCount > 0 ? 'success' : 'error');
};

// ========== AUTO CHAT (PREMIUM) ==========
const autoChatQuotes = [
  "In our day, if you believe in God, you are considered a conservative, but I am Satan, but they may believe in me",
  "If it were bought, I would buy a little youth for my mother, a new life for my father, and a heartfelt childhood smile for myself",
  "There are only two things beautiful in the world: women and flowers",
  "Which official, which pharaoh is posing over the people His wife's underwear was bought with the money of the nation",
  "One day you will look up at the sky or smile, or shed tears of joy and say this was more than I needed and prayed for",
  "When the turtle reaches the top of the mountain, the eagle leaves because it is no longer the top for the eagle",
  "When you reach out for peace, keep your other hand on your gun.",
  "Do not be deceived by the beginning, Satan believed in the beginning",
  "Decisions that protect your dignity are always right",
  "Don't work too hard in this world because you won't get out alive",
  "Life is a material war and the poor boy doesn't live long in it",
  "Rest assured that a hand raised to the sky will never return empty",
  "perhaps it isn't love when I say you are what I love the most -you are the knife I turn inside myself, this is love. This, my dear, is love",
  "If you want to come back, I've closed the door of my heart like this",
  "The world you are so worried about was given to Prophet Adam as punishment",
  "Long ears don't compete in horse races, but they always laugh at the losing horse",
  "I gave you a heart that contained only my mother",
  "If I were afraid of loneliness, I would treat you all well",
  "DON'T BARK IF YOU CAN'T BITE",
  "Never fight with a pig in the mud, you will both get dirty and the pig will enjoy it",
  "I was addicted to silence. I don't know if I'm tired or my words",
  "If you choose me, I'll become a vegetarian.",
  "Be bad, but at least don't be a liar",
  "Speech must be like a girl's skirt, long enough to convey meaning and short enough to attract attention",
  "After betrayal, I'm sorry is a dirty word",
  "There are so many wounds here that the best thing is to plant a cloth",
  "Nothing kills the soul like the wrong place and the wrong people",
  "Don't leave anyone in the middle of the road. They may not have their own way and chose it because of you",
  "Don't ask someone who is leaving why they are leaving because they have prepared excuses before their bags",
  "I am deep with silence. That's the situation that suits me",
  "Tragedy is when a mature mind and a kind heart come together in one body",
  "Your childhood is over when you realize that sleep is a reward, not a punishment",
  "When we waited for the difficulties to pass, life passed",
  "You will reach the truth through mistakes. I am a man because I make mistakes. You will never reach any truth if you do not make mistakes",
  "God forgive everyone who died, but the living have to continue living.  huh?  did i say bad",
  "I have stopped speaking. I have spoken in silence all my life. I have spent all my tragedies in silence",
  "What are you afraid of when you spend the hardest night of your life without telling anyone",
  "When your mind fails, Satan helps you",
  "I'm sure your workplace is half the cause of your depression",
  "I love your roots, not the flowers everyone sees",
  "Those who live in cowardice are born dead",
  "I spent my whole life building ships That I was done The sea was dry And when I broke the ship, it rained",
  "I'm like a desert without life.",
  "Whoever is not good will not be good to anyone",
  "Halal bread is the greatest certificate of life",
  "A 100-year-old drawing tool from the Old World",
  "The only thing that doesn't change its taste is my pain, which is always bitter",
  "We are too young to die and too old to live",
  "The truth is always bitter to a liar",
  "The mind is a slave to emotion",
  "A bird does not build a nest in a cage so that slavery is not inherited by its young",
  "If you are cruel, people will respect you , no matter how many they are",
  "die alone, we die because of people who cheapened us when we thought they were life",
  "Whenever I overcome something, a dog follows me. It's called pride",
  "The whole question here is whether I am a monster or a victim myself",
  "After a heavy grief or spiritual storm, one wants to sleep forever",
  "The world is based on meaningless things, and without them nothing might happen at all",
  "I have so much to tell you that I am afraid I will not tell you anything",
  "I don't want to create a child whose dreams are like mine",
  "Take good care of yourself, don't think of me when the water flows and finds its way",
  "Love is great but it hurts a lot. I'd rather not fall into it from the beginning",
  "They muddy the water to make it look deep",
  "I looked at the temples, churches and mosques, but I found God in my heart",
  "I never give up when I fail because I know there are still some idiots who will applaud me",
  "The world you are so worried about was given to Adam as punishment",
  "If there were an honorable world, prostitutes would starve",
  "Through that beauty, I made myself dust and she didn't put her feet on me",
  "Don't call me when I'm rich. I had the same number when I was poor",
  "Where, on what street, and on what road can I find you now?",
  "Make friends with people who fight for you in a room where you're not present.",
  "The best thing for a person is to die early",
  "I wish I could sleep as peacefully as I did when I was a child and ignorant",
  "Sometimes one falls in love with one's own pain in an unusually passionate way",
  "My past is so full of misery and vagueness that my heart pounds every time I remember it",
  "Everyone has some secret worries that no one understands except themselves. We often call them cold when they are boiling in pain",
  "When I advise you, it doesn't mean I'm smarter than you, I just made more mistakes than you",
  "This life is nothing to sleep early and finish it early",
  "Fear does not prevent death, but it prevents life",
  "Every time you didn't come, a lightning bolt struck my soul. Loss became my fate, loneliness became my country",
  "When will kindness be like that? With yourself you are everything you took Except for me",
  "The immoral and the rank and file are always happy in this day and age",
  "There are many acquaintances, but few friends",
  "Forbidden fruit is sweeter,",
  "Poverty is not a shame, but it's better to hide it",
  "A real cottage It's much better than an imaginary palace",
  "I have learned that the saddest thing in life is to be left alone with your thoughts",
  "I have learned that making a decision is more important than making the right decision",
  "I have learned that no matter how good a friend is, they will hurt you every once in a while and you must forgive them for that",
  "I have learned that it is not what we have in life but who we have in our life that matters",
  "I have learned that sometimes we are angry at each other not because of what we did but because of what we did not do for each other"
];

let activeAutoChatInterval = null;
let isAutoChatting = false;

document.getElementById('startAutoChatBtn').onclick = async () => {
  if (!isPremium) {
    showNotification('⭐ Auto Chat is a Premium feature!', 'warning');
    return;
  }

  const token = getSelectedToken('autochat');
  const channelId = document.getElementById('autoChatChannelId').value.trim();
  const delayStr = document.getElementById('autoChatDelay').value;
  const delayMs = (parseFloat(delayStr) || 30) * 1000;

  if (!token || !channelId) {
    showNotification(t('fillAllFields'), 'warning');
    return;
  }

  isAutoChatting = true;
  document.getElementById('startAutoChatBtn').style.display = 'none';
  document.getElementById('stopAutoChatBtn').style.display = 'inline-block';

  const statusBox = document.getElementById('autoChatResultStatus');
  statusBox.innerHTML = `▶️ Started Auto Chat...<br>⏳ Interval: ${delayStr} seconds<br>`;

  const sendMsg = async () => {
    if (!isAutoChatting) return;
    const msg = autoChatQuotes[Math.floor(Math.random() * autoChatQuotes.length)];
    const result = await ipcRenderer.invoke('send-message', { token, channelId, content: msg });
    if (result.success) {
       statusBox.innerHTML += `✅ Sent message!<br>`;
    } else {
       statusBox.innerHTML += `❌ Failed: ${result.error}<br>`;
    }
    statusBox.scrollTop = statusBox.scrollHeight;
  };

  sendMsg(); // یەکەم نامە ڕاستەوخۆ دەنێرێت پێش وەرگرتنی کات
  activeAutoChatInterval = setInterval(sendMsg, delayMs);
};

document.getElementById('stopAutoChatBtn').onclick = () => {
  isAutoChatting = false;
  if (activeAutoChatInterval) clearInterval(activeAutoChatInterval);
  activeAutoChatInterval = null;

  document.getElementById('startAutoChatBtn').style.display = 'inline-block';
  document.getElementById('stopAutoChatBtn').style.display = 'none';
  
  const statusBox = document.getElementById('autoChatResultStatus');
  statusBox.innerHTML += `<strong>⏹️ Stopped.</strong><br>`;
  statusBox.scrollTop = statusBox.scrollHeight;
};

// ========== QUEST COMPLETER (PREMIUM) ==========
const questScriptCode = `delete window.$;
let wpRequire = webpackChunkdiscord_app.push([[Symbol()], {}, r => r]);
webpackChunkdiscord_app.pop();

let ApplicationStreamingStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getStreamerActiveStreamMetadata).exports.A;
let RunningGameStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getRunningGames).exports.Ay;
let QuestsStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getQuest).exports.A;
let ChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.A?.__proto__?.getAllThreadsForParent).exports.A;
let GuildChannelStore = Object.values(wpRequire.c).find(x => x?.exports?.Ay?.getSFWDefaultChannel).exports.Ay;
let FluxDispatcher = Object.values(wpRequire.c).find(x => x?.exports?.h?.__proto__?.flushWaitQueue).exports.h;
let api = Object.values(wpRequire.c).find(x => x?.exports?.Bo?.get).exports.Bo;

const supportedTasks = ["WATCH_VIDEO", "PLAY_ON_DESKTOP", "STREAM_ON_DESKTOP", "PLAY_ACTIVITY", "WATCH_VIDEO_ON_MOBILE"];
let quests = [...QuestsStore.quests.values()].filter(x => x.userStatus?.enrolledAt && !x.userStatus?.completedAt && new Date(x.config.expiresAt).getTime() > Date.now() && supportedTasks.find(y => Object.keys((x.config.taskConfig ?? x.config.taskConfigV2).tasks).includes(y)));
let isApp = typeof DiscordNative !== "undefined";
if(quests.length === 0) {
	console.log("You don't have any uncompleted quests!");
} else {
	let doJob = function() {
		const quest = quests.pop();
		if(!quest) return;

		const pid = Math.floor(Math.random() * 30000) + 1000;
		
		const applicationId = quest.config.application.id;
		const applicationName = quest.config.application.name;
		const questName = quest.config.messages.questName;
		const taskConfig = quest.config.taskConfig ?? quest.config.taskConfigV2;
		const taskName = supportedTasks.find(x => taskConfig.tasks[x] != null);
		const secondsNeeded = taskConfig.tasks[taskName].target;
		let secondsDone = quest.userStatus?.progress?.[taskName]?.value ?? 0;

		if(taskName === "WATCH_VIDEO" || taskName === "WATCH_VIDEO_ON_MOBILE") {
			const maxFuture = 10, speed = 7, interval = 1;
			const enrolledAt = new Date(quest.userStatus.enrolledAt).getTime();
			let completed = false;
			let fn = async () => {			
				while(true) {
					const maxAllowed = Math.floor((Date.now() - enrolledAt)/1000) + maxFuture;
					const diff = maxAllowed - secondsDone;
					const timestamp = secondsDone + speed;
					if(diff >= speed) {
						const res = await api.post({url: \`/quests/\${quest.id}/video-progress\`, body: {timestamp: Math.min(secondsNeeded, timestamp + Math.random())}});
						completed = res.body.completed_at != null;
						secondsDone = Math.min(secondsNeeded, timestamp);
					}
					
					if(timestamp >= secondsNeeded) {
						break;
					}
					await new Promise(resolve => setTimeout(resolve, interval * 1000));
				}
				if(!completed) {
					await api.post({url: \`/quests/\${quest.id}/video-progress\`, body: {timestamp: secondsNeeded}});
				}
				console.log("Quest completed!");
				doJob();
			};
			fn();
			console.log(\`Spoofing video for \${questName}.\`);
		} else if(taskName === "PLAY_ON_DESKTOP") {
			if(!isApp) {
				console.log("This no longer works in browser for non-video quests. Use the discord desktop app to complete the", questName, "quest!");
			} else {
				api.get({url: \`/applications/public?application_ids=\${applicationId}\`}).then(res => {
					const appData = res.body[0];
					const exeName = appData.executables?.find(x => x.os === "win32")?.name?.replace(">","") ?? appData.name.replace(/[\\\\/:*?"<>|]/g, "");
					
					const fakeGame = {
						cmdLine: \`C:\\\\Program Files\\\\\${appData.name}\\\\\${exeName}\`,
						exeName,
						exePath: \`c:/program files/\${appData.name.toLowerCase()}/\${exeName}\`,
						hidden: false,
						isLauncher: false,
						id: applicationId,
						name: appData.name,
						pid: pid,
						pidPath: [pid],
						processName: appData.name,
						start: Date.now(),
					};
					const realGames = RunningGameStore.getRunningGames();
					const fakeGames = [fakeGame];
					const realGetRunningGames = RunningGameStore.getRunningGames;
					const realGetGameForPID = RunningGameStore.getGameForPID;
					RunningGameStore.getRunningGames = () => fakeGames;
					RunningGameStore.getGameForPID = (pid) => fakeGames.find(x => x.pid === pid);
					FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: realGames, added: [fakeGame], games: fakeGames});
					
					let fn = data => {
						let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.PLAY_ON_DESKTOP.value);
						console.log(\`Quest progress: \${progress}/\${secondsNeeded}\`);
						
						if(progress >= secondsNeeded) {
							console.log("Quest completed!");
							
							RunningGameStore.getRunningGames = realGetRunningGames;
							RunningGameStore.getGameForPID = realGetGameForPID;
							FluxDispatcher.dispatch({type: "RUNNING_GAMES_CHANGE", removed: [fakeGame], added: [], games: []});
							FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
							
							doJob();
						}
					};
					FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
					
					console.log(\`Spoofed your game to \${applicationName}. Wait for \${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.\`);
				});
			}
		} else if(taskName === "STREAM_ON_DESKTOP") {
			if(!isApp) {
				console.log("This no longer works in browser for non-video quests. Use the discord desktop app to complete the", questName, "quest!");
			} else {
				let realFunc = ApplicationStreamingStore.getStreamerActiveStreamMetadata;
				ApplicationStreamingStore.getStreamerActiveStreamMetadata = () => ({
					id: applicationId,
					pid,
					sourceName: null
				});
				
				let fn = data => {
					let progress = quest.config.configVersion === 1 ? data.userStatus.streamProgressSeconds : Math.floor(data.userStatus.progress.STREAM_ON_DESKTOP.value);
					console.log(\`Quest progress: \${progress}/\${secondsNeeded}\`);
					
					if(progress >= secondsNeeded) {
						console.log("Quest completed!");
						
						ApplicationStreamingStore.getStreamerActiveStreamMetadata = realFunc;
						FluxDispatcher.unsubscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
						
						doJob();
					}
				};
				FluxDispatcher.subscribe("QUESTS_SEND_HEARTBEAT_SUCCESS", fn);
				
				console.log(\`Spoofed your stream to \${applicationName}. Stream any window in vc for \${Math.ceil((secondsNeeded - secondsDone) / 60)} more minutes.\`);
				console.log("Remember that you need at least 1 other person to be in the vc!");
			}
		} else if(taskName === "PLAY_ACTIVITY") {
			const channelId = ChannelStore.getSortedPrivateChannels()[0]?.id ?? Object.values(GuildChannelStore.getAllGuilds()).find(x => x != null && x.VOCAL.length > 0).VOCAL[0].channel.id;
			const streamKey = \`call:\${channelId}:1\`;
			
			let fn = async () => {
				console.log("Completing quest", questName, "-", quest.config.messages.questName);
				
				while(true) {
					const res = await api.post({url: \`/quests/\${quest.id}/heartbeat\`, body: {stream_key: streamKey, terminal: false}});
					const progress = res.body.progress.PLAY_ACTIVITY.value;
					console.log(\`Quest progress: \${progress}/\${secondsNeeded}\`);
					
					await new Promise(resolve => setTimeout(resolve, 20 * 1000));
					
					if(progress >= secondsNeeded) {
						await api.post({url: \`/quests/\${quest.id}/heartbeat\`, body: {stream_key: streamKey, terminal: true}});
						break;
					}
				}
				
				console.log("Quest completed!");
				doJob();
			};
			fn();
		}
	};
	doJob();
}`;

document.getElementById('copyQuestScriptBtn').onclick = async () => {
  if (!isPremium) {
    showNotification('⭐ Quest Completer is a Premium feature!', 'warning');
    return;
  }

  try {
    await navigator.clipboard.writeText(questScriptCode);
    showNotification('✅ Script Copied Successfully!', 'success');
    document.getElementById('copyQuestScriptBtn').innerHTML = t('scriptCopied');
    setTimeout(() => {
      document.getElementById('copyQuestScriptBtn').innerHTML = t('copyQuestScript');
    }, 2000);
  } catch (err) {
    showNotification('❌ Failed to copy script', 'error');
  }
};

// ========== SUPPORT SERVER ==========
const joinSupportBtn = document.getElementById('joinSupportServerBtn');
if (joinSupportBtn) {
  joinSupportBtn.onclick = async () => {
    const supportUrl = 'https://discord.gg/AYF4H5ts8J';
    await shell.openExternal(supportUrl);
    showNotification('Opening support server...', 'info');
  };
}

// ========== DEVELOPER PANEL FUNCTIONS ==========

async function loadAllKeys() {
  console.log('🔍 loadAllKeys called, isDeveloper:', isDeveloper);
  
  if (!isDeveloper) {
    console.log('❌ Not developer, skipping loadAllKeys');
    return;
  }
  
  try {
    const keys = await ipcRenderer.invoke('get-all-keys');
    console.log('📚 Received keys from main:', keys);
    
    const container = document.getElementById('allKeysList');
    if (!container) {
      console.log('❌ allKeysList container not found!');
      return;
    }
    
    const searchTerm = document.getElementById('keySearch')?.value.toLowerCase() || '';
    
    // چاککردنی شێوازی خوێندنەوەی کلیلەکان
    const keysList = keys.allKeys || keys.keys || (Array.isArray(keys) ? keys : []);
    
    if (!keysList || keysList.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #aaa;">🔑 No keys found. Use "node generate-keys.js" to create keys.</div>';
      return;
    }
    
    const filteredKeys = keysList.filter(k => 
      k.key.toLowerCase().includes(searchTerm) ||
      (k.usedBy && k.usedBy.toLowerCase().includes(searchTerm))
    );
    
    const usedCount = keysList.filter(k => k.used === true).length;
    const unusedCount = keysList.filter(k => k.used !== true).length;
    
    container.innerHTML = `
      <div style="margin-bottom: 15px; padding: 10px; background: #0f1117; border-radius: 12px; display: flex; justify-content: space-between; flex-wrap: wrap;">
        <div><strong>📊 Statistics:</strong> Total: ${keysList.length}</div>
        <div style="color: #57f287;">✅ Used: ${usedCount}</div>
        <div style="color: #ed4245;">❌ Unused: ${unusedCount}</div>
      </div>
    `;
    
    // جیاکردنەوەی کلیلەکان بەپێی جۆرەکانیان
    const types = {};
    filteredKeys.forEach(key => {
      const type = key.type || 'normal';
      if (!types[type]) types[type] = [];
      types[type].push(key);
    });
    
    // دروستکردنی بەش بۆ هەر جۆرێک
    for (const [type, typeKeys] of Object.entries(types)) {
      const typeTitle = type.charAt(0).toUpperCase() + type.slice(1);
      
      const typeSection = document.createElement('div');
      
      const usedTypeCount = typeKeys.filter(k => k.used).length;
      const unusedTypeCount = typeKeys.length - usedTypeCount;
      
      const typeHeader = document.createElement('div');
      typeHeader.style.cssText = 'background: #2b2d31; color: #fff; padding: 12px 15px; border-radius: 8px; margin-top: 20px; margin-bottom: 15px; font-size: 15px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; user-select: none; border: 1px solid #1e1f22; transition: 0.2s;';
      const typeIcon = type === 'premium' ? '💎' : type === 'special' ? '⭐' : type === 'developer' ? '👑' : type === 'trial' ? '⏱️' : '🔑';
      
      typeHeader.innerHTML = `
        <div><strong style="color: #5865f2;">${typeIcon} ${typeTitle} Keys</strong> <span style="color: #aaa; font-size: 12px; margin-left: 10px;">(Total: ${typeKeys.length})</span></div>
        <div style="font-size: 12px; display: flex; align-items: center;">
          <span style="color: #57f287; margin-right: 15px; background: rgba(87, 242, 135, 0.1); padding: 3px 8px; border-radius: 12px;">✅ Used: ${usedTypeCount}</span>
          <span style="color: #ed4245; margin-right: 15px; background: rgba(237, 66, 69, 0.1); padding: 3px 8px; border-radius: 12px;">❌ Unused: ${unusedTypeCount}</span>
          <span class="toggle-icon" style="font-size: 10px; transition: transform 0.3s;">▼</span>
        </div>
      `;
      
      const keysContainer = document.createElement('div');
      keysContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; margin-bottom: 20px;';
      
      typeHeader.onclick = () => {
        if (keysContainer.style.display === 'none') {
          keysContainer.style.display = 'grid';
          typeHeader.querySelector('.toggle-icon').style.transform = 'rotate(0deg)';
        } else {
          keysContainer.style.display = 'none';
          typeHeader.querySelector('.toggle-icon').style.transform = 'rotate(-90deg)';
        }
      };
      
      typeSection.appendChild(typeHeader);
      typeSection.appendChild(keysContainer);

      typeKeys.forEach(key => {
        const keyDiv = document.createElement('div');
        keyDiv.className = 'token-entry';
        keyDiv.style.cssText = 'padding: 15px; border-left: 4px solid ' + (key.used ? '#ed4245' : '#57f287') + '; background: #1a1c24; border-radius: 8px; display: flex; flex-direction: column; justify-content: space-between; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';
        
        const statusText = key.used ? 'USED' : 'UNUSED';
        const statusColor = key.used ? '#ed4245' : '#57f287';
        
        keyDiv.innerHTML = `
          <div style="font-family: monospace; font-size: 13px; font-weight: bold; color: ${statusColor}; word-break: break-all; margin-bottom: 10px;">
            🔑 ${escapeHtml(key.key)}
          </div>
          <div style="font-size: 11px; color: #aaa; display: flex; justify-content: space-between; border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 8px;">
            <span>📊 <span style="color: ${statusColor}; font-weight: bold;">${statusText}</span></span>
            <span>📅 ${new Date(key.createdAt).toLocaleDateString()}</span>
          </div>
          ${key.used ? `
          <div style="font-size: 11px; color: #aaa; background: #2b2d31; padding: 8px; border-radius: 6px;">
            👤 Used by: <strong style="color: #57f287;">${escapeHtml(key.usedBy)}</strong><br>
            <span style="color: #888; font-size: 10px; display: inline-block; margin-top: 4px;">🕐 ${new Date(key.usedAt).toLocaleString()}</span>
          </div>
          ` : `
          <div style="font-size: 11px; color: #888; text-align: center; padding: 8px; background: #2b2d31; border-radius: 6px;">
            ✨ Ready to use
          </div>
          `}
        `;
        keysContainer.appendChild(keyDiv);
      });
      
      container.appendChild(typeSection);
    }
    
    console.log('✅ Keys loaded successfully, displayed:', filteredKeys.length);
  } catch (error) {
    console.error('❌ Error loading keys:', error);
    const container = document.getElementById('allKeysList');
    if (container) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ed4245;">❌ Error loading keys: ' + error.message + '</div>';
    }
  }
}

async function loadAllUsers() {
  if (!isDeveloper) return;
  
  try {
    const users = await ipcRenderer.invoke('get-all-users');
    console.log('📚 Received users from main:', users);
    
    const container = document.getElementById('allUsersList');
    if (!container) return;
    
    const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
    
    // چاککردنی شێوازی خوێندنەوەی بەکارهێنەران
    const usersList = users.users || (Array.isArray(users) ? users : []);
    
    if (!usersList || usersList.length === 0) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #aaa;">👥 No users found.</div>';
      return;
    }
    
    const filteredUsers = usersList.filter(u => 
      (u.username && u.username.toLowerCase().includes(searchTerm)) ||
      (u.machineId && u.machineId.toLowerCase().includes(searchTerm))
    );
    
    container.innerHTML = `
      <div style="margin-bottom: 15px; padding: 10px; background: #0f1117; border-radius: 12px;">
        <strong>📊 Statistics:</strong> Total Users: ${usersList.length}
      </div>
    `;
    
    filteredUsers.forEach(user => {
      const userDiv = document.createElement('div');
      userDiv.className = 'token-entry';
      userDiv.style.cssText = 'margin-bottom: 10px; padding: 12px; flex-direction: column; align-items: flex-start; background: #1a1c24; border-radius: 12px;';
      
      let roleBadge = '';
      if (user.isDeveloper) {
        roleBadge = '<span style="background: #f0b232; color: #000; padding: 2px 8px; border-radius: 20px; font-size: 10px; margin-right: 5px; font-weight: bold;">👑 Developer</span>';
      } else if (user.keyType === 'premium' || user.keyType === 'special') {
        roleBadge = '<span style="background: #ff73fa; color: #fff; padding: 2px 8px; border-radius: 20px; font-size: 10px; margin-right: 5px; font-weight: bold;">💎 Premium</span>';
      } else if (user.keyType === 'trial') {
        roleBadge = '<span style="background: #e67e22; color: #fff; padding: 2px 8px; border-radius: 20px; font-size: 10px; margin-right: 5px; font-weight: bold;">⏱️ Trial</span>';
      } else if (user.usedKey) {
        roleBadge = '<span style="background: #5865f2; color: #fff; padding: 2px 8px; border-radius: 20px; font-size: 10px; margin-right: 5px; font-weight: bold;">👤 Normal</span>';
      }

      userDiv.innerHTML = `
        <div style="display: flex; justify-content: space-between; width: 100%; flex-wrap: wrap;">
          <div>
            <strong style="color: #5865f2;">👤 ${escapeHtml(user.username || 'User')}</strong>
            <span style="font-size: 11px; color: #aaa; margin-left: 10px;">ID: ${escapeHtml(user.machineId?.substring(0, 8) || 'N/A')}</span>
          </div>
          <div>
            ${roleBadge}
            <span style="background: ${user.usedKey || user.isDeveloper ? '#23a55a' : '#da373c'}; color: #fff; padding: 2px 8px; border-radius: 20px; font-size: 10px;">
              ${user.usedKey || user.isDeveloper ? '✅ Active' : '❌ Inactive'}
            </span>
          </div>
        </div>
        <div style="font-size: 12px; color: #aaa; margin-top: 8px;">
          🔑 Key: ${user.usedKey ? escapeHtml(user.usedKey) : 'No key assigned'}
        </div>
        <div style="font-size: 11px; color: #666; margin-top: 5px;">
          🖥️ Machine ID: ${escapeHtml(user.machineId || 'Unknown')}
        </div>
        <div style="font-size: 11px; color: #666; margin-top: 5px;">
          📅 Joined: ${new Date(user.createdAt).toLocaleString()}
        </div>
      `;
      container.appendChild(userDiv);
    });
    
    console.log('✅ Users loaded successfully, displayed:', filteredUsers.length);
  } catch (error) {
    console.error('❌ Error loading users:', error);
    const container = document.getElementById('allUsersList');
    if (container) {
      container.innerHTML = '<div style="text-align: center; padding: 40px; color: #ed4245;">❌ Error loading users: ' + error.message + '</div>';
    }
  }
}

// Refresh buttons
const refreshKeysBtn = document.getElementById('refreshKeysBtn');
if (refreshKeysBtn) {
  refreshKeysBtn.addEventListener('click', () => {
    console.log('🔄 Refresh keys button clicked');
    loadAllKeys();
  });
}

const refreshUsersBtn = document.getElementById('refreshUsersBtn');
if (refreshUsersBtn) {
  refreshUsersBtn.addEventListener('click', () => {
    console.log('🔄 Refresh users button clicked');
    loadAllUsers();
  });
}

['genNormalKeyBtn', 'genPremiumKeyBtn', 'genTrialKeyBtn'].forEach(id => {
  const btn = document.getElementById(id);
  if (btn) {
    btn.addEventListener('click', async () => {
      const typeMap = { 'genNormalKeyBtn': 'normal', 'genPremiumKeyBtn': 'premium', 'genTrialKeyBtn': 'trial' };
      const type = typeMap[id];
      const result = await ipcRenderer.invoke('generate-new-key', { type });
      if (result.success) {
        showNotification(`✅ Generated: ${result.key}`, 'success');
        loadAllKeys();
      } else {
        showNotification(`❌ Error: ${result.error}`, 'error');
      }
    });
  }
});

// Search inputs
const keySearch = document.getElementById('keySearch');
if (keySearch) {
  keySearch.addEventListener('input', () => {
    console.log('🔍 Searching keys:', keySearch.value);
    loadAllKeys();
  });
}

const userSearch = document.getElementById('userSearch');
if (userSearch) {
  userSearch.addEventListener('input', () => {
    console.log('🔍 Searching users:', userSearch.value);
    loadAllUsers();
  });
}

// Repair user key
const repairUserKeyBtn = document.getElementById('repairUserKeyBtn');
if (repairUserKeyBtn) {
  repairUserKeyBtn.addEventListener('click', async () => {
    const username = document.getElementById('repairUsername').value.trim();
    const newKey = document.getElementById('repairNewKey').value.trim();
    const resultDiv = document.getElementById('repairResult');
    
    if (!username) {
      if (resultDiv) resultDiv.innerHTML = '<span style="color: #ed4245;">❌ Please enter username!</span>';
      return;
    }
    
    if (resultDiv) resultDiv.innerHTML = '<span style="color: #aaa;">⏳ Processing...</span>';
    
    const result = await ipcRenderer.invoke('repair-user-key-by-admin', { username, newKey });
    
    if (result.success) {
      if (resultDiv) resultDiv.innerHTML = `<span style="color: #57f287;">✅ ${result.message}<br>New Key: ${result.newKey}</span>`;
      showNotification('Key repaired successfully!', 'success');
      loadAllKeys();
      loadAllUsers();
      document.getElementById('repairUsername').value = '';
      document.getElementById('repairNewKey').value = '';
    } else {
      if (resultDiv) resultDiv.innerHTML = `<span style="color: #ed4245;">❌ ${result.error}</span>`;
    }
  });
}

// ========== SEARCH ==========
const tokenSearchInput = document.getElementById('tokenSearch');
if (tokenSearchInput) tokenSearchInput.addEventListener('input', () => updateTokensUI());

const mfaCodeInput = document.getElementById('mfaCode');
if (mfaCodeInput) {
  mfaCodeInput.addEventListener('input', (e) => {
    if (e.target.value.length === 6) {
      document.getElementById('fetchTokenBtn').click();
    }
  });
}

// ========== INITIALIZE ==========
updateAllTexts();
checkSession();

// ========== جێگیرکردنی باکگراوند بۆ شاشەی کۆمپیوتەر ==========
window.addEventListener('DOMContentLoaded', () => {
  document.body.style.backgroundSize = "cover";
  document.body.style.backgroundPosition = "center";
  document.body.style.backgroundAttachment = "fixed";
  document.body.style.backgroundRepeat = "no-repeat";
});