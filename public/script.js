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
const setDateBtn = document.getElementById('setDateBtn');
const customDateInput = document.getElementById('customDate');
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
let startTime = null;
let timerInterval;
let friends = [];

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
    
    // Сохраняем в базу данных
    database.ref(`users/${userId}`).update({
        startTime: startTime,
        username: tg.initDataUnsafe?.user?.username || null,
        firstName: tg.initDataUnsafe?.user?.first_name || null
    });

    startBtn.style.display = 'none';
    resetBtn.style.display = 'inline';
    startRealtimeTimer();
});

resetBtn.addEventListener('click', () => {
    startTime = null;
    
    // Удаляем из базы данных
    database.ref(`users/${userId}/startTime`).remove();

    startBtn.style.display = 'inline';
    resetBtn.style.display = 'none';
    stopRealtimeTimer();
    updateTimer();
});

// Обработчик выбора даты
setDateBtn.addEventListener('click', () => {
    customDateInput.style.display = 'block';
    customDateInput.focus();
});

customDateInput.addEventListener('change', () => {
    const selectedDate = new Date(customDateInput.value);
    startTime = selectedDate.toISOString();
    
    // Сохраняем в базу данных
    database.ref(`users/${userId}`).update({
        startTime: startTime
    });

    startBtn.style.display = 'none';
    resetBtn.style.display = 'inline';
    customDateInput.style.display = 'none';
    startRealtimeTimer();
});

// Функция для рендеринга списка друзей
function renderFriends() {
    friendsList.innerHTML = '';
    friends.forEach((friend, index) => {
        const li = document.createElement('li');
        li.className = 'friend-item';
        
        // Получаем данные друга из базы данных
        database.ref('users').once('value')
            .then((snapshot) => {
                const users = snapshot.val();
                let foundUser = null;
                
                // Ищем пользователя по username
                for (const uid in users) {
                    if (users[uid].username === friend) {
                        foundUser = users[uid];
                        break;
                    }
                }
                
                if (foundUser) {
                    const time = calculateTime(foundUser.startTime);
                    const timeStr = foundUser.startTime ? 
                        `${time.days}д ${time.hours}ч ${time.minutes}м` : 
                        'Не начал';
                    
                    const displayName = foundUser.firstName ? 
                        `${foundUser.firstName} (@${friend})` : 
                        `@${friend}`;
                    
                    li.innerHTML = `
                        <span class="friend-name">${displayName}</span>
                        <span class="friend-time">${timeStr}</span>
                        <button class="delete-friend" data-index="${index}">✕</button>
                    `;
                } else {
                    li.innerHTML = `
                        <span class="friend-name">@${friend}</span>
                        <span class="friend-time">Не найден</span>
                        <button class="delete-friend" data-index="${index}">✕</button>
                    `;
                }
            })
            .catch(error => {
                console.error('Ошибка при загрузке времени друга:', error);
                li.innerHTML = `
                    <span class="friend-name">@${friend}</span>
                    <span class="friend-time">Ошибка</span>
                    <button class="delete-friend" data-index="${index}">✕</button>
                `;
            });
        
        friendsList.appendChild(li);
    });
}

// Добавление друга
addFriendBtn.addEventListener('click', () => {
    let username = friendUsernameInput.value.trim();
    if (!username) return;
    
    // Удаляем @ если есть
    if (username.startsWith('@')) {
        username = username.substring(1);
    }
    
    if (friends.includes(username)) {
        alert('Этот друг уже добавлен');
        return;
    }

    // Проверяем существование пользователя
    database.ref('users').once('value')
        .then((snapshot) => {
            const users = snapshot.val();
            let userExists = false;
            
            // Ищем пользователя по username
            for (const uid in users) {
                if (users[uid].username === username) {
                    userExists = true;
                    break;
                }
            }
            
            if (userExists) {
                friends.push(username);
                
                // Добавляем друга в базу данных
                database.ref(`users/${userId}/friends`).set(friends);
                
                renderFriends();
                friendUsernameInput.value = '';
            } else {
                alert('Пользователь еще не использовал приложение');
            }
        })
        .catch(error => {
            console.error('Ошибка при проверке пользователя:', error);
            alert('Ошибка при добавлении друга');
        });
});

// Обработчик удаления друзей
friendsList.addEventListener('click', (e) => {
    if (e.target.classList.contains('delete-friend')) {
        const index = e.target.dataset.index;
        friends.splice(index, 1);
        
        // Обновляем список друзей в базе данных
        database.ref(`users/${userId}/friends`).set(friends);
        
        renderFriends();
    }
});

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

// Приглашение друга
inviteFriendBtn.addEventListener('click', () => {
    tg.switchInlineQuery('Присоединяйся к челленджу трезвости!');
});

// Обработчики событий для навигации
navHome.addEventListener('click', () => {
    homeScreen.style.display = 'block';
    statsScreen.style.display = 'none';
    navHome.classList.add('active');
    navStats.classList.remove('active');
});

navStats.addEventListener('click', () => {
    homeScreen.style.display = 'none';
    statsScreen.style.display = 'block';
    navStats.classList.add('active');
    navHome.classList.remove('active');
});

// Инициализация состояния навигации
homeScreen.style.display = 'block';
statsScreen.style.display = 'none';
navHome.classList.add('active');

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

// Слушаем изменения данных пользователя в Firebase
database.ref(`users/${userId}`).on('value', (snapshot) => {
    const userData = snapshot.val() || {};
    
    // Обновляем startTime
    if (userData.startTime !== startTime) {
        startTime = userData.startTime;
        if (startTime) {
            startBtn.style.display = 'none';
            resetBtn.style.display = 'inline';
            startRealtimeTimer();
        } else {
            startBtn.style.display = 'inline';
            resetBtn.style.display = 'none';
            stopRealtimeTimer();
            updateTimer();
        }
    }
    
    // Обновляем список друзей
    if (userData.friends) {
        friends = userData.friends;
        renderFriends();
    }
});

// Инициализация при загрузке страницы
database.ref(`users/${userId}`).once('value')
    .then((snapshot) => {
        const userData = snapshot.val() || {};
        
        // Сохраняем username и имя пользователя
        if (tg.initDataUnsafe?.user?.username) {
            database.ref(`users/${userId}`).update({
                username: tg.initDataUnsafe.user.username,
                firstName: tg.initDataUnsafe.user.first_name || null
            });
        }
        
        // Восстанавливаем время старта
        if (userData.startTime) {
            startTime = userData.startTime;
            startBtn.style.display = 'none';
            resetBtn.style.display = 'inline';
            startRealtimeTimer();
        }
        
        // Восстанавливаем список друзей
        if (userData.friends) {
            friends = userData.friends;
        }
        
        renderFriends();
    });
