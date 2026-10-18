console.log('script.js підключено');

const routes = [
    { name: 'ВДНГ - Голосієво', km: 10, difficulty: 'Легка' },
    { name: 'Пуща-Водиця', km: 25, difficulty: 'Середня' },
    { name: 'Голосіївський ліс (Трейл)', km: 15, difficulty: 'Важка' }
];

// Крок 2: Прибрати статичний приклад із розмітки
const staticCards = document.querySelectorAll('.card');
staticCards.forEach(card => card.remove());

// Крок 3: Вибрати контейнер
const listContainer = document.querySelector('#routes-list');

// Крок 9 (підготовка): вибрати елемент підсумку
const totalKmElement = document.querySelector('#total-km');

// Функція рендеру. Перебирає масив маршрутів, динамічно створює HTML-елементи 
// для кожного з них і додає їх у контейнер на сторінці.
const renderRoutes = (routesArray) => {
    listContainer.innerHTML = ''; 
    let totalKm = 0;

    routesArray.forEach(route => {
        totalKm += route.km;

        // Крок 5: Створювати елемент для кожного запису
        const card = document.createElement('article');
        card.classList.add('card');
        
        const title = document.createElement('h3');
        title.textContent = route.name;
        
        const details = document.createElement('p');
        // Строге дотримання вимоги 14 варіанта: p - «km км, difficulty»
        details.textContent = `${route.km} км, ${route.difficulty}`;
        
        // Крок 6: Додати атрибут і умовний клас
        card.setAttribute('data-km', route.km);
        
        if (route.difficulty === 'Легка') {
            card.classList.add('easy');
        } else if (route.difficulty === 'Середня') {
            card.classList.add('medium');
        } else if (route.difficulty === 'Важка') {
            card.classList.add('hard');
        }

        card.append(title, details);
        
        // Крок 7: Додати елемент у контейнер
        listContainer.append(card);
    });

    // Крок 9: Оновити підсумковий елемент
    if (totalKmElement) {
        totalKmElement.textContent = `Загальна довжина: ${totalKm} км`;
    }
};

// Крок 8: Викликати рендер при завантаженні сторінки
renderRoutes(routes);