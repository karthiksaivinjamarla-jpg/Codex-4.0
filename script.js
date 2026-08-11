/**
 * CODEX 4.0 - Interactive Registration Frontend
 * Netlify frontend -> Google Apps Script backend
 */

const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbz_1QzFyPz82upcA8OYMuBLy36iMaKhKd5kFfAIPf6FlcTnbCBiFs2lDg6IdCPBCSVqfQ/exec",
    QR_IMAGE_URL: "https://raw.githubusercontent.com/karthiksaivinjamarla-jpg/Codex-4.0/main/codex-payment-qr.png",
    EVENT_NAME: "CODEX 4.0",
    ORGANIZER: "Coders' Club",
    PAYMENT_FEE: 300,
    MAX_FILE_SIZE: 10 * 1024 * 1024
};

let currentStep = 1;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

window.addEventListener("DOMContentLoaded", () => {
    $("#paymentQR").src = CONFIG.QR_IMAGE_URL;
    $("#displayFee").innerText = `₹${CONFIG.PAYMENT_FEE} per team`;
    setupForm();
    setupDropzone();
    setupRevealObserver();
    updateTeamSizeUI();
    showStep(1);
});

function setupForm() {
    const form = $("#registrationForm");
    const teamSizeRadios = $$('input[name="teamSize"]');

    teamSizeRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            updateTeamSizeUI();
            clearStatus();
        });
    });

    $$("#stepper .step").forEach(button => {
        button.addEventListener("click", () => {
            const target = Number(button.dataset.step);
            if (target <= currentStep) showStep(target);
            else if (canMoveForward(currentStep)) showStep(target);
        });
    });

    $("#backBtn").addEventListener("click", () => {
        if (currentStep > 1) showStep(currentStep - 1);
    });

    $("#nextBtn").addEventListener("click", () => {
        if (!canMoveForward(currentStep)) return;
        const next = getNextStep(currentStep);
        showStep(next);
    });

    form.addEventListener("submit", handleSubmit);

    $$("input, select").forEach(input => {
        input.addEventListener("input", () => clearFieldError(input));
        input.addEventListener("change", () => clearFieldError(input));
    });

    $("#receipt").addEventListener("change", handleFileSelection);
}

function getTeamSize() {
    return $("input[name='teamSize']:checked")?.value || "2";
}

function updateTeamSizeUI() {
    const isThree = getTeamSize() === "3";
    const section = $("#member3Section");
    const step = $("#member3Step");
    const inputs = section.querySelectorAll("input, select");

    section.classList.toggle("hidden", !isThree && currentStep === 4 ? true : !isThree);
    step.classList.toggle("hidden", false);
    step.querySelector("small").textContent = isThree ? "Required" : "Skipped";

    $$(".choice").forEach(label => label.classList.remove("active"));
    const checked = $("input[name='teamSize']:checked");
    checked?.closest(".choice")?.classList.add("active");

    inputs.forEach(input => {
        if (isThree) input.setAttribute("required", "");
        else {
            input.removeAttribute("required");
            input.setCustomValidity("");
        }
    });

    if (!isThree && currentStep === 4) showStep(5);
}

function getNextStep(step) {
    if (step === 3 && getTeamSize() === "2") return 5;
    if (step === 4 && getTeamSize() === "2") return 5;
    return Math.min(5, step + 1);
}

function getPreviousStep(step) {
    if (step === 5 && getTeamSize() === "2") return 3;
    return Math.max(1, step - 1);
}

function showStep(step) {
    if (step === 4 && getTeamSize() === "2") step = 5;
    currentStep = step;

    $$(".form-step").forEach(panel => {
        panel.classList.toggle("active", Number(panel.dataset.panel) === step);
    });

    $$("#stepper .step").forEach(button => {
        const value = Number(button.dataset.step);
        button.classList.toggle("active", value === step);
    });

    const visibleIndex = step === 5 ? 5 : step;
    $("#progressBar").style.width = `${visibleIndex * 20}%`;

    $("#backBtn").disabled = step === 1;
    const isPayment = step === 5;
    $("#nextBtn").style.display = isPayment ? "none" : "inline-flex";
    $("#submitBtn").style.display = isPayment ? "inline-flex" : "none";

    if (step === 4) updateTeamSizeUI();
    clearStatus();

    document.querySelector(".registration-wrap")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function canMoveForward(step) {
    const panel = $(`.form-step[data-panel="${step}"]`);
    if (!panel) return true;

    const fields = [...panel.querySelectorAll("input, select")].filter(field => !field.disabled && field.type !== "radio");
    let valid = true;

    fields.forEach(field => {
        const fieldWrapper = field.closest(".field");
        clearFieldError(field);
        if (field.required && !field.checkValidity()) {
            fieldWrapper?.classList.add("invalid");
            valid = false;
        }
    });

    if (step === 1) {
        const name = $("#teamName").value.trim();
        const college = $("#collegeName").value.trim();
        if (name.length < 2 || college.length < 2) valid = false;
    }

    if (!valid) {
        showStatus("Please complete the required fields before continuing.", true);
        const firstInvalid = fields.find(field => field.required && !field.checkValidity());
        firstInvalid?.focus();
    }
    return valid;
}

function clearFieldError(input) {
    input.closest(".field")?.classList.remove("invalid");
}

function setupDropzone() {
    const dropzone = $("#dropzone");
    ["dragenter", "dragover"].forEach(eventName => {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.add("dragover");
        });
    });
    ["dragleave", "drop"].forEach(eventName => {
        dropzone.addEventListener(eventName, event => {
            event.preventDefault();
            dropzone.classList.remove("dragover");
        });
    });
    dropzone.addEventListener("drop", event => {
        const files = event.dataTransfer.files;
        if (files.length) {
            $("#receipt").files = files;
            handleFileSelection({ target: $("#receipt") });
        }
    });
}

function handleFileSelection(event) {
    const file = event.target.files[0];
    const info = $("#fileInfo");
    const title = $("#uploadTitle");
    const sub = $("#uploadSub");

    if (!file) {
        info.textContent = "No file selected";
        title.textContent = "Drop your file here";
        sub.textContent = "or click to choose a file";
        return;
    }

    const allowed = ["image/jpeg", "image/png", "application/pdf"];
    if (!allowed.includes(file.type)) {
        event.target.value = "";
        info.textContent = "Invalid file type. Use JPG, PNG or PDF.";
        showStatus("Payment receipt must be JPG, PNG or PDF.", true);
        return;
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        event.target.value = "";
        info.textContent = "File exceeds the 10MB limit.";
        showStatus("Payment receipt must be 10MB or smaller.", true);
        return;
    }

    info.textContent = `✓ ${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`;
    title.textContent = "Payment receipt selected";
    sub.textContent = "Click to replace the file";
    clearStatus();
}

async function handleSubmit(event) {
    event.preventDefault();
    clearStatus();

    if (!validateForm()) return;

    const submitBtn = $("#submitBtn");
    const statusMsg = $("#statusMessage");
    const receiptInput = $("#receipt");

    submitBtn.disabled = true;
    submitBtn.innerHTML = "Submitting… <span>↗</span>";
    statusMsg.classList.remove("hidden");
    statusMsg.textContent = "Uploading registration and payment receipt…";

    try {
        const form = $("#registrationForm");
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        data.payAmount = String(CONFIG.PAYMENT_FEE);
        data.submissionToken = createToken();

        const file = receiptInput.files[0];
        data.receiptBase64 = await convertFileToBase64(file);
        data.receiptType = file.type;
        data.receiptName = file.name;

        $("#progressBar").style.width = "100%";
        statusMsg.textContent = "Registration received. Confirming your Registration ID…";

        await fetch(CONFIG.API_URL, {
            method: "POST",
            mode: "no-cors",
            cache: "no-cache",
            body: JSON.stringify(data)
        });

        const registrationId = await pollForRegistrationId(data.submissionToken);
        showSuccess(registrationId);
    } catch (error) {
        console.error("Submission error:", error);
        showStatus(error.message || "Something went wrong. Please try again.", true);
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Submit Registration <span>✓</span>";
    }
}

function validateForm() {
    const form = $("#registrationForm");
    if (!form.checkValidity()) {
        const invalid = form.querySelector(":invalid");
        const panel = invalid?.closest(".form-step");
        if (panel) showStep(Number(panel.dataset.panel));
        form.reportValidity();
        return false;
    }

    const teamSize = getTeamSize();
    const years = [$("[name='m1_year']").value, $("[name='m2_year']").value];
    if (teamSize === "3") years.push($("[name='m3_year']").value);

    const fourthYearCount = years.filter(year => year === "4th Year").length;
    if (fourthYearCount > 1) {
        showStep(teamSize === "3" ? 4 : 3);
        showStatus("A team can have a maximum of one 4th-year student.", true);
        return false;
    }

    const phones = [];
    const emails = [];
    const count = teamSize === "3" ? 3 : 2;
    for (let i = 1; i <= count; i++) {
        const phone = $(`[name='m${i}_phone']`).value.trim();
        const email = $(`[name='m${i}_email']`).value.trim().toLowerCase();
        if (!/^[0-9]{10}$/.test(phone)) {
            showStep(i + 1);
            showStatus(`Member ${i}: please enter a valid 10-digit mobile number.`, true);
            return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showStep(i + 1);
            showStatus(`Member ${i}: please enter a valid email address.`, true);
            return false;
        }
        if (phones.includes(phone)) {
            showStep(i + 1);
            showStatus("Each team member must have a different mobile number.", true);
            return false;
        }
        if (emails.includes(email)) {
            showStep(i + 1);
            showStatus("Each team member must have a different email ID.", true);
            return false;
        }
        phones.push(phone);
        emails.push(email);
    }

    const utr = $("[name='utr']").value.trim();
    if (!/^[A-Za-z0-9]{8,30}$/.test(utr)) {
        showStep(5);
        showStatus("Please enter a valid UPI Transaction ID / UTR (8–30 letters or numbers).", true);
        return false;
    }

    const file = $("#receipt").files[0];
    if (!file) {
        showStep(5);
        showStatus("Please upload your payment receipt.", true);
        return false;
    }
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
        showStep(5);
        showStatus("Payment receipt must be JPG, PNG or PDF.", true);
        return false;
    }
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showStep(5);
        showStatus("Payment receipt must be 10MB or smaller.", true);
        return false;
    }
    return true;
}

function createToken() {
    if (window.crypto?.getRandomValues) {
        const bytes = new Uint8Array(18);
        crypto.getRandomValues(bytes);
        return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
    }
    return `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

function pollForRegistrationId(token, attempts = 20) {
    return new Promise((resolve, reject) => {
        let count = 0;
        const check = () => {
            count++;
            const callbackName = `codexCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const script = document.createElement("script");
            let finished = false;
            const cleanup = () => { delete window[callbackName]; script.remove(); };
            window[callbackName] = result => {
                finished = true;
                cleanup();
                if (result?.success && result.registrationId) resolve(result.registrationId);
                else if (count < attempts) setTimeout(check, 1000);
                else reject(new Error("Registration was submitted, but the Registration ID could not be confirmed. Please contact the organizers."));
            };
            script.onerror = () => {
                if (finished) return;
                finished = true;
                cleanup();
                if (count < attempts) setTimeout(check, 1000);
                else reject(new Error("Unable to confirm Registration ID. Please contact the organizers."));
            };
            script.src = `${CONFIG.API_URL}?action=getRegistrationId&token=${encodeURIComponent(token)}&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
            document.body.appendChild(script);
        };
        check();
    });
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
    });
}

function showSuccess(registrationId) {
    $("#registrationForm").classList.add("hidden");
    $("#successScreen").classList.remove("hidden");
    $("#displayRegID").innerText = registrationId;
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function showStatus(message, isError = false) {
    const status = $("#statusMessage");
    status.classList.remove("hidden");
    status.innerText = message;
    status.style.color = isError ? "#fda4af" : "#94a3b8";
    status.scrollIntoView({ behavior: "smooth", block: "center" });
}

function clearStatus() {
    const status = $("#statusMessage");
    status.classList.add("hidden");
    status.innerText = "";
}

function setupRevealObserver() {
    const elements = $$(".reveal");
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animationPlayState = "running";
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });
    elements.forEach(el => {
        el.style.animationPlayState = "paused";
        observer.observe(el);
    });
}
