(function() {
    'use strict';
    
    // Глобальные переменные с защитой
    const state = {
        scrollObservers: [],
        imageObserver: null,
        resizeTimeout: null,
        animationTimeout: null,
        isMobile: false,
        isTablet: false,
        isDesktop: false,
        timerInterval: null,
        activePopup: null,
        prefersReducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
    };
    
    // Утилиты
    const utils = {
        throttle(func, limit) {
            let inThrottle;
            return function() {
                const args = arguments;
                const context = this;
                if (!inThrottle) {
                    func.apply(context, args);
                    inThrottle = true;
                    setTimeout(() => inThrottle = false, limit);
                }
            };
        },
        
        debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        },
        
        isElementInViewport(el) {
            if (!el) return false;
            const rect = el.getBoundingClientRect();
            return (
                rect.top <= (window.innerHeight || document.documentElement.clientHeight) * 0.9 &&
                rect.bottom >= 0
            );
        },
        
        trapFocus(element) {
            const focusableEls = element.querySelectorAll(
                'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
            );
            const firstFocusableEl = focusableEls[0];
            const lastFocusableEl = focusableEls[focusableEls.length - 1];
            
            element.addEventListener('keydown', function(e) {
                if (e.key !== 'Tab') return;
                
                if (e.shiftKey) {
                    if (document.activeElement === firstFocusableEl) {
                        e.preventDefault();
                        lastFocusableEl.focus();
                    }
                } else {
                    if (document.activeElement === lastFocusableEl) {
                        e.preventDefault();
                        firstFocusableEl.focus();
                    }
                }
            });
        }
    };
    
    // Основной объект с функционалом
    const App = {
        init() {
            this.checkDeviceType();
            this.initTimer();
            this.initAnimations();
            this.initAccordions();
            this.initPrizeButtons();
            this.initLegalAccordion();
            this.initScrollAnimations();
            this.initLazyLoading();
            this.initImageErrorHandling();
            this.setupResizeHandler();
            this.setupGlobalListeners();
            this.initFixedHeader();
            
            // Оптимизация изображений при загрузке
            if (state.isMobile) {
                setTimeout(() => {
                    this.optimizeMobileImages();
                }, 100);
            }
            
            console.log('App initialized successfully');
        },
        
        checkDeviceType() {
            const width = window.innerWidth;
            state.isMobile = width <= 430;
            state.isTablet = width > 430 && width <= 768;
            state.isDesktop = width > 768;
            
            this.applyLayoutFixes();
        },
        
        applyLayoutFixes() {
            const $ = window.jQuery;
            
            // Управляем видимостью текста
            if (state.isMobile) {
                // Мобильная версия
                $('.desktop-text').hide();
                $('.mobile-title-text').show();
                
                // Оптимизация изображений для мобильных
                this.optimizeMobileImages();
                
                // Скрываем кнопки и делаем блоки кликабельными
                $('.block-btn').hide();
                $('.block-item').css('cursor', 'pointer').attr('role', 'button');
                
            } else if (state.isTablet) {
                // Планшетная версия
                $('.desktop-text').show();
                $('.mobile-title-text').hide();
                $('.block-btn').show();
                $('.block-item').css('cursor', '').removeAttr('role');
                
                // Не скрываем изображения на планшете
                $('.case-image').show();
            } else {
                // Десктопная версия
                $('.desktop-text').show();
                $('.mobile-title-text').hide();
                $('.block-btn').show();
                $('.block-item').css('cursor', '').removeAttr('role');
                $('.case-image').show();
            }
        },
        
        optimizeMobileImages() {
            const $ = window.jQuery;
            
            // Оптимизация для каждого кейса на мобильных
            $('.block-item').each(function(index) {
                const $block = $(this);
                const $images = $block.find('.case-image');
                
                if ($images.length > 0) {
                    $images.css({
                        'max-width': '100%',
                        'height': 'auto',
                        'object-fit': 'contain'
                    });
                }
            });
            
            // Адаптация размера контейнера изображений
            $('.case-images').css({
                'width': '120px',
                'height': '85px',
                'display': 'flex',
                'justify-content': 'center',
                'align-items': 'center'
            });
        },
        
        initFixedHeader() {
            const $ = window.jQuery;
            const fixedHeader = $('#fixedHeader');
            const fixedTimerValue = $('.fixed-timer-value');
            const mainTimerContainer = $('.timer-container');
            const fixedHeaderBtn = $('#fixedHeaderBtn');
            
            if (!fixedHeader.length || !mainTimerContainer.length) {
                console.warn('Элементы фиксированной шапки не найдены');
                return;
            }
            
            // Копируем состояние таймера в фиксированную шапку
            this.syncFixedHeaderTimer();
            
            // Наблюдатель за видимостью основного таймера
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) {
                        this.showFixedHeader();
                    } else {
                        this.hideFixedHeader();
                    }
                });
            }, {
                threshold: 0.1,
                rootMargin: '-50px 0px 0px 0px' 
            });
            
            observer.observe(mainTimerContainer[0]);
            state.scrollObservers.push(observer);
            
            // Также отслеживаем скролл для плавного появления/скрытия
            $(window).on('scroll', utils.throttle(() => {
                const scrollTop = $(window).scrollTop();
                const mainTimerOffset = mainTimerContainer.offset().top;
                
                if (scrollTop > mainTimerOffset + 100) {
                    this.showFixedHeader();
                } else if (scrollTop < mainTimerOffset) {
                    this.hideFixedHeader();
                }
            }, 100));
        },
        
        showFixedHeader() {
            const $ = window.jQuery;
            const fixedHeader = $('#fixedHeader');
            
            if (!fixedHeader.hasClass('visible')) {
                fixedHeader
                    .addClass('visible')
                    .attr('aria-hidden', 'false');
                
                this.syncFixedHeaderTimer();
                
                if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                    gsap.fromTo(fixedHeader,
                        { y: -20, opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
                    );
                }
            }
        },
        
        hideFixedHeader() {
            const $ = window.jQuery;
            const fixedHeader = $('#fixedHeader');
            
            if (fixedHeader.hasClass('visible')) {
                fixedHeader
                    .removeClass('visible')
                    .attr('aria-hidden', 'true');
                
                if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                    gsap.to(fixedHeader,
                        { y: -20, opacity: 0, duration: 0.2, ease: 'power2.in' }
                    );
                }
            }
        },
        
        syncFixedHeaderTimer() {
            const $ = window.jQuery;
            const mainTimerValue = $('.timer-value').text();
            const fixedTimerValue = $('.fixed-timer-value');
            
            if (mainTimerValue && fixedTimerValue.length) {
                fixedTimerValue.text(mainTimerValue);
            }
        },
        
        setupResizeHandler() {
            const resizeHandler = utils.throttle(() => {
                this.checkDeviceType();
                this.initScrollAnimations();
            }, 250);
            
            window.addEventListener('resize', resizeHandler);
        },
        
        setupGlobalListeners() {
            // Закрытие попапов по ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && state.activePopup) {
                    this.closePopup(state.activePopup);
                }
            });
            
            // Клик вне попапа
            document.addEventListener('click', (e) => {
                if (state.activePopup && e.target.classList.contains('popup-overlay')) {
                    this.closePopup(state.activePopup);
                }
            });
        },
        
        initTimer() {
            const $ = window.jQuery;
            const timerValue = $('.timer-value');
            const progressRing = $('.progress-ring-circle');
            const fixedTimerValue = $('.fixed-timer-value');
            
            if (!timerValue.length || !progressRing.length) {
                console.warn('Элементы таймера не найдены');
                return;
            }
            
            let timeLeft = 300;
            const totalTime = 300;
            
            const radius = parseInt(progressRing.attr('r')) || 71;
            const circumference = 2 * Math.PI * radius;
            
            function formatTime(seconds) {
                const minutes = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
            }
            
            function updateProgress() {
                const progress = timeLeft / totalTime;
                const offset = circumference * (1 - progress);
                
                if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                    gsap.to(progressRing, {
                        strokeDashoffset: offset,
                        duration: 1,
                        ease: 'linear'
                    });
                } else {
                    progressRing.css('stroke-dashoffset', offset);
                }
            }
            
            function updateTimer() {
                const timeText = formatTime(timeLeft);
                timerValue.text(timeText);
                fixedTimerValue.text(timeText);
                updateProgress();
                
                if (timeLeft > 0) {
                    timeLeft--;
                    state.timerInterval = setTimeout(updateTimer, 1000);
                } else {
                    const zeroText = "00:00";
                    timerValue.text(zeroText);
                    fixedTimerValue.text(zeroText);
                    
                    if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                        gsap.to(timerValue, {
                            color: '#ff3333',
                            duration: 0.3,
                            yoyo: true,
                            repeat: 3
                        });
                        
                        gsap.to(fixedTimerValue, {
                            color: '#ff3333',
                            duration: 0.3,
                            yoyo: true,
                            repeat: 3
                        });
                    } else {
                        timerValue.css('color', '#ff3333');
                        fixedTimerValue.css('color', '#ff3333');
                        setTimeout(() => {
                            timerValue.css('color', '#262626');
                            fixedTimerValue.css('color', '#262626');
                        }, 2000);
                    }
                }
            }
            
            progressRing.css({
                'stroke-dasharray': circumference,
                'stroke-dashoffset': '0'
            });
            
            updateTimer();
        },
        
        initAnimations() {
            if (state.prefersReducedMotion) {
                this.initFallbackAnimations();
                return;
            }
            
            if (typeof gsap === 'undefined') {
                this.initFallbackAnimations();
                return;
            }
            
            const $ = window.jQuery;
            
            if (state.isMobile) {
                gsap.from('.top-section', {
                    opacity: 0,
                    y: -20,
                    duration: 0.6,
                    ease: 'power2.out'
                });
                
                gsap.from('.header-center', {
                    opacity: 0,
                    scale: 0.95,
                    duration: 0.5,
                    ease: 'power2.out',
                    delay: 0.2
                });
                
                gsap.from('.block-item', {
                    opacity: 0,
                    y: 20,
                    duration: 0.4,
                    stagger: 0.1,
                    ease: 'power2.out',
                    delay: 0.3
                });
                
            } else if (state.isTablet) {
                gsap.from('.top-section', {
                    opacity: 0,
                    y: -20,
                    duration: 0.6,
                    ease: 'power2.out'
                });
                
                gsap.from('.header-center', {
                    opacity: 0,
                    scale: 0.95,
                    duration: 0.5,
                    ease: 'power2.out',
                    delay: 0.2
                });
                
                gsap.from('.block-item', {
                    opacity: 0,
                    y: 20,
                    duration: 0.4,
                    stagger: 0.1,
                    ease: 'power2.out',
                    delay: 0.3
                });
                
            } else {
                gsap.from('.timer-circle', {
                    opacity: 0,
                    scale: 0.8,
                    rotation: -10,
                    duration: 0.8,
                    ease: 'back.out(1.7)',
                    delay: 0.2
                });
                
                gsap.from('.header-center', {
                    opacity: 0,
                    y: -20,
                    duration: 0.6,
                    ease: 'power2.out',
                    delay: 0.1
                });
                
                gsap.from('.block-item', {
                    opacity: 0,
                    y: 30,
                    duration: 0.5,
                    stagger: 0.1,
                    ease: 'power2.out',
                    delay: 0.4
                });
            }
        },
        
        initFallbackAnimations() {
            const $ = window.jQuery;
            $('.top-section, .header-center, .block-item, .faq-block').each(function(index) {
                const $element = $(this);
                
                $element.css({
                    'opacity': '0',
                    'transform': 'translateY(20px)'
                });
                
                setTimeout(() => {
                    $element.css({
                        'opacity': '1',
                        'transform': 'translateY(0)',
                        'transition': 'opacity 0.6s ease, transform 0.6s ease'
                    });
                }, 100 + (index * 50));
            });
        },
        
        initAccordions() {
            const $ = window.jQuery;
            const self = this;
            
            $('.faq-question').on('click', function(e) {
                self.handleAccordionClick($(this).closest('.faq-item'));
            });
            
            $('.faq-question').on('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    $(this).trigger('click');
                }
            });
        },
        
        handleAccordionClick($faqItem) {
            const $ = window.jQuery;
            const $answer = $faqItem.find('.faq-answer');
            const $toggle = $faqItem.find('.faq-toggle');
            const isActive = $faqItem.hasClass('active');
            
            $('.faq-item.active').not($faqItem).each(function() {
                const $otherItem = $(this);
                const $otherAnswer = $otherItem.find('.faq-answer');
                const $otherToggle = $otherItem.find('.faq-toggle');
                this.closeAccordion($otherItem, $otherAnswer, $otherToggle);
            }.bind(this));
            
            if (!isActive) {
                this.openAccordion($faqItem, $answer, $toggle);
            } else {
                this.closeAccordion($faqItem, $answer, $toggle);
            }
        },
        
        openAccordion($item, $answer, $toggle) {
            const $ = window.jQuery;
            $item.addClass('active');
            $item.attr('aria-expanded', 'true');
            
            const contentHeight = $answer.find('.faq-answer-content').outerHeight();
            
            if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                gsap.to($toggle, {
                    rotation: 45,
                    duration: 0.3,
                    ease: 'power2.inOut'
                });
                
                this.animateHeight($answer, contentHeight + 40);
            } else {
                $toggle.css('transform', 'rotate(45deg)');
                $answer.css('maxHeight', contentHeight + 40 + 'px');
            }
        },
        
        closeAccordion($item, $answer, $toggle) {
            const $ = window.jQuery;
            
            if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                gsap.to($toggle, {
                    rotation: 0,
                    duration: 0.3,
                    ease: 'power2.inOut'
                });
                
                this.animateHeight($answer, 0, () => {
                    $item.removeClass('active');
                    $item.attr('aria-expanded', 'false');
                });
            } else {
                $toggle.css('transform', 'rotate(0deg)');
                $answer.css('maxHeight', '0');
                setTimeout(() => {
                    $item.removeClass('active');
                    $item.attr('aria-expanded', 'false');
                }, 300);
            }
        },
        
        animateHeight($element, height, callback) {
            if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                gsap.to($element, {
                    maxHeight: height,
                    duration: 0.4,
                    ease: 'power2.out',
                    onComplete: callback
                });
            } else {
                $element.css('maxHeight', height + 'px');
                if (callback) setTimeout(callback, 400);
            }
        },
        
        initPrizeButtons() {
            const $ = window.jQuery;
            const self = this;
            
            // Улучшенный обработчик для клика на блоки
            $('.block-item').on('click', function(e) {
                e.preventDefault();
                
                if (state.isMobile) {
                    const prizeId = $(this).data('prize');
                    if (prizeId >= 1 && prizeId <= 7) {
                        self.openPopup(prizeId);
                    }
                }
            });
            
            // Обработчик для кнопок (десктоп и планшет)
            $('.block-btn').on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                if (state.isMobile) return; 
                
                const prizeId = $(this).data('prize');
                
                if (prizeId >= 1 && prizeId <= 7) {
                    self.openPopup(prizeId);
                }
            });
            
            $('.block-btn').on('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    $(this).trigger('click');
                }
            });
            
            if (state.isMobile) {
                $('.block-item').on('touchstart', function() {
                    $(this).css('opacity', '0.9');
                }).on('touchend', function() {
                    $(this).css('opacity', '1');
                });
            }
        },
        
        openPopup(popupId) {
            const $ = window.jQuery;
            const popup = $(`#popup-${popupId}`);
            
            if (!popup.length) return;
            
            if (state.activePopup) {
                this.closePopup(state.activePopup);
            }
            
            state.activePopup = popupId;
            $('body').css('overflow', 'hidden').addClass('popup-open');
            popup.addClass('active');
            
            this.hideFixedHeader();
            
            setTimeout(() => {
                popup.find('.popup-close').focus();
                utils.trapFocus(popup[0]);
            }, 100);
            
            // Анимация
            if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                if (state.isMobile) {
                    gsap.fromTo(popup.find('.popup-container'),
                        { y: '100%', opacity: 0 },
                        { y: 0, opacity: 1, duration: 0.3, ease: 'power2.out' }
                    );
                } else {
                    gsap.fromTo(popup.find('.popup-container'),
                        { opacity: 0, y: 30, scale: 0.95 },
                        { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: 'back.out(1.2)' }
                    );
                }
            }
            
            this.setupPopupEvents(popupId);
        },
        
        closePopup(popupId) {
            const $ = window.jQuery;
            const popup = $(`#popup-${popupId}`);
            
            if (!popup.length) return;
            
            const onComplete = () => {
                popup.removeClass('active');
                $('body').css('overflow', '').removeClass('popup-open');
                state.activePopup = null;
                
                setTimeout(() => {
                    $(`.block-item[data-prize="${popupId}"]`).focus();
                }, 50);
            };
            
            if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                if (state.isMobile) {
                    gsap.to(popup.find('.popup-container'), {
                        y: '100%',
                        opacity: 0,
                        duration: 0.3,
                        ease: 'power2.in',
                        onComplete: onComplete
                    });
                } else {
                    gsap.to(popup.find('.popup-container'), {
                        opacity: 0,
                        y: 20,
                        scale: 0.98,
                        duration: 0.3,
                        ease: 'power2.in',
                        onComplete: onComplete
                    });
                }
            } else {
                if (state.isMobile) {
                    popup.find('.popup-container').css({
                        'transform': 'translateY(100%)',
                        'opacity': '0',
                        'transition': 'transform 0.3s ease, opacity 0.3s ease'
                    });
                } else {
                    popup.find('.popup-container').css({
                        'opacity': '0',
                        'transform': 'translateY(20px) scale(0.98)',
                        'transition': 'all 0.3s ease'
                    });
                }
                setTimeout(onComplete, 300);
            }
        },
        
        setupPopupEvents(popupId) {
            const $ = window.jQuery;
            const popup = $(`#popup-${popupId}`);
            const self = this;
            
            popup.find('.popup-close').off('click').on('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                self.closePopup(popupId);
            });
            
            popup.find('.popup-submit').off('click').on('click', function() {
                const checkbox = popup.find('input[type="checkbox"]');
                
                if (checkbox.length && !checkbox.is(':checked')) {
                    self.animateInvalidCheckbox(checkbox);
                    self.showMessage('Пожалуйста, примите условия соглашения');
                    return;
                }
                
                self.submitForm(popupId, checkbox);
            });
            
            popup.find('.popup-rules-link').off('click').on('click', function(e) {
                e.preventDefault();
                self.showMessage('Открываем правила акции...');
                self.closePopup(popupId);
            });
            
            popup.find('input[type="checkbox"]').off('keydown').on('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    $(this).prop('checked', !$(this).prop('checked'));
                }
            });
        },
        
        submitForm(popupId, checkbox) {
            const formData = {
                prize_id: popupId,
                accepted_terms: checkbox.is(':checked'),
                timestamp: Date.now()
            };
            
            console.log('Отправка формы:', formData);
            
            this.showMessage('Заявка успешно отправлена!');
            
            setTimeout(() => {
                this.closePopup(popupId);
            }, 1500);
        },
        
        animateInvalidCheckbox(checkbox) {
            const $ = window.jQuery;
            
            if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                gsap.to(checkbox, {
                    x: [-5, 5, -5, 5, 0],
                    duration: 0.4,
                    ease: 'power2.out'
                });
                
                gsap.to(checkbox.closest('.popup-checkbox'), {
                    backgroundColor: 'rgba(255, 59, 48, 0.1)',
                    duration: 0.3,
                    yoyo: true,
                    repeat: 1
                });
            } else {
                const $checkbox = $(checkbox);
                $checkbox.css('border-color', '#ff3b30');
                setTimeout(() => $checkbox.css('border-color', '#E6E6E6'), 400);
            }
        },
        
        initLegalAccordion() {
            const $ = window.jQuery;
            const self = this;
            
            $('.legal-question').on('click', function(e) {
                e.preventDefault();
                const $legalItem = $(this).closest('.legal-item');
                const $answer = $legalItem.find('.legal-answer');
                const $toggle = $(this).find('.legal-toggle');
                const isActive = $legalItem.hasClass('active');
                
                if (!isActive) {
                    $legalItem.addClass('active');
                    $legalItem.attr('aria-expanded', 'true');
                    
                    if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                        gsap.to($toggle, {
                            rotation: 270,
                            duration: 0.3,
                            ease: 'power2.inOut'
                        });
                        
                        const contentHeight = $answer.find('.legal-content').outerHeight();
                        self.animateHeight($answer, contentHeight + 50);
                    } else {
                        $toggle.css('transform', 'rotate(270deg)');
                        const contentHeight = $answer.find('.legal-content').outerHeight();
                        $answer.css('maxHeight', contentHeight + 50 + 'px');
                    }
                } else {
                    if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                        gsap.to($toggle, {
                            rotation: 90,
                            duration: 0.3,
                            ease: 'power2.inOut'
                        });
                        
                        self.animateHeight($answer, 0, () => {
                            $legalItem.removeClass('active');
                            $legalItem.attr('aria-expanded', 'false');
                        });
                    } else {
                        $toggle.css('transform', 'rotate(90deg)');
                        $answer.css('maxHeight', '0');
                        setTimeout(() => {
                            $legalItem.removeClass('active');
                            $legalItem.attr('aria-expanded', 'false');
                        }, 300);
                    }
                }
            });
            
            $('.legal-question').on('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    $(this).trigger('click');
                }
            });
        },
        
        initScrollAnimations() {
            const $ = window.jQuery;
            
            if ('IntersectionObserver' in window && typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting && !entry.target.classList.contains('animated')) {
                            entry.target.classList.add('animated');
                            
                            gsap.fromTo(entry.target,
                                { opacity: 0, y: 30 },
                                { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
                            );
                        }
                    });
                }, {
                    threshold: 0.1,
                    rootMargin: '50px'
                });
                
                $('.block-item').each((i, el) => observer.observe(el));
                $('.faq-block, .legal-block').each((i, el) => observer.observe(el));
                
                state.scrollObservers.push(observer);
            } else {
                const animatedElements = $('.block-item, .faq-block, .legal-block');
                let scrollTimeout;
                
                function checkVisibility() {
                    animatedElements.each(function() {
                        const $element = $(this);
                        
                        if ($element.hasClass('animated')) return;
                        
                        if (utils.isElementInViewport(this)) {
                            $element.addClass('animated');
                            
                            if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                                gsap.fromTo($element,
                                    { opacity: 0, y: 30 },
                                    { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
                                );
                            } else {
                                $element.css({
                                    'opacity': '1',
                                    'transform': 'translateY(0)',
                                    'transition': 'opacity 0.6s ease, transform 0.6s ease'
                                });
                            }
                        }
                    });
                }
                
                $(window).on('scroll', utils.throttle(checkVisibility, 100));
                checkVisibility();
            }
        },
        
        initLazyLoading() {
            if ('IntersectionObserver' in window) {
                state.imageObserver = new IntersectionObserver((entries, observer) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            const src = img.getAttribute('data-src');
                            
                            if (src) {
                                img.src = src;
                                img.classList.remove('lazy-load');
                                img.classList.add('loaded');
                                observer.unobserve(img);
                            }
                        }
                    });
                }, {
                    rootMargin: '50px 0px',
                    threshold: 0.1
                });
                
                $('img.lazy-load').each((i, el) => {
                    state.imageObserver.observe(el);
                });
            } else {
                $('img.lazy-load').each(function() {
                    const $img = $(this);
                    const src = $img.data('src');
                    if (src) {
                        $img.attr('src', src).removeClass('lazy-load').addClass('loaded');
                    }
                });
            }
        },
        
        initImageErrorHandling() {
            const $ = window.jQuery;
            
            $('img').on('error', function() {
                const $img = $(this);
                const altText = $img.attr('alt') || 'Изображение';
                
                const $placeholder = $('<div>').addClass('image-placeholder')
                    .css({
                        'background': 'linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%)',
                        'display': 'flex',
                        'align-items': 'center',
                        'justify-content': 'center',
                        'color': '#666',
                        'font-family': "'SB Sans Display', sans-serif",
                        'font-size': '14px',
                        'text-align': 'center',
                        'padding': '20px',
                        'border-radius': '4px'
                    })
                    .text(altText);
                
                $img.replaceWith($placeholder);
            });
        },
        
        showMessage(text) {
            const $ = window.jQuery;
            $('.prize-message').remove();
            
            const isMobile = state.isMobile;
            
            const message = $(`<div class="prize-message" role="alert" aria-live="polite">${text}</div>`);
            $('body').append(message);
            
            message.css({
                'position': 'fixed',
                'top': isMobile ? '10px' : '20px',
                'right': isMobile ? '10px' : '20px',
                'left': isMobile ? '10px' : 'auto',
                'background': 'linear-gradient(133.66deg, #04D903 0%, #0FA8E0 97.76%)',
                'color': 'white',
                'padding': isMobile ? '8px 12px' : '12px 24px',
                'border-radius': '8px',
                'font-family': "'SB Sans Display', sans-serif",
                'font-size': isMobile ? '12px' : '15px',
                'box-shadow': '0 4px 12px rgba(0, 80, 255, 0.3)',
                'z-index': '10001',
                'max-width': isMobile ? 'calc(100% - 20px)' : '350px',
                'pointer-events': 'none',
                'text-align': 'center'
            });
            
            if (typeof gsap !== 'undefined' && !state.prefersReducedMotion) {
                gsap.fromTo(message,
                    { opacity: 0, y: -20, scale: 0.8 },
                    {
                        opacity: 1,
                        y: 0,
                        scale: 1,
                        duration: 0.3,
                        ease: 'back.out(1.7)',
                        onComplete: function() {
                            setTimeout(() => {
                                gsap.to(message, {
                                    opacity: 0,
                                    y: -20,
                                    duration: 0.3,
                                    ease: 'power2.in',
                                    onComplete: () => message.remove()
                                });
                            }, 2000);
                        }
                    }
                );
            } else {
                message.css({
                    'opacity': '0',
                    'transform': 'translateY(-20px) scale(0.8)'
                });
                
                setTimeout(() => {
                    message.css({
                        'opacity': '1',
                        'transform': 'translateY(0) scale(1)',
                        'transition': 'opacity 0.3s ease, transform 0.3s ease'
                    });
                    
                    setTimeout(() => {
                        message.css({
                            'opacity': '0',
                            'transform': 'translateY(-20px)'
                        });
                        setTimeout(() => message.remove(), 300);
                    }, 2000);
                }, 10);
            }
        },
        
        cleanup() {
            if (state.timerInterval) {
                clearTimeout(state.timerInterval);
            }
            
            if (state.animationTimeout) {
                clearTimeout(state.animationTimeout);
            }
            
            state.scrollObservers.forEach(observer => {
                observer.disconnect();
            });
            state.scrollObservers = [];
            
            if (state.imageObserver) {
                state.imageObserver.disconnect();
                state.imageObserver = null;
            }
            
            const $ = window.jQuery;
            $('#fixedHeaderBtn').off('click').off('keydown');
            $(window).off('scroll');
        }
    };
    
    document.addEventListener('DOMContentLoaded', function() {
        if (window.jQuery) {
            App.init();
        } else {
            console.error('jQuery не загружен');
        }
    });
    
    window.App = App;
})();