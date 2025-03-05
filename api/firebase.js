const admin = require('firebase-admin');

// Инициализация Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL
    });
}

const database = admin.database();

// Rate limiting map
const rateLimit = new Map();
const RATE_LIMIT = 5; // requests
const TIME_WINDOW = 60000; // 1 minute

function handler(req, res) {
    // Проверка метода
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Rate limiting
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();
    const userRequests = rateLimit.get(ip) || [];
    const recentRequests = userRequests.filter(time => now - time < TIME_WINDOW);
    
    if (recentRequests.length >= RATE_LIMIT) {
        return res.status(429).json({ error: 'Too many requests' });
    }
    
    recentRequests.push(now);
    rateLimit.set(ip, recentRequests);

    // Проверка origin
    const origin = req.headers.origin || '';
    const allowedOrigins = [
        'https://t.me',
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : ''
    ].filter(Boolean);

    if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    // Полная конфигурация только на сервере
    const fullConfig = {
        apiKey: process.env.FIREBASE_API_KEY,
        authDomain: process.env.FIREBASE_AUTH_DOMAIN,
        databaseURL: process.env.FIREBASE_DATABASE_URL,
        projectId: process.env.FIREBASE_PROJECT_ID,
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.FIREBASE_APP_ID,
        measurementId: process.env.FIREBASE_MEASUREMENT_ID
    };

    // Отправляем клиенту минимальную конфигурацию
    const clientConfig = {
        databaseURL: fullConfig.databaseURL,
        projectId: fullConfig.projectId
    };

    // Устанавливаем security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    res.status(200).json({
        firebaseConfig: clientConfig,
        botUsername: process.env.BOT_USERNAME
    });
}

// Функция для получения настроек подписки
async function getSubscriptionSettings() {
    const snapshot = await database.ref('settings/subscription').once('value');
    return snapshot.val() || {
        freeMonthEnabled: true,
        freeMonthDays: 30
    };
}

// Функция для обновления настроек подписки
async function updateSubscriptionSettings(settings) {
    await database.ref('settings/subscription').update(settings);
}

// Функция для активации бесплатного месяца
async function activateFreeMonth(userId, referrerId) {
    try {
        // Получаем настройки подписки
        const settingsSnapshot = await database.ref('settings/subscription').once('value');
        const settings = settingsSnapshot.val() || { freeMonthEnabled: true, freeMonthDays: 30 };
        
        if (settings.freeMonthEnabled) {
            const now = new Date();
            const endDate = new Date(now.getTime() + (settings.freeMonthDays * 24 * 60 * 60 * 1000));
            
            await database.ref(`users/${userId}/subscription`).set({
                type: 'free_month',
                startDate: now.getTime(),
                endDate: endDate.getTime(),
                referrerId: referrerId
            });
            
            return true;
        }
        
        return false;
    } catch (error) {
        console.error('Error activating free month:', error);
        return false;
    }
}

module.exports = {
    handler,
    activateFreeMonth,
    database,
    getSubscriptionSettings,
    updateSubscriptionSettings
};