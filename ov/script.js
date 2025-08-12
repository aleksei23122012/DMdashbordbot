document.addEventListener('DOMContentLoaded', () => {
  // --- НАСТРОЙКИ И ЭЛЕМЕНТЫ ---
  const SUPABASE_URL = 'https://vyxjfeoqngnlvqttetbd.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5eGpmZW9xbmdubHZxdHRldGJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQzODQyMjMsImV4cCI6MjA2OTk2MDIyM30.mt8Ybj6H0DHi07XD0Tt_sW3DfyZAMInyNyDNpI69Ld0';

  const mainBlock = document.getElementById('main-block');
  const backButton = document.getElementById('back-button');
  const modeToggle = document.getElementById('mode-toggle');
  const searchInput = document.getElementById('search-input');

  let supabase;
  try {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (error) {
    mainBlock.innerHTML = `<p style="color: red;">Не удалось инициализировать Supabase.</p>`;
    return;
  }
  
  // --- ПЕРЕМЕННЫЕ СОСТОЯНИЯ ---
  let currentCategory = 'Брокеридж';
  let currentType = null;
  let debounceTimeout;
  const pusheenImageUrl = 'https://cdn.imgbin.com/9/12/6/imgbin-pusheen-sticker-telegram-vkontakte-jj-pusheen-cat-illustration-FYzgapPV2qHfFNKvYnCcXKHuH.jpg';

  // --- ФУНКЦИИ ОТОБРАЖЕНИЯ ---
  
  async function renderNachpoz(categoryColumn) {
    currentType = null;
    mainBlock.classList.add('loading');
    backButton.classList.add('hidden');
    const { data, error } = await supabase.from('Button').select(`num, ${categoryColumn}`).order('num');
    mainBlock.classList.remove('loading');

    if (error) { mainBlock.innerHTML = `<p style="color:red;">Ошибка загрузки: ${error.message}</p>`; return; }
    
    let buttonsHtml = '';
    const buttonSlots = Array.from({ length: 6 }, (_, i) => data.find(d => d.num === i + 1) || { num: i + 1, [categoryColumn]: null });
    buttonSlots.forEach(buttonData => {
      const buttonText = buttonData[categoryColumn];
      if (buttonData.num === 6 && !buttonText) {
        buttonsHtml += `<div class="empty-slot"><img src="${pusheenImageUrl}" alt="Pusheen Cat" class="pusheen-image"></div>`;
      } else if (buttonText) {
        buttonsHtml += `<button>${buttonText}</button>`;
      } else {
        buttonsHtml += '<div class="empty-slot"></div>';
      }
    });
    mainBlock.innerHTML = `<div class="button-grid">${buttonsHtml}</div>`;
    setupNachpozListeners();
  }
  
  async function renderTupoz(category, type) {
    currentType = type;
    mainBlock.classList.add('loading');
    backButton.classList.remove('hidden');
    
    const { data, error } = await supabase.from('Text').select('question, answer').eq('category', category).eq('type', type);
    mainBlock.classList.remove('loading');
    
    if (error) { mainBlock.innerHTML = `<p style="color:red;">Ошибка загрузки: ${error.message}</p>`; return; }
    
    mainBlock.innerHTML = createAccordionHtml(data, category);
    setupAccordionListeners();
  }
  
  async function renderSearchResults(searchText) {
      if (!searchText) {
        if (currentType) {
          renderTupoz(currentCategory, currentType);
        } else {
          renderNachpoz(currentCategory === 'Брокеридж' ? 'brok' : 'upak');
        }
        return;
      }

      mainBlock.classList.add('loading');
      backButton.classList.add('hidden');
      
      let query = supabase.from('Text')
        .select('question, answer')
        .eq('category', currentCategory)
        .ilike('question', `%${searchText}%`);
      
      if (currentType) {
        query = query.eq('type', currentType);
      }
      
      const { data, error } = await query;
      mainBlock.classList.remove('loading');

      if (error) { mainBlock.innerHTML = `<p style="color:red;">Ошибка поиска: ${error.message}</p>`; return; }
      
      if (data && data.length === 1) {
        const textToCopy = data[0].answer;
        navigator.clipboard.writeText(textToCopy);
      }
      
      mainBlock.innerHTML = createAccordionHtml(data, currentCategory, true, data.length === 1);
      setupAccordionListeners();
  }

  // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

  function createAccordionHtml(items, category, isSearchResult = false, autoExpandSingleItem = false) {
      if (!items || items.length === 0) {
          const message = isSearchResult ? 'Ничего не найдено.' : `Для типа "${category}" скрипты не найдены.`;
          return `<div class="empty-message-container"><p>${message}</p></div>`;
      }
      const accordionItems = items.map(item => {
          const isActive = autoExpandSingleItem;
          const headerClass = `accordion-header ${isActive ? 'active' : ''}`;
          const panelClass = `accordion-panel ${isActive ? 'active' : ''}`;
          return `<div class="accordion-item"><button class="${headerClass}">${item.question}</button><div class="${panelClass}"><p>${item.answer}</p></div></div>`;
      }).join('');
      return `<div class="accordion-list">${accordionItems}</div>`;
  }

  // --- СЛУШАТЕЛИ СОБЫТИЙ С ДОБАВЛЕННОЙ АНАЛИТИКОЙ ---
  
  function setupNachpozListeners() {
    mainBlock.querySelectorAll('.button-grid button').forEach(button => {
        button.addEventListener('click', (e) => {
          const buttonText = e.target.textContent;

          // Отправляем данные о клике на кнопку КАТЕГОРИИ
          supabase.from('click_logs').insert({ 
            category: currentCategory, 
            clicked_item: `[КАТЕГОРИЯ] ${buttonText}`
          }).then(({ error }) => {
            if (error) console.error('Ошибка записи клика на категорию:', error);
          });
          
          renderTupoz(currentCategory, buttonText);
        });
    });
  }

  function setupAccordionListeners() {
    mainBlock.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', (e) => {
        const headerText = e.target.textContent;
        const isOpening = !header.classList.contains('active');

        // Отправляем данные о клике на КОНКРЕТНОЕ возражение, только если оно РАСКРЫВАЕТСЯ
        if (isOpening) {
          supabase.from('click_logs').insert({ 
            category: currentCategory, 
            clicked_item: headerText
          }).then(({ error }) => {
            if (error) console.error('Ошибка записи клика на возражение:', error);
          });
        }

        const currentlyActive = mainBlock.querySelector('.accordion-header.active');
        if (currentlyActive && currentlyActive !== header) {
          currentlyActive.classList.remove('active');
          currentlyActive.nextElementSibling.classList.remove('active');
        }
        header.classList.toggle('active');
        header.nextElementSibling.classList.toggle('active');
      });
    });
  }

  backButton.addEventListener('click', () => {
    searchInput.value = '';
    renderNachpoz(currentCategory === 'Брокеридж' ? 'brok' : 'upak');
  });

  modeToggle.addEventListener('change', function() {
    const labelBrokerage = document.querySelector('.label-brokerage');
    const labelPackaging = document.querySelector('.label-packaging');
    labelBrokerage.classList.toggle('text-active', !this.checked);
    labelPackaging.classList.toggle('text-active', !this.checked);
    searchInput.value = '';
    if (this.checked) {
      currentCategory = 'Упаковка';
      renderNachpoz('upak');
    } else {
      currentCategory = 'Брокеридж';
      renderNachpoz('brok');
    }
  });
  
  searchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimeout);
      debounceTimeout = setTimeout(() => {
          renderSearchResults(e.target.value.trim());
      }, 300);
  });

  // Первоначальная загрузка
  renderNachpoz('brok');
});
