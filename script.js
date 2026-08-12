/**
 * CODEX 4.0
 * Registration Frontend
 *
 * GitHub Pages / Netlify frontend
 * Google Apps Script backend
 */

const CONFIG = {
    API_URL:
        "https://script.google.com/macros/s/AKfycbwqbA-ujJmA0dHwx9z8YY9fuk86DdjkpxU-y0m1sZ9fvNBLc4qHa1apQEiy23hVOfkBKQ/exec",

    QR_IMAGE_URL:
        "./codex-payment-qr.png",

    EVENT_NAME: "CODEX 4.0",
    ORGANIZER: "Coders' Club",

    // FIXED PAYMENT
    PAYMENT_FEE: 300,

    // Maximum receipt size: 10 MB
    MAX_FILE_SIZE: 10 * 1024 * 1024
};


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentStep = 1;
let maxStepReached = 1;


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", () => {

    const qr = document.getElementById("paymentQR");
    const fee = document.getElementById("displayFee");

    if (qr) {
        qr.src = CONFIG.QR_IMAGE_URL;
    }

    if (fee) {
        fee.innerText = `₹${CONFIG.PAYMENT_FEE} per team`;
    }

    setupTeamSize();
    setupNavigation();
    setupFileUpload();
    setupFormSubmission();

    showStep(1);
});


/* =========================================================
   TEAM SIZE
========================================================= */

function setupTeamSize() {

    const radios =
        document.querySelectorAll('input[name="teamSize"]');

    const member3Section =
        document.getElementById("member3Section");

    const member3Step =
        document.getElementById("member3Step");

    const member3Inputs =
        member3Section
            ? member3Section.querySelectorAll("input, select")
            : [];

    radios.forEach(radio => {

        radio.addEventListener("change", () => {

            const isThree =
                radio.value === "3";

            if (member3Section) {
                member3Section.classList.toggle(
                    "hidden",
                    !isThree
                );
            }

            if (member3Step) {
                member3Step.classList.toggle(
                    "hidden",
                    !isThree
                );
            }

            member3Inputs.forEach(input => {

                if (isThree) {
                    input.setAttribute("required", "");
                } else {
                    input.removeAttribute("required");
                    input.setCustomValidity("");
                }

            });

            // Reset navigation when team size changes
            maxStepReached = Math.min(maxStepReached, 3);

            updateNavigation();
        });

    });

}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {

    const nextBtn =
        document.getElementById("nextBtn");

    const backBtn =
        document.getElementById("backBtn");

    if (nextBtn) {
        nextBtn.addEventListener("click", nextStep);
    }

    if (backBtn) {
        backBtn.addEventListener("click", previousStep);
    }

    // Stepper buttons
    document.querySelectorAll(".step").forEach(stepButton => {

        stepButton.addEventListener("click", () => {

            const target =
                Number(stepButton.dataset.step);

            if (
                !stepButton.classList.contains("hidden") &&
                target <= maxStepReached
            ) {
                showStep(target);
            }

        });

    });

}


/* =========================================================
   NEXT STEP
========================================================= */

function nextStep() {

    const teamSize =
        document.querySelector(
            'input[name="teamSize"]:checked'
        )?.value;

    // Determine actual sequence
    const steps =
        teamSize === "3"
            ? [1, 2, 3, 4, 5]
            : [1, 2, 3, 5];

    const index =
        steps.indexOf(currentStep);

    if (index === -1 || index >= steps.length - 1) {
        return;
    }

    // Validate current section before continuing
    if (!validateCurrentStep()) {
        return;
    }

    const next =
        steps[index + 1];

    maxStepReached =
        Math.max(maxStepReached, next);

    showStep(next);

}


/* =========================================================
   PREVIOUS STEP
========================================================= */

function previousStep() {

    const teamSize =
        document.querySelector(
            'input[name="teamSize"]:checked'
        )?.value;

    const steps =
        teamSize === "3"
            ? [1, 2, 3, 4, 5]
            : [1, 2, 3, 5];

    const index =
        steps.indexOf(currentStep);

    if (index <= 0) {
        return;
    }

    showStep(steps[index - 1]);
}


/* =========================================================
   SHOW STEP
========================================================= */

function showStep(step) {

    const teamSize =
        document.querySelector(
            'input[name="teamSize"]:checked'
        )?.value;

    // If team has only 2 members,
    // never show member 3
    if (step === 4 && teamSize !== "3") {
        step = 5;
    }

    currentStep = step;

    document
        .querySelectorAll(".form-step")
        .forEach(panel => {

            const panelStep =
                Number(panel.dataset.panel);

            panel.classList.toggle(
                "active",
                panelStep === step
            );

        });

    // Update stepper
    document
        .querySelectorAll(".step")
        .forEach(button => {

            const buttonStep =
                Number(button.dataset.step);

            button.classList.toggle(
                "active",
                buttonStep === step
            );

            button.classList.toggle(
                "completed",
                buttonStep < step
            );

        });

    // Progress
    const progressBar =
        document.getElementById("progressBar");

    const total =
        teamSize === "3" ? 5 : 4;

    let progress = 0;

    if (teamSize === "3") {
        progress = ((step - 1) / 4) * 100;
    } else {

        const positions = {
            1: 0,
            2: 33,
            3: 66,
            5: 100
        };

        progress =
            positions[step] ?? 0;
    }

    if (progressBar) {
        progressBar.style.width =
            `${progress}%`;
    }

    updateNavigation();

    clearStatus();

    // Scroll to registration area
    document
        .getElementById("register")
        ?.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

}


/* =========================================================
   NAVIGATION BUTTON STATE
========================================================= */

function updateNavigation() {

    const nextBtn =
        document.getElementById("nextBtn");

    const backBtn =
        document.getElementById("backBtn");

    const submitBtn =
        document.getElementById("submitBtn");

    const isPayment =
        currentStep === 5;

    if (backBtn) {

        backBtn.style.display =
            currentStep === 1
                ? "none"
                : "inline-flex";

    }

    if (nextBtn) {

        nextBtn.style.display =
            isPayment
                ? "none"
                : "inline-flex";

    }

    if (submitBtn) {

        // IMPORTANT:
        // Submit button is visible ONLY on payment page.
        if (isPayment) {
            submitBtn.classList.remove("hidden");
            submitBtn.style.display = "inline-flex";
        } else {
            submitBtn.classList.add("hidden");
            submitBtn.style.display = "none";
        }

    }

}


/* =========================================================
   CURRENT STEP VALIDATION
========================================================= */

function validateCurrentStep() {

    const panel =
        document.querySelector(
            `.form-step[data-panel="${currentStep}"]`
        );

    if (!panel) {
        return true;
    }

    const inputs =
        panel.querySelectorAll(
            "input, select, textarea"
        );

    for (const input of inputs) {

        // Ignore hidden member 3 section
        if (
            input.closest(".hidden") &&
            currentStep !== 4
        ) {
            continue;
        }

        if (!input.checkValidity()) {

            input.reportValidity();

            return false;
        }

    }

    return true;
}


/* =========================================================
   FILE UPLOAD
========================================================= */

function setupFileUpload() {

    const receipt =
        document.getElementById("receipt");

    const fileInfo =
        document.getElementById("fileInfo");

    if (!receipt) {
        return;
    }

    receipt.addEventListener("change", event => {

        const file =
            event.target.files[0];

        if (!file) {

            if (fileInfo) {
                fileInfo.innerText =
                    "No file selected";
            }

            return;
        }

        const allowedTypes = [
            "image/jpeg",
            "image/png",
            "application/pdf"
        ];

        if (!allowedTypes.includes(file.type)) {

            receipt.value = "";

            if (fileInfo) {
                fileInfo.innerText =
                    "Invalid file. Use JPG, PNG or PDF.";
            }

            showStatus(
                "Please upload a JPG, PNG or PDF payment receipt.",
                true
            );

            return;
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {

            receipt.value = "";

            if (fileInfo) {
                fileInfo.innerText =
                    "File is too large. Maximum size is 10MB.";
            }

            showStatus(
                "Payment receipt must be 10MB or smaller.",
                true
            );

            return;
        }

        if (fileInfo) {

            fileInfo.innerText =
                `Selected: ${file.name} (${(
                    file.size / 1024 / 1024
                ).toFixed(2)} MB)`;

        }

        clearStatus();

    });

}


/* =========================================================
   FORM SUBMISSION
========================================================= */

function setupFormSubmission() {

    const form =
        document.getElementById("registrationForm");

    if (!form) {
        return;
    }

    form.addEventListener("submit", async event => {

        event.preventDefault();

        clearStatus();

        // Must be on payment step
        if (currentStep !== 5) {
            showStatus(
                "Please complete the registration steps first.",
                true
            );
            return;
        }

        if (!validateCompleteForm(form)) {
            return;
        }

        const submitBtn =
            document.getElementById("submitBtn");

        const receipt =
            document.getElementById("receipt");

        try {

            submitBtn.disabled = true;
            submitBtn.innerHTML =
                "Submitting Registration...";

            showStatus(
                "Uploading registration and payment receipt...",
                false
            );

            const formData =
                new FormData(form);

            const data =
                Object.fromEntries(
                    formData.entries()
                );

            // Fixed payment amount
            data.payAmount =
                String(CONFIG.PAYMENT_FEE);

            // Create unique token for backend tracking
            data.submissionToken =
                createSubmissionToken();

            // Receipt
            const file =
                receipt.files[0];

            if (!file) {
                throw new Error(
                    "Payment receipt is required."
                );
            }

            data.receiptBase64 =
                await convertFileToBase64(file);

            data.receiptType =
                file.type;

            data.receiptName =
                file.name;

            /*
             * Send to Google Apps Script.
             *
             * no-cors is used because the Apps Script
             * endpoint is cross-origin.
             */
            await fetch(
                CONFIG.API_URL,
                {
                    method: "POST",
                    mode: "no-cors",
                    cache: "no-cache",
                    body: JSON.stringify(data)
                }
            );

            /*
             * Do NOT poll for Registration ID.
             *
             * Apps Script generates and stores the ID
             * directly in Google Sheets.
             *
             * Website only shows successful submission.
             */

            showSuccess();

        } catch (error) {

            console.error(
                "Registration submission error:",
                error
            );

            showStatus(
                error.message ||
                "Unable to submit registration. Please try again.",
                true
            );

            submitBtn.disabled = false;

            submitBtn.innerHTML =
                'Submit Registration <span>✓</span>';

        }

    });

}


/* =========================================================
   COMPLETE FORM VALIDATION
========================================================= */

function validateCompleteForm(form) {

    if (!form.checkValidity()) {

        form.reportValidity();

        return false;
    }

    const teamSize =
        document.querySelector(
            'input[name="teamSize"]:checked'
        )?.value;

    if (!["2", "3"].includes(teamSize)) {

        showStatus(
            "Please select a team size of 2 or 3.",
            true
        );

        return false;
    }


    /* -------------------------
       YEAR VALIDATION
    ------------------------- */

    const years = [];

    const m1Year =
        document.querySelector('[name="m1_year"]');

    const m2Year =
        document.querySelector('[name="m2_year"]');

    if (m1Year) {
        years.push(m1Year.value);
    }

    if (m2Year) {
        years.push(m2Year.value);
    }

    if (teamSize === "3") {

        const m3Year =
            document.querySelector('[name="m3_year"]');

        if (m3Year) {
            years.push(m3Year.value);
        }

    }

    const allowedYears = [
        "2nd Year",
        "3rd Year",
        "4th Year"
    ];

    if (
        years.some(
            year =>
                !allowedYears.includes(year)
        )
    ) {

        showStatus(
            "Only 2nd Year, 3rd Year and 4th Year students are allowed.",
            true
        );

        return false;
    }


    /* -------------------------
       MAX ONE 4TH YEAR
    ------------------------- */

    const fourthYearCount =
        years.filter(
            year =>
                year === "4th Year"
        ).length;

    if (fourthYearCount > 1) {

        showStatus(
            "A team can have a maximum of one 4th-year student.",
            true
        );

        return false;
    }


    /* -------------------------
       PHONE + EMAIL
    ------------------------- */

    const phones = [];
    const emails = [];

    const memberCount =
        teamSize === "3"
            ? 3
            : 2;

    for (
        let i = 1;
        i <= memberCount;
        i++
    ) {

        const phoneElement =
            document.querySelector(
                `[name="m${i}_phone"]`
            );

        const emailElement =
            document.querySelector(
                `[name="m${i}_email"]`
            );

        if (
            !phoneElement ||
            !emailElement
        ) {

            showStatus(
                `Member ${i} details are missing.`,
                true
            );

            return false;
        }

        const phone =
            phoneElement.value.trim();

        const email =
            emailElement.value
                .trim()
                .toLowerCase();

        if (
            !/^[0-9]{10}$/.test(phone)
        ) {

            showStatus(
                `Member ${i}: please enter a valid 10-digit mobile number.`,
                true
            );

            return false;
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/
                .test(email)
        ) {

            showStatus(
                `Member ${i}: please enter a valid email address.`,
                true
            );

            return false;
        }

        if (phones.includes(phone)) {

            showStatus(
                "Each team member must have a different mobile number.",
                true
            );

            return false;
        }

        if (emails.includes(email)) {

            showStatus(
                "Each team member must have a different email ID.",
                true
            );

            return false;
        }

        phones.push(phone);
        emails.push(email);

    }


    /* -------------------------
       UTR
    ------------------------- */

    const utrElement =
        document.querySelector(
            '[name="utr"]'
        );

    if (!utrElement) {

        showStatus(
            "Payment transaction field is missing.",
            true
        );

        return false;
    }

    const utr =
        utrElement.value.trim();

    if (
        !/^[A-Za-z0-9]{8,30}$/.test(utr)
    ) {

        showStatus(
            "Please enter a valid UPI Transaction ID / UTR.",
            true
        );

        return false;
    }


    /* -------------------------
       RECEIPT
    ------------------------- */

    const receipt =
        document.getElementById(
            "receipt"
        )?.files[0];

    if (!receipt) {

        showStatus(
            "Please upload your payment receipt.",
            true
        );

        return false;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf"
    ];

    if (
        !allowedTypes.includes(
            receipt.type
        )
    ) {

        showStatus(
            "Payment receipt must be JPG, PNG or PDF.",
            true
        );

        return false;
    }

    if (
        receipt.size >
        CONFIG.MAX_FILE_SIZE
    ) {

        showStatus(
            "Payment receipt must be 10MB or smaller.",
            true
        );

        return false;
    }

    return true;
}


/* =========================================================
   TOKEN
========================================================= */

function createSubmissionToken() {

    if (
        window.crypto &&
        window.crypto.getRandomValues
    ) {

        const bytes =
            new Uint8Array(18);

        window.crypto.getRandomValues(
            bytes
        );

        return Array.from(
            bytes,
            byte =>
                byte
                    .toString(16)
                    .padStart(2, "0")
        ).join("");

    }

    return (
        Date.now() +
        Math.random()
            .toString(36)
            .slice(2)
    );
}


/* =========================================================
   FILE → BASE64
========================================================= */

function convertFileToBase64(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();

            reader.readAsDataURL(
                file
            );

            reader.onload = () => {

                resolve(
                    reader.result
                        .split(",")[1]
                );

            };

            reader.onerror =
                reject;

        }
    );
}


/* =========================================================
   SUCCESS SCREEN
========================================================= */

function showSuccess() {

    const form =
        document.getElementById(
            "registrationForm"
        );

    const successScreen =
        document.getElementById(
            "successScreen"
        );

    if (form) {
        form.classList.add("hidden");
    }

    if (successScreen) {

        successScreen.classList.remove(
            "hidden"
        );

    }

    // Registration ID is intentionally NOT displayed.

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* =========================================================
   STATUS
========================================================= */

function showStatus(
    message,
    isError = false
) {

    const status =
        document.getElementById(
            "statusMessage"
        );

    if (!status) {
        return;
    }

    status.classList.remove(
        "hidden"
    );

    status.innerText =
        message;

    status.style.color =
        isError
            ? "var(--error)"
            : "var(--text-muted)";

    status.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });

}


function clearStatus() {

    const status =
        document.getElementById(
            "statusMessage"
        );

    if (!status) {
        return;
    }

    status.classList.add(
        "hidden"
    );

    status.innerText = "";

}
// Team size selection glow
document.querySelectorAll('input[name="teamSize"]').forEach(radio => {

    radio.addEventListener('change', function () {

        document.querySelectorAll('.choice').forEach(choice => {
            choice.classList.remove('active');
        });

        this.closest('.choice').classList.add('active');

    });

});
