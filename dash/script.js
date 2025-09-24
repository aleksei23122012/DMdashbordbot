document.addEventListener('DOMContentLoaded', () => {

    // --- ПОДКЛЮЧЕНИЕ К SUPABASE ---
    const SUPABASE_URL = 'https://yhjrhnglgtenxwncrrnf.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloanJobmdsZ3Rlbnh3bmNycm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODA3MDksImV4cCI6MjA2ODY1NjcwOX0.0sSrzNrc08de6h9vWkDJxMBN4OTT2qsNhGhDvQ9VgbI';
    const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // --- ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ---
    let doughnutChartDay, doughnutChartMonth, trafficLineChart, leadsLineChart, timePerLeadLineChart;
    
    // ИЗМЕНЕНИЕ: Переменные для хранения данных пользователя после авторизации
    let userIdentifier = null;       // TG username или ID Mango
    let userIdentifierColumn = null; // 'tg' или 'id_mango'
    
    let currentUserName = "", currentUserPosition = "", currentUserTeam = "";
    
    const TAG_MAP = {"t_net": "Теги не проставлены", "t_avtootvet": "Автоответчик", "t_lid": "Лид", "t_neinteres": "Не интересно", "t_finorg": "Фин. орг.", "t_perezvon": "Перезвонить позже", "t_woman": "Женщина", "t_sbros": "Сброс", "t_nomany": "Нет денег", "t_buisnes": "Есть бизнес", "t_mat": "Ругается", "t_idiot": "Неадекват", "t_deti": "Дети", "t_old": "Пенсионер", "t_bankrot": "Банкрот", "t_duble": "Дубль", "t_gos": "Госслужащие"};
    const CAT_IMAGE_MAP = {1: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat1.png', 2: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat2.png', 3: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat3.png', 4: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat4.png', 5: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat5.png'};
    const DEFAULT_CAT_IMAGE = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTAxrOH3BsNrlwQ7MRFAM5YQfoyo4uSbgQVg&s';
    
    // --- ЭЛЕМЕНТЫ DOM ---
    const authOverlay = document.getElementById('auth-overlay');
    const authSubmitBtn = document.getElementById('auth-submit-btn');
    const authIdInput = document.getElementById('auth-id-input');
    const authError = document.getElementById('auth-error');
    const dashboardContainer = document.querySelector('.dashboard-container');

    // --- НОВАЯ ГИБРИДНАЯ АВТОРИЗАЦИЯ ---
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe?.user?.username) {
        // Сценарий 1: Запуск через Telegram Web App
        console.log("Обнаружен Telegram Web App. Используем авторизацию по username.");
        userIdentifier = window.Telegram.WebApp.initDataUnsafe.user.username;
        userIdentifierColumn = 'tg';

        authOverlay.style.display = 'none';
        dashboardContainer.style.visibility = 'visible';
        
        // Загрузка данных для пользователя Telegram
        fetchDashboardData('day');
    } else {
        // Сценарий 2: Запуск в обычном браузере, ждем ввода ID
        console.log("Telegram Web App не обнаружен. Ожидание входа по ID Mango.");
    }
    
    // Слушатель для кнопки входа в браузере
    authSubmitBtn.addEventListener('click', async () => {
        const inputId = authIdInput.value.trim();
        if (!inputId) {
            authError.textContent = 'ID не может быть пустым.';
            return;
        }

        authError.textContent = '';
        authSubmitBtn.disabled = true;
        authSubmitBtn.textContent = 'Проверка...';

        try {
            // Проверяем, есть ли такой id_mango в таблице persinfo
            const { data, error } = await supabaseClient
                .from('persinfo')
                .select('id_mango')
                .eq('id_mango', inputId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // Пользователь найден
                userIdentifier = data.id_mango;
                userIdentifierColumn = 'id_mango'; // Указываем, что искать нужно в колонке 'id_mango'
                
                authOverlay.style.display = 'none';
                dashboardContainer.style.visibility = 'visible';
                
                fetchDashboardData('day'); // Загружаем данные после успешного входа
            } else {
                authError.textContent = 'Пользователь с таким ID не найден.';
            }
        } catch (err) {
            console.error('Ошибка при авторизации:', err);
            authError.textContent = 'Произошла ошибка. Попробуйте снова.';
        } finally {
            authSubmitBtn.disabled = false;
            authSubmitBtn.textContent = 'Войти';
        }
    });

    // --- ФУНКЦИИ-ПОМОЩНИКИ (без изменений) ---
    function capitalizeFirstLetter(string) { if (!string) return ''; return string.charAt(0).toUpperCase() + string.slice(1); }
    function formatInterval(intervalStr) { if (!intervalStr) return "00:00:00"; return intervalStr.split('.')[0]; }
    function updateDoughnutChart(chartInstance, percentage = 0) { if (!chartInstance) return; const validPercentage = Math.max(0, Math.min(100, percentage)); chartInstance.data.datasets[0].data = [validPercentage, 100 - validPercentage]; chartInstance.update(); }
    function setComparisonIndicator(elementId, userValue, avgValue, isTime = false) { const element = document.getElementById(elementId); if (!element || userValue === null || userValue === undefined || avgValue === null || avgValue === undefined) { if (element) element.textContent = '---'; return; } const userSeconds = isTime ? timeToSeconds(userValue) : parseFloat(userValue); const avgSeconds = isTime ? timeToSeconds(avgValue) : parseFloat(avgValue); let userIsBetter = isTime ? userSeconds < avgSeconds : userSeconds > avgSeconds; element.textContent = userIsBetter ? '>' : '<'; element.className = userIsBetter ? 'indicator-col indicator-green' : 'indicator-col indicator-red'; }
    function timeToSeconds(timeStr) { if (!timeStr || typeof timeStr !== 'string') return 0; const parts = formatInterval(timeStr).split(':'); if (parts.length !== 3) return 0; return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10); }
    function timeToHours(timeStr) { if (!timeStr) return 0; const totalSeconds = timeToSeconds(timeStr); return totalSeconds / 3600; }
    function applyRelativeGradient(selector, isReversed = false) {
        const cells = document.querySelectorAll(selector);
        if (cells.length === 0) return;
        const cellData = Array.from(cells).map(cell => {
            const text = cell.textContent;
            const value = text.includes(':') ? timeToSeconds(text) : parseFloat(text.replace('%', ''));
            return { cell, value };
        });
        const values = cellData.map(item => item.value).filter(v => !isNaN(v));
        if (values.length === 0) return;
        const min = Math.min(...values);
        const max = Math.max(...values);
        if (min === max) {
            cellData.forEach(item => {
                const hue = item.value === 0 ? 0 : 60;
                item.cell.style.backgroundColor = `hsl(${hue}, 90%, 85%)`;
                item.cell.style.color = `hsl(${hue}, 80%, 25%)`;
                item.cell.style.fontWeight = '600';
                item.cell.style.borderRadius = '4px';
            });
            return;
        }
        const range = max - min;
        cellData.forEach(item => {
            let normalized = 0.5;
            if (range > 0 && !isNaN(item.value)) {
                normalized = (item.value - min) / range;
            }
            if (isReversed) {
                normalized = 1 - normalized;
            }
            const hue = normalized * 120;
            item.cell.style.backgroundColor = `hsl(${hue}, 90%, 85%)`;
            item.cell.style.color = `hsl(${hue}, 80%, 25%)`;
            item.cell.style.fontWeight = '600';
            item.cell.style.borderRadius = '4px';
            if (item.value === 0) {
                item.cell.style.backgroundColor = 'hsl(0, 90%, 85%)';
                item.cell.style.color = 'hsl(0, 80%, 25%)';
            }
        });
    }
    function updateTagsTable(tbodyId, data) { const tbody = document.getElementById(tbodyId); if (!tbody || !data) { tbody.innerHTML = '<tr><td colspan="2">Нет данных</td></tr>'; return; } tbody.innerHTML = ''; const tagsArray = Object.keys(data).filter(key => key.startsWith('t_') && key !== 't_os').map(key => ({ key, name: TAG_MAP[key] || key, count: data[key] || 0 })).filter(tag => tag.count > 0).sort((a, b) => b.count - a.count); if (tagsArray.length === 0) { tbody.innerHTML = '<tr><td colspan="2">Теги не найдены</td></tr>'; return; } tagsArray.forEach(tag => { const row = document.createElement('tr'); if (tag.key === 't_net') row.classList.add('highlight-red'); row.innerHTML = `<td>${tag.name}</td><td>${tag.count}</td>`; tbody.appendChild(row); }); }
    function createOrUpdateLineChart(canvasId, chartInstance, labels, yourData, avgData, yAxisFormatter) { const ctx = document.getElementById(canvasId).getContext('2d'); const data = { labels: labels, datasets: [ { label: 'Средние значения', data: avgData, borderColor: '#1e88e5', backgroundColor: '#1e88e5', borderWidth: 4, tension: 0.4, pointRadius: 5, pointBackgroundColor: 'white', pointBorderColor: '#1e88e5', pointBorderWidth: 2 }, { label: 'Твои значения', data: yourData, borderColor: '#e53935', backgroundColor: '#e53935', borderWidth: 4, tension: 0.4, pointRadius: 5, pointBackgroundColor: 'white', pointBorderColor: '#e53935', pointBorderWidth: 2 } ] }; const options = { responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, }, plugins: { legend: { display: false }, tooltip: { enabled: true, backgroundColor: 'rgba(0, 0, 0, 0.85)', titleColor: '#FFFFFF', bodyColor: '#FFFFFF', titleFont: { size: 14, weight: 'bold' }, bodyFont: { size: 12 }, padding: 12, cornerRadius: 8, displayColors: true, borderColor: 'rgba(0,0,0,0)', borderWidth: 0, callbacks: { labelColor: function(context) { return { borderColor: context.dataset.borderColor, backgroundColor: context.dataset.borderColor, borderWidth: 2, borderRadius: 2, }; }, title: function(tooltipItems) { const label = tooltipItems[0].label; return capitalizeFirstLetter(label); }, label: function(context) { let label = context.dataset.label || ''; if (label) { label += ': '; } if (context.parsed.y !== null) { label += yAxisFormatter(context.parsed.y); } return label; } } } }, scales: { y: { beginAtZero: true, ticks: { callback: yAxisFormatter } } } }; if (chartInstance) { chartInstance.data = data; chartInstance.options = options; chartInstance.update(); return chartInstance; } else { return new Chart(ctx, { type: 'line', data: data, options: options }); } }

    // --- ОСНОВНЫЕ ФУНКЦИИ ЗАГРУЗКИ ---
    
    async function fetchDashboardData(period) {
        if (!userIdentifier || !userIdentifierColumn) return; // Защита от вызова до авторизации

        const userTable = period === 'day' ? 'TMday' : 'TMmonth';
        const avgTable = period === 'day' ? 'AVGday' : 'AVGmonth';

        // ИЗМЕНЕНИЕ: Запрос использует динамические переменные
        const userRequest = supabaseClient.from(userTable).select('*').eq(userIdentifierColumn, userIdentifier).maybeSingle();
        const avgRequest = supabaseClient.from(avgTable).select('*').maybeSingle();
        
        const [userResponse, avgResponse] = await Promise.all([userRequest, avgRequest]);

        if (userResponse.error || avgResponse.error) { console.error(`Ошибка Supabase:`, userResponse.error || avgResponse.error); alert(`Произошла ошибка при загрузке данных. Подробности в консоли.`); return; }
        const userData = userResponse.data;
        const avgData = avgResponse.data;
        if (!userData) { alert(`Данные для пользователя "${userIdentifier}" не найдены в таблице ${userTable}.`); return; }
        if (!avgData) { alert(`Средние данные не найдены в таблице ${avgTable}.`); return; }

        currentUserName = userData.operator;
        currentUserPosition = userData.dolg;
        currentUserTeam = userData.team;

        document.getElementById('operator-name').textContent = currentUserName;
        if (currentUserPosition) { document.getElementById('btn-position').textContent = `Все ${currentUserPosition}`; }

        if (period === 'day') {
            document.getElementById('context-name').textContent = currentUserTeam;
            document.getElementById('trafic-value-day').textContent = formatInterval(userData.trafic);
            updateDoughnutChart(doughnutChartDay, (userData.per_trafic || 0) * 100);
            document.getElementById('kz-bar-day').textContent = `Количество звонков - ${userData.kz || 0}`;
            document.getElementById('lid-bar-day').textContent = `Количество лидов - ${userData.lid || 0}`;
            document.getElementById('avg-time-lid-bar-day').textContent = `Время на лид - ${formatInterval(userData.avg_time_lid)}`;
            document.getElementById('os-text-day').textContent = userData.OS || "Обратная связь отсутствует.";
            document.getElementById('cat-image-day').src = CAT_IMAGE_MAP[userData.cat] || DEFAULT_CAT_IMAGE;
            document.getElementById('day-user-kz').textContent = userData.kz;
            document.getElementById('day-srav-kz').textContent = avgData.kz;
            setComparisonIndicator('day-ind-kz', userData.kz, avgData.kz);
            document.getElementById('day-user-lid').textContent = userData.lid;
            document.getElementById('day-srav-lid').textContent = avgData.lid;
            setComparisonIndicator('day-ind-lid', userData.lid, avgData.lid);
            document.getElementById('day-user-time').textContent = formatInterval(userData.avg_time_lid);
            document.getElementById('day-srav-time').textContent = formatInterval(avgData.avg_time_lid);
            setComparisonIndicator('day-ind-time', userData.avg_time_lid, avgData.avg_time_lid, true);
            document.getElementById('day-user-trafic').textContent = formatInterval(userData.trafic);
            document.getElementById('day-srav-trafic').textContent = formatInterval(avgData.trafic);
            setComparisonIndicator('day-ind-trafic', userData.trafic, avgData.trafic, true);
            updateTagsTable('tags-table-body-day', userData);
        } else if (period === 'month') {
            document.getElementById('context-name').textContent = avgData.month || "Месяц";
            document.getElementById('trafic-value-month').textContent = formatInterval(userData.trafic);
            updateDoughnutChart(doughnutChartMonth, (userData.per_trafic || 0) * 100);
            document.getElementById('kz-bar-month').textContent = `Количество звонков - ${userData.kz || 0}`;
            document.getElementById('lid-bar-month').textContent = `Количество лидов - ${userData.lid || 0}`;
            document.getElementById('avg-time-lid-bar-month').textContent = `Время на лид - ${formatInterval(userData.avg_time_lid)}`;
            document.getElementById('os-text-month').textContent = userData.OS || "Обратная связь отсутствует.";
            document.getElementById('plan-trafic-prognoz-value').textContent = `${Math.round((userData.per_trafic_prognoz || 0) * 100)}%`;
            document.getElementById('plan-lid-prognoz-value').textContent = `${Math.round((userData.per_lid_prognoz || 0) * 100)}%`;
            document.getElementById('month-user-kz').textContent = userData.kz;
            document.getElementById('month-srav-kz').textContent = avgData.kz;
            setComparisonIndicator('month-ind-kz', userData.kz, avgData.kz);
            document.getElementById('month-user-lid').textContent = userData.lid;
            document.getElementById('month-srav-lid').textContent = avgData.lid;
            setComparisonIndicator('month-ind-lid', userData.lid, avgData.lid);
            document.getElementById('month-user-time').textContent = formatInterval(userData.avg_time_lid);
            document.getElementById('month-srav-time').textContent = formatInterval(avgData.avg_time_lid);
            setComparisonIndicator('month-ind-time', userData.avg_time_lid, avgData.avg_time_lid, true);
            document.getElementById('month-user-trafic').textContent = formatInterval(userData.trafic);
            document.getElementById('month-srav-trafic').textContent = formatInterval(avgData.trafic);
            setComparisonIndicator('month-ind-trafic', userData.trafic, avgData.trafic, true);
            updateTagsTable('tags-table-body-month', userData);
        }
    }

    async function fetchPositionData() {
        if (!currentUserPosition || !currentUserTeam) { await fetchDashboardData('day'); }
        if (!currentUserPosition) { alert("Не удалось загрузить данные пользователя для определения группы."); return; }
        let filterColumn, filterValue, headerText;
        if (currentUserPosition === 'РГТМ') {
            filterColumn = 'team';
            filterValue = currentUserTeam;
            headerText = currentUserTeam;
        } else {
            filterColumn = 'dolg';
            filterValue = currentUserPosition;
            headerText = currentUserPosition;
        }
        document.getElementById('context-name').textContent = headerText;
        const dayRequest = supabaseClient.from('TMday').select('*').eq(filterColumn, filterValue);
        const monthRequest = supabaseClient.from('TMmonth').select('*').eq(filterColumn, filterValue);
        const [dayResponse, monthResponse] = await Promise.all([dayRequest, monthRequest]);
        if (dayResponse.error || monthResponse.error) { console.error("Ошибка при загрузке рейтинга:", dayResponse.error || monthResponse.error); alert("Не удалось загрузить данные для рейтинга."); return; }
        populatePositionTableDay(dayResponse.data);
        populatePositionTableMonth(monthResponse.data);
    }

    function populatePositionTableDay(data) { const tbody = document.getElementById('position-data-body-day'); tbody.innerHTML = ''; data.sort((a, b) => (b.lid || 0) - (a.lid || 0)); data.forEach(op => { const row = document.createElement('tr'); if (op.operator === currentUserName) { row.classList.add('current-user-row'); } row.innerHTML = ` <td class="separator-right">${op.operator || '---'}</td> <td>${formatInterval(op.trafic)}</td> <td class="td-gradient-traffic-day">${Math.round((op.per_trafic || 0) * 100)}%</td> <td>${op.kz || 0}</td> <td>${op.lid || 0}</td> <td class="td-gradient-time-day">${formatInterval(op.avg_time_lid)}</td> <td class="td-gradient-leads-day separator-right">${Math.round((op.per_lid || 0) * 100)}%</td> <td>${formatInterval(op.plan_trafic)}</td> <td>${op.plan_lid || 0}</td> `; tbody.appendChild(row); }); applyRelativeGradient('.td-gradient-traffic-day'); applyRelativeGradient('.td-gradient-leads-day'); applyRelativeGradient('.td-gradient-time-day', true); }
    function populatePositionTableMonth(data) { const tbody = document.getElementById('position-data-body-month'); tbody.innerHTML = ''; data.sort((a, b) => (b.lid || 0) - (a.lid || 0)); data.forEach(op => { const row = document.createElement('tr'); if (op.operator === currentUserName) { row.classList.add('current-user-row'); } row.innerHTML = ` <td class="separator-right">${op.operator || '---'}</td> <td>${formatInterval(op.trafic)}</td> <td class="td-gradient-traffic-month">${Math.round((op.per_trafic || 0) * 100)}%</td> <td>${op.kz || 0}</td> <td>${op.lid || 0}</td> <td class="td-gradient-time-month">${formatInterval(op.avg_time_lid)}</td> <td class="td-gradient-leads-month separator-right">${Math.round((op.per_lid || 0) * 100)}%</td> <td>${formatInterval(op.avg_time_post)}</td> `; tbody.appendChild(row); }); applyRelativeGradient('.td-gradient-traffic-month'); applyRelativeGradient('.td-gradient-leads-month'); applyRelativeGradient('.td-gradient-time-month', true); }
    
    async function fetchDynamicsData() {
        if (!userIdentifier || !userIdentifierColumn) return; // Защита от вызова до авторизации

        // ИЗМЕНЕНИЕ: Запрос использует динамические переменные
        const { data, error } = await supabaseClient.from('Dynamics').select('*').eq(userIdentifierColumn, userIdentifier).maybeSingle();

        if (error) { console.error("Ошибка при загрузке данных для динамики:", error); alert("Не удалось загрузить данные для динамики."); return; }
        if (!data) { alert(`Данные для динамики не найдены для пользователя ${userIdentifier}.`); return; }

        const labels = [], yourTraffic = [], avgTraffic = [], yourLeads = [], avgLeads = [], yourTime = [], avgTime = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
            labels.push(date.toLocaleString('ru-RU', { month: 'short' }).replace('.', ''));
        }

        for (let i = 1; i <= 6; i++) {
            yourTraffic.push(timeToHours(data[`${i}trafic`]));
            avgTraffic.push(timeToHours(data[`${i}avg_trafic`]));
            yourLeads.push(data[`${i}lid`] || 0); 
            avgLeads.push(data[`${i}avg_lid`] || 0);
            yourTime.push(timeToSeconds(data[`${i}time`]));
            avgTime.push(timeToSeconds(data[`${i}avg_time`]));
        }

        const firstMonthDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
        const firstMonthName = firstMonthDate.toLocaleString('ru-RU', { month: 'long' });
        const currentMonthName = now.toLocaleString('ru-RU', { month: 'long' });
        document.getElementById('context-name').textContent = `${capitalizeFirstLetter(firstMonthName)} - ${capitalizeFirstLetter(currentMonthName)}`;
        
        trafficLineChart = createOrUpdateLineChart('traffic-line-chart', trafficLineChart, labels, yourTraffic, avgTraffic, (val) => `${Math.round(val)} ч`);
        leadsLineChart = createOrUpdateLineChart('leads-line-chart', leadsLineChart, labels, yourLeads, avgLeads, (val) => `${val}`);
        timePerLeadLineChart = createOrUpdateLineChart('time-per-lead-line-chart', timePerLeadLineChart, labels, yourTime, avgTime, (val) => `${(val / 60).toFixed(1).replace('.',',')} мин`);
        document.getElementById('dynamics-os-text').textContent = data.os || "Обратная связь отсутствует.";
    }

    // --- ИНИЦИАЛИЗАЦИЯ ГРАФИКОВ И СЛУШАТЕЛЕЙ КНОПОК ---
    const darkBlueColor = getComputedStyle(document.documentElement).getPropertyValue('--dark-blue').trim();
    const chartOptions = { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } };
    const chartDataTemplate = { labels: ['Процент трафика', 'Остаток'], datasets: [{ data: [0, 100], backgroundColor: [ darkBlueColor, '#E9ECEF' ], borderColor: 'transparent' }] };
    doughnutChartDay = new Chart(document.getElementById('doughnutChartDay').getContext('2d'), { type: 'doughnut', data: JSON.parse(JSON.stringify(chartDataTemplate)), options: chartOptions });
    doughnutChartMonth = new Chart(document.getElementById('doughnutChartMonth').getContext('2d'), { type: 'doughnut', data: JSON.parse(JSON.stringify(chartDataTemplate)), options: chartOptions });
    
    const btnDay = document.getElementById('btn-day');
    const btnMonth = document.getElementById('btn-month');
    const btnPosition = document.getElementById('btn-position');
    const btnDynamics = document.getElementById('btn-dynamics');
    const allViews = document.querySelectorAll('.view');
    const allButtons = document.querySelectorAll('.header-buttons button');
    const operatorNameEl = document.getElementById('operator-name');
    const contextNameEl = document.getElementById('context-name');

    function switchView(viewId, buttonToActivate, task) {
        allViews.forEach(view => view.style.display = 'none');
        allButtons.forEach(button => button.classList.remove('active'));
        document.getElementById(viewId).style.display = 'flex';
        buttonToActivate.classList.add('active');
        
        operatorNameEl.style.display = 'inline';
        contextNameEl.style.display = 'inline';
        contextNameEl.style.fontWeight = '600';
        contextNameEl.style.fontSize = 'inherit';
        contextNameEl.style.color = 'var(--text-secondary)';
        
        if (task === 'day' || task === 'month') { fetchDashboardData(task); } 
        else if (task === 'position') {
            operatorNameEl.style.display = 'none';
            contextNameEl.style.fontWeight = '700';
            contextNameEl.style.fontSize = '22px';
            contextNameEl.style.color = 'var(--text-primary)';
            fetchPositionData();
        } else if (task === 'dynamics') {
            operatorNameEl.textContent = currentUserName || "Пользователь";
            fetchDynamicsData();
        }
    }

    btnDay.addEventListener('click', () => { switchView('view-day', btnDay, 'day'); });
    btnMonth.addEventListener('click', () => { switchView('view-month', btnMonth, 'month'); });
    btnPosition.addEventListener('click', () => { switchView('view-position', btnPosition, 'position'); });
    btnDynamics.addEventListener('click', () => { switchView('view-dynamics', btnDynamics, 'dynamics'); });

    // ВАЖНО: Первоначальная загрузка данных теперь происходит только после успешной авторизации,
    // поэтому вызов fetchDashboardData('day') в конце файла больше не нужен.
});
