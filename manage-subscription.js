const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Инициализация Firebase Admin
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://alkobot-7de63-default-rtdb.europe-west1.firebasedatabase.app'
});

const database = admin.database();

// Функция для включения бесплатного периода
async function enableFreeMonth(days) {
    try {
        await database.ref('settings/subscription').update({
            freeMonthEnabled: true,
            freeMonthDays: days
        });
        console.log('✅ Бесплатная подписка включена');
        console.log(`📅 Длительность: ${days} дней`);
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

// Функция для выключения бесплатного периода
async function disableFreeMonth() {
    try {
        await database.ref('settings/subscription').update({
            freeMonthEnabled: false
        });
        console.log('✅ Бесплатная подписка выключена');
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

// Функция для получения статистики пользователей
async function getUserStats() {
    try {
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        
        const totalUsers = Object.keys(users).length;
        const subscribedUsers = Object.values(users).filter(user => user.subscriptionEndDate && user.subscriptionEndDate > Date.now()).length;
        
        console.log('\n📊 Статистика пользователей:');
        console.log(`👥 Всего пользователей: ${totalUsers}`);
        console.log(`💎 С активной подпиской: ${subscribedUsers}`);
        console.log(`📈 Процент платящих: ${((subscribedUsers / totalUsers) * 100).toFixed(1)}%\n`);
    } catch (error) {
        console.error('❌ Ошибка:', error);
    }
}

// Обработка аргументов командной строки
const command = process.argv[2];
const days = parseInt(process.argv[3]);

async function main() {
    switch (command) {
        case 'on':
            if (isNaN(days) || days <= 0) {
                console.error('❌ Укажите корректное количество дней');
                console.log('\n📝 Примеры использования:');
                console.log('node manage-subscription.js on 30    # Включить на 30 дней');
                console.log('node manage-subscription.js off      # Выключить');
                console.log('node manage-subscription.js stats    # Показать статистику');
                process.exit(1);
            }
            await enableFreeMonth(days);
            break;
            
        case 'off':
            await disableFreeMonth();
            break;
            
        case 'stats':
            await getUserStats();
            break;
            
        default:
            console.log('📝 Примеры использования:');
            console.log('node manage-subscription.js on 30    # Включить на 30 дней');
            console.log('node manage-subscription.js off      # Выключить');
            console.log('node manage-subscription.js stats    # Показать статистику');
    }
    process.exit();
}

main();
