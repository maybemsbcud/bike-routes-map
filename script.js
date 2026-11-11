console.log('script.js підключено');

const routes = [
    { name: 'ВДНГ - Голосієво', km: 10, difficulty: 'Легка' },
    { name: 'Пуща-Водиця', km: 25, difficulty: 'Середня' },
    { name: 'Голосіївський ліс (Трейл)', km: 15, difficulty: 'Важка' }
];

const staticCards = document.querySelectorAll('.card');
staticCards.forEach(card => card.remove());

const listContainer = document.querySelector('#routes-list');
const totalKmElement = document.querySelector('#total-km');

const form = document.querySelector('#route-form');
const nameInput = document.querySelector('#route-name');
const kmInput = document.querySelector('#route-km');
const difficultyInput = document.querySelector('#route-difficulty');
const filterSelect = document.querySelector('#filter-difficulty');

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
        details.textContent = `${route.km} км, ${route.difficulty}`;
        
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
        difficulty: difficultyInput.value
    };

    routes.push(newRoute);
    applyFilter();
    form.reset();
});

// Фільтрація списку маршрутів за обраною складністю
filterSelect.addEventListener('change', applyFilter);

renderRoutes(routes);