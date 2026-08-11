const CONFIG = {
    API_URL: "https://script.google.com/macros/s/AKfycbwqbA-ujJmA0dHwx9z8YY9fuk86DdjkpxU-y0m1sZ9fvNBLc4qHa1apQEiy23hVOfkBKQ/exec",

    QR_IMAGE_URL: "https://raw.githubusercontent.com/karthiksaivinjamarla-jpg/Codex-4.0/main/codex-payment-qr.png",

    EVENT_NAME: "CODEX 4.0",
    ORGANIZER: "Coders' Club",

    PAYMENT_FEE: 300,
    MAX_FILE_SIZE: 10 * 1024 * 1024
};

let currentStep = 1;

document.addEventListener("DOMContentLoaded", () => {
    const qr = document.getElementById("paymentQR");
    const fee = document.getElementById("displayFee");

    if (qr) qr.src = CONFIG.QR_IMAGE_URL;
    if (fee) fee.innerText = `₹${CONFIG.PAYMENT_FEE} per team`;

    setupEventListeners();
    setupStepNavigation();
    updateTeamSizeUI();
    showStep(1);
});


/* =========================================================
   MULTI-STEP NAVIGATION
   ========================================================= */

function setupStepNavigation() {

    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {

            if (currentStep === 5) return;

            if (!validateCurrentStep()) return;

            const next = getNextStep(currentStep);

            if (next) {
                showStep(next);
            }
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", () => {

            if (currentStep === 1) return;

            const previous = getPreviousStep(currentStep);

            if (previous) {
                showStep(previous);
            }
        });
    }
}


function getNextStep(step) {

    const teamSize = getTeamSize();

    if (step === 1) return 2;

    if (step === 2) return 3;

    if (step === 3) {
        return teamSize === "3" ? 4 : 5;
    }

    if (step === 4) return 5;

    return null;
}


function getPreviousStep(step) {

    const teamSize = getTeamSize();

    if (step === 5) {
        return teamSize === "3" ? 4 : 3;
    }

    if (step === 4) return 3;

    if (step === 3) return 2;

    if (step === 2) return 1;

    return null;
}


/* =========================================================
   SHOW STEP
   ========================================================= */

function showStep(step) {

    const teamSize = getTeamSize();

    if (step === 4 && teamSize !== "3") {
        step = 5;
    }

    currentStep = step;

    const panels = document.querySelectorAll(".form-step");

    panels.forEach(panel => {

        const panelStep = Number(panel.dataset.panel);

        panel.classList.toggle(
            "active",
            panelStep === currentStep
        );
    });


    /* Stepper */

    const stepButtons =
        document.querySelectorAll(".stepper .step");

    stepButtons.forEach(button => {

        const buttonStep =
            Number(button.dataset.step);

        button.classList.toggle(
            "active",
            buttonStep === currentStep
        );

        button.classList.toggle(
            "completed",
            buttonStep < currentStep
        );

        if (buttonStep === 4) {

            button.classList.toggle(
                "hidden",
                teamSize !== "3"
            );
        }
    });


    /* Progress bar */

    const progressBar =
        document.getElementById("progressBar");

    if (progressBar) {

        const percentage =
            (currentStep / 5) * 100;

        progressBar.style.width =
            `${percentage}%`;
    }


    /* Buttons */

    const backBtn =
        document.getElementById("backBtn");

    const nextBtn =
        document.getElementById("nextBtn");

    const submitBtn =
        document.getElementById("submitBtn");


    if (backBtn) {

        backBtn.disabled =
            currentStep === 1;

        backBtn.style.visibility =
            currentStep === 1
                ? "hidden"
                : "visible";
    }


    if (nextBtn) {

        nextBtn.classList.toggle(
            "hidden",
            currentStep === 5
        );
    }


    if (submitBtn) {

        submitBtn.classList.toggle(
            "hidden",
            currentStep !== 5
        );
    }


    clearStatus();
}


/* =========================================================
   CURRENT STEP VALIDATION
   ========================================================= */

function validateCurrentStep() {

    clearStatus();

    const panel =
        document.querySelector(
            `.form-step[data-panel="${currentStep}"]`
        );

    if (!panel) return true;


    const teamSize = getTeamSize();


    if (currentStep === 4 &&
        teamSize !== "3") {

        return true;
    }


    const requiredFields =
        panel.querySelectorAll(
            "input[required], select[required], textarea[required]"
        );


    for (const field of requiredFields) {

        if (!field.checkValidity()) {

            field.reportValidity();
            field.focus();

            return false;
        }
    }


    /* Team Details */

    if (currentStep === 1) {

        const teamName =
            document.querySelector(
                '[name="teamName"]'
            );

        const collegeName =
            document.querySelector(
                '[name="collegeName"]'
            );


        if (!teamName?.value.trim()) {

            showStatus(
                "Please enter your team name.",
                true
            );

            teamName?.focus();

            return false;
        }


        if (!collegeName?.value.trim()) {

            showStatus(
                "Please enter your college name.",
                true
            );

            collegeName?.focus();

            return false;
        }
    }


    /* Member validation */

    if (currentStep >= 2 &&
        currentStep <= 4) {

        const memberNumber =
            currentStep - 1;

        return validateMember(memberNumber);
    }


    return true;
}


/* =========================================================
   MEMBER VALIDATION
   ========================================================= */

function validateMember(number) {

    const name =
        document.querySelector(
            `[name="m${number}_name"]`
        );

    const roll =
        document.querySelector(
            `[name="m${number}_roll"]`
        );

    const email =
        document.querySelector(
            `[name="m${number}_email"]`
        );

    const phone =
        document.querySelector(
            `[name="m${number}_phone"]`
        );

    const year =
        document.querySelector(
            `[name="m${number}_year"]`
        );

    const branch =
        document.querySelector(
            `[name="m${number}_branch"]`
        );

    const section =
        document.querySelector(
            `[name="m${number}_section"]`
        );


    const fields = [
        name,
        roll,
        email,
        phone,
        year,
        branch,
        section
    ];


    for (const field of fields) {

        if (!field ||
            !field.value.trim()) {

            field?.reportValidity();
            field?.focus();

            return false;
        }
    }


    if (!/^[0-9]{10}$/.test(
        phone.value.trim()
    )) {

        showStatus(
            `Member ${number}: please enter a valid 10-digit mobile number.`,
            true
        );

        phone.focus();

        return false;
    }


    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        email.value.trim()
    )) {

        showStatus(
            `Member ${number}: please enter a valid email address.`,
            true
        );

        email.focus();

        return false;
    }


    const allowedYears = [
        "2nd Year",
        "3rd Year",
        "4th Year"
    ];


    if (!allowedYears.includes(
        year.value
    )) {

        showStatus(
            `Member ${number}: select 2nd Year, 3rd Year or 4th Year.`,
            true
        );

        year.focus();

        return false;
    }


    return true;
}


/* =========================================================
   TEAM SIZE
   ========================================================= */

function getTeamSize() {

    return document.querySelector(
        'input[name="teamSize"]:checked'
    )?.value || "2";
}


function updateTeamSizeUI() {

    const teamSize =
        getTeamSize();

    const m3Section =
        document.getElementById(
            "member3Section"
        );

    const member3Step =
        document.getElementById(
            "member3Step"
        );


    if (m3Section) {

        m3Section.classList.toggle(
            "hidden",
            teamSize !== "3"
        );
    }


    if (member3Step) {

        member3Step.classList.toggle(
            "hidden",
            teamSize !== "3"
        );
    }
}


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

    const form =
        document.getElementById(
            "registrationForm"
        );

    if (!form) return;


    const teamSizeRadios =
        document.getElementsByName(
            "teamSize"
        );


    const m3Section =
        document.getElementById(
            "member3Section"
        );


    const m3Inputs =
        m3Section
            ? m3Section.querySelectorAll(
                "input, select"
            )
            : [];


    const receiptInput =
        document.getElementById(
            "receipt"
        );


    /* Team size */

    teamSizeRadios.forEach(radio => {

        radio.addEventListener(
            "change",
            e => {

                const isThree =
                    e.target.value === "3";


                if (m3Section) {

                    m3Section.classList.toggle(
                        "hidden",
                        !isThree
                    );
                }


                m3Inputs.forEach(input => {

                    if (isThree) {

                        input.setAttribute(
                            "required",
                            ""
                        );

                    } else {

                        input.removeAttribute(
                            "required"
                        );

                        input.setCustomValidity("");
                    }
                });


                updateTeamSizeUI();
            }
        );
    });


    /* Receipt */

    if (receiptInput) {

        receiptInput.addEventListener(
            "change",
            e => {

                const file =
                    e.target.files[0];

                const info =
                    document.getElementById(
                        "fileInfo"
                    );


                if (!file) {

                    if (info) {

                        info.innerText =
                            "No file selected (Max 10MB)";
                    }

                    return;
                }


                const allowedTypes = [
                    "image/jpeg",
                    "image/png",
                    "application/pdf"
                ];


                if (!allowedTypes.includes(
                    file.type
                )) {

                    e.target.value = "";

                    if (info) {

                        info.innerText =
                            "Invalid file type. Use JPG, PNG or PDF.";
                    }

                    showStatus(
                        "Please upload a JPG, PNG or PDF payment receipt.",
                        true
                    );

                    return;
                }


                if (file.size >
                    CONFIG.MAX_FILE_SIZE) {

                    e.target.value = "";

                    if (info) {

                        info.innerText =
                            "No file selected (Max 10MB)";
                    }

                    showStatus(
                        "Payment receipt must be 10MB or smaller.",
                        true
                    );

                    return;
                }


                if (info) {

                    info.innerText =
                        `Selected: ${file.name} ` +
                        `(${(
                            file.size /
                            1024 /
                            1024
                        ).toFixed(2)} MB)`;
                }


                clearStatus();
            }
        );
    }


    /* FINAL SUBMIT */

    form.addEventListener(
        "submit",
        async e => {

            e.preventDefault();

            clearStatus();


            if (!validateAllSteps()) {
                return;
            }


            const submitBtn =
                document.getElementById(
                    "submitBtn"
                );

            const nextBtn =
                document.getElementById(
                    "nextBtn"
                );

            const backBtn =
                document.getElementById(
                    "backBtn"
                );

            const statusMsg =
                document.getElementById(
                    "statusMessage"
                );


            submitBtn.disabled = true;

            if (nextBtn)
                nextBtn.disabled = true;

            if (backBtn)
                backBtn.disabled = true;


            submitBtn.innerText =
                "Submitting Registration...";


            statusMsg.classList.remove(
                "hidden"
            );

            statusMsg.innerText =
                "Uploading registration and payment receipt...";


            try {

                const formData =
                    new FormData(form);


                const data =
                    Object.fromEntries(
                        formData.entries()
                    );


                data.payAmount =
                    String(CONFIG.PAYMENT_FEE);


                data.submissionToken =
                    createToken();


                const file =
                    receiptInput?.files[0];


                if (!file) {

                    throw new Error(
                        "Payment receipt is required."
                    );
                }


                data.receiptBase64 =
                    await convertFileToBase64(
                        file
                    );


                data.receiptType =
                    file.type;


                data.receiptName =
                    file.name;


                await fetch(
                    CONFIG.API_URL,
                    {
                        method: "POST",
                        mode: "no-cors",
                        cache: "no-cache",
                        body: JSON.stringify(
                            data
                        )
                    }
                );


                statusMsg.innerText =
                    "Registration received. Confirming your Registration ID...";


                const registrationId =
                    await pollForRegistrationId(
                        data.submissionToken
                    );


                showSuccess(
                    registrationId
                );


            } catch (error) {

                console.error(
                    "Submission error:",
                    error
                );


                showStatus(
                    error.message ||
                    "Something went wrong. Please try again.",
                    true
                );


                submitBtn.disabled =
                    false;


                submitBtn.innerText =
                    "Submit Registration";


                if (nextBtn)
                    nextBtn.disabled = false;

                if (backBtn)
                    backBtn.disabled = false;
            }
        }
    );
}


/* =========================================================
   VALIDATE ALL STEPS
   ========================================================= */

function validateAllSteps() {

    const teamSize =
        getTeamSize();


    const steps =
        teamSize === "3"
            ? [1, 2, 3, 4]
            : [1, 2, 3];


    for (const step of steps) {

        currentStep = step;


        if (!validateCurrentStep()) {

            showStep(step);

            return false;
        }
    }


    showStep(5);


    const utr =
        document.querySelector(
            '[name="utr"]'
        );


    const file =
        document.getElementById(
            "receipt"
        )?.files[0];


    if (!utr ||
        !/^[A-Za-z0-9]{8,30}$/.test(
            utr.value.trim()
        )) {

        showStatus(
            "Please enter a valid UPI Transaction ID / UTR.",
            true
        );

        utr?.focus();

        return false;
    }


    if (!file) {

        showStatus(
            "Please upload your payment receipt.",
            true
        );

        return false;
    }


    if (file.size >
        CONFIG.MAX_FILE_SIZE) {

        showStatus(
            "Payment receipt must be 10MB or smaller.",
            true
        );

        return false;
    }


    return true;
}


/* =========================================================
   REGISTRATION ID
   ========================================================= */

function createToken() {

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
            b =>
                b.toString(16)
                 .padStart(2, "0")
        ).join("");
    }


    return `${Date.now()}${Math.random()
        .toString(36)
        .slice(2)}`;
}


function pollForRegistrationId(
    token,
    attempts = 20
) {

    return new Promise(
        (resolve, reject) => {

            let count = 0;


            const check = () => {

                count++;


                const callbackName =
                    `codexCallback_${Date.now()}_${Math.random()
                        .toString(36)
                        .slice(2)}`;


                const script =
                    document.createElement(
                        "script"
                    );


                let finished = false;


                const cleanup = () => {

                    delete window[
                        callbackName
                    ];

                    script.remove();
                };


                window[
                    callbackName
                ] = result => {

                    if (finished)
                        return;


                    finished = true;

                    cleanup();


                    if (
                        result?.success &&
                        result.registrationId
                    ) {

                        resolve(
                            result.registrationId
                        );

                        return;
                    }


                    if (count < attempts) {

                        setTimeout(
                            check,
                            1000
                        );

                    } else {

                        reject(
                            new Error(
                                "Registration was submitted, but the Registration ID could not be confirmed. Please contact the organizers."
                            )
                        );
                    }
                };


                script.onerror = () => {

                    if (finished)
                        return;


                    finished = true;

                    cleanup();


                    if (count < attempts) {

                        setTimeout(
                            check,
                            1000
                        );

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


                document.body.appendChild(
                    script
                );
            };


            check();
        }
    );
}


/* =========================================================
   FILE
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
                    reader.result.split(
                        ","
                    )[1]
                );
            };


            reader.onerror =
                reject;
        }
    );
}


/* =========================================================
   SUCCESS
   ========================================================= */

function showSuccess(
    registrationId
) {

    document
        .getElementById(
            "registrationForm"
        )
        .classList.add(
            "hidden"
        );


    document
        .querySelector(
            ".stepper"
        )
        ?.classList.add(
            "hidden"
        );


    document
        .querySelector(
            ".progress-track"
        )
        ?.classList.add(
            "hidden"
        );


    document
        .getElementById(
            "successScreen"
        )
        .classList.remove(
            "hidden"
        );


    document
        .getElementById(
            "displayRegID"
        )
        .innerText =
        registrationId;


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


    if (!status) return;


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


    if (!status) return;


    status.classList.add(
        "hidden"
    );


    status.innerText = "";
}
