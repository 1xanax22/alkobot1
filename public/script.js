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

// Открываем на полный экран после небольшой задержки
setTimeout(() => {
    tg.expand();
}, 100);

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// Функция инициализации пользователя
async function initUser() {
    if (!tg.initDataUnsafe?.user?.id) {
        console.error('No user data available');
        return;
    }

    const userId = tg.initDataUnsafe.user.id;
    const userRef = database.ref(`users/${userId}`);

    try {
        const snapshot = await userRef.once('value');
        if (!snapshot.exists()) {
            // Если пользователя нет в базе, создаем его
            await userRef.set({
                username: tg.initDataUnsafe.user.username || '',
                firstName: tg.initDataUnsafe.user.first_name || '',
                startTime: null,
                friends: []
            });
            console.log('New user created:', userId);
        }
    } catch (error) {
        console.error('Error initializing user:', error);
    }
}

// Инициализируем пользователя при загрузке
initUser();

// Получение элементов DOM
const timerDisplay = document.getElementById('timer');
const homeScreen = document.getElementById('homeScreen');
const statsScreen = document.getElementById('statsScreen');

// Получение ID пользователя из Telegram
const userId = tg.initDataUnsafe?.user?.id || 'anonymous';

// Глобальные переменные
let startTime = null;

// Функция для вычисления времени
function calculateTime(startTime) {
    if (!startTime || startTime === 'null' || isNaN(parseInt(startTime))) {
        return null;
    }

    try {
        startTime = parseInt(startTime);
        if (startTime > Date.now()) {
            return null;
        }

        const now = Date.now();
        const diff = now - startTime;
        
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 36500) return null;

        return {
            days,
            hours,
            minutes,
            text: days > 0 ? `${days}д ${hours}ч ${minutes}мин` : 
                  hours > 0 ? `${hours}ч ${minutes}мин` : 
                  `${minutes}мин`
        };
    } catch (error) {
        console.error('Error calculating time:', error);
        return null;
    }
}

// Функция форматирования времени
function formatTimeToString(time) {
    if (!time) return 'еще не начал';
    return time.text;
}

// Функция обновления таймера
function updateTimer() {
    if (!startTime) {
        timerDisplay.textContent = 'Нажми "Старт"';
        return;
    }
    
    const time = calculateTime(startTime);
    if (time) {
        timerDisplay.textContent = time.text;
    }
}

// Функция обновления таймера друга
function updateFriendTimer(timeSpan, startTime) {
    if (!startTime || startTime === 'null') {
        timeSpan.textContent = 'Бухает';
        timeSpan.style.color = '#ff3333';
        return;
    }
    
    const time = calculateTime(startTime);
    if (time) {
        timeSpan.textContent = time.text;
        timeSpan.style.color = '#00cc00';
    }
}

// Функция обновления всех таймеров друзей
function updateAllFriendTimers() {
    const timers = document.querySelectorAll('.friend-timer');
    timers.forEach(timer => {
        const startTime = timer.dataset.startTime;
        if (startTime) {
            updateFriendTimer(timer, startTime);
        }
    });
}

// Функция запуска обновления таймеров
function startTimerUpdates() {
    if (window.timerIntervals) {
        window.timerIntervals.forEach(interval => clearInterval(interval));
    }
    
    updateTimer();
    updateAllFriendTimers();
    
    window.timerIntervals = [
        setInterval(updateTimer, 5000),
        setInterval(updateAllFriendTimers, 5000)
    ];
}

// Функция проверки существования пользователя
async function checkUserExists(username) {
    try {
        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val() || {};
        return Object.values(users).some(user => user.username === username);
    } catch (error) {
        console.error('Error checking user:', error);
        return false;
    }
}

// Функция создания элемента друга
function createFriendElement(friend, index, showDelete = false, isStats = false) {
    const li = document.createElement('li');
    li.style.transition = 'all 0.3s ease';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'friend-item';

    const friendInfoContainer = document.createElement('div');
    friendInfoContainer.className = 'friend-info';

    const displayName = document.createElement('div');
    displayName.className = 'friend-display-name';
    displayName.textContent = friend.firstName || 'Аноним';

    const username = document.createElement('div');
    username.className = 'friend-username';
    // Добавляем специальное оформление для ника создателя бота
    if (friend.username === '@gordeytgg' || friend.firstName === '01') {
        username.innerHTML = `👨‍💻 <span style="color: #ff4444;">${friend.username}</span>`;
        username.style.display = 'flex';
        username.style.alignItems = 'center';
        username.style.gap = '4px';
        displayName.style.color = '#ff4444';
    } else {
        username.textContent = friend.username;
    }

    friendInfoContainer.appendChild(displayName);
    friendInfoContainer.appendChild(username);

    const timeSpan = document.createElement('span');
    timeSpan.className = 'friend-timer';
    timeSpan.dataset.startTime = friend.startTime;

    // Определяем медаль для топ-3
    let medal = '';
    if (index === 0) medal = '🥇';
    else if (index === 1) medal = '🥈';
    else if (index === 2) medal = '🥉';
    
    const medalHtml = medal ? `<span class="friend-medal">${medal}</span>` : '';
    
    wrapper.innerHTML = medalHtml;
    wrapper.appendChild(friendInfoContainer);
    wrapper.appendChild(timeSpan);
    
    // Добавляем кнопку удаления только если showDelete = true
    if (showDelete) {
        const removeBtn = document.createElement('button');
        removeBtn.className = isStats ? 'delete-friend' : 'remove-friend';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeFriend(friend.username, li);
        };
        wrapper.appendChild(removeBtn);
    }
    
    li.appendChild(wrapper);
    updateFriendTimer(timeSpan, friend.startTime);
    
    return li;
}

// Функция добавления друга
async function addFriend(username) {
    console.log('Adding friend:', username);
    
    if (!username) {
        alert('Введите имя пользователя');
        return false;
    }
    
    try {
        username = username.trim();
        if (username.startsWith('@')) {
            username = username.substring(1);
        }

        console.log('Checking username:', username);

        if (username === tg.initDataUnsafe?.user?.username) {
            alert('Нельзя добавить себя в друзья');
            return false;
        }

        const exists = await checkUserExists(username);
        console.log('User exists:', exists);
        
        if (!exists) {
            alert('Пользователь не найден');
            return false;
        }

        const snapshot = await database.ref(`users/${userId}`).once('value');
        const userData = snapshot.val() || {};
        const currentFriends = userData.friends || [];
        
        console.log('Current friends:', currentFriends);
        
        if (currentFriends.includes(username)) {
            alert('Этот пользователь уже в списке друзей');
            return false;
        }

        // Добавляем в базу данных
        currentFriends.push(username);
        console.log('Updating friends list:', currentFriends);
        
        await database.ref(`users/${userId}`).update({ friends: currentFriends });
        console.log('Database updated');

        // Обновляем оба списка
        await renderFriendsList();
        await renderFriendsStats();
        
        return true;

    } catch (error) {
        console.error('Error adding friend:', error);
        alert('Произошла ошибка');
        return false;
    }
}

// Функция удаления друга с анимацией
async function removeFriend(username, element) {
    try {
        // Анимация удаления
        element.style.opacity = '0';
        element.style.transform = 'translateY(20px)';
        
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const snapshot = await database.ref(`users/${userId}`).once('value');
        const userData = snapshot.val() || {};
        const currentFriends = (userData.friends || []).filter(f => f !== username);
        
        await database.ref(`users/${userId}`).update({ friends: currentFriends });
        
        if (currentFriends.length === 0) {
            const friendsList = document.getElementById('friendsList');
            const emptyMessage = document.createElement('li');
            emptyMessage.textContent = 'Добавь друзей чтобы видеть их прогресс';
            friendsList.innerHTML = '';
            friendsList.appendChild(emptyMessage);
        } else {
            element.remove();
        }
    } catch (error) {
        console.error('Error removing friend:', error);
        alert('Ошибка при удалении друга');
        // Восстанавливаем элемент если произошла ошибка
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
    }
}

// Функция рендеринга друзей
async function renderFriends() {
    try {
        const friendsList = document.getElementById('friendsList');
        friendsList.innerHTML = '';
        
        const snapshot = await database.ref(`users/${userId}`).once('value');
        const currentFriends = snapshot.val()?.friends || [];
        
        if (currentFriends.length === 0) {
            friendsList.innerHTML = '<li>Добавь друзей чтобы видеть их прогресс</li>';
            return;
        }

        // Получаем данные всех пользователей
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        
        // Получаем данные друзей
        const friendsData = [];
        for (const uid in users) {
            const user = users[uid];
            if (currentFriends.includes(user.username)) {
                const time = calculateTime(user.startTime);
                friendsData.push({
                    username: user.username,
                    firstName: user.firstName,
                    startTime: user.startTime,
                    totalDays: time ? time.days : -1
                });
            }
        }
        
        // Сортируем друзей по времени
        friendsData.sort((a, b) => {
            if (a.totalDays === -1) return 1;
            if (b.totalDays === -1) return -1;
            return b.totalDays - a.totalDays;
        });

        // Берем только топ-3
        const topFriends = friendsData.slice(0, 3);

        // Создаем фрагмент для оптимизации
        const fragment = document.createDocumentFragment();
        
        // Добавляем друзей
        topFriends.forEach((friend, index) => {
            const li = createFriendElement(friend, index, false); // false - не показывать кнопку удаления
            fragment.appendChild(li);
        });
        
        friendsList.appendChild(fragment);
        
    } catch (error) {
        console.error('Error rendering friends:', error);
    }
}

async function renderFriendsList() {
    const friendsList = document.getElementById('friendsList');
    if (!friendsList) return;
    
    try {
        const snapshot = await database.ref(`users/${userId}`).once('value');
        const currentFriends = snapshot.val()?.friends || [];
        
        if (currentFriends.length === 0) {
            friendsList.innerHTML = '<p>Добавьте друзей чтобы видеть их прогресс</p>';
            return;
        }

        // Получаем данные всех пользователей
        const usersSnapshot = await database.ref('users').once('value');
        const users = usersSnapshot.val() || {};
        
        // Получаем данные друзей с полным временем трезвости
        const friendsData = [];
        for (const uid in users) {
            const user = users[uid];
            if (currentFriends.includes(user.username)) {
                const time = calculateTime(user.startTime);
                const totalMinutes = time ? (time.days * 24 * 60) + (time.hours * 60) + time.minutes : -1;
                friendsData.push({
                    username: user.username,
                    firstName: user.firstName,
                    startTime: user.startTime,
                    totalMinutes: totalMinutes
                });
            }
        }
        
        // Сортируем друзей по общему количеству минут
        friendsData.sort((a, b) => {
            if (a.totalMinutes === -1) return 1;
            if (b.totalMinutes === -1) return -1;
            return b.totalMinutes - a.totalMinutes;
        });

        // Очищаем список
        friendsList.innerHTML = '';
        
        // Берем только топ-3 друзей
        const topFriends = friendsData.slice(0, 3);
        
        // Создаем элементы для каждого друга
        topFriends.forEach((friend, index) => {
            const li = createFriendElement(friend, index);
            friendsList.appendChild(li);
        });
        
    } catch (error) {
        console.error('Error rendering friends list:', error);
        friendsList.innerHTML = '<p>Ошибка загрузки друзей</p>';
    }
}

// Глобальные переменные для пагинации в статистике
let statsCurrentPage = 0;
const statsPerPage = 4;

// Функция для отображения друзей в статистике с пагинацией
async function renderFriendsStats() {
    const container = document.getElementById('friendsListStats');
    if (!container) return;

    try {
        // Получаем список друзей текущего пользователя
        const currentUserSnapshot = await database.ref(`users/${userId}`).once('value');
        const currentUserFriends = currentUserSnapshot.val()?.friends || [];

        if (currentUserFriends.length === 0) {
            container.innerHTML = '<p>Нет друзей</p>';
            return;
        }

        const snapshot = await database.ref('users').once('value');
        const users = snapshot.val() || {};
        let friendsList = [];

        // Фильтруем только друзей и вычисляем их время трезвости
        for (const [uid, userData] of Object.entries(users)) {
            if (userData.username && currentUserFriends.includes(userData.username)) {
                const soberTime = calculateTime(userData.startTime);
                const totalMinutes = soberTime ? 
                    (soberTime.days * 24 * 60) + (soberTime.hours * 60) + soberTime.minutes : 
                    -1;

                friendsList.push({
                    userId: uid,
                    username: userData.username,
                    firstName: userData.firstName || 'Аноним',
                    startTime: userData.startTime,
                    totalMinutes: totalMinutes
                });
            }
        }

        if (friendsList.length === 0) {
            container.innerHTML = '<p>Нет друзей</p>';
            return;
        }

        // Сортируем по времени трезвости (от большего к меньшему)
        friendsList.sort((a, b) => {
            if (a.totalMinutes === -1) return 1;
            if (b.totalMinutes === -1) return -1;
            return b.totalMinutes - a.totalMinutes;
        });

        const statsContainer = document.createElement('div');
        statsContainer.className = 'friends-stats-container';
        
        const listWrapper = document.createElement('div');
        listWrapper.className = 'friends-list-wrapper';

        const totalPages = Math.ceil(friendsList.length / statsPerPage);
        
        for (let i = 0; i < totalPages; i++) {
            const pageDiv = document.createElement('div');
            pageDiv.className = 'friends-page';
            
            const pageItems = friendsList.slice(i * statsPerPage, (i + 1) * statsPerPage);
            pageItems.forEach((friend, index) => {
                const globalIndex = i * statsPerPage + index;
                const element = createFriendElement(friend, globalIndex, false, true);
                pageDiv.appendChild(element);
            });
            
            listWrapper.appendChild(pageDiv);
        }

        statsContainer.appendChild(listWrapper);
        
        // Добавляем пагинацию только если больше одной страницы
        if (totalPages > 1) {
            const pagination = document.createElement('div');
            pagination.className = 'friends-pagination';
            
            const prevBtn = document.createElement('button');
            prevBtn.textContent = '←';
            prevBtn.onclick = () => changePage('prev');
            
            const nextBtn = document.createElement('button');
            nextBtn.textContent = '→';
            nextBtn.onclick = () => changePage('next');
            
            pagination.appendChild(prevBtn);
            pagination.appendChild(nextBtn);
            
            container.innerHTML = '';
            container.appendChild(statsContainer);
            container.appendChild(pagination);
            
            function changePage(direction) {
                const wrapper = listWrapper;
                const currentPage = statsCurrentPage;
                
                if (direction === 'next' && currentPage < totalPages - 1) {
                    wrapper.style.transform = `translateX(-${(currentPage + 1) * 100}%)`;
                    statsCurrentPage++;
                } else if (direction === 'prev' && currentPage > 0) {
                    wrapper.style.transform = `translateX(-${(currentPage - 1) * 100}%)`;
                    statsCurrentPage--;
                }
                
                updatePagination();
            }
            
            function updatePagination() {
                prevBtn.disabled = statsCurrentPage === 0;
                nextBtn.disabled = statsCurrentPage === totalPages - 1;
            }
            
            updatePagination();
        } else {
            container.innerHTML = '';
            container.appendChild(statsContainer);
        }

    } catch (error) {
        console.error('Error rendering friends stats:', error);
        container.innerHTML = '<p>Ошибка загрузки друзей</p>';
    }
}

// Обработчики для навигации
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const targetScreen = btn.getAttribute('data-screen');
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(targetScreen).classList.add('active');
        
        document.querySelectorAll('.nav-btn').forEach(navBtn => {
            navBtn.classList.remove('active');
        });
        btn.classList.add('active');
        
        if (targetScreen === 'statsScreen') {
            renderFriendsStats(); // Вместо syncFriendsLists вызываем новую функцию
        }
    });
});

// Обработчики событий
document.getElementById('startBtn').onclick = async () => {
    startTime = Date.now();
    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('resetBtn').style.display = 'inline-block';
    
    await database.ref(`users/${userId}`).update({
        startTime: startTime
    });
    
    updateTimer();
    startTimerUpdates();
};

document.getElementById('resetBtn').onclick = async () => {
    startTime = null;
    document.getElementById('startBtn').style.display = 'inline-block';
    document.getElementById('resetBtn').style.display = 'none';
    
    await database.ref(`users/${userId}`).update({
        startTime: null
    });
    
    if (window.timerIntervals) {
        window.timerIntervals.forEach(interval => clearInterval(interval));
        window.timerIntervals = null;
    }
    
    updateTimer();
};

document.getElementById('setDateBtn').onclick = () => {
    // Создаем контейнер
    const container = document.createElement('div');
    container.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        max-width: 300px;
        z-index: 1000;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        background: rgba(0, 0, 0, 0.9);
        padding: 20px;
        border-radius: 15px;
        border: 1px solid rgba(0, 204, 0, 0.3);
        text-align: center;
    `;

    // Создаем заголовок
    const title = document.createElement('div');
    title.textContent = 'Выберите дату и время';
    title.style.cssText = `
        color: #00cc00;
        font-size: 18px;
        margin-bottom: 15px;
        font-weight: bold;
        width: 100%;
    `;

    // Создаем контейнеры для инпутов
    const dateContainer = document.createElement('div');
    dateContainer.className = 'date-time-input';
    dateContainer.style.width = '50%';
    
    const timeContainer = document.createElement('div');
    timeContainer.className = 'date-time-input';
    timeContainer.style.width = '50%';
    timeContainer.style.display = 'none';

    // Создаем input для даты
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.style.cssText = `
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 8px;
        font-size: 16px;
        color: #ffffff;
        background-color: #00cc00;
        width: 100%;
        margin: 5px 0;
        text-align: center;
    `;

    // Создаем input для времени
    const timeInput = document.createElement('input');
    timeInput.type = 'time';
    timeInput.style.cssText = dateInput.style.cssText;

    // Создаем кнопку подтверждения
    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Подтвердить';
    confirmBtn.style.cssText = `
        margin-top: 10px;
        padding: 10px;
        background-color: #00cc00;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        cursor: pointer;
        display: none;
        width: 50%;
    `;

    // Добавляем элементы в контейнеры
    dateContainer.appendChild(dateInput);
    timeContainer.appendChild(timeInput);

    // Добавляем элементы в основной контейнер
    container.appendChild(title);
    container.appendChild(dateContainer);
    container.appendChild(timeContainer);
    container.appendChild(confirmBtn);
    document.body.appendChild(container);

    // Устанавливаем текущую дату
    const now = new Date();
    dateInput.value = now.toISOString().split('T')[0];
    timeInput.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    // Обработчик выбора даты
    dateInput.addEventListener('change', () => {
        timeContainer.style.display = 'block';
        timeInput.focus();
    });

    // Обработчик выбора времени
    timeInput.addEventListener('change', () => {
        confirmBtn.style.display = 'block';
    });

    // Обработчик подтверждения
    confirmBtn.addEventListener('click', async () => {
        const selectedDate = new Date(`${dateInput.value}T${timeInput.value}`);
        if (!isNaN(selectedDate.getTime())) {
            startTime = selectedDate.getTime();
            await database.ref(`users/${userId}`).update({
                startTime: startTime
            });
            document.getElementById('startBtn').style.display = 'none';
            document.getElementById('resetBtn').style.display = 'inline-block';
            updateTimer();
            startTimerUpdates();
        }
        container.remove();
    });

    // Добавляем кнопку закрытия
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = `
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        color: #ff4444;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        margin: 0;
    `;
    closeBtn.onclick = () => container.remove();
    container.appendChild(closeBtn);

    // Открываем календарь
    dateInput.focus();
    dateInput.click();
};

document.getElementById('inviteFriendBtn').onclick = () => {
    const appUrl = `https://t.me/stopalko01_bot?start=ref_${userId}`;
    const messageText = startTime ? 
        `Я не пью уже ${formatTimeToString(calculateTime(startTime))} - теперь твоя очередь сиять! ✨` :
        'Я еще не включил таймер, но я стремлюсь к этому!';
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(appUrl)}&text=${encodeURIComponent(messageText)}`;
    window.open(shareUrl, '_blank');
};

document.getElementById('addFriendBtn').onclick = async () => {
    const input = document.getElementById('friendUsername');
    const username = input.value.trim();
    
    const success = await addFriend(username);
    console.log('Add friend result:', success);
    
    if (success) {
        input.value = '';
    }
};

document.getElementById('addFriendBtnStats').onclick = async () => {
    const input = document.getElementById('friendUsernameStats');
    const username = input.value.trim();
    
    const success = await addFriend(username);
    console.log('Add friend result (stats):', success);
    
    if (success) {
        input.value = '';
        renderFriendsStats();
    }
};

// Добавляем обработчик для скрытия клавиатуры
document.addEventListener('click', function(event) {
    const input = document.querySelector('input[type="text"]');
    // Проверяем, что клик был не по полю ввода и не по его родителям
    if (input && !event.target.closest('.add-friend-form')) {
        input.blur(); // Убираем фокус с поля ввода, что скроет клавиатуру
    }
});

// Добавляем обработчик для touch-событий
document.addEventListener('touchstart', function(event) {
    const input = document.querySelector('input[type="text"]');
    // Проверяем, что касание было не по полю ввода и не по его родителям
    if (input && !event.target.closest('.add-friend-form')) {
        input.blur(); // Убираем фокус с поля ввода, что скроет клавиатуру
    }
});

// Глобальные переменные
let currentDate = new Date();
let selectedDay = null;
let activeButton = null;

// Функция для сохранения статуса дня в Firebase
async function saveDayStatus(date, drinkType, remove = false) {
    try {
        const dayRef = database.ref(`users/${userId}/calendar/${date}`);
        
        if (drinkType === 'sober') {
            // Если отмечаем трезвый день, удаляем все предыдущие записи
            await dayRef.set({
                sober: true
            });
        } else if (remove) {
            // Если удаляем метку
            const snapshot = await dayRef.once('value');
            const currentData = snapshot.val() || {};
            delete currentData[drinkType];
            
            if (Object.keys(currentData).length === 0) {
                await dayRef.remove();
            } else {
                await dayRef.update(currentData);
            }
        } else {
            // Если добавляем алкоголь и день не отмечен как трезвый
            const snapshot = await dayRef.once('value');
            const currentData = snapshot.val() || {};
            
            if (!currentData.sober) {
                await dayRef.update({
                    [drinkType]: true
                });
            }
        }
    } catch (error) {
        console.error('Error saving day status:', error);
    }
}

// Функция для загрузки статуса дней из Firebase
function loadCalendarData(year, month) {
    return database.ref(`users/${userId}/calendar`).once('value')
        .then((snapshot) => {
            const data = snapshot.val() || {};
            return data;
        });
}

// Функция для добавления точки к дню
function addDotToDay(dayElement, drinkType) {
    let dotContainer = dayElement.querySelector('.dot-container');
    if (!dotContainer) {
        dotContainer = document.createElement('div');
        dotContainer.className = 'dot-container';
        dayElement.appendChild(dotContainer);
    }

    const dot = document.createElement('div');
    dot.className = `dot ${drinkType}`;
    dotContainer.appendChild(dot);
    
    requestAnimationFrame(() => {
        dot.classList.add('visible');
    });
}

// Функция для обновления отображения дня при загрузке календаря
function updateDayDisplay(dayElement, dayData) {
    if (!dayData) return;

    let dotContainer = document.createElement('div');
    dotContainer.className = 'dot-container';
    dayElement.appendChild(dotContainer);

    if (dayData.light) {
        const dot = document.createElement('div');
        dot.className = 'dot light';
        dotContainer.appendChild(dot);
        requestAnimationFrame(() => dot.classList.add('visible'));
    }
    if (dayData.medium) {
        const dot = document.createElement('div');
        dot.className = 'dot medium';
        dotContainer.appendChild(dot);
        requestAnimationFrame(() => dot.classList.add('visible'));
    }
    if (dayData.strong) {
        const dot = document.createElement('div');
        dot.className = 'dot strong';
        dotContainer.appendChild(dot);
        requestAnimationFrame(() => dot.classList.add('visible'));
    }

    // Если нет точек, удаляем контейнер
    if (!dotContainer.children.length) {
        dotContainer.remove();
    }
}

// Функция для сохранения статуса дня в Firebase и обновления UI
function updateDrinkStatus(dayElement, dayDate, drinkType, calendarData) {
    const dateStr = `${dayDate.getFullYear()}-${dayDate.getMonth() + 1}-${dayDate.getDate()}`;
    const hasType = dayElement.querySelector(`.dot.${drinkType}`);
    
    // Check if the date is in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dayDate > today) {
        return;
    }

    // Если это трезвый день
    if (drinkType === 'sober') {
        // Удаляем все точки
        const dotContainer = dayElement.querySelector('.dot-container');
        if (dotContainer) {
            dotContainer.remove();
        }
        
        // Добавляем класс sober
        dayElement.classList.add('sober');
        
        // Сохраняем в Firebase как полностью новый день
        database.ref(`users/${userId}/calendar/${dateStr}`).set({
            sober: true
        });
        return;
    }

    // Если день был отмечен как трезвый, убираем метку
    if (dayElement.classList.contains('sober')) {
        dayElement.classList.remove('sober');
        saveDayStatus(dateStr, 'sober', true);
    }
    
    // Если уже есть отметка этого типа, пропускаем
    if (hasType) {
        return;
    }

    // Создаем или получаем контейнер для точек
    let dotContainer = dayElement.querySelector('.dot-container');
    if (!dotContainer) {
        dotContainer = document.createElement('div');
        dotContainer.className = 'dot-container';
        dayElement.appendChild(dotContainer);
    }

    // Добавляем точку
    const dot = document.createElement('div');
    dot.className = `dot ${drinkType}`;
    dotContainer.appendChild(dot);
    requestAnimationFrame(() => dot.classList.add('visible'));

    // Сохраняем в Firebase
    saveDayStatus(dateStr, drinkType, false);
}

// Функция для отображения дня
function displayDayData(dayElement, dayData) {
    // Очищаем предыдущие данные
    const oldDotContainer = dayElement.querySelector('.dot-container');
    if (oldDotContainer) {
        oldDotContainer.remove();
    }
    dayElement.classList.remove('sober');

    if (!dayData) return;

    // Если день трезвый, показываем только зеленую метку
    if (dayData.sober) {
        dayElement.classList.add('sober');
        return;
    }

    // Иначе показываем точки алкоголя
    const dotContainer = document.createElement('div');
    dotContainer.className = 'dot-container';
    dayElement.appendChild(dotContainer);

    if (dayData.light) {
        const dot = document.createElement('div');
        dot.className = 'dot light';
        dotContainer.appendChild(dot);
        requestAnimationFrame(() => dot.classList.add('visible'));
    }
    if (dayData.medium) {
        const dot = document.createElement('div');
        dot.className = 'dot medium';
        dotContainer.appendChild(dot);
        requestAnimationFrame(() => dot.classList.add('visible'));
    }
    if (dayData.strong) {
        const dot = document.createElement('div');
        dot.className = 'dot strong';
        dotContainer.appendChild(dot);
        requestAnimationFrame(() => dot.classList.add('visible'));
    }

    // Если нет точек, удаляем контейнер
    if (!dotContainer.children.length) {
        dotContainer.remove();
    }
}

// Обновляем функцию updateCalendar
function updateCalendar(direction = 'none') {
    const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 
                       'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
    
    document.getElementById('monthYear').textContent = 
        `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;

    const calendarSlide = document.querySelector('.calendar-slide');
    const oldCalendar = document.getElementById('calendar');
    
    const newCalendar = document.createElement('div');
    newCalendar.id = 'calendar';
    newCalendar.className = 'days-grid';

    // Устанавливаем начальные позиции для анимации
    if (direction === 'left') {
        newCalendar.classList.add('next');
        if (oldCalendar) {
            oldCalendar.classList.add('prev');
        }
    } else if (direction === 'right') {
        newCalendar.classList.add('prev');
        if (oldCalendar) {
            oldCalendar.classList.add('next');
        }
    }

    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    let startingDay = firstDay.getDay() || 7;
    startingDay--;

    for (let i = 0; i < startingDay; i++) {
        const emptyDay = document.createElement('div');
        emptyDay.className = 'calendar-day empty';
        newCalendar.appendChild(emptyDay);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    loadCalendarData(currentDate.getFullYear(), currentDate.getMonth())
        .then(calendarData => {
            for (let day = 1; day <= lastDay.getDate(); day++) {
                const dayElement = document.createElement('div');
                const dateStr = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}-${day}`;
                const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                dayDate.setHours(0, 0, 0, 0);
                
                dayElement.className = 'calendar-day';
                dayElement.textContent = day;

                if (dayDate > today) {
                    dayElement.classList.add('future');
                } else {
                    dayElement.addEventListener('click', () => {
                        if (!activeButton) return;
                        
                        const drinkType = activeButton.id.replace('Btn', '');
                        if (drinkType === 'reset') {
                            const dotContainer = dayElement.querySelector('.dot-container');
                            if (dotContainer) {
                                const dots = Array.from(dotContainer.children);
                                dots.forEach(dot => {
                                    dot.classList.remove('visible');
                                });
                                
                                setTimeout(() => {
                                    dotContainer.remove();
                                }, 300);
                            }
                            
                            // Сбрасываем трезвый день
                            if (dayElement.classList.contains('sober')) {
                                dayElement.classList.remove('sober');
                                saveDayStatus(dayDate, 'sober', true);
                            }
                            
                            saveDayStatus(dayDate, 'light', true);
                            saveDayStatus(dayDate, 'medium', true);
                            saveDayStatus(dayDate, 'strong', true);
                        } else {
                            updateDrinkStatus(dayElement, dayDate, drinkType, calendarData);
                        }
                    });
                }

                if (calendarData && calendarData[dateStr]) {
                    displayDayData(dayElement, calendarData[dateStr]);
                }

                newCalendar.appendChild(dayElement);
            }

            if (direction !== 'none') {
                calendarSlide.appendChild(newCalendar);
                
                // Запускаем анимацию
                requestAnimationFrame(() => {
                    if (direction === 'left') {
                        if (oldCalendar) {
                            oldCalendar.classList.add('prev');
                            oldCalendar.classList.remove('current');
                        }
                        newCalendar.classList.remove('next');
                        newCalendar.classList.add('current');
                    } else if (direction === 'right') {
                        if (oldCalendar) {
                            oldCalendar.classList.add('next');
                            oldCalendar.classList.remove('current');
                        }
                        newCalendar.classList.remove('prev');
                        newCalendar.classList.add('current');
                    }
                });

                // Очищаем после анимации
                setTimeout(() => {
                    if (oldCalendar && oldCalendar.parentNode) {
                        oldCalendar.remove();
                    }
                }, 300);
            } else {
                if (oldCalendar && oldCalendar.parentNode) {
                    oldCalendar.replaceWith(newCalendar);
                } else {
                    calendarSlide.appendChild(newCalendar);
                }
            }
        });
}

// Функция инициализации календаря
function initCalendar() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() - 1);
        updateCalendar('left');
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentDate.setMonth(currentDate.getMonth() + 1);
        updateCalendar('right');
    });

    const drinkButtons = document.querySelectorAll('.drink-btn');
    drinkButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            if (activeButton === btn) {
                btn.classList.remove('active');
                activeButton = null;
            } else {
                if (activeButton) {
                    activeButton.classList.remove('active');
                }
                btn.classList.add('active');
                activeButton = btn;
            }
        });
    });

    updateCalendar();
}

// Вызываем функцию при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    initCalendar();
});

// Инициализация
const timerElement = document.getElementById('timer');
timerElement.style.visibility = 'hidden'; // Скрываем таймер при загрузке

database.ref(`users/${userId}`).once('value')
    .then((snapshot) => {
        const userData = snapshot.val();
        if (userData) {
            startTime = userData.startTime;
            if (startTime) {
                document.getElementById('startBtn').style.display = 'none';
                document.getElementById('resetBtn').style.display = 'inline-block';
                updateTimer();
                startTimerUpdates();
            }
        }
        timerElement.style.visibility = 'visible';
        renderFriendsList(); // Добавляем вызов renderFriendsList
    })
    .catch((error) => {
        console.error('Error loading user data:', error);
        timerElement.style.visibility = 'visible';
    });

// Достижения
const achievements = [
    { id: 1, days: 1, icon: '🌱', title: 'Первый день', description: 'Начало вашего пути' },
    { id: 7, days: 7, icon: '🌟', title: 'Первая неделя', description: '7 дней трезвости' },
    { id: 30, days: 30, icon: '🌙', title: 'Первый месяц', description: 'Месяц новой жизни' },
    { id: 90, days: 90, icon: '🌞', title: 'Три месяца', description: 'Четверть года чистоты' },
    { id: 180, days: 180, icon: '🌈', title: 'Полгода', description: '180 дней свободы' },
    { id: 365, days: 365, icon: '👑', title: 'Один год', description: 'Целый год трезвости!' }
];

// Функция обновления статистики
function updateStatistics(days) {
    // Сэкономленные деньги (500 рублей в день)
    const savedMoney = days * 500;
    document.querySelector('.money-value').textContent = formatMoney(savedMoney);
    
    // Продление жизни (в среднем 5 часов за каждый день трезвости)
    const extraLifeDays = Math.floor((days * 5) / 24);
    document.querySelector('.life-value').textContent = `${extraLifeDays} дней`;
    
    // Здоровье (максимум достигается за 365 дней)
    const healthPercent = Math.min(100, Math.round((days / 365) * 100));
    document.querySelector('.health-value').textContent = `${healthPercent}%`;
}

// Функция обновления прогресса
function updateProgress(days) {
    // Обновляем текущую серию
    document.querySelector('.current-streak').textContent = days;
    
    // Обновляем лучшую серию
    if (bestStreak < days) {
        bestStreak = days;
        saveBestStreak();
    }
    document.querySelector('.best-streak').textContent = bestStreak;
}

// Функция обновления достижений
function updateAchievements(days) {
    // Обновляем статистику
    updateStatistics(days);

    // Обновляем прогресс
    updateProgress(days);

    // Обновляем кольцо прогресса
    const circle = document.querySelector('.streak-ring .progress');
    const circumference = 283; // 2 * π * 45 (радиус)
    let nextAchievement = achievements[0];

    // Находим следующее недостигнутое достижение
    for (let achievement of achievements) {
        if (days < achievement.days) {
            nextAchievement = achievement;
            break;
        }
    }

    // Вычисляем прогресс до следующего достижения
    const prevAchievementDays = achievements[achievements.indexOf(nextAchievement) - 1]?.days || 0;
    const progress = ((days - prevAchievementDays) / (nextAchievement.days - prevAchievementDays)) * 100;
    const offset = circumference - (progress / 100) * circumference;
    circle.style.strokeDashoffset = offset;

    // Обновляем счетчики
    document.querySelector('.streak-count .days').textContent = days;
    document.querySelector('.info-item .value.money').textContent = formatMoney(days * 500);
    
    // Обновляем достижения
    achievements.forEach(achievement => {
        const element = document.getElementById(`achievement${achievement.id}`);
        if (!element) return;

        const progressBar = element.querySelector('.progress-bar');
        const statusText = element.querySelector('.status');
        
        if (days >= achievement.days) {
            if (!element.classList.contains('unlocked')) {
                element.classList.add('unlocked', 'just-unlocked');
                showNotification(`🎉 Новое достижение: ${achievement.title}!`);
                setTimeout(() => element.classList.remove('just-unlocked'), 1000);
            }
            progressBar.style.width = '100%';
            statusText.textContent = 'Разблокировано';
        } else {
            element.classList.remove('unlocked');
            const achievementProgress = Math.min(100, (days / achievement.days) * 100);
            progressBar.style.width = achievementProgress + '%';
            statusText.textContent = `${days}/${achievement.days} дней`;
        }
    });
}

// Функция для красивого форматирования денег
function formatMoney(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 0
    }).format(amount);
}

// Функция для показа уведомлений
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    // Добавляем небольшую задержку для анимации
    requestAnimationFrame(() => {
        notification.classList.add('show');
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    });
}