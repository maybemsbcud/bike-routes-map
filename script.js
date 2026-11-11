const API_URL = 'https://jsonplaceholder.typicode.com/users';
const AVERAGE_SPEED_KMH = 15;

let routesData = [];
let isLoading = false;
let errorMessage = '';
let elevationAnimId = null;

function saveToLocalStorage(items) {
    try {
        localStorage.setItem('routes_data', JSON.stringify(items));
    } catch (error) {
        console.error('Помилка запису в localStorage:', error);
    }
}

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

async function putItem(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(item);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function getAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const request = tx.objectStore(STORE_NAME).getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
    });
}

async function deleteItem(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

async function clearAllItems() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    });
}

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

function getElevationPoints(route) {
    if (!route) return [];
    const numPoints = 10;
    const distance = Number(route.distanceKm ?? route.lengthKm) || 10;
    const stepKm = distance / (numPoints - 1);

    let baseAlt = 120;
    let variation = 25;
    if (route.difficulty === 'Середня') {
        baseAlt = 140;
        variation = 50;
    } else if (route.difficulty === 'Важка') {
        baseAlt = 160;
        variation = 95;
    }

    const points = [];
    for (let i = 0; i < numPoints; i++) {
        const km = Number((i * stepKm).toFixed(1));
        const wave1 = Math.sin((i + route.id) * 0.9);
        const wave2 = Math.cos((i * 1.5) + route.id);
        const altitude = Math.round(baseAlt + (wave1 * variation * 0.6) + (wave2 * variation * 0.4));
        points.push({ km, altitude });
    }
    return points;
}

function stopElevationAnimation() {
    if (elevationAnimId) {
        cancelAnimationFrame(elevationAnimId);
        elevationAnimId = null;
    }
}

function startElevationAnimation(route) {
    stopElevationAnimation();

    const canvas = document.querySelector('#elevation-chart');
    if (!canvas || !route) return;

    const ctx = canvas.getContext('2d');
    const points = getElevationPoints(route);
    if (points.length < 2) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = { top: 30, right: 30, bottom: 40, left: 55 };

    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const minAlt = Math.min(...points.map(p => p.altitude)) - 10;
    const maxAlt = Math.max(...points.map(p => p.altitude)) + 15;
    const maxKm = points[points.length - 1].km || 1;

    const toCanvasCoords = (km, alt) => {
        const x = padding.left + (km / maxKm) * chartW;
        const y = padding.top + chartH - ((alt - minAlt) / (maxAlt - minAlt)) * chartH;
        return { x, y };
    };

    let progress = 0;
    const durationFrames = 60;

    const renderFrame = () => {
        progress = Math.min(progress + (1 / durationFrames), 1);

        ctx.clearRect(0, 0, width, height);

        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#666';
        ctx.font = '12px system-ui, sans-serif';

        const gridLines = 4;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartH / gridLines) * i;
            const altVal = Math.round(maxAlt - ((maxAlt - minAlt) / gridLines) * i);
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();
            ctx.fillText(`${altVal} м`, 10, y + 4);
        }

        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartH);
        ctx.lineTo(width - padding.right, padding.top + chartH);
        ctx.strokeStyle = '#9e9e9e';
        ctx.stroke();

        for (let i = 0; i < points.length; i += 2) {
            const p = points[i];
            const { x } = toCanvasCoords(p.km, p.altitude);
            ctx.fillText(`${p.km} км`, x - 12, height - 15);
        }

        const currentDistance = maxKm * progress;
        const visiblePoints = [];

        for (let i = 0; i < points.length; i++) {
            if (points[i].km <= currentDistance) {
                visiblePoints.push(toCanvasCoords(points[i].km, points[i].altitude));
            } else {
                const prev = points[i - 1];
                const curr = points[i];
                const t = (currentDistance - prev.km) / (curr.km - prev.km);
                const interAlt = prev.altitude + t * (curr.altitude - prev.altitude);
                visiblePoints.push(toCanvasCoords(currentDistance, interAlt));
                break;
            }
        }

        if (visiblePoints.length > 1) {
            const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
            gradient.addColorStop(0, 'rgba(46, 125, 50, 0.35)');
            gradient.addColorStop(1, 'rgba(46, 125, 50, 0.02)');

            ctx.beginPath();
            ctx.moveTo(visiblePoints[0].x, padding.top + chartH);
            for (const pt of visiblePoints) {
                ctx.lineTo(pt.x, pt.y);
            }
            ctx.lineTo(visiblePoints[visiblePoints.length - 1].x, padding.top + chartH);
            ctx.closePath();
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.beginPath();
            ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y);
            for (let i = 1; i < visiblePoints.length; i++) {
                ctx.lineTo(visiblePoints[i].x, visiblePoints[i].y);
            }
            ctx.strokeStyle = '#1b5e20';
            ctx.lineWidth = 3;
            ctx.stroke();

            const leadPoint = visiblePoints[visiblePoints.length - 1];
            ctx.beginPath();
            ctx.arc(leadPoint.x, leadPoint.y, 6, 0, Math.PI * 2);
            ctx.fillStyle = '#b35000';
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        if (progress < 1) {
            elevationAnimId = requestAnimationFrame(renderFrame);
        } else {
            elevationAnimId = null;
        }
    };

    elevationAnimId = requestAnimationFrame(renderFrame);
}

function getDifficultyClass(difficulty) {
    if (difficulty === 'Легка') return 'easy';
    if (difficulty === 'Середня') return 'medium';
    if (difficulty === 'Важка') return 'hard';
    return '';
}

function calculateTotalKm(items) {
    return Number(items.reduce((sum, r) => sum + Number(r.distanceKm ?? r.lengthKm), 0).toFixed(1));
}

function createRouteCard(route) {
    const distanceKm = Number(route.distanceKm ?? route.lengthKm);
    const estimatedTimeHours = (distanceKm / AVERAGE_SPEED_KMH).toFixed(1);
    const diffClass = getDifficultyClass(route.difficulty);

    const card = document.createElement('article');
    card.className = `card ${diffClass}`.trim();
    card.dataset.km = distanceKm;

    card.innerHTML = `
        <div class="card-header">
            <h3>${route.name}</h3>
            <button type="button" class="btn-delete" title="Видалити маршрут">✕</button>
        </div>
        <p>${distanceKm} км, ${route.difficulty}${route.city ? ' • ' + route.city : ''}</p>
        <div class="route-meta">
            <span>Приблизний час у дорозі: ~${estimatedTimeHours} год (15 км/год)</span>
            <a href="#/routes/${route.id}" data-link class="route-status">Детальніше →</a>
        </div>
    `;

    const deleteBtn = card.querySelector('.btn-delete');
    deleteBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        removeRoute(route.id);
    });

    card.addEventListener('click', (event) => {
        if (event.target.closest('button') || event.target.closest('a[data-link]')) return;
        navigate(`/routes/${route.id}`);
    });

    return card;
}

function renderRoutesList(items, container) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.textContent = 'Маршрутів за обраним критерієм не знайдено.';
        container.appendChild(emptyMsg);
        return;
    }

    for (const route of items) {
        container.appendChild(createRouteCard(route));
    }
}

function generateRoutesFromUsers(users) {
    const shuffled = [...users];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const count = Math.floor(Math.random() * 5) + 6;
    const selectedUsers = shuffled.slice(0, count);
    const difficulties = ['Легка', 'Середня', 'Важка'];

    return selectedUsers.map((user) => {
        const km = Math.floor(Math.random() * 35) + 8;
        const diff = difficulties[Math.floor(Math.random() * difficulties.length)];
        return {
            id: user.id,
            name: user.name,
            lengthKm: km,
            distanceKm: km,
            difficulty: diff,
            city: user.address?.city || 'Київ'
        };
    });
}

async function initData() {
    isLoading = true;
    errorMessage = '';

    try {
        await migrateLocalStorageToIndexedDB();
        let dbRoutes = await getAllItems();

        if (!dbRoutes || dbRoutes.length === 0) {
            const response = await fetch(API_URL);
            if (!response.ok) {
                throw new Error(`Помилка сервера: код ${response.status}`);
            }
            const data = await response.json();
            const initialRoutes = generateRoutesFromUsers(data);

            saveToLocalStorage(initialRoutes);
            for (const r of initialRoutes) {
                await putItem(r);
            }
            dbRoutes = initialRoutes;
        }

        routesData = dbRoutes;
    } catch (error) {
        errorMessage = 'Помилка доступу до локального сховища або мережі: ' + error.message;
        console.error(error);
        routesData = loadFromLocalStorage();
    } finally {
        isLoading = false;
    }
}

async function loadData() {
    isLoading = true;
    errorMessage = '';
    render();

    try {
        const response = await fetch(API_URL);
        if (!response.ok) {
            throw new Error(`Помилка сервера: код ${response.status}`);
        }
        const data = await response.json();
        const freshRoutes = generateRoutesFromUsers(data);

        await clearAllItems();
        for (const r of freshRoutes) {
            await putItem(r);
        }
        saveToLocalStorage(freshRoutes);

        routesData = await getAllItems();
    } catch (error) {
        errorMessage = 'Не вдалося оновити дані. ' + error.message;
        console.error(error);
    } finally {
        isLoading = false;
        render();
    }
}

async function removeRoute(id) {
    try {
        await deleteItem(id);
        routesData = await getAllItems();
        saveToLocalStorage(routesData);
        render();
    } catch (error) {
        errorMessage = 'Не вдалося видалити маршрут: ' + error.message;
        render();
    }
}

function validateKm(event) {
    const kmValue = Number(event.target.value);
    if (kmValue > 300) {
        event.target.setCustomValidity('Довжина маршруту не може перевищувати 300 км');
    } else {
        event.target.setCustomValidity('');
    }
}

function renderFilterLinks(activeLevel) {
    const levels = [
        { label: 'Всі', href: '#/', value: 'Всі' },
        { label: 'Легка', href: '#/difficulty/Легка', value: 'Легка' },
        { label: 'Середня', href: '#/difficulty/Середня', value: 'Середня' },
        { label: 'Важка', href: '#/difficulty/Важка', value: 'Важка' }
    ];

    return levels.map(item => {
        const activeClass = item.value === activeLevel ? 'active-filter' : '';
        return `<a href="${item.href}" data-link class="filter-link ${activeClass}">${item.label}</a>`;
    }).join('');
}

function renderToolbarAndStatus(activeLevel) {
    return `
        <div class="routes-toolbar">
            <div class="filter-wrapper">
                <span>Фільтр за складністю:</span>
                <div class="filter-links">
                    ${renderFilterLinks(activeLevel)}
                </div>
            </div>
            <button type="button" id="btn-refresh" class="btn-refresh" ${isLoading ? 'disabled' : ''}>
                Оновити маршрути
            </button>
        </div>

        ${isLoading ? '<div id="loading-indicator" class="loading-indicator">Завантаження маршрутів...</div>' : ''}
        ${errorMessage ? `<div id="error-message" class="error-message">${errorMessage}</div>` : ''}
    `;
}

function attachToolbarEvents(container) {
    const refreshBtn = container.querySelector('#btn-refresh');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', loadData);
    }
}

function attachHomeEvents(container) {
    attachToolbarEvents(container);

    const kmInput = container.querySelector('#route-km');
    if (kmInput) {
        kmInput.addEventListener('input', validateKm);
    }

    const form = container.querySelector('#route-form');
    if (form) {
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const nameInput = form.querySelector('#route-name');
            const lengthInput = form.querySelector('#route-km');
            const diffSelect = form.querySelector('#route-difficulty');

            const nextId = routesData.length > 0
                ? Math.max(...routesData.map(r => Number(r.id) || 0)) + 1
                : 1;

            const km = Number(lengthInput.value);
            const newRouteItem = {
                id: nextId,
                name: nameInput.value.trim(),
                lengthKm: km,
                distanceKm: km,
                difficulty: diffSelect.value,
                city: 'Київ'
            };

            try {
                await putItem(newRouteItem);
                routesData = await getAllItems();
                saveToLocalStorage(routesData);
                render();
            } catch (error) {
                errorMessage = 'Не вдалося зберегти новий маршрут: ' + error.message;
                render();
            }
        });
    }
}

function renderHome() {
    const app = document.querySelector('#app');
    app.innerHTML = `
        <section id="map">
            <h2>Карта</h2>
            <img src="assets/img/map-placeholder.jpg" alt="Карта веломаршрутів міста">
        </section>

        <section id="routes">
            <h2>Маршрути</h2>

            ${renderToolbarAndStatus('Всі')}

            <p id="total-km" style="font-weight: 800; font-size: 1.25rem; color: #b35000; margin-bottom: 20px;">
                Загальна довжина: ${calculateTotalKm(routesData)} км
            </p>

            <div id="routes-list" class="cards"></div>
        </section>

        <section id="add-route">
            <h2>Додати новий маршрут</h2>
            <form id="route-form">
                <div class="form-group">
                    <label for="route-name">Назва маршруту:</label>
                    <input type="text" id="route-name" name="name" required placeholder="наприклад, Оболонська набережна">
                </div>

                <div class="form-group">
                    <label for="route-km">Довжина (км):</label>
                    <input type="number" id="route-km" name="lengthKm" min="0.1" step="any" required placeholder="наприклад, 12.5">
                </div>

                <div class="form-group">
                    <label for="route-difficulty">Складність:</label>
                    <select id="route-difficulty" name="difficulty" required>
                        <option value="" disabled selected>Оберіть складність</option>
                        <option value="Легка">Легка</option>
                        <option value="Середня">Середня</option>
                        <option value="Важка">Важка</option>
                    </select>
                </div>

                <button type="submit" class="btn-submit">Додати маршрут</button>
            </form>
        </section>
    `;

    const listContainer = app.querySelector('#routes-list');
    renderRoutesList(routesData, listContainer);
    attachHomeEvents(app);
}

function renderRouteDetail(params) {
    const app = document.querySelector('#app');
    const routeId = Number(params.id);
    const route = routesData.find(item => Number(item.id) === routeId);

    if (!route) {
        renderNotFound();
        return;
    }

    const distanceKm = Number(route.distanceKm ?? route.lengthKm);
    const estimatedTime = (distanceKm / AVERAGE_SPEED_KMH).toFixed(1);

    app.innerHTML = `
        <aside class="route-detail-view">
            <p><a href="#/" data-link class="back-link">← Повернутися до списку маршрутів</a></p>
            <h2>Деталі обраного маршруту</h2>
            <div>
                <p><strong>Маршрут:</strong> ${route.name}</p>
                <p><strong>Місто:</strong> ${route.city}</p>
                <p><strong>Довжина (distanceKm):</strong> ${distanceKm} км | <strong>Складність:</strong> <a href="#/difficulty/${encodeURIComponent(route.difficulty)}" data-link class="route-status">${route.difficulty}</a></p>
                <p><strong>Приблизний час у дорозі (15 км/год):</strong> ~${estimatedTime} год</p>

                <div class="elevation-profile">
                    <h3>Профіль висоти маршруту</h3>
                    <div class="canvas-wrapper">
                        <canvas id="elevation-chart" width="560" height="220"></canvas>
                    </div>
                    <div class="chart-controls">
                        <button type="button" id="btn-replay" class="btn-refresh">Перезапустити анімацію</button>
                    </div>
                </div>
            </div>
        </aside>
    `;

    const replayBtn = app.querySelector('#btn-replay');
    if (replayBtn) {
        replayBtn.addEventListener('click', () => startElevationAnimation(route));
    }

    startElevationAnimation(route);
}

function renderDifficultyFilter(params) {
    const app = document.querySelector('#app');
    const level = params.level;
    const filtered = routesData.filter(route => route.difficulty === level);

    app.innerHTML = `
        <section id="routes">
            <p><a href="#/" data-link class="back-link">← Усі маршрути</a></p>
            <h2>Маршрути за складністю: ${level}</h2>

            ${renderToolbarAndStatus(level)}

            <p id="total-km" style="font-weight: 800; font-size: 1.25rem; color: #b35000; margin-bottom: 20px;">
                Загальна довжина: ${calculateTotalKm(filtered)} км
            </p>

            <div id="routes-list" class="cards"></div>
        </section>
    `;

    const listContainer = app.querySelector('#routes-list');
    renderRoutesList(filtered, listContainer);
    attachToolbarEvents(app);
}

function renderNotFound() {
    const app = document.querySelector('#app');
    app.innerHTML = `
        <section class="not-found">
            <h2>404 — Сторінку не знайдено</h2>
            <p>Запитаний маршрут або сторінка не існує.</p>
            <p><a href="#/" data-link class="btn-refresh">Повернутися на головну</a></p>
        </section>
    `;
}

// Таблиця маршрутів клієнтського роутера: зіставлення шляху з відповідною view-функцією
const routes = [
    { path: '/', view: renderHome },
    { path: '/routes/:id', view: renderRouteDetail },
    { path: '/difficulty/:level', view: renderDifficultyFilter }
];

function matchRoute(path) {
    const pathParts = path.split('/').filter(Boolean);
    for (const route of routes) {
        const routeParts = route.path.split('/').filter(Boolean);
        if (routeParts.length !== pathParts.length) continue;
        const params = {};
        const isMatch = routeParts.every((part, i) => {
            if (part.startsWith(':')) {
                params[part.slice(1)] = decodeURIComponent(pathParts[i]);
                return true;
            }
            return part === pathParts[i];
        });
        if (isMatch) return { view: route.view, params };
    }
    return null;
}

function navigate(path) {
    const cleanPath = path.startsWith('#') ? path.slice(1) : path;
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
    if (window.location.hash === '#' + normalizedPath) {
        render();
    } else {
        window.location.hash = normalizedPath;
    }
}

function render() {
    const app = document.querySelector('#app');
    if (!app) return;

    stopElevationAnimation();
    app.innerHTML = '';

    const rawPath = window.location.hash.slice(1) || '/';
    const path = rawPath.startsWith('/') ? rawPath : '/' + rawPath;

    const match = matchRoute(path);
    if (!match) {
        renderNotFound();
        return;
    }

    match.view(match.params);
}

document.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-link]');
    if (!link) return;
    event.preventDefault();
    const targetSection = link.dataset.scroll;
    navigate(link.getAttribute('href'));
    if (targetSection) {
        setTimeout(() => {
            const sectionEl = document.getElementById(targetSection);
            if (sectionEl) {
                sectionEl.scrollIntoView({ behavior: 'smooth' });
            }
        }, 0);
    }
});

window.addEventListener('hashchange', render);

window.addEventListener('DOMContentLoaded', async () => {
    await initData();
    render();
});