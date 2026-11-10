// Обрано фреймворк Vue 3, оскільки його глобальна CDN-збірка дозволяє створювати реактивні компоненти без компіляції JSX у браузері та має декларативний синтаксис шаблонів і обчислюваних властивостей (computed).

const API_URL = 'https://jsonplaceholder.typicode.com/users';
const AVERAGE_SPEED_KMH = 15;

/*
Функцію ручного рендеру з практикуму 7 закоментовано, оскільки її замінено декларативним Vue-компонентом RouteCard:
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
*/

const RouteCard = {
    props: ['id', 'name', 'lengthKm', 'difficulty', 'city', 'selected'],
    emits: ['select'],
    computed: {
        estimatedTimeHours() {
            return (this.lengthKm / AVERAGE_SPEED_KMH).toFixed(1);
        },
        difficultyClass() {
            if (this.difficulty === 'Легка') return 'easy';
            if (this.difficulty === 'Середня') return 'medium';
            if (this.difficulty === 'Важка') return 'hard';
            return '';
        }
    },
    template: `
        <article
            class="card"
            :class="[difficultyClass, { selected: selected }]"
            :data-km="lengthKm"
            @click="$emit('select', id)"
        >
            <h3>{{ name }}</h3>
            <p>{{ lengthKm }} км, {{ difficulty }}<span v-if="city"> • {{ city }}</span></p>
            <div class="route-meta">
                <span>Приблизний час у дорозі: ~{{ estimatedTimeHours }} год (15 км/год)</span>
                <span class="route-status">{{ selected ? 'Обрано' : 'Детальніше →' }}</span>
            </div>
        </article>
    `
};

Vue.createApp({
    components: {
        RouteCard
    },
    data() {
        return {
            routes: [],
            selectedDifficulty: 'Всі',
            isLoading: false,
            errorMessage: '',
            selectedRouteId: null,
            newRoute: {
                name: '',
                lengthKm: '',
                difficulty: ''
            }
        };
    },
    computed: {
        filteredRoutes() {
            if (this.selectedDifficulty === 'Всі') {
                return this.routes;
            }
            return this.routes.filter(route => route.difficulty === this.selectedDifficulty);
        },
        totalKm() {
            return Number(this.filteredRoutes.reduce((sum, route) => sum + Number(route.lengthKm), 0).toFixed(1));
        },
        selectedRoute() {
            return this.routes.find(route => route.id === this.selectedRouteId) || null;
        }
    },
    methods: {
        async loadData() {
            this.isLoading = true;
            this.errorMessage = '';

            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`Помилка сервера: код ${response.status}`);
                }
                const data = await response.json();

                const difficulties = ['Легка', 'Середня', 'Важка'];
                this.routes = data.map((user, index) => ({
                    id: user.id,
                    name: user.name,
                    lengthKm: (user.id * 3) + 7,
                    difficulty: difficulties[index % difficulties.length],
                    city: user.address?.city || 'Київ'
                }));
            } catch (error) {
                this.errorMessage = 'Не вдалося завантажити дані маршрутів. Перевірте з\'єднання з мережею.';
                console.error('Помилка при завантаженні даних:', error);
            } finally {
                this.isLoading = false;
            }
        },
        selectRoute(id) {
            this.selectedRouteId = this.selectedRouteId === id ? null : id;
        },
        validateKm(event) {
            const kmValue = Number(event.target.value);
            if (kmValue > 300) {
                event.target.setCustomValidity('Довжина маршруту не може перевищувати 300 км');
            } else {
                event.target.setCustomValidity('');
            }
        },
        addRoute() {
            const nextId = this.routes.length > 0
                ? Math.max(...this.routes.map(r => r.id)) + 1
                : 1;

            this.routes.push({
                id: nextId,
                name: this.newRoute.name,
                lengthKm: Number(this.newRoute.lengthKm),
                difficulty: this.newRoute.difficulty,
                city: 'Київ'
            });

            this.newRoute.name = '';
            this.newRoute.lengthKm = '';
            this.newRoute.difficulty = '';
        }
    },
    mounted() {
        this.loadData();
    }
}).mount('#app');