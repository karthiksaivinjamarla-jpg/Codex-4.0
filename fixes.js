/* CODEX 4.0 production fixes layer.
   Loaded after script.js/theme.js so it can safely correct shared UI behavior
   without replacing the existing registration logic. */
(function () {
    'use strict';

    const TEAM_SELECTOR_SIZE = '14px';
    const BODY_MIN_SIZE = '15px';

    function setVisible(el, visible) {
        if (!el) return;
        el.classList.remove('hidden');
        el.style.display = visible ? '' : 'none';
        el.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function fixSubmitAndNavigation() {
        const current = Number(window.currentStep || document.querySelector('.form-step.active')?.dataset.panel || 1);
        const submit = document.getElementById('submitBtn');
        const next = document.getElementById('nextBtn');
        const back = document.getElementById('backBtn');

        if (submit) {
            submit.classList.remove('hidden');
            setVisible(submit, current === 5);
            submit.disabled = false;
        }
        if (next) {
            next.classList.remove('hidden');
            setVisible(next, current !== 5);
        }
        if (back) {
            setVisible(back, current !== 1);
        }
    }

    function fixTeamSizeSelector() {
        document.querySelectorAll('.choice').forEach(choice => {
            const radio = choice.querySelector('input[name="teamSize"]');
            const label = choice.querySelector('span');
            if (!radio) return;

            choice.classList.toggle('active', radio.checked);
            choice.setAttribute('aria-checked', radio.checked ? 'true' : 'false');
            if (label) {
                label.style.fontSize = TEAM_SELECTOR_SIZE;
                label.style.padding = '10px 14px';
                label.style.minHeight = '42px';
            }
        });
    }

    function fixReadableText() {
        const selectors = [
            '.form-step p', '.form-step label', '.form-step .hint',
            '.form-step small', '.form-step .field-note', '.form-step .description',
            '.payment-note', '.upload-note', '.stepper .step'
        ];
        document.querySelectorAll(selectors.join(',')).forEach(el => {
            const size = parseFloat(getComputedStyle(el).fontSize);
            if (Number.isFinite(size) && size < 12) el.style.fontSize = BODY_MIN_SIZE;
        });
    }

    function removePendingPaymentLanguage() {
        const patterns = [/payment pending verification/i, /payment status:\s*under review/i];
        document.querySelectorAll('body *').forEach(el => {
            if (el.children.length) return;
            const text = (el.textContent || '').trim();
            if (patterns.some(re => re.test(text))) {
                el.textContent = text
                    .replace(/payment pending verification/ig, '')
                    .replace(/payment status:\s*under review/ig, '')
                    .trim();
                if (!el.textContent) el.style.display = 'none';
            }
        });
    }

    function fixDirectStepperNavigation() {
        document.querySelectorAll('.stepper .step').forEach(button => {
            if (button.dataset.codexFixBound === '1') return;
            button.dataset.codexFixBound = '1';
            button.addEventListener('click', () => {
                const target = Number(button.dataset.step);
                const max = Number(window.maxReachedStep || 1);
                const sequence = typeof window.getStepSequence === 'function'
                    ? window.getStepSequence()
                    : [1, 2, 3, 4, 5];
                if (sequence.includes(target) && target <= max && typeof window.showStep === 'function') {
                    window.showStep(target);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(fixSubmitAndNavigation, 0);
                }
            });
        });
    }

    function improveFormStatus() {
        const form = document.getElementById('registrationForm');
        if (!form || form.dataset.codexStatusFix === '1') return;
        form.dataset.codexStatusFix = '1';

        const originalSubmit = form.requestSubmit ? form.requestSubmit.bind(form) : null;
        form.addEventListener('submit', () => {
            const submit = document.getElementById('submitBtn');
            if (submit) {
                submit.disabled = true;
                submit.classList.remove('hidden');
                submit.style.display = 'inline-flex';
                submit.querySelector('span')?.replaceChildren(document.createTextNode('…'));
            }
        }, true);
    }

    function fixThemeToggle() {
        document.querySelectorAll('[data-theme-toggle], #themeToggle, .theme-toggle').forEach(el => {
            el.style.position = 'relative';
            el.style.zIndex = '20';
            el.style.flexShrink = '0';
        });
    }

    function applyAll() {
        fixSubmitAndNavigation();
        fixTeamSizeSelector();
        fixReadableText();
        fixDirectStepperNavigation();
        improveFormStatus();
        fixThemeToggle();
        removePendingPaymentLanguage();
    }

    window.addEventListener('load', applyAll);
    document.addEventListener('DOMContentLoaded', () => {
        applyAll();
        setTimeout(applyAll, 100);
        setTimeout(applyAll, 500);
    });

    // Keep the submit button state correct whenever the existing app changes steps.
    const originalShowStep = window.showStep;
    if (typeof originalShowStep === 'function') {
        window.showStep = function (step) {
            const result = originalShowStep.apply(this, arguments);
            setTimeout(applyAll, 0);
            return result;
        };
    }
})();
