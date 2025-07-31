const supabaseUrl = 'https://yhjrhnglgtenxwncrrnf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloanJobmdsZ3Rlbnh3bmNycm5mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODA3MDksImV4cCI6MjA2ODY1NjcwOX0.0sSrzNrc08de6h9vWkDJxMBN4OTT2qsNhGhDvQ9VgbI';
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let doughnutChart;
let doughnutChartMonth;
let currentUserPosition = null; // Храним должность, а не команду

const TAG_MAP = {
    t_net: "Теги не проставлены", t_avtootvet: "Автоответчик", t_lid: "Лид",
    t_neinteres: "Не интересно", t_finorg: "Фин. орг.", t_perezvon: "Перезвонить позже",
    t_woman: "Женщина", t_sbros: "Сброс", t_nomany: "Нет денег",
    t_buisnes: "Есть бизнес", t_mat: "Ругается", t_idiot: "Неадекват",
    t_deti: "Дети", t_old: "Пенсионер", t_bankrot: "Банкрот",
    t_duble: "Дубль"
};
const TAG_COLUMNS = Object.keys(TAG_MAP).join(',');

const CAT_IMAGE_MAP = {
    1: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat1.png',
    2: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat2.png',
    3: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat3.png',
    4: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat4.png',
    5: 'https://yhjrhnglgtenxwncrrnf.supabase.co/storage/v1/object/public/cats/cat5.png'
};
const DEFAULT_CAT_IMAGE = 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTTAxrOH3BsNrlwQ7MRFAM5YQfoyo4uSbgQVg&s';

function updateTagsTable(tbodyId, data) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody || !data) return;
    tbody.innerHTML = '';
    const tagsArray = [];
    for (const key in TAG_MAP) {
        tagsArray.push({ key: key, name: TAG_MAP[key], count: data[key] || 0 });
    }
    tagsArray.sort((a, b) => b.count - a.count);
    tagsArray.forEach(tag => {
        if (tag.count > 0) {
            const row = document.createElement('tr');
            if (tag.key === 't_net') { row.classList.add('highlight-red'); }
            row.innerHTML = `<td>${tag.name}</td><td>${tag.count}</td>`;
            tbody.appendChild(row);
        }
    });
}

function updateDoughnutChart(chartInstance, percentage = 0) {
    if (!chartInstance) return;
    const validPercentage = Math.max(0, Math.min(100, percentage));
    chartInstance.data.datasets[0].data = [validPercentage, 100 - validPercentage];
    chartInstance.update();
}

function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function setComparisonIndicator(elementId, userValue, avgValue, isTime = false) {
    const element = document.getElementById(elementId);
    if (!element || userValue === null || avgValue === null) {
        if (element) element.textContent = '';
        return;
    };
    let userIsBetter;
    if (isTime) {
        userIsBetter = timeToSeconds(userValue) < timeToSeconds(avgValue);
    } else {
        userIsBetter = parseFloat(userValue) > parseFloat(avgValue);
    }
    if (userIsBetter) {
        element.textContent = '>';
        element.className = 'indicator-col indicator-green';
    } else {
        element.textContent = '<';
        element.className = 'indicator-col indicator-red';
    }
}

function timeToSeconds(timeStr) {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const parts = timeStr.split(':');
    if (parts.length !== 3) return 0;
    return parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
}

async function fetchDashboardData(tableName) {
    let userIdentifier = null;
    let userIdentifierForDisplay = 'Неизвестный';

    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        const tgWebApp = window.Telegram.WebApp;
        tgWebApp.ready();
        const user = tgWebApp.initDataUnsafe?.user;
        if (user && (user.username || user.id)) {
            userIdentifier = user.username ? user.username.toString() : user.id.toString();
        }
    }
    
    if (!userIdentifier) {
        document.getElementById('operator-name').textContent = 'Пользователь не определен';
        return;
    }
    
    document.getElementById('operator-name').textContent = 'Загрузка...';
    document.getElementById('position-name').textContent = '';

    if (tableName === 'TMday') {
        try {
            const { data, error } = await supabaseClient.from('TMday').select(`operator, dolg, cat, trafic, kz, lid, avg_time_lid, per_trafic, OS, ${TAG_COLUMNS}`).eq('tg', userIdentifier).single();
            if (error) throw error;
            if (data) {
                currentUserPosition = data.dolg;
                document.getElementById('operator-name').textContent = data.operator ?? 'Имя не найдено';
                document.getElementById('position-name').textContent = data.dolg ?? '';
                document.getElementById('trafic-value').textContent = data.trafic ?? '00:00:00';
                document.getElementById('kz-bar').textContent = `Количество звонков - ${data.kz ?? 0}`;
                document.getElementById('lid-bar').textContent = `Количество лидов - ${data.lid ?? 0}`;
                document.getElementById('avg-time-lid-bar').textContent = `Время на лид - ${data.avg_time_lid ?? '00:00:00'}`;
                document.getElementById('os-text').textContent = data.OS ?? 'Обратная связь от оператора отсутствует.';
                updateTagsTable('tags-table-body-day', data);
                updateDoughnutChart(doughnutChart, (parseFloat(data.per_trafic) || 0) * 100);
                document.getElementById('cat-image-day').src = CAT_IMAGE_MAP[data.cat] || DEFAULT_CAT_IMAGE;
            } else {
                 document.getElementById('operator-name').textContent = 'Данные не найдены';
            }
        } catch (error) {
            console.error(`Ошибка 'TMday':`, error.message);
        }
    } else if (tableName === 'TMmonth') {
        try {
            const { data: userData, error: userError } = await supabaseClient.from('TMmonth').select('operator, dolg, trafic, per_trafic, kz, lid, avg_time_lid, OS, per_trafic_prognoz, per_lid_prognoz').eq('tg', userIdentifier).single();
            if (userError) throw userError;
            
            const { data: avgData, error: avgError } = await supabaseClient.from('AVGmonth').select('kz, lid, avg_time_lid, trafic').single();
            if (avgError) throw avgError;

            if (userData) {
                currentUserPosition = userData.dolg;
                document.getElementById('operator-name').textContent = userData.operator ?? 'Имя не найдено';
                document.getElementById('position-name').textContent = userData.dolg ?? '';
                document.getElementById('trafic-value-month').textContent = userData.trafic ?? 'N/A';
                updateDoughnutChart(doughnutChartMonth, (parseFloat(userData.per_trafic) || 0) * 100);
                document.getElementById('kz-bar-month').textContent = `Количество звонков - ${userData.kz ?? 'N/A'}`;
                document.getElementById('lid-bar-month').textContent = `Количество лидов - ${userData.lid ?? 'N/A'}`;
                document.getElementById('avg-time-lid-bar-month').textContent = `Время на лид - ${userData.avg_time_lid ?? 'N/A'}`;
                document.getElementById('os-text-month').textContent = userData.OS ?? 'Обратная связь за месяц отсутствует.';
                document.getElementById('plan-trafic-prognoz-value').textContent = `${Math.round((parseFloat(userData.per_trafic_prognoz) || 0) * 100)}%`;
                document.getElementById('plan-lid-prognoz-value').textContent = `${Math.round((parseFloat(userData.per_lid_prognoz) || 0) * 100)}%`;

                const { data: tagsData } = await supabaseClient.from('TMday').select(TAG_COLUMNS).eq('tg', userIdentifier).single();
                if (tagsData) {
                    updateTagsTable('tags-table-body-month', tagsData);
                }

                if(avgData){
                    document.getElementById('month-user-kz').textContent = userData.kz ?? 'N/A';
                    document.getElementById('month-user-lid').textContent = userData.lid ?? 'N/A';
                    document.getElementById('month-user-time').textContent = userData.avg_time_lid ?? 'N/A';
                    document.getElementById('month-user-trafic').textContent = userData.trafic ?? 'N/A';
                    document.getElementById('month-srav-kz').textContent = avgData.kz ?? 'N/A';
                    document.getElementById('month-srav-lid').textContent = avgData.lid ?? 'N/A';
                    document.getElementById('month-srav-time').textContent = avgData.avg_time_lid ?? 'N/A';
                    document.getElementById('month-srav-trafic').textContent = avgData.trafic ?? 'N/A';
                    setComparisonIndicator('month-ind-kz', userData.kz, avgData.kz);
                    setComparisonIndicator('month-ind-lid', userData.lid, avgData.lid);
                    setComparisonIndicator('month-ind-time', userData.avg_time_lid, avgData.avg_time_lid, true);
                    setComparisonIndicator('month-ind-trafic', userData.trafic, avgData.trafic, true);
                }
            } else {
                 document.getElementById('operator-name').textContent = 'Данные не найдены';
            }
        } catch (error) {
            console.error(`Ошибка 'TMmonth':`, error.message);
        }
    }
}

async function fetchPositionData(position) {
    if (!position) {
        alert("Не удалось определить должность. Пожалуйста, сначала откройте вкладку 'День' или 'Месяц'.");
        return;
    }
    document.getElementById('position-name').textContent = position;
    try {
        const { data: dayData, error: dayError } = await supabaseClient.from('Teamday').select('*').eq('dolg', position);
        if (dayError) throw dayError;

        const { data: monthData, error: monthError } = await supabaseClient.from('Teammon').select('*').eq('dolg', position);
        if (monthError) throw monthError;

        populatePositionTableDay(dayData);
        populatePositionTableMonth(monthData);

    } catch (error) {
        console.error("Ошибка при загрузке данных по должности:", error.message);
    }
}

function populatePositionTableDay(data) {
    const tbody = document.getElementById('position-data-body-day');
    data.sort((a, b) => (b.lid || 0) - (a.lid || 0));
    tbody.innerHTML = '';
    data.forEach(op => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="separator-right">${op.operator}</td>
            <td>${op.trafic || 'N/A'}</td>
            <td class="td-gradient-traffic-day">${(op.per_trafic * 100).toFixed(0)}%</td>
            <td>${op.kz || 0}</td>
            <td>${op.lid || 0}</td>
            <td class="td-gradient-time-day">${op.avg_time_lid || 'N/A'}</td>
            <td class="td-gradient-leads-day separator-right">${(op.per_lid * 100).toFixed(0)}%</td>
            <td>${op.plan_trafic || 'N/A'}</td>
            <td>${op.plan_lid || 0}</td>
        `;
        tbody.appendChild(row);
    });
    applyRelativeGradient('.td-gradient-traffic-day');
    applyRelativeGradient('.td-gradient-leads-day');
    applyRelativeGradient('.td-gradient-time-day', true);
}

function populatePositionTableMonth(data) {
    const tbody = document.getElementById('position-data-body-month');
    data.sort((a, b) => (b.lid || 0) - (a.lid || 0));
    tbody.innerHTML = '';
    data.forEach(op => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="separator-right">${op.operator}</td>
            <td>${op.trafic || 'N/A'}</td>
            <td class="td-gradient-traffic-month">${(op.per_trafic * 100).toFixed(0)}%</td>
            <td>${op.kz || 0}</td>
            <td>${op.lid || 0}</td>
            <td class="td-gradient-time-month">${op.avg_time_lid || 'N/A'}</td>
            <td class="td-gradient-leads-month separator-right">${(op.per_lid * 100).toFixed(0)}%</td>
            <td>${op.avg_time_post || 'N/A'}</td>
        `;
        tbody.appendChild(row);
    });
    applyRelativeGradient('.td-gradient-traffic-month');
    applyRelativeGradient('.td-gradient-leads-month');
    applyRelativeGradient('.td-gradient-time-month', true);
}

function applyRelativeGradient(selector, isReversed = false) {
    const cells = document.querySelectorAll(selector);
    if (cells.length === 0) return;
    const values = Array.from(cells).map(cell => {
        const text = cell.textContent;
        if (text.includes(':')) {
            const parts = text.split(':').map(Number);
            return (parts[0] || 0) * 3600 + (parts[1] || 0) * 60 + (parts[2] || 0);
        }
        return parseFloat(text.replace('%', ''));
    });
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    cells.forEach((cell, index) => {
        const value = values[index];
        let normalized = 0.5;
        if (range > 0) normalized = (value - min) / range;
        if (isReversed) normalized = 1 - normalized;
        const hue = normalized * 120;
        cell.style.backgroundColor = `hsl(${hue}, 90%, 85%)`;
        cell.style.color = `hsl(${hue}, 80%, 25%)`;
        cell.style.fontWeight = '600';
        cell.style.borderRadius = '4px';
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const darkBlueColor = getComputedStyle(document.documentElement).getPropertyValue('--dark-blue').trim();
    const chartOptions = { responsive: true, maintainAspectRatio: false, cutout: '80%', plugins: { legend: { display: false }, tooltip: { enabled: false } } };
    const chartDataTemplate = { labels: ['Процент трафика', 'Остаток'], datasets: [{ data: [0, 100], backgroundColor: [ darkBlueColor, '#E9ECEF' ], borderColor: 'transparent' }] };

    const ctxDay = document.getElementById('doughnutChart').getContext('2d');
    doughnutChart = new Chart(ctxDay, { type: 'doughnut', data: JSON.parse(JSON.stringify(chartDataTemplate)), options: chartOptions });

    const ctxMonth = document.getElementById('doughnutChartMonth').getContext('2d');
    doughnutChartMonth = new Chart(ctxMonth, { type: 'doughnut', data: JSON.parse(JSON.stringify(chartDataTemplate)), options: chartOptions });
    
    const btnDay = document.getElementById('btn-day');
    const btnMonth = document.getElementById('btn-month');
    const btnPosition = document.getElementById('btn-position');
    const btnDynamics = document.getElementById('btn-dynamics');
    const viewDay = document.getElementById('view-day');
    const viewMonth = document.getElementById('view-month');
    const viewPosition = document.getElementById('view-position');
    const viewDynamics = document.getElementById('view-dynamics');
    const operatorNameEl = document.getElementById('operator-name');
    const positionNameEl = document.getElementById('position-name');

    const allButtons = [btnDay, btnMonth, btnPosition, btnDynamics];
    const allViews = [viewDay, viewMonth, viewPosition, viewDynamics];

    function switchView(viewToShow, buttonToActivate) {
        allViews.forEach(view => view.classList.remove('active'));
        allButtons.forEach(button => button.classList.remove('active'));
        viewToShow.classList.add('active');
        buttonToActivate.classList.add('active');
        
        if (viewToShow.id === 'view-position') {
            operatorNameEl.style.display = 'none';
            positionNameEl.style.fontWeight = '700';
            positionNameEl.style.fontSize = '22px';
            positionNameEl.style.color = 'var(--text-primary)';
            fetchPositionData(currentUserPosition);
        } else {
            operatorNameEl.style.display = 'inline';
            positionNameEl.style.fontWeight = '600';
            positionNameEl.style.fontSize = 'inherit';
            positionNameEl.style.color = 'var(--text-secondary)';
            
            if (viewToShow.id !== 'view-dynamics') {
                const tableName = viewToShow.id === 'view-day' ? 'TMday' : 'TMmonth';
                fetchDashboardData(tableName);
            }
        }
    }

    btnDay.addEventListener('click', () => { switchView(viewDay, btnDay); });
    btnMonth.addEventListener('click', () => { switchView(viewMonth, btnMonth); });
    btnPosition.addEventListener('click', () => { switchView(viewPosition, btnPosition); });
    btnDynamics.addEventListener('click', () => { switchView(viewDynamics, btnDynamics); });

    fetchDashboardData('TMday');
});
