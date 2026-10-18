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

// Функція рендеру. Перебирає масив маршрутів, динамічно створює HTML-елементи 
// для кожного з них і додає їх у контейнер на сторінці.
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
       // p - «km км, difficulty»
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

renderRoutes(routes);