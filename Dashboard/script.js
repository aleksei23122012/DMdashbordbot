const supabaseUrl = 'https://yhjrhnglgtenxwncrrnf.supabase.co';
const supabaseKey = '...'; // Ваш ключ
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

let doughnutChart, doughnutChartMonth;
let currentUserPosition = null;

// ... функции TAG_MAP, CAT_IMAGE_MAP и т.д. остаются без изменений ...

function updateTagsTable(tbodyId, data) {
    // ... функция без изменений ...
}

async function fetchDashboardData(tableName) {
    let userIdentifier = null, userIdentifierForDisplay = 'Неизвестный';
    // ... логика определения userIdentifier ...
    if (!userIdentifier) { return; }

    if (tableName === 'TMday') {
        try {
            const { data, error } = await supabaseClient.from('TMday').select(`operator, dolg, cat, trafic, kz, lid, avg_time_lid, per_trafic, OS, ${TAG_COLUMNS}`).eq('tg', userIdentifier).single();
            if (error) throw error;
            if (data) {
                currentUserPosition = data.dolg;
                document.getElementById('operator-name').textContent = data.operator ?? 'Имя не найдено';
                document.getElementById('position-name').textContent = data.dolg ?? '';
                updateTagsTable('tags-table-body-day', data);
                // ... остальная логика заполнения данных для вида "День" ...
            }
        } catch (error) { /* ... обработка ошибки ... */ }
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
                
                const { data: tagsData } = await supabaseClient.from('TMday').select(TAG_COLUMNS).eq('tg', userIdentifier).single();
                if (tagsData) {
                    updateTagsTable('tags-table-body-month', tagsData);
                }
                // ... остальная логика заполнения данных для вида "Месяц" ...
            }
        } catch (error) { /* ... обработка ошибки ... */ }
    }
}

// ИСПРАВЛЕННАЯ ФУНКЦИЯ
async function fetchPositionData(position) {
    if (!position) {
        alert("Не удалось определить должность. Пожалуйста, сначала откройте вкладку 'День' или 'Месяц'.");
        return;
    }
    document.getElementById('position-name').textContent = position;

    try {
        // Используем правильные таблицы Teamday и Teammon
        const { data: dayData, error: dayError } = await supabaseClient.from('Teamday').select('*').eq('dolg', position);
        if (dayError) throw dayError;

        const { data: monthData, error: monthError } = await supabaseClient.from('Teammon').select('*').eq('dolg', position);
        if (monthError) throw monthError;

        populatePositionTableDay(dayData);
        populatePositionTableMonth(monthData);

    } catch (error) {
        console.error("Ошибка при загрузке данных по должности:", error.message);
        alert("Не удалось загрузить данные по должности. Проверьте RLS для таблиц Teamday и Teammon.");
    }
}

function populatePositionTableDay(data) {
    const tbody = document.getElementById('position-data-body-day');
    data.sort((a, b) => (b.lid || 0) - (a.lid || 0));
    tbody.innerHTML = '';
    data.forEach(op => {
        // ... код вставки строк ...
    });
    // ... применение градиентов ...
}

function populatePositionTableMonth(data) {
    const tbody = document.getElementById('position-data-body-month');
    data.sort((a, b) => (b.lid || 0) - (a.lid || 0));
    tbody.innerHTML = '';
    data.forEach(op => {
        // ... код вставки строк ...
    });
    // ... применение градиентов ...
}

document.addEventListener('DOMContentLoaded', () => {
    // ... весь остальной код из предыдущего ответа остается без изменений ...
    
    // Получаем ссылки на новые/переименованные элементы
    const btnDay = document.getElementById('btn-day');
    const btnMonth = document.getElementById('btn-month');
    const btnPosition = document.getElementById('btn-position');
    const btnDynamics = document.getElementById('btn-dynamics');

    const viewDay = document.getElementById('view-day');
    const viewMonth = document.getElementById('view-month');
    const viewPosition = document.getElementById('view-position');
    const viewDynamics = document.getElementById('view-dynamics');
    
    // ... и так далее ...

    function switchView(viewToShow, buttonToActivate) {
        // ... логика переключения ...
        if (viewToShow.id === 'view-position') {
            // ... стилизация ...
            fetchPositionData(currentUserPosition); // Вызываем правильную функцию
        } else {
            // ...
        }
    }
    
    btnDay.addEventListener('click', () => { switchView(viewDay, btnDay); });
    btnMonth.addEventListener('click', () => { switchView(viewMonth, btnMonth); });
    btnPosition.addEventListener('click', () => { switchView(viewPosition, btnPosition); });
    btnDynamics.addEventListener('click', () => { switchView(viewDynamics, btnDynamics); });

    fetchDashboardData('TMday');
});
