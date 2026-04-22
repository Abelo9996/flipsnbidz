(function () {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const SELECTOR = '[data-animate]';
    const REVEALED_CLASS = 'is-revealed';
    const NO_MOTION_CLASS = 'reveal-reduced-motion';
    const observed = new WeakSet();

    function toNumber(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function parseDelay(value) {
        if (!value) return 0;
        const trimmed = String(value).trim();
        if (trimmed.endsWith('ms')) return Math.max(0, toNumber(trimmed.slice(0, -2), 0));
        if (trimmed.endsWith('s')) return Math.max(0, toNumber(trimmed.slice(0, -1), 0) * 1000);
        const numeric = toNumber(trimmed, 0);
        return numeric <= 10 ? numeric * 1000 : numeric;
    }

    function markImmediate(element) {
        element.classList.add(REVEALED_CLASS, NO_MOTION_CLASS);
        element.style.removeProperty('--reveal-delay');
        element.style.removeProperty('--reveal-child-delay');
        const staggerChildren = element.dataset.staggerChildren;
        if (staggerChildren) {
            Array.from(element.children).forEach((child) => {
                child.classList.add(REVEALED_CLASS, NO_MOTION_CLASS);
                child.style.removeProperty('--reveal-child-delay');
            });
        }
    }

    function applyConfig(element) {
        const delay = parseDelay(element.dataset.delay);
        if (delay > 0) {
            element.style.setProperty('--reveal-delay', `${delay}ms`);
        }

        const staggerChildren = parseDelay(element.dataset.staggerChildren);
        if (staggerChildren > 0) {
            element.style.setProperty('--reveal-child-delay', `${staggerChildren}ms`);
            Array.from(element.children).forEach((child, index) => {
                child.style.setProperty('--reveal-index', String(index));
            });
        }
    }

    function revealElement(element, observer) {
        element.classList.add(REVEALED_CLASS);
        if (element.dataset.once !== 'false') {
            observer.unobserve(element);
        }
    }

    let observer = null;

    function createObserver() {
        if (observer) observer.disconnect();
        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (!entry.isIntersecting) {
                    if (entry.target.dataset.once === 'false') {
                        entry.target.classList.remove(REVEALED_CLASS);
                    }
                    return;
                }
                revealElement(entry.target, observer);
            });
        }, {
            threshold: 0.18,
            rootMargin: '0px 0px -10% 0px'
        });
    }

    function setupElements(root = document) {
        const elements = root.querySelectorAll(SELECTOR);
        elements.forEach((element) => {
            if (observed.has(element)) return;
            observed.add(element);
            applyConfig(element);

            if (reduceMotion.matches) {
                markImmediate(element);
                return;
            }

            observer.observe(element);
        });
    }

    function handleMotionChange(event) {
        const elements = document.querySelectorAll(SELECTOR);
        if (event.matches) {
            elements.forEach(markImmediate);
            if (observer) observer.disconnect();
            return;
        }

        createObserver();
        elements.forEach((element) => {
            element.classList.remove(NO_MOTION_CLASS);
            if (!element.classList.contains(REVEALED_CLASS) || element.dataset.once === 'false') {
                observer.observe(element);
            }
        });
    }

    createObserver();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setupElements());
    } else {
        setupElements();
    }

    if (typeof reduceMotion.addEventListener === 'function') {
        reduceMotion.addEventListener('change', handleMotionChange);
    } else if (typeof reduceMotion.addListener === 'function') {
        reduceMotion.addListener(handleMotionChange);
    }

    window.initializeScrollReveal = setupElements;
})();
