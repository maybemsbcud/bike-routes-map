console.log('script.js підключено');

// дані для 14 варіанту
const routes = [
    { name: 'ВДНГ - Голосієво', km: 10, difficulty: 'Легка' },
    { name: 'Пуща-Водиця', km: 25, difficulty: 'Середня' },
    { name: 'Голосіївський ліс (Трейл)', km: 15, difficulty: 'Важка' }
];

// функція рахує сумарну довжину маршрутів циклом
const processRoutes = () => {
    let totalLength = 0;
    for (let i = 0; i < routes.length; i++) {
        totalLength += routes[i].km;
    }
    console.log(`Загальна довжина всіх маршрутів: ${totalLength} км`);
};

processRoutes();

// класифікація по складності
for (const route of routes) {
    if (route.difficulty === 'Легка') {
        console.log(`Маршрут "${route.name}" — розслаблена поїздка.`);
    } else if (route.difficulty === 'Середня') {
        console.log(`Маршрут "${route.name}" — вимагає витривалості.`);
    } else {
        console.log(`Маршрут "${route.name}" — для підготовлених спортсменів.`);
    }
}

// стрілкова функція для розрахунку часу (швидкість 15 км/год)
const estimateMinutes = km => Math.round(km / 15 * 60);

// виводимо час для кожного маршруту
for (const route of routes) {
    console.log(`Час на маршрут "${route.name}": ${estimateMinutes(route.km)} хв.`);
}