const { activateFreeMonth } = require('./firebase');

// Rate limiting map
const rateLimit = new Map();
const RATE_LIMIT = 5; // requests
const TIME_WINDOW = 60000; // 1 minute

const BOT_TOKEN = process.env.BOT_TOKEN;

async function sendTelegramMessage(chatId, text, extra = {}) {
    try {
        const response = await fetch(
            `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: text,
                    ...extra
                })
            }
        );
        return await response.json();
    } catch (error) {
        console.error('Error sending telegram message:', error);
        throw error;
    }
}

async function handler(req, res) {
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

    // Валидация username
    const username = req.query.username;
    if (!username || typeof username !== 'string' || username.length > 32 || !/^[a-zA-Z0-9_]*$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' });
    }

    try {
        const response = await fetch(
            `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getChat?chat_id=@${encodeURIComponent(username)}`
        );
        const data = await response.json();
        
        if (data.ok) {
            return res.status(200).json({
                ok: true,
                userId: data.result.id,
                username: data.result.username
            });
        } else {
            return res.status(404).json({
                ok: false,
                error: 'User not found'
            });
        }
    } catch (error) {
        console.error('Telegram API Error:', error);
        return res.status(500).json({ error: 'Failed to fetch user data' });
    }
}

// Обработка команды start с реферальной ссылкой
async function startHandler(req, res) {
    try {
        const { userId, startParam } = req.body;
        
        // Проверяем, является ли это реферальной ссылкой
        if (startParam && startParam.startsWith('ref_')) {
            const referrerId = startParam.split('_')[1];
            
            // Активируем бесплатный месяц
            const activated = await activateFreeMonth(userId, referrerId);
            
            if (activated) {
                // Отправляем сообщение новому пользователю
                await sendTelegramMessage(userId, 'Поздравляем! 🎉 Вы получили бесплатный месяц премиум-подписки!');
                
                // Отправляем сообщение пригласившему
                await sendTelegramMessage(referrerId, 'Ваш друг присоединился к челленджу! 🎈');
            }
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error handling start command:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// Обработчик команд от пользователя
async function handleCommand(command, userId) {
    try {
        switch (command) {
            case '/admin':
                if (userId === '455635951') {
                    const adminUrl = 'https://stopalko01-bot.web.app/admin.html';
                    await sendTelegramMessage(userId, "Нажмите кнопку ниже, чтобы открыть админ-панель:", {
                        reply_markup: JSON.stringify({
                            inline_keyboard: [
                                [{
                                    text: "Открыть админ-панель",
                                    web_app: { url: adminUrl }
                                }]
                            ]
                        })
                    });
                }
                break;
                
            default:
                break;
        }
    } catch (error) {
        console.error('Error handling command:', error);
    }
}

// Обработчик для API эндпоинта
async function commandHandler(req, res) {
    try {
        const { command, userId } = req.body;
        await handleCommand(command, userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error in command handler:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

module.exports = {
    handler,
    startHandler,
    handleCommand,
    commandHandler,
    sendTelegramMessage
};