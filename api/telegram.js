// Rate limiting map
const rateLimit = new Map();
const RATE_LIMIT = 5; // requests
const TIME_WINDOW = 60000; // 1 minute

export default async function handler(req, res) {
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
