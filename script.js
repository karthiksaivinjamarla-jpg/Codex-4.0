const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbwqbA-ujJmA0dHwx9z8YY9fuk86DdjkpxU-y0m1sZ9fvNBLc4qHa1apQEiy23hVOfkBKQ/exec",
    QR_IMAGE_URL: "./codex-payment-qr.png",
    EVENT_NAME: "CODEX 4.0",
    ORGANIZER: "Coders' Club",
    PAYMENT_FEE: 300,
    MAX_FILE_SIZE: 10 * 1024 * 1024
};

let currentStep = 1;
let maxReachedStep = 1;

/* =========================================================
   INITIALIZATION
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
    const qr = document.getElementById("paymentQR");
    const fee = document.getElementById("displayFee");

    if (qr) qr.src = CONFIG.QR_IMAGE_URL;
    if (fee) fee.textContent = `₹${CONFIG.PAYMENT_FEE} per team`;

    setupTeamSize();
    setupNavigation();
    setupFileUpload();
    setupFormSubmission();
    compactTeamSizeSelector();
    showStep(1);
});

/* =========================================================
   TEAM SIZE
========================================================= */
function getTeamSize() {
    return document.querySelector('input[name="teamSize"]:checked')?.value || "2";
}

function updateTeamSizeUI() {
    document.querySelectorAll('.choice').forEach(choice => {
        const radio = choice.querySelector('input[name="teamSize"]');
        if (radio) choice.classList.toggle('active', radio.checked);
    });
}

function compactTeamSizeSelector() {
    document.querySelectorAll('.choice span').forEach(span => {
        span.style.padding = "9px 10px";
        span.style.fontSize = "10px";
    });
    document.querySelectorAll('.choice-row').forEach(row => {
        row.style.gap = "8px";
    });
}

function setupTeamSize() {
    document.querySelectorAll('input[name="teamSize"]').forEach(radio => {
        radio.addEventListener('change', () => {
            updateTeamSizeUI();
            updateMember3State();

            /* Changing team size changes the step sequence, so restart
               progression from Team Details. Existing typed data is kept. */
            maxReachedStep = 1;
            currentStep = 1;
            showStep(1);
        });
    });
    updateTeamSizeUI();
    updateMember3State();
}

function updateMember3State() {
    const isThree = getTeamSize() === "3";
    const section = document.getElementById("member3Section");
    const step = document.getElementById("member3Step");

    if (step) step.classList.toggle("hidden", !isThree);

    if (section) {
        if (!isThree && currentStep === 4) currentStep = 5;
        if (currentStep !== 4) section.classList.add("hidden");

        section.querySelectorAll("input, select").forEach(field => {
            if (isThree) field.setAttribute("required", "");
            else {
                field.removeAttribute("required");
                field.setCustomValidity("");
            }
        });
    }
}

/* =========================================================
   STEP SEQUENCE
========================================================= */
function getStepSequence() {
    return getTeamSize() === "3" ? [1, 2, 3, 4, 5] : [1, 2, 3, 5];
}

function setupNavigation() {
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");

    if (nextBtn) nextBtn.addEventListener("click", nextStep);
    if (backBtn) backBtn.addEventListener("click", previousStep);

    document.querySelectorAll(".stepper .step").forEach(button => {
        button.addEventListener("click", () => {
            const target = Number(button.dataset.step);
            const sequence = getStepSequence();

            /* A section can be opened directly once it has already been
               completed/reached. This lets users edit earlier details and
               then jump directly to any already-filled section. */
            if (sequence.includes(target) && target <= maxReachedStep) {
                showStep(target);
            }
        });
    });
}

function nextStep(event) {
    if (event) event.preventDefault();

    if (!validateCurrentStep()) return;

    const sequence = getStepSequence();
    const index = sequence.indexOf(currentStep);

    if (index < sequence.length - 1) {
        const next = sequence[index + 1];
        maxReachedStep = Math.max(maxReachedStep, next);
        showStep(next);
    }
}

function previousStep(event) {
    if (event) event.preventDefault();

    const sequence = getStepSequence();
    const index = sequence.indexOf(currentStep);

    if (index > 0) showStep(sequence[index - 1]);
}

function showStep(step) {
    const sequence = getStepSequence();
    if (!sequence.includes(step)) step = sequence[0];

    currentStep = step;
    updateMember3State();

    document.querySelectorAll(".form-step").forEach(panel => {
        const panelStep = Number(panel.dataset.panel);
        const isCurrent = panelStep === currentStep;

        panel.classList.toggle("active", isCurrent);

        if (panelStep !== 4 || getTeamSize() === "3") {
            panel.classList.toggle("hidden", !isCurrent);
        }
    });

    document.querySelectorAll(".stepper .step").forEach(button => {
        const number = Number(button.dataset.step);
        const visible = number !== 4 || getTeamSize() === "3";

        button.classList.toggle("hidden", !visible);
        button.classList.toggle("active", number === currentStep);
        button.classList.toggle("completed", number < currentStep || number <= maxReachedStep);
    });

    const progressBar = document.getElementById("progressBar");
    if (progressBar) {
        const index = sequence.indexOf(currentStep);
        progressBar.style.width = `${((index + 1) / sequence.length) * 100}%`;
    }

    updateNavigation();
    clearStatus();
}

function updateNavigation() {
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");
    const submitBtn = document.getElementById("submitBtn");

    if (backBtn) {
        backBtn.style.display = currentStep === 1 ? "none" : "inline-flex";
    }

    if (nextBtn) {
        nextBtn.classList.toggle("hidden", currentStep === 5);
        nextBtn.style.display = currentStep === 5 ? "none" : "inline-flex";
    }

    if (submitBtn) {
        submitBtn.classList.toggle("hidden", currentStep !== 5);
        submitBtn.style.display = currentStep === 5 ? "inline-flex" : "none";
    }
}

/* =========================================================
   STEP VALIDATION
========================================================= */
function validateCurrentStep() {
    const panel = document.querySelector(`.form-step[data-panel="${currentStep}"]`);
    if (!panel) return true;

    for (const field of panel.querySelectorAll("input, select, textarea")) {
        if (field.disabled || field.type === "hidden") continue;
        if (!field.checkValidity()) {
            field.reportValidity();
            return false;
        }
    }

    if (currentStep === 1 && !document.querySelector('input[name="teamSize"]:checked')) {
        showStatus("Please select a team size.", true);
        return false;
    }

    return true;
}

/* =========================================================
   FILE UPLOAD
========================================================= */
function setupFileUpload() {
    const receipt = document.getElementById("receipt");
    const fileInfo = document.getElementById("fileInfo");
    if (!receipt) return;

    receipt.addEventListener("change", () => {
        const file = receipt.files[0];
        if (!file) {
            if (fileInfo) fileInfo.textContent = "No file selected";
            return;
        }

        const allowed = ["image/jpeg", "image/png", "application/pdf"];
        if (!allowed.includes(file.type)) {
            receipt.value = "";
            if (fileInfo) fileInfo.textContent = "Invalid file. Use JPG, PNG or PDF.";
            showStatus("Please upload a JPG, PNG or PDF payment receipt.", true);
            return;
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            receipt.value = "";
            if (fileInfo) fileInfo.textContent = "File is too large. Maximum size is 10MB.";
            showStatus("Payment receipt must be 10MB or smaller.", true);
            return;
        }

        if (fileInfo) {
            fileInfo.textContent = `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
        }
        clearStatus();
    });
}

/* =========================================================
   COMPLETE VALIDATION
========================================================= */
function validateCompleteForm(form) {
    const teamSize = getTeamSize();

    const member3Fields = document.querySelectorAll("#member3Section input, #member3Section select");
    member3Fields.forEach(field => {
        if (teamSize === "3") field.setAttribute("required", "");
        else field.removeAttribute("required");
    });

    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }

    const years = [];
    for (let i = 1; i <= (teamSize === "3" ? 3 : 2); i++) {
        const el = document.querySelector(`[name="m${i}_year"]`);
        if (el) years.push(el.value);
    }

    const allowedYears = ["2nd Year", "3rd Year", "4th Year"];
    if (years.some(y => !allowedYears.includes(y))) {
        showStatus("Only 2nd Year, 3rd Year and 4th Year students are allowed.", true);
        return false;
    }

    if (years.filter(y => y === "4th Year").length > 1) {
        showStatus("A team can have a maximum of one 4th-year student.", true);
        return false;
    }

    const phones = new Set();
    const emails = new Set();
    const count = teamSize === "3" ? 3 : 2;

    for (let i = 1; i <= count; i++) {
        const phone = document.querySelector(`[name="m${i}_phone"]`)?.value.trim();
        const email = document.querySelector(`[name="m${i}_email"]`)?.value.trim().toLowerCase();

        if (!/^[0-9]{10}$/.test(phone || "")) {
            showStatus(`Member ${i}: please enter a valid 10-digit mobile number.`, true);
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "")) {
            showStatus(`Member ${i}: please enter a valid email address.`, true);
            return false;
        }
        if (phones.has(phone)) {
            showStatus("Each team member must have a different mobile number.", true);
            return false;
        }
        if (emails.has(email)) {
            showStatus("Each team member must have a different email ID.", true);
            return false;
        }
        phones.add(phone);
        emails.add(email);
    }

    const utr = document.querySelector('[name="utr"]')?.value.trim() || "";
    if (!/^[A-Za-z0-9]{8,30}$/.test(utr)) {
        showStatus("Please enter a valid UPI Transaction ID / UTR.", true);
        return false;
    }

    const receipt = document.getElementById("receipt")?.files[0];
    if (!receipt) {
        showStatus("Please upload your payment receipt.", true);
        return false;
    }
    if (!["image/jpeg", "image/png", "application/pdf"].includes(receipt.type)) {
        showStatus("Payment receipt must be JPG, PNG or PDF.", true);
        return false;
    }
    if (receipt.size > CONFIG.MAX_FILE_SIZE) {
        showStatus("Payment receipt must be 10MB or smaller.", true);
        return false;
    }

    return true;
}

/* =========================================================
   FORM SUBMISSION
========================================================= */
function setupFormSubmission() {
    const form = document.getElementById("registrationForm");
    if (!form) return;

    form.addEventListener("submit", async event => {
        event.preventDefault();
        clearStatus();

        if (currentStep !== 5) {
            showStatus("Please complete the registration steps first.", true);
            return;
        }

        if (!validateCompleteForm(form)) return;

        const submitBtn = document.getElementById("submitBtn");
        const receipt = document.getElementById("receipt");

        try {
            submitBtn.disabled = true;
            submitBtn.innerHTML = "Submitting Registration...";
            showStatus("Uploading registration and payment receipt...", false);

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.payAmount = String(CONFIG.PAYMENT_FEE);
            data.submissionToken = createSubmissionToken();

            const file = receipt.files[0];
            data.receiptBase64 = await convertFileToBase64(file);
            data.receiptType = file.type;
            data.receiptName = file.name;

            await fetch(CONFIG.API_URL, {
                method: "POST",
                mode: "no-cors",
                cache: "no-cache",
                body: JSON.stringify(data)
            });

            showSuccess();
        } catch (error) {
            console.error("Registration submission error:", error);
            showStatus(error.message || "Unable to submit registration. Please try again.", true);
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Submit Registration <span>✓</span>';
        }
    });
}

function createSubmissionToken() {
    if (window.crypto?.getRandomValues) {
        const bytes = new Uint8Array(18);
        window.crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    }
    return Date.now() + Math.random().toString(36).slice(2);
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/* =========================================================
   SUCCESS / STATUS
========================================================= */
function showSuccess() {
    document.getElementById("registrationForm")?.classList.add("hidden");

    /* Remove the payment-verification message from the final screen. */
    document.querySelector("#successScreen .pending-badge")?.remove();

    document.getElementById("successScreen")?.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showStatus(message, isError = false) {
    const status = document.getElementById("statusMessage");
    if (!status) return;
    status.classList.remove("hidden");
    status.textContent = message;
    status.style.color = isError ? "var(--danger, #fb7185)" : "var(--muted, #94a3b8)";
}

function clearStatus() {
    const status = document.getElementById("statusMessage");
    if (!status) return;
    status.classList.add("hidden");
    status.textContent = "";
}