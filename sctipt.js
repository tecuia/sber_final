'use strict';

const WheelGame = (function() {
    const PRIZE_NUMBER = 5;
    
    let wheel;
    let resultButton;
    let flag = true;

    return {
        init: function() {
            wheel = document.getElementById('wheelFortune');
            resultButton = document.getElementById('resultButton');

            this.bindEvents();
        },

        bindEvents: function() {
            wheel.addEventListener('click', this.handleWheelClick.bind(this));
            resultButton.addEventListener('click', this.handleResultClick.bind(this));
        },

        handleWheelClick: function() {
            if (!flag) return;
            flag = false;

            const realAngle = 360 * 5 + (180 + 45 * (PRIZE_NUMBER - 1)) % 360;
            const wheelImage = document.querySelector('.wheel-image');
            const spinningText = document.getElementById('spinningText');
            const resultContent = document.getElementById('resultContent');

            spinningText.classList.add('active');
            resultContent.classList.remove('active');

            wheelImage.style.animation = 'none';
            wheelImage.offsetHeight;
            document.documentElement.style.setProperty('--angle', `${realAngle}deg`);
            wheelImage.style.animation = `wheelFortune 5s ease-out forwards`;

            setTimeout(() => {
                spinningText.classList.remove('active');
                resultContent.classList.add('active');
                flag = true;
            }, 5000);
        },

        handleResultClick: function() {
            window.open('content.html', '_blank', 'noopener,noreferrer,width=800,height=600');
        }
    };
})();

document.addEventListener('DOMContentLoaded', function() {
    WheelGame.init();
});