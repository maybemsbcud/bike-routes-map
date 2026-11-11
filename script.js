// Обрано фреймворк Vue 3, оскільки його глобальна CDN-збірка дозволяє створювати реактивні компоненти без компіляції JSX у браузері та має декларативний синтаксис шаблонів і обчислюваних властивостей (computed).

const API_URL = 'https://jsonplaceholder.typicode.com/users';
const AVERAGE_SPEED_KMH = 15;

// Збереження даних у localStorage
function saveToLocalStorage(items) {
    try {
        localStorage.setItem('routes_data', JSON.stringify(items));
    } catch (error) {
        console.error('Помилка запису в localStorage:', error);
    }
}

// Зчитування даних із localStorage
function loadFromLocalStorage() {
    try {
        const raw = localStorage.getItem('routes_data');
        return raw ? JSON.parse(raw) : [];
    } catch (error) {
        console.error('Помилка зчитування з localStorage:', error);
        return [];
    }
}

const DB_NAME = 'BikeRoutesDB';
const DB_VERSION = 1;
const STORE_NAME = 'routes';

// Відкриття бази даних IndexedDB із створенням object store
function openDB() {
    return new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
            reject(new Error('IndexedDB не підтримується браузером або недоступна'));
            return;
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Додавання або оновлення запису в IndexedDB
async function putItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Отримання всіх записів із IndexedDB
async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

// Видалення запису за id з IndexedDB
async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

// Одноразова міграція даних із localStorage до IndexedDB
async function migrateLocalStorageToIndexedDB() {
    const isMigrated = localStorage.getItem('routes_migrated');
    if (isMigrated === 'true') {
        return;
    }

    const localData = loadFromLocalStorage();
    if (localData && localData.length > 0) {
        for (const item of localData) {
            await putItem(item);
        }
    }
    localStorage.setItem('routes_migrated', 'true');
}

const RouteCard = {
    props: ['id', 'name', 'lengthKm', 'difficulty', 'city', 'selected'],
    emits: ['select', 'delete'],
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
            <div class="card-header">
                <h3>{{ name }}</h3>
                <button
                    type="button"
                    class="btn-delete"
                    title="Видалити маршрут"
                    @click.stop="$emit('delete', id)"
                >✕</button>
            </div>
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
        async initData() {
            this.isLoading = true;
            this.errorMessage = '';

            try {
                // Спроба міграції даних із localStorage
                await migrateLocalStorageToIndexedDB();

                // Отримання записів зі сховища IndexedDB
                let dbRoutes = await getAllItems();

                // Якщо база порожня, завантажуємо початкові дані з API
                if (!dbRoutes || dbRoutes.length === 0) {
                    const response = await fetch(API_URL);
                    if (!response.ok) {
                        throw new Error(`Помилка сервера: код ${response.status}`);
                    }
                    const data = await response.json();

                    const difficulties = ['Легка', 'Середня', 'Важка'];
                    const initialRoutes = data.map((user, index) => ({
                        id: user.id,
                        name: user.name,
                        lengthKm: (user.id * 3) + 7,
                        difficulty: difficulties[index % difficulties.length],
                        city: user.address?.city || 'Київ'
                    }));

                    // Зберігаємо первинний стан у localStorage та IndexedDB
                    saveToLocalStorage(initialRoutes);
                    for (const r of initialRoutes) {
                        await putItem(r);
                    }
                    dbRoutes = initialRoutes;
                }

                this.routes = dbRoutes;
            } catch (error) {
                this.errorMessage = 'Помилка доступу до локального сховища або мережі: ' + error.message;
                console.error(error);
                // Резервний варіант зчитування з localStorage у разі блокування IndexedDB
                this.routes = loadFromLocalStorage();
            } finally {
                this.isLoading = false;
            }
        },
        async loadData() {
            // Ручне оновлення даних з API
            this.isLoading = true;
            this.errorMessage = '';

            try {
                const response = await fetch(API_URL);
                if (!response.ok) {
                    throw new Error(`Помилка сервера: код ${response.status}`);
                }
                const data = await response.json();

                const difficulties = ['Легка', 'Середня', 'Важка'];
                const freshRoutes = data.map((user, index) => ({
                    id: user.id,
                    name: user.name,
                    lengthKm: (user.id * 3) + 7,
                    difficulty: difficulties[index % difficulties.length],
                    city: user.address?.city || 'Київ'
                }));

                for (const r of freshRoutes) {
                    await putItem(r);
                }
                saveToLocalStorage(freshRoutes);

                this.routes = await getAllItems();
            } catch (error) {
                this.errorMessage = 'Не вдалося оновити дані. ' + error.message;
                console.error(error);
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
        async addRoute() {
            const nextId = this.routes.length > 0
                ? Math.max(...this.routes.map(r => Number(r.id) || 0)) + 1
                : 1;

            const newRouteItem = {
                id: nextId,
                name: this.newRoute.name,
                lengthKm: Number(this.newRoute.lengthKm),
                difficulty: this.newRoute.difficulty,
                city: 'Київ'
            };

            try {
                await putItem(newRouteItem);
                this.routes = await getAllItems();
                saveToLocalStorage(this.routes);

                this.newRoute.name = '';
                this.newRoute.lengthKm = '';
                this.newRoute.difficulty = '';
            } catch (error) {
                this.errorMessage = 'Не вдалося зберегти новий маршрут: ' + error.message;
            }
        },
        async removeRoute(id) {
            try {
                await deleteItem(id);
                this.routes = await getAllItems();
                saveToLocalStorage(this.routes);

                if (this.selectedRouteId === id) {
                    this.selectedRouteId = null;
                }
            } catch (error) {
                this.errorMessage = 'Не вдалося видалити маршрут: ' + error.message;
            }
        }
    },
    mounted() {
        this.initData();
    }
}).mount('#app');