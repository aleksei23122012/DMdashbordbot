document.addEventListener('DOMContentLoaded', () => {
    // --- Логика для слайдера проектов на главной странице ---
    const mainSlider = document.getElementById('slider');
    if (mainSlider) {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const scrollStep = () => mainSlider.querySelector('.project-card').offsetWidth + 20;

        nextBtn.addEventListener('click', () => mainSlider.scrollBy({ left: scrollStep(), behavior: 'smooth' }));
        prevBtn.addEventListener('click', () => mainSlider.scrollBy({ left: -scrollStep(), behavior: 'smooth' }));
    }

    // --- Логика для модального окна проектов ---
    const projectCards = document.querySelectorAll('.project-card');
    const modal = document.getElementById('project-modal');
    if (modal) {
        const modalCloseBtn = document.getElementById('modal-close-btn');
        const modalImageContainer = document.querySelector('.modal-image-container');
        const modalTitle = document.getElementById('modal-project-title');
        const modalDescription = document.getElementById('modal-project-description');
        const modalNav = document.querySelector('.modal-nav');
        const modalPrevBtn = document.getElementById('modal-prev-btn');
        const modalNextBtn = document.getElementById('modal-next-btn');
        
        let currentImageIndex = 0;
        let images = [];

        const showImage = (index) => {
            const slider = modalImageContainer.querySelector('.modal-image-slider');
            slider.style.transform = `translateX(-${index * 100}%)`;
        };

        modalPrevBtn.addEventListener('click', () => {
            currentImageIndex = (currentImageIndex > 0) ? currentImageIndex - 1 : images.length - 1;
            showImage(currentImageIndex);
        });

        modalNextBtn.addEventListener('click', () => {
            currentImageIndex = (currentImageIndex < images.length - 1) ? currentImageIndex + 1 : 0;
            showImage(currentImageIndex);
        });

        projectCards.forEach(card => {
            card.addEventListener('click', () => {
                // Извлекаем данные из data-атрибутов
                modalTitle.textContent = card.dataset.title;
                modalDescription.innerHTML = card.dataset.desc;
                
                // Обрабатываем изображения
                images = card.dataset.img.split(',');
                modalImageContainer.innerHTML = ''; // Очищаем контейнер
                
                if (images.length > 1) {
                    const slider = document.createElement('div');
                    slider.className = 'modal-image-slider';
                    images.forEach(imgUrl => {
                        const imgDiv = document.createElement('div');
                        imgDiv.className = 'modal-image';
                        imgDiv.style.backgroundImage = `url('${imgUrl.trim()}')`;
                        slider.appendChild(imgDiv);
                    });
                    modalImageContainer.appendChild(slider);
                    modalNav.style.display = 'block'; // Показываем навигацию
                } else {
                    const imgDiv = document.createElement('div');
                    imgDiv.className = 'modal-image';
                    imgDiv.style.backgroundImage = `url('${images[0].trim()}')`;
                    modalImageContainer.appendChild(imgDiv);
                    modalNav.style.display = 'none'; // Скрываем навигацию
                }

                currentImageIndex = 0;
                showImage(0);
                modal.classList.add('open');
            });
        });

        const closeModal = () => modal.classList.remove('open');
        modalCloseBtn.addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
});
