console.log('script.js підключено');

const API_URL = 'https://jsonplaceholder.typicode.com/users';

let routes = [];

const staticCards = document.querySelectorAll('.card');
staticCards.forEach(card => card.remove());

const listContainer = document.querySelector('#routes-list');
const totalKmElement = document.querySelector('#total-km');

const form = document.querySelector('#route-form');
const nameInput = document.querySelector('#route-name');
const kmInput = document.querySelector('#route-km');
const difficultyInput = document.querySelector('#route-difficulty');
const filterSelect = document.querySelector('#filter-difficulty');

const btnRefresh = document.querySelector('#btn-refresh');
const loadingIndicator = document.querySelector('#loading-indicator');
const errorMessage = document.querySelector('#error-message');

const renderRoutes = (routesArray) => {
    listContainer.innerHTML = ''; 
    let totalKm = 0;

    routesArray.forEach(route => {
        totalKm += route.km;

        const card = document.createElement('article');
        card.classList.add('card');
        
        const title = document.createElement('h3');
        title.textContent = route.name;
        
        const details = document.createElement('p');
        const cityInfo = route.city ? ` • ${route.city}` : '';
        details.textContent = `${route.km} км, ${route.difficulty}${cityInfo}`;
        
        card.setAttribute('data-km', route.km);
        
        if (route.difficulty === 'Легка') {
            card.classList.add('easy');
        } else if (route.difficulty === 'Середня') {
            card.classList.add('medium');
        } else if (route.difficulty === 'Важка') {
            card.classList.add('hard');
        }

        card.append(title, details);
        listContainer.append(card);
    });

    if (totalKmElement) {
        totalKmElement.textContent = `Загальна довжина: ${totalKm} км`;
    }
};

const applyFilter = () => {
    const selectedDifficulty = filterSelect.value;
    if (selectedDifficulty === 'Всі') {
        renderRoutes(routes);
    } else {
        const filteredRoutes = routes.filter(route => route.difficulty === selectedDifficulty);
        renderRoutes(filteredRoutes);
    }
};

// Завантаження списку маршрутів через JSONPlaceholder API (https://jsonplaceholder.typicode.com/users)
const loadData = async () => {
    loadingIndicator.classList.remove('hidden');
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
    btnRefresh.disabled = true;

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Помилка сервера: код ${response.status}`);
        }
        const data = await response.json();

        const difficulties = ['Легка', 'Середня', 'Важка'];
        routes = data.map((user, index) => ({
            name: user.name,
            km: (user.id * 3) + 7,
            difficulty: difficulties[index % difficulties.length],
            city: user.address?.city || 'Київ'
        }));

        applyFilter();
    } catch (error) {
        errorMessage.textContent = 'Не вдалося завантажити дані маршрутів. Перевірте з\'єднання з мережею.';
        errorMessage.classList.remove('hidden');
        console.error('Помилка при завантаженні даних:', error);
    } finally {
        loadingIndicator.classList.add('hidden');
        btnRefresh.disabled = false;
    }
};

// Валідація ліміту кілометражу на подію input
kmInput.addEventListener('input', () => {
    const kmValue = Number(kmInput.value);
    if (kmValue > 300) {
        kmInput.setCustomValidity('Довжина маршруту не може перевищувати 300 км');
    } else {
        kmInput.setCustomValidity('');
    }
});

// Обробка відправки форми додавання маршруту
form.addEventListener('submit', (event) => {
    event.preventDefault();

    const newRoute = {
        name: nameInput.value.trim(),
        km: Number(kmInput.value),
        difficulty: difficultyInput.value,
        city: 'Київ'
    };

    routes.push(newRoute);
    applyFilter();
    form.reset();
});

// Фільтрація списку маршрутів за обраною складністю
filterSelect.addEventListener('change', applyFilter);

// Повторний запит даних за кліком
btnRefresh.addEventListener('click', loadData);

loadData();