// ... (начало файла: supabaseUrl, supabaseKey, TAG_MAP и т.д. - без изменений) ...

async function fetchDashboardData(tableName) {
    console.log("--- Шаг 1: Начинаю fetchDashboardData для таблицы:", tableName);
    
    let userIdentifier = null;
    if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
        // ... (логика определения пользователя) ...
        userIdentifier = ...;
        console.log("--- Шаг 2: Пользователь Telegram определен:", userIdentifier);
    } else {
        // Добавим тестовый ID для отладки в браузере.
        // ЗАКОММЕНТИРУЙТЕ ЭТУ СТРОКУ ПЕРЕД ЗАГРУЗКОЙ НА БОЕВОЙ!
        userIdentifier = 'test_user'; // <--- ТЕСТОВЫЙ ID
        console.log("--- Шаг 2: Пользователь Telegram НЕ определен. Использую тестовый ID:", userIdentifier);
    }

    if (!userIdentifier) {
        console.error("--- КРИТИЧЕСКАЯ ОШИБКА: ID пользователя не определен!");
        document.getElementById('operator-name').textContent = 'Пользователь не определен';
        return;
    }
    
    // ... (сброс UI) ...

    if (tableName === 'TMday') {
        try {
            console.log("--- Шаг 3 (День): Отправляю запрос в Supabase...");
            const { data, error } = await supabaseClient.from('TMday').select(`...`).eq('tg', userIdentifier).single();
            if (error) throw error;
            
            if (data) {
                console.log("--- Шаг 4 (День): Данные из Supabase ПОЛУЧЕНЫ:", data);
                // ... (вся ваша логика отрисовки) ...
            } else {
                console.warn("--- Шаг 4 (День): Данные из Supabase НЕ ПОЛУЧЕНЫ (пустой ответ).");
            }
        } catch (error) {
            console.error("--- КРИТИЧЕСКАЯ ОШИБКА (День): Ошибка при запросе к Supabase:", error.message);
        }
    } else if (tableName === 'TMmonth') {
        // ... (аналогичные console.log для 'TMmonth') ...
    }
}


document.addEventListener('DOMContentLoaded', () => {
    console.log("--- DOMContentLoaded: Страница загружена, начинаю инициализацию. ---");
    // ... (весь ваш код инициализации: чарты, кнопки и т.д.) ...

    function switchView(viewToShow, buttonToActivate) {
        console.log("--- switchView: Переключаю на вид:", viewToShow.id);
        // ... (логика переключения) ...
    }

    // ... (привязка событий к кнопкам) ...

    fetchDashboardData('TMday');
});
