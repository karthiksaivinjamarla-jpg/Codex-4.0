const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbwqbA-ujJmA0dHwx9z8YY9fuk86DdjkpxU-y0m1sZ9fvNBLc4qHa1apQEiy23hVOfkBKQ/exec",
    QR_IMAGE_URL: "./codex-payment-qr.png",
    EVENT_NAME: "CODEX 4.0",
    ORGANIZER: "Coders' Club",
    PAYMENT_FEE: 300,
    UPI_ID: "9392687157@ybl",
    MAX_FILE_SIZE: 10 * 1024 * 1024
};

let currentStep = 1;
let maxReachedStep = 1;
let lastSubmittedData = null;
let lookupInterval = null;

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
    setupPaymentHelpers();
    setupFileUpload();
    setupRealtimeValidation();
    setupFormSubmission();
    setupConfirmationPassActions();
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
   STEP SEQUENCE & NAVIGATION
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
   PAYMENT HELPERS & UPI INTEGRATION
========================================================= */
function setupPaymentHelpers() {
    const copyBtn = document.getElementById("copyUpiBtn");
    const upiLink = document.getElementById("upiPayLink");

    if (copyBtn) {
        copyBtn.addEventListener("click", async () => {
            try {
                await navigator.clipboard.writeText(CONFIG.UPI_ID);
                const originalText = copyBtn.textContent;
                copyBtn.textContent = "✓ Copied UPI ID!";
                copyBtn.classList.add("copied");
                setTimeout(() => {
                    copyBtn.textContent = originalText;
                    copyBtn.classList.remove("copied");
                }, 2000);
            } catch (e) {
                prompt("Copy this UPI ID:", CONFIG.UPI_ID);
            }
        });
    }

    if (upiLink) {
        upiLink.href = `upi://pay?pa=${CONFIG.UPI_ID}&pn=${encodeURIComponent(CONFIG.EVENT_NAME)}&am=${CONFIG.PAYMENT_FEE}&cu=INR`;
    }
}

/* =========================================================
   FILE UPLOAD & LIVE PREVIEW
========================================================= */
function setupFileUpload() {
    const receiptInput = document.getElementById("receipt");
    const fileInfo = document.getElementById("fileInfo");
    const dropzoneLabel = document.getElementById("dropzoneLabel");
    const dropzonePrompt = document.getElementById("dropzonePrompt");
    const previewContainer = document.getElementById("previewContainer");
    const previewMedia = document.getElementById("previewMedia");
    const previewFileName = document.getElementById("previewFileName");
    const previewFileSize = document.getElementById("previewFileSize");
    const removeFileBtn = document.getElementById("removeFileBtn");

    if (!receiptInput) return;

    function handleFile(file) {
        if (!file) {
            resetPreview();
            return;
        }

        const allowed = ["image/jpeg", "image/png", "application/pdf"];
        if (!allowed.includes(file.type)) {
            receiptInput.value = "";
            resetPreview();
            showStatus("Please upload a JPG, PNG or PDF payment receipt.", true);
            return;
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            receiptInput.value = "";
            resetPreview();
            showStatus("Payment receipt must be 10MB or smaller.", true);
            return;
        }

        clearStatus();
        const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + " MB";
        if (fileInfo) fileInfo.textContent = `Selected: ${file.name} (${sizeFormatted})`;

        if (previewFileName) previewFileName.textContent = file.name;
        if (previewFileSize) previewFileSize.textContent = sizeFormatted;

        if (previewMedia) {
            previewMedia.innerHTML = "";
            if (file.type.startsWith("image/")) {
                const img = document.createElement("img");
                img.src = URL.createObjectURL(file);
                img.alt = "Receipt preview";
                img.className = "receipt-thumbnail";
                previewMedia.appendChild(img);
            } else {
                const pdfBadge = document.createElement("div");
                pdfBadge.className = "pdf-badge";
                pdfBadge.innerHTML = "<span>PDF</span><b>Document</b>";
                previewMedia.appendChild(pdfBadge);
            }
        }

        if (dropzonePrompt) dropzonePrompt.classList.add("hidden");
        if (previewContainer) previewContainer.classList.remove("hidden");
    }

    function resetPreview() {
        receiptInput.value = "";
        if (fileInfo) fileInfo.textContent = "No file selected";
        if (dropzonePrompt) dropzonePrompt.classList.remove("hidden");
        if (previewContainer) previewContainer.classList.add("hidden");
        if (previewMedia) previewMedia.innerHTML = "";
    }

    receiptInput.addEventListener("change", () => {
        handleFile(receiptInput.files[0]);
    });

    if (removeFileBtn) {
        removeFileBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            resetPreview();
        });
    }

    if (dropzoneLabel) {
        ["dragenter", "dragover"].forEach(eventName => {
            dropzoneLabel.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneLabel.classList.add("dragover");
            }, false);
        });

        ["dragleave", "drop"].forEach(eventName => {
            dropzoneLabel.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropzoneLabel.classList.remove("dragover");
            }, false);
        });

        dropzoneLabel.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files.length > 0) {
                receiptInput.files = files;
                handleFile(files[0]);
            }
        });
    }
}

/* =========================================================
   REAL-TIME VALIDATION & FIELD CHECKS
========================================================= */
function setupRealtimeValidation() {
    const yearSelects = document.querySelectorAll('select[name$="_year"]');
    yearSelects.forEach(select => {
        select.addEventListener("change", () => {
            checkYearConstraints();
        });
    });

    const contactInputs = document.querySelectorAll('input[name$="_phone"], input[name$="_email"]');
    contactInputs.forEach(input => {
        input.addEventListener("blur", () => {
            checkContactUniqueness();
        });
    });
}

function checkYearConstraints() {
    const teamSize = getTeamSize();
    const count = teamSize === "3" ? 3 : 2;
    let fourthYearCount = 0;

    for (let i = 1; i <= count; i++) {
        const val = document.querySelector(`[name="m${i}_year"]`)?.value;
        if (val === "4th Year") fourthYearCount++;
    }

    if (fourthYearCount > 1) {
        showStatus("Note: CODEX 4.0 rules allow a maximum of ONE 4th-year student per team.", true);
        return false;
    } else {
        clearStatus();
        return true;
    }
}

function checkContactUniqueness() {
    const teamSize = getTeamSize();
    const count = teamSize === "3" ? 3 : 2;
    const phones = new Set();
    const emails = new Set();

    for (let i = 1; i <= count; i++) {
        const phone = document.querySelector(`[name="m${i}_phone"]`)?.value.trim();
        const email = document.querySelector(`[name="m${i}_email"]`)?.value.trim().toLowerCase();

        if (phone) {
            if (phones.has(phone)) {
                showStatus(`Mobile number ${phone} is entered more than once. Each member must have a unique phone number.`, true);
                return false;
            }
            phones.add(phone);
        }

        if (email) {
            if (emails.has(email)) {
                showStatus(`Email ${email} is entered more than once. Each member must have a unique email ID.`, true);
                return false;
            }
            emails.add(email);
        }
    }
    clearStatus();
    return true;
}

/* =========================================================
   STEP & FORM VALIDATION
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

    if (!checkYearConstraints()) return false;
    if (!checkContactUniqueness()) return false;

    return true;
}

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
        showStatus("Only 2nd Year, 3rd Year and 4th Year students are eligible.", true);
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
            showStatus("Uploading registration and payment receipt to backend...", false);

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            data.payAmount = String(CONFIG.PAYMENT_FEE);
            data.submissionToken = createSubmissionToken();

            const file = receipt.files[0];
            data.receiptBase64 = await convertFileToBase64(file);
            data.receiptType = file.type;
            data.receiptName = file.name;

            lastSubmittedData = data;

            await fetch(CONFIG.API_URL, {
                method: "POST",
                mode: "no-cors",
                cache: "no-cache",
                body: JSON.stringify(data)
            });

            showSuccess(data);
            pollForRegistrationId(data.submissionToken);
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
   SUCCESS / CONFIRMATION PASS
========================================================= */
function showSuccess(data) {
    document.getElementById("registrationForm")?.classList.add("hidden");
    const successScreen = document.getElementById("successScreen");
    if (!successScreen) return;

    successScreen.classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });

    // Populate pass details
    document.getElementById("passTeamName").textContent = data.teamName || "-";
    document.getElementById("passCollege").textContent = data.collegeName || "-";
    document.getElementById("passTeamSize").textContent = `${data.teamSize || 2} Members`;
    document.getElementById("passUtr").textContent = data.utr || "-";
    document.getElementById("passRegId").textContent = "GENERATING ID...";

    const memberList = document.getElementById("passMemberList");
    if (memberList) {
        memberList.innerHTML = "";
        const count = data.teamSize === "3" ? 3 : 2;

        for (let i = 1; i <= count; i++) {
            const li = document.createElement("li");
            const isLeader = i === 1;
            const name = data[`m${i}_name`] || `Member ${i}`;
            const roll = data[`m${i}_roll`] || "-";
            const branch = data[`m${i}_branch`] || "-";
            const year = data[`m${i}_year`] || "-";
            const section = data[`m${i}_section`] || "-";

            li.innerHTML = `
                <div class="member-badge">${isLeader ? "👑 LEADER" : "MEMBER " + i}</div>
                <div class="member-info">
                    <strong>${escapeHtml(name)}</strong>
                    <small>Roll: ${escapeHtml(roll)} · ${escapeHtml(branch)} (Sec ${escapeHtml(section)}) · ${escapeHtml(year)}</small>
                </div>
            `;
            memberList.appendChild(li);
        }
    }
}

/* =========================================================
   REGISTRATION ID POLLING VIA JSONP
========================================================= */
window.handleRegistrationIdResponse = function(response) {
    if (response && response.success && response.registrationId) {
        const idElem = document.getElementById("passRegId");
        if (idElem) {
            idElem.textContent = response.registrationId;
            idElem.classList.add("highlight-pulse");
        }
        if (lookupInterval) {
            clearInterval(lookupInterval);
            lookupInterval = null;
        }
    }
};

function pollForRegistrationId(token) {
    let attempts = 0;
    const maxAttempts = 15;

    function query() {
        attempts++;
        const scriptId = "jsonp_reg_lookup";
        const oldScript = document.getElementById(scriptId);
        if (oldScript) oldScript.remove();

        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `${CONFIG.API_URL}?action=getRegistrationId&token=${encodeURIComponent(token)}&callback=handleRegistrationIdResponse&_t=${Date.now()}`;
        document.body.appendChild(script);

        if (attempts >= maxAttempts && lookupInterval) {
            clearInterval(lookupInterval);
            lookupInterval = null;
            const idElem = document.getElementById("passRegId");
            if (idElem && idElem.textContent === "GENERATING ID...") {
                idElem.textContent = "CONFIRMED (See Email)";
            }
        }
    }

    setTimeout(query, 1500);
    lookupInterval = setInterval(query, 4000);
}

function setupConfirmationPassActions() {
    const printBtn = document.getElementById("printSlipBtn");
    const copyRegIdBtn = document.getElementById("copyRegIdBtn");

    if (printBtn) {
        printBtn.addEventListener("click", () => {
            window.print();
        });
    }

    if (copyRegIdBtn) {
        copyRegIdBtn.addEventListener("click", async () => {
            const regId = document.getElementById("passRegId")?.textContent || "";
            if (regId && regId !== "GENERATING ID...") {
                try {
                    await navigator.clipboard.writeText(regId);
                    const original = copyRegIdBtn.textContent;
                    copyRegIdBtn.textContent = "✓ Copied ID!";
                    setTimeout(() => {
                        copyRegIdBtn.textContent = original;
                    }, 2000);
                } catch (e) {
                    prompt("Copy Registration ID:", regId);
                }
            } else {
                alert("Please wait a moment while your Registration ID is assigned.");
            }
        });
    }
}

/* =========================================================
   UTILITIES
========================================================= */
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

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}