/**
 * CODEX 4.0 - Registration Frontend
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

document.addEventListener("DOMContentLoaded", () => {
    const qr = document.getElementById("paymentQR");
    const fee = document.getElementById("displayFee");

    if (qr) qr.src = CONFIG.QR_IMAGE_URL;
    if (fee) fee.innerText = `₹${CONFIG.PAYMENT_FEE} per team`;

    setupEventListeners();
});

function setupEventListeners() {
    const form = document.getElementById("registrationForm");
    if (!form) return;

    const teamSizeRadios = document.getElementsByName("teamSize");
    const m3Section = document.getElementById("member3Section");
    const m3Inputs = m3Section
        ? m3Section.querySelectorAll("input, select")
        : [];

    const receiptInput = document.getElementById("receipt");
    const progressBar = document.getElementById("progressBar");

    teamSizeRadios.forEach(radio => {
        radio.addEventListener("change", e => {
            const isThree = e.target.value === "3";

            if (m3Section) {
                m3Section.classList.toggle("hidden", !isThree);
            }

            m3Inputs.forEach(input => {
                if (isThree) {
                    input.setAttribute("required", "");
                } else {
                    input.removeAttribute("required");
                    input.setCustomValidity("");
                }
            });

            if (progressBar) {
                progressBar.style.width = isThree ? "66%" : "33%";
            }
        });
    });

    if (receiptInput) {
        receiptInput.addEventListener("change", e => {
            const file = e.target.files[0];
            const info = document.getElementById("fileInfo");

            if (!file) {
                if (info) info.innerText = "No file selected (Max 10MB)";
                return;
            }

            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "application/pdf"
            ];

            if (!allowedTypes.includes(file.type)) {
                e.target.value = "";
                if (info) {
                    info.innerText = "Invalid file type. Use JPG, PNG or PDF.";
                }
                showStatus("Please upload a JPG, PNG or PDF payment receipt.", true);
                return;
            }

            if (file.size > CONFIG.MAX_FILE_SIZE) {
                e.target.value = "";
                if (info) info.innerText = "No file selected (Max 10MB)";
                showStatus("Payment receipt must be 10MB or smaller.", true);
                return;
            }

            if (info) {
                info.innerText =
                    `Selected: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;
            }

            clearStatus();
        });
    }

    form.addEventListener("submit", async e => {
        e.preventDefault();
        clearStatus();

        if (!validateForm(form)) return;

        const submitBtn = document.getElementById("submitBtn");
        const statusMsg = document.getElementById("statusMessage");

        submitBtn.disabled = true;
        submitBtn.innerText = "Submitting Registration...";

        statusMsg.classList.remove("hidden");
        statusMsg.innerText = "Uploading registration and payment receipt...";

        try {
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            data.payAmount = String(CONFIG.PAYMENT_FEE);
            data.submissionToken = createToken();

            const file = receiptInput.files[0];

            if (!file) {
                throw new Error("Payment receipt is required.");
            }

            data.receiptBase64 = await convertFileToBase64(file);
            data.receiptType = file.type;
            data.receiptName = file.name;

            if (progressBar) {
                progressBar.style.width = "100%";
            }

            await fetch(CONFIG.API_URL, {
                method: "POST",
                mode: "no-cors",
                cache: "no-cache",
                body: JSON.stringify(data)
            });

            statusMsg.innerText =
                "Registration received. Confirming your Registration ID...";

            const registrationId =
                await pollForRegistrationId(data.submissionToken);

            showSuccess(registrationId);

        } catch (error) {
            console.error("Submission error:", error);

            showStatus(
                error.message || "Something went wrong. Please try again.",
                true
            );

            submitBtn.disabled = false;
            submitBtn.innerText = "Submit Registration";
        }
    });
}

function validateForm(form) {
    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }

    const teamSize =
        document.querySelector('input[name="teamSize"]:checked')?.value;

    if (!["2", "3"].includes(teamSize)) {
        showStatus("Please select a team size of 2 or 3.", true);
        return false;
    }

    const years = [];

    const m1Year = document.querySelector('[name="m1_year"]');
    const m2Year = document.querySelector('[name="m2_year"]');

    if (m1Year) years.push(m1Year.value);
    if (m2Year) years.push(m2Year.value);

    if (teamSize === "3") {
        const m3Year = document.querySelector('[name="m3_year"]');
        if (m3Year) years.push(m3Year.value);
    }

    const allowedYears = ["2nd Year", "3rd Year", "4th Year"];

    if (years.some(year => !allowedYears.includes(year))) {
        showStatus(
            "Only 2nd Year, 3rd Year and 4th Year students are allowed.",
            true
        );
        return false;
    }

    const fourthYearCount =
        years.filter(year => year === "4th Year").length;

    if (fourthYearCount > 1) {
        showStatus(
            "A team can have a maximum of one 4th-year student.",
            true
        );
        return false;
    }

    const phones = [];
    const emails = [];
    const memberCount = teamSize === "3" ? 3 : 2;

    for (let i = 1; i <= memberCount; i++) {
        const phoneElement =
            document.querySelector(`[name="m${i}_phone"]`);

        const emailElement =
            document.querySelector(`[name="m${i}_email"]`);

        if (!phoneElement || !emailElement) {
            showStatus(`Member ${i} details are missing.`, true);
            return false;
        }

        const phone = phoneElement.value.trim();
        const email = emailElement.value.trim().toLowerCase();

        if (!/^[0-9]{10}$/.test(phone)) {
            showStatus(
                `Member ${i}: please enter a valid 10-digit mobile number.`,
                true
            );
            return false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

    const utrElement = document.querySelector('[name="utr"]');

    if (!utrElement) {
        showStatus("Payment transaction field is missing.", true);
        return false;
    }

    const utr = utrElement.value.trim();

    if (!/^[A-Za-z0-9]{8,30}$/.test(utr)) {
        showStatus(
            "Please enter a valid UPI Transaction ID / UTR (8–30 letters or numbers).",
            true
        );
        return false;
    }

    const file = document.getElementById("receipt")?.files[0];

    if (!file) {
        showStatus("Please upload your payment receipt.", true);
        return false;
    }

    const allowedTypes = [
        "image/jpeg",
        "image/png",
        "application/pdf"
    ];

    if (!allowedTypes.includes(file.type)) {
        showStatus("Payment receipt must be JPG, PNG or PDF.", true);
        return false;
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        showStatus("Payment receipt must be 10MB or smaller.", true);
        return false;
    }

    return true;
}

function createToken() {
    if (window.crypto && window.crypto.getRandomValues) {
        const bytes = new Uint8Array(18);
        window.crypto.getRandomValues(bytes);

        return Array.from(
            bytes,
            b => b.toString(16).padStart(2, "0")
        ).join("");
    }

    return `${Date.now()}${Math.random().toString(36).slice(2)}`;
}

/*
 * Looks up the ID saved by Apps Script.
 * The backend now stores Submission Token and exposes
 * getRegistrationId as JSONP, so this works cross-origin.
 */
function pollForRegistrationId(token, attempts = 20) {
    return new Promise((resolve, reject) => {
        let count = 0;

        const check = () => {
            count++;

            const callbackName =
                `codexCallback_${Date.now()}_${Math.random()
                    .toString(36)
                    .slice(2)}`;

            const script = document.createElement("script");
            let finished = false;

            const cleanup = () => {
                delete window[callbackName];
                script.remove();
            };

            window[callbackName] = result => {
                if (finished) return;

                finished = true;
                cleanup();

                if (result?.success && result.registrationId) {
                    resolve(result.registrationId);
                    return;
                }

                if (count < attempts) {
                    setTimeout(check, 1000);
                } else {
                    reject(
                        new Error(
                            "Registration was submitted, but the Registration ID could not be confirmed. Please contact the organizers with your submission time."
                        )
                    );
                }
            };

            script.onerror = () => {
                if (finished) return;

                finished = true;
                cleanup();

                if (count < attempts) {
                    setTimeout(check, 1000);
                } else {
                    reject(
                        new Error(
                            "Unable to confirm Registration ID. Please contact the organizers."
                        )
                    );
                }
            };

            script.src =
                `${CONFIG.API_URL}?action=getRegistrationId` +
                `&token=${encodeURIComponent(token)}` +
                `&callback=${encodeURIComponent(callbackName)}` +
                `&_=${Date.now()}`;

            document.body.appendChild(script);
        };

        check();
    });
}

function convertFileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.readAsDataURL(file);

        reader.onload = () => {
            resolve(reader.result.split(",")[1]);
        };

        reader.onerror = reject;
    });
}

function showSuccess(registrationId) {
    document
        .getElementById("registrationForm")
        .classList.add("hidden");

    document
        .querySelector(".progress-container")
        ?.classList.add("hidden");

    document
        .getElementById("successScreen")
        .classList.remove("hidden");

    document
        .getElementById("displayRegID")
        .innerText = registrationId;

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

function showStatus(message, isError = false) {
    const status = document.getElementById("statusMessage");

    status.classList.remove("hidden");
    status.innerText = message;

    status.style.color =
        isError ? "var(--error)" : "var(--text-muted)";

    status.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
}

function clearStatus() {
    const status = document.getElementById("statusMessage");

    status.classList.add("hidden");
    status.innerText = "";
}
