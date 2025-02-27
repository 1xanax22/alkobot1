// Инициализация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBsVVKxvVrGKJ_YjFrqzQHlNvZhHYhOBtk",
    authDomain: "alkobot-7de63.firebaseapp.com",
    databaseURL: "https://alkobot-7de63-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "alkobot-7de63",
    storageBucket: "alkobot-7de63.appspot.com",
    messagingSenderId: "228623628440",
    appId: "1:228623628440:web:0c8777b0c4b6f5c6c4c0b5",
    measurementId: "G-YPXP9GGZR1"
};

// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
tg.ready();

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Получение элементов DOM
const timerDisplay = document.getElementById('timer');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const friendsList = document.getElementById('friendsList');
const friendUsernameInput = document.getElementById('friendUsername');
const addFriendBtn = document.getElementById('addFriendBtn');
const inviteFriendBtn = document.getElementById('inviteFriendBtn');
const navHome = document.getElementById('navHome');
const navStats = document.getElementById('navStats');
const homeScreen = document.getElementById('homeScreen');
const statsScreen = document.getElementById('statsScreen');
const statsContent = document.getElementById('statsContent');

// Получение ID пользователя из Telegram
const userId = tg.initDataUnsafe?.user?.id || 'anonymous';

// Хранение данных
let startTime = localStorage.getItem('startTime');
let timerInterval;
let friends = JSON.parse(localStorage.getItem('friends') || '[]');

// Функция обновления таймера
function updateTimer() {
    if (!startTime) {
        timerDisplay.textContent = 'Нажми "Старт"';
        return;
    }

    const now = new Date().getTime();
    const start = new Date(startTime).getTime();
    const diff = now - start;

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    timerDisplay.textContent = `${days} дн, ${hours} ч, ${minutes} мин, ${seconds} сек`;
}

// Обновляем таймер каждую секунду
function startRealtimeTimer() {
    updateTimer();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
}

// Останавливаем таймер
function stopRealtimeTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Обработчики событий для кнопок
startBtn.addEventListener('click', () => {
    startTime = new Date().toISOString();
    localStorage.setItem('startTime', startTime);
    
    // Сохраняем в базу данных
    database.ref(`users/${userId}`).update({
        startTime: startTime
    });

    startBtn.style.display = 'none';
    resetBtn.style.display = 'inline';
    startRealtimeTimer();
});

resetBtn.addEventListener('click', () => {
    startTime = null;
    localStorage.removeItem('startTime');
    
    // Удаляем из базы данных
    database.ref(`users/${userId}/startTime`).remove();

    startBtn.style.display = 'inline';
    resetBtn.style.display = 'none';
    stopRealtimeTimer();
    updateTimer();
});

// Функция для рендеринга списка друзей
function renderFriends() {
    friendsList.innerHTML = '';
    friends.forEach((friend, index) => {
        const li = document.createElement('li');
        li.textContent = friend;
        friendsList.appendChild(li);
    });
}

// Функция для расчета времени
function calculateTime(startTimeISO) {
    if (!startTimeISO) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    
    const now = new Date().getTime();
    const start = new Date(startTimeISO).getTime();
    const diff = now - start;

    return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000)
    };
}

// Добавление друга
addFriendBtn.addEventListener('click', () => {
    const username = friendUsernameInput.value.trim();
    if (username && !friends.includes(username)) {
        friends.push(username);
        localStorage.setItem('friends', JSON.stringify(friends));
        
        // Добавляем друга в базу данных
        database.ref(`users/${userId}/friends`).set(friends);
        
        renderFriends();
        friendUsernameInput.value = '';
    }
});

// Приглашение друга
inviteFriendBtn.addEventListener('click', () => {
    tg.switchInlineQuery('Присоединяйся к челленджу трезвости!');
});

// Функция для навигации
function handleNavigation(btn, screen) {
    return () => {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        screen.classList.add('active');
        btn.classList.add('active');
        if (screen === statsScreen) updateStats();
    };
}

navHome.addEventListener('click', handleNavigation(navHome, homeScreen));
navStats.addEventListener('click', handleNavigation(navStats, statsScreen));

// Функция для обновления статистики
function updateStats() {
    database.ref('users').once('value')
        .then((snapshot) => {
            const users = snapshot.val() || {};
            let totalUsers = 0;
            let activeSober = 0;
            
            for (const userId in users) {
                totalUsers++;
                if (users[userId].startTime) activeSober++;
            }
            
            statsContent.innerHTML = `
                <p>Всего участников: ${totalUsers}</p>
                <p>Сейчас не пьют: ${activeSober}</p>
            `;
        })
        .catch(error => {
            console.error('Ошибка при загрузке статистики:', error);
            statsContent.innerHTML = '<p>Ошибка при загрузке статистики</p>';
        });
}

// Инициализация
if (startTime) {
    startBtn.style.display = 'none';
    resetBtn.style.display = 'inline';
    startRealtimeTimer();
}

renderFriends();

// Загружаем данные из Firebase при старте
database.ref(`users/${userId}`).once('value')
    .then((snapshot) => {
        const userData = snapshot.val() || {};
        if (userData.startTime) {
            startTime = userData.startTime;
            localStorage.setItem('startTime', startTime);
            startBtn.style.display = 'none';
            resetBtn.style.display = 'inline';
            startRealtimeTimer();
        }
        if (userData.friends) {
            friends = userData.friends;
            localStorage.setItem('friends', JSON.stringify(friends));
            renderFriends();
        }
    });
