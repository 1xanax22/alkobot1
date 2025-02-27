// Инициализация Telegram Web App
const tg = window.Telegram.WebApp;
if (!tg || typeof tg.ready !== 'function') {
    console.error('Telegram WebApp SDK не загружен');
    alert('Ошибка: Telegram WebApp SDK не загружен. Проверь подключение в index.html.');
} else {
    tg.ready();
}

// Загружаем конфигурацию Firebase и токен бота через API Vercel
fetch('/api/firebase')
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка загрузки конфигурации Firebase: ${response.status} - ${response.statusText}`);
        }
        return response.json();
    })
    .then(data => {
        const { firebaseConfig, botUsername } = data;

        // Проверка загрузки Firebase SDK
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK не загружен');
            alert('Ошибка: Firebase SDK не загружен. Проверь подключение в index.html.');
            return;
        }

        // Инициализация Firebase
        firebase.initializeApp(firebaseConfig);
        const database = firebase.database();

        // Элементы DOM
        const timerDisplay = document.getElementById('timer');
        const startBtn = document.getElementById('startBtn');
        const resetBtn = document.getElementById('resetBtn');
        const friendUsernameInput = document.getElementById('friendUsername');
        const addFriendBtn = document.getElementById('addFriendBtn');
        const inviteFriendBtn = document.getElementById('inviteFriendBtn');
        const friendsList = document.getElementById('friendsList');
        const homeScreen = document.getElementById('homeScreen');
        const statsScreen = document.getElementById('statsScreen');
        const navHome = document.getElementById('navHome');
        const navStats = document.getElementById('navStats');
        const friendCount = document.getElementById('friendCount');
        const totalSoberTime = document.getElementById('totalSoberTime');

        // Функция для безопасного экранирования HTML
        function escapeHtml(unsafe) {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        }

        // Функция для безопасного сохранения в localStorage
        function secureStore(key, value) {
            try {
                const encryptedValue = btoa(JSON.stringify(value));
                localStorage.setItem(key, encryptedValue);
            } catch (error) {
                console.error('Error storing data:', error);
            }
        }

        // Функция для безопасного чтения из localStorage
        function secureRead(key) {
            try {
                const value = localStorage.getItem(key);
                return value ? JSON.parse(atob(value)) : null;
            } catch (error) {
                console.error('Error reading data:', error);
                return null;
            }
        }

        // Получение ID пользователя из Telegram
        const userId = tg.initDataUnsafe?.user?.id || 'anonymous';

        // Хранение данных
        let startTime = secureRead(`startTime_${userId}`);
        let friends = secureRead(`friends_${userId}`) || [];
        let timerInterval = null;

        // Функция обновления таймера
        function updateTimer() {
            if (!startTime) {
                timerDisplay.innerText = 'Нажми "Старт"!';
                timerDisplay.classList.remove('active');
                return;
            }
            const now = new Date();
            const start = new Date(startTime);
            const diff = Math.max(0, now - start);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            timerDisplay.innerText = `${days} дн, ${hours} ч, ${minutes} мин, ${seconds} сек`;
            timerDisplay.classList.add('active');

            database.ref(`users/${userId}`).set({
                startTime: startTime,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }).catch(error => console.error("Ошибка сохранения в Firebase:", error));
        }

        // Обновляем таймер каждую секунду
        function startRealtimeTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            updateTimer();
            timerInterval = setInterval(updateTimer, 1000);
        }

        // Останавливаем таймер
        function stopRealtimeTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
        }

        if (startTime) {
            startBtn.style.display = 'none';
            resetBtn.style.display = 'inline';
            startRealtimeTimer();
        }

        startBtn.addEventListener('click', () => {
            startTime = new Date().toISOString();
            secureStore(`startTime_${userId}`, startTime);
            startBtn.style.display = 'none';
            resetBtn.style.display = 'inline';
            startRealtimeTimer();
        });

        resetBtn.addEventListener('click', () => {
            startTime = null;
            stopRealtimeTimer();
            secureStore(`startTime_${userId}`, startTime);
            timerDisplay.innerText = 'Нажми "Старт"!';
            timerDisplay.classList.remove('active');
            startBtn.style.display = 'inline';
            resetBtn.style.display = 'none';
            database.ref(`users/${userId}`).remove().catch(error => console.error("Ошибка удаления из Firebase:", error));
        });

        // Функция для рендеринга списка друзей
        function renderFriends() {
            friendsList.innerHTML = '';
            friends.forEach(friend => {
                const friendRef = database.ref(`users/${friend.id}`);
                friendRef.on('value', (snapshot) => {
                    const friendData = snapshot.val();
                    const li = document.createElement('li');
                    li.textContent = `${escapeHtml(friend.username || `Друг ${friend.id}`)}: ${friendData?.startTime ? calculateTime(friendData.startTime) : 'не начал'}`;
                    friendsList.appendChild(li);
                }, (error) => console.error("Ошибка загрузки данных друга:", error));
            });
        }
        renderFriends();

        // Функция для расчета времени
        function calculateTime(startTimeISO) {
            const start = new Date(startTimeISO);
            const now = new Date();
            const diff = Math.max(0, now - start);
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            return `${days} дн, ${hours} ч, ${minutes} мин, ${seconds} сек`;
        }

        // Добавление друга
        addFriendBtn.addEventListener('click', async () => {
            let username = friendUsernameInput.value.trim();
            if (username.startsWith('@')) username = username.slice(1);
            if (!username || !/^[a-zA-Z0-9_]{5,32}$/.test(username)) {
                alert('Неверный формат имени пользователя!');
                return;
            }

            try {
                const response = await fetch(`/api/telegram?username=${encodeURIComponent(username)}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                
                if (data.ok) {
                    const friendId = data.userId;
                    const friendRef = database.ref(`users/${friendId}`);
                    const snapshot = await new Promise((resolve, reject) => {
                        friendRef.once('value', resolve, reject);
                    });
                    
                    if (!snapshot.exists()) {
                        alert('Друг не активировал приложение! Пригласите его заново.');
                        return;
                    }
                    
                    if (!friends.some(f => f.id === friendId)) {
                        friends.push({ id: friendId, username: `@${username}` });
                        secureStore(`friends_${userId}`, friends);
                        renderFriends();
                        friendUsernameInput.value = '';
                    } else {
                        alert('Этот друг уже добавлен!');
                    }
                } else {
                    alert('Пользователь не найден или ник неверный! Пригласите друга.');
                }
            } catch (error) {
                alert('Ошибка при добавлении друга. Проверь ник и попробуй ещё раз.');
                console.error('API Error:', error);
            }
        });

        // Функция для отправки приглашения
        inviteFriendBtn.addEventListener('click', () => {
            const inviteLink = `https://t.me/${botUsername}?start=invite_${userId}`;
            const imageUrl = 'https://i.imgur.com/abc123xyz.jpg'; // Замени на реальный URL твоего изображения
            const message = encodeURIComponent(
                `Приглашение от друга!\nЯ не пью уже ${timerDisplay.innerText} — теперь твоя очередь сиять!\nПрисоединяйся и начни свой путь к трезвости!\n`
            );
            const telegramLink = `https://t.me/share/url?url=${inviteLink}&text=${message}&media=${imageUrl}`;
            tg.openTelegramLink(telegramLink);
            console.log('Invite Link Opened:', telegramLink);
        });

        // Обработка стартового параметра для авторегистрации друга
        const startParam = tg.initDataUnsafe.start_param;
        if (startParam && startParam.startsWith('invite_')) {
            const inviterId = startParam.replace('invite_', '');
            const currentUserRef = database.ref(`users/${userId}`);
            currentUserRef.once('value', (snapshot) => {
                if (!snapshot.exists()) {
                    currentUserRef.set({
                        inviterId: inviterId,
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    }).then(() => {
                        console.log(`Пользователь ${userId} зарегистрирован по приглашению от ${inviterId}`);
                    }).catch(error => console.error("Ошибка регистрации:", error));
                }
            });
        }

        // Функция для навигации
        function handleNavigation(btn, screen) {
            return function () {
                homeScreen.classList.remove('active');
                statsScreen.classList.remove('active');
                navHome.classList.remove('active');
                navStats.classList.remove('active');
                screen.classList.add('active');
                btn.classList.add('active');
                if (screen === statsScreen) updateStats();
                console.log(`Переключено на ${screen.id}, active: ${btn.classList.contains('active')}`);
            };
        }

        navHome.addEventListener('click', handleNavigation(navHome, homeScreen));
        navHome.addEventListener('touchstart', handleNavigation(navHome, homeScreen));
        navStats.addEventListener('click', handleNavigation(navStats, statsScreen));
        navStats.addEventListener('touchstart', handleNavigation(navStats, statsScreen));

        // Функция для обновления статистики
        function updateStats() {
            const friendCountValue = friends.length;
            friendCount.textContent = friendCountValue;

            let totalSeconds = 0;
            friends.forEach(friend => {
                const friendRef = database.ref(`users/${friend.id}`);
                friendRef.on('value', (snapshot) => {
                    const friendData = snapshot.val();
                    if (friendData?.startTime) {
                        const start = new Date(friendData.startTime);
                        const now = new Date();
                        const diff = Math.max(0, now - start);
                        totalSeconds += diff / 1000;
                    }
                });
            });
            const days = Math.floor(totalSeconds / (3600 * 24));
            const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = Math.floor(totalSeconds % 60);
            totalSoberTime.textContent = `${days} дн, ${hours} ч, ${minutes} мин, ${seconds} сек`;
        }

        // Событие окончания анимации
        friendsList.addEventListener('animationend', (e) => {
            if (e.animationName === 'fadeIn') e.target.style.opacity = 1;
        });
    })
    .catch(error => {
        console.error("Ошибка загрузки конфигурации Firebase:", error);
        alert('Не удалось подключиться к Firebase. Проверь настройки сервера.');
    });
