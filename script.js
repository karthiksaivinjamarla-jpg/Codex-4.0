/**
 * =========================================================
 * CODEX 4.0
 * Registration Frontend
 *
 * Frontend:
 * GitHub / Netlify
 *
 * Backend:
 * Google Apps Script
 * =========================================================
 */

const CONFIG = {

    API_URL:
        "https://script.google.com/macros/s/AKfycbwqbA-ujJmA0dHwx9z8YY9fuk86DdjkpxU-y0m1sZ9fvNBLc4qHa1apQEiy23hVOfkBKQ/exec",

    QR_IMAGE_URL:
        "https://raw.githubusercontent.com/karthiksaivinjamarla-jpg/Codex-4.0/main/codex-payment-qr.png",

    EVENT_NAME:
        "CODEX 4.0",

    ORGANIZER:
        "Coders' Club",

    PAYMENT_FEE:
        300,

    MAX_FILE_SIZE:
        10 * 1024 * 1024

};


let currentStep = 1;
let isSubmitting = false;


// =========================================================
// INITIALIZE
// =========================================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        initializeQR();
        initializeTeamSize();
        initializeReceipt();
        initializeNavigation();
        initializeForm();

        updateTeamSize();
        showStep(1);

    }
);


// =========================================================
// QR
// =========================================================

function initializeQR() {

    const qr =
        document.getElementById(
            "paymentQR"
        );

    const fee =
        document.getElementById(
            "displayFee"
        );


    if (qr) {

        qr.src =
            CONFIG.QR_IMAGE_URL;

    }


    if (fee) {

        fee.innerText =
            `₹${CONFIG.PAYMENT_FEE} per team`;

    }

}


// =========================================================
// TEAM SIZE
// =========================================================

function initializeTeamSize() {

    const radios =
        document.querySelectorAll(
            'input[name="teamSize"]'
        );


    radios.forEach(
        function (radio) {

            radio.addEventListener(
                "change",
                function () {

                    updateTeamSize();

                }
            );

        }
    );

}


function getTeamSize() {

    const selected =
        document.querySelector(
            'input[name="teamSize"]:checked'
        );


    return selected
        ? selected.value
        : "2";

}


function updateTeamSize() {

    const teamSize =
        getTeamSize();


    const member3Section =
        document.getElementById(
            "member3Section"
        );


    const member3Step =
        document.getElementById(
            "member3Step"
        );


    const member3Inputs =
        member3Section
            ? member3Section.querySelectorAll(
                "input, select"
            )
            : [];


    // -------------------------
    // MEMBER 3
    // -------------------------

    if (teamSize === "3") {

        if (member3Section) {
            member3Section.classList.remove(
                "hidden"
            );
        }


        if (member3Step) {
            member3Step.classList.remove(
                "hidden"
            );
        }


        member3Inputs.forEach(
            function (input) {

                input.setAttribute(
                    "required",
                    ""
                );

            }
        );

    } else {

        if (member3Section) {
            member3Section.classList.add(
                "hidden"
            );
        }


        if (member3Step) {
            member3Step.classList.add(
                "hidden"
            );
        }


        member3Inputs.forEach(
            function (input) {

                input.removeAttribute(
                    "required"
                );

                input.setCustomValidity("");

            }
        );

    }


    // -------------------------
    // TEAM SIZE LIGHTING
    // -------------------------

    document
        .querySelectorAll(
            'input[name="teamSize"]'
        )
        .forEach(
            function (radio) {

                const choice =
                    radio.closest(
                        ".choice"
                    );


                if (choice) {

                    choice.classList.toggle(
                        "active",
                        radio.checked
                    );

                }

            }
        );


    // -------------------------
    // IF CURRENT STEP INVALID
    // -------------------------

    if (
        currentStep === 4 &&
        teamSize === "2"
    ) {

        showStep(5);

    }

}


// =========================================================
// NAVIGATION
// =========================================================

function initializeNavigation() {

    const nextBtn =
        document.getElementById(
            "nextBtn"
        );


    const backBtn =
        document.getElementById(
            "backBtn"
        );


    const steps =
        document.querySelectorAll(
            ".stepper .step"
        );


    // CONTINUE

    if (nextBtn) {

        nextBtn.addEventListener(
            "click",
            function () {

                if (isSubmitting) {
                    return;
                }


                if (
                    !validateStep(
                        currentStep
                    )
                ) {

                    return;

                }


                const next =
                    getNextStep(
                        currentStep
                    );


                if (next) {

                    showStep(next);

                }

            }
        );

    }


    // BACK

    if (backBtn) {

        backBtn.addEventListener(
            "click",
            function () {

                if (isSubmitting) {
                    return;
                }


                const previous =
                    getPreviousStep(
                        currentStep
                    );


                if (previous) {

                    showStep(
                        previous
                    );

                }

            }
        );

    }


    // STEPPER

    steps.forEach(
        function (stepButton) {

            stepButton.addEventListener(
                "click",
                function () {

                    const target =
                        Number(
                            stepButton.dataset.step
                        );


                    if (!target) {
                        return;
                    }


                    // Don't jump forward.

                    if (
                        target >
                        currentStep
                    ) {

                        return;

                    }


                    if (
                        target === 4 &&
                        getTeamSize() !== "3"
                    ) {

                        return;

                    }


                    showStep(target);

                }
            );

        }
    );

}


// =========================================================
// NEXT STEP
// =========================================================

function getNextStep(step) {

    const teamSize =
        getTeamSize();


    if (step === 1) {
        return 2;
    }


    if (step === 2) {
        return 3;
    }


    if (step === 3) {

        if (teamSize === "3") {
            return 4;
        }

        return 5;

    }


    if (step === 4) {
        return 5;
    }


    return null;

}


// =========================================================
// PREVIOUS STEP
// =========================================================

function getPreviousStep(step) {

    const teamSize =
        getTeamSize();


    if (step === 5) {

        if (teamSize === "3") {
            return 4;
        }

        return 3;

    }


    if (step === 4) {
        return 3;
    }


    if (step === 3) {
        return 2;
    }


    if (step === 2) {
        return 1;
    }


    return null;

}


// =========================================================
// SHOW STEP
// =========================================================

function showStep(step) {

    const teamSize =
        getTeamSize();


    // Never show Member 3 for a 2-member team.

    if (
        step === 4 &&
        teamSize !== "3"
    ) {

        step = 5;

    }


    currentStep =
        step;


    const panels =
        document.querySelectorAll(
            ".form-step"
        );


    const stepButtons =
        document.querySelectorAll(
            ".stepper .step"
        );


    // -------------------------
    // PANELS
    // -------------------------

    panels.forEach(
        function (panel) {

            const panelNumber =
                Number(
                    panel.dataset.panel
                );


            panel.classList.toggle(
                "active",
                panelNumber === currentStep
            );


            if (
                panelNumber === 4 &&
                teamSize !== "3"
            ) {

                panel.classList.add(
                    "hidden"
                );

            }

        }
    );


    // -------------------------
    // STEPPER
    // -------------------------

    stepButtons.forEach(
        function (button) {

            const stepNumber =
                Number(
                    button.dataset.step
                );


            if (
                stepNumber === 4
            ) {

                button.classList.toggle(
                    "hidden",
                    teamSize !== "3"
                );

            }


            button.classList.toggle(
                "active",
                stepNumber === currentStep
            );


            button.classList.toggle(
                "completed",
                stepNumber < currentStep
            );

        }
    );


    // -------------------------
    // PROGRESS
    // -------------------------

    const progressBar =
        document.getElementById(
            "progressBar"
        );


    if (progressBar) {

        let percentage;


        if (teamSize === "3") {

            const map = {
                1: 20,
                2: 40,
                3: 60,
                4: 80,
                5: 100
            };


            percentage =
                map[currentStep];

        } else {

            const map = {
                1: 25,
                2: 50,
                3: 75,
                5: 100
            };


            percentage =
                map[currentStep];

        }


        progressBar.style.width =
            `${percentage || 20}%`;

    }


    // -------------------------
    // BUTTONS
    // -------------------------

    const backBtn =
        document.getElementById(
            "backBtn"
        );


    const nextBtn =
        document.getElementById(
            "nextBtn"
        );


    const submitBtn =
        document.getElementById(
            "submitBtn"
        );


    if (backBtn) {

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


    const register =
        document.getElementById(
            "register"
        );


    if (register) {

        register.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    }

}


// =========================================================
// VALIDATION
// =========================================================

function validateStep(step) {

    clearStatus();


    const panel =
        document.querySelector(
            `.form-step[data-panel="${step}"]`
        );


    if (!panel) {
        return true;
    }


    const teamSize =
        getTeamSize();


    // Member 3 isn't needed for 2 members.

    if (
        step === 4 &&
        teamSize !== "3"
    ) {

        return true;

    }


    const fields =
        panel.querySelectorAll(
            "input[required], select[required]"
        );


    for (
        const field of fields
    ) {

        if (
            !field.checkValidity()
        ) {

            field.reportValidity();

            field.focus();

            return false;

        }

    }


    // TEAM

    if (step === 1) {

        const teamName =
            document.querySelector(
                '[name="teamName"]'
            );


        const college =
            document.querySelector(
                '[name="collegeName"]'
            );


        if (
            !teamName.value.trim()
        ) {

            showStatus(
                "Please enter a team name.",
                true
            );

            teamName.focus();

            return false;

        }


        if (
            !college.value.trim()
        ) {

            showStatus(
                "Please enter your college name.",
                true
            );

            college.focus();

            return false;

        }

    }


    // MEMBER

    if (
        step >= 2 &&
        step <= 4
    ) {

        const memberNumber =
            step - 1;


        if (
            !validateMember(
                memberNumber
            )
        ) {

            return false;

        }

    }


    return true;

}


// =========================================================
// MEMBER VALIDATION
// =========================================================

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


    for (
        const field of fields
    ) {

        if (
            !field ||
            !field.value.trim()
        ) {

            if (field) {
                field.reportValidity();
                field.focus();
            }

            return false;

        }

    }


    // PHONE

    if (
        !/^[0-9]{10}$/.test(
            phone.value.trim()
        )
    ) {

        showStatus(
            `Member ${number}: enter a valid 10-digit mobile number.`,
            true
        );

        phone.focus();

        return false;

    }


    // EMAIL

    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email.value.trim()
        )
    ) {

        showStatus(
            `Member ${number}: enter a valid email address.`,
            true
        );

        email.focus();

        return false;

    }


    return true;

}


// =========================================================
// RECEIPT
// =========================================================

function initializeReceipt() {

    const receipt =
        document.getElementById(
            "receipt"
        );


    if (!receipt) {
        return;
    }


    receipt.addEventListener(
        "change",
        function (event) {

            const file =
                event.target.files[0];


            const info =
                document.getElementById(
                    "fileInfo"
                );


            if (!file) {

                if (info) {
                    info.innerText =
                        "No file selected";
                }

                return;

            }


            const allowedTypes = [
                "image/jpeg",
                "image/png",
                "application/pdf"
            ];


            if (
                !allowedTypes.includes(
                    file.type
                )
            ) {

                event.target.value =
                    "";


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


            if (
                file.size >
                CONFIG.MAX_FILE_SIZE
            ) {

                event.target.value =
                    "";


                if (info) {

                    info.innerText =
                        "No file selected";

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


// =========================================================
// FORM SUBMISSION
// =========================================================

function initializeForm() {

    const form =
        document.getElementById(
            "registrationForm"
        );


    if (!form) {
        return;
    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            if (isSubmitting) {
                return;
            }


            // Validate all visible steps.

            if (
                !validateAllSteps()
            ) {

                return;

            }


            const submitBtn =
                document.getElementById(
                    "submitBtn"
                );


            const status =
                document.getElementById(
                    "statusMessage"
                );


            isSubmitting =
                true;


            if (submitBtn) {

                submitBtn.disabled =
                    true;

                submitBtn.innerText =
                    "Submitting Registration...";

            }


            if (status) {

                status.classList.remove(
                    "hidden"
                );

                status.innerText =
                    "Uploading registration and payment receipt...";

            }


            try {

                const formData =
                    new FormData(
                        form
                    );


                const data =
                    Object.fromEntries(
                        formData.entries()
                    );


                // FIXED PAYMENT

                data.payAmount =
                    "300";


                // RECEIPT

                const receipt =
                    document.getElementById(
                        "receipt"
                    );


                const file =
                    receipt?.files[0];


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


                // SEND

                if (status) {

                    status.innerText =
                        "Submitting registration...";

                }


                await fetch(
                    CONFIG.API_URL,
                    {
                        method: "POST",

                        mode: "no-cors",

                        cache: "no-cache",

                        body:
                            JSON.stringify(
                                data
                            )
                    }
                );


                // Apps Script receives the data,
                // generates Registration ID,
                // stores it in Sheets,
                // and saves receipt in Drive.
                //
                // Participant does NOT see the ID.

                showSuccess();


            } catch (error) {

                console.error(
                    "Registration error:",
                    error
                );


                showStatus(
                    error.message ||
                    "Unable to submit registration. Please try again.",
                    true
                );


                if (submitBtn) {

                    submitBtn.disabled =
                        false;

                    submitBtn.innerText =
                        "Submit Registration ✓";

                }


                isSubmitting =
                    false;

            }

        }
    );

}


// =========================================================
// VALIDATE COMPLETE FORM
// =========================================================

function validateAllSteps() {

    const teamSize =
        getTeamSize();


    const steps =
        teamSize === "3"
            ? [1, 2, 3, 4]
            : [1, 2, 3];


    for (
        const step of steps
    ) {

        if (
            !validateStep(step)
        ) {

            showStep(step);

            return false;

        }

    }


    // -------------------------
    // FOURTH YEAR LIMIT
    // -------------------------

    let fourthYearCount =
        0;


    const members =
        teamSize === "3"
            ? [1, 2, 3]
            : [1, 2];


    members.forEach(
        function (number) {

            const year =
                document.querySelector(
                    `[name="m${number}_year"]`
                );


            if (
                year &&
                year.value === "4th Year"
            ) {

                fourthYearCount++;

            }

        }
    );


    if (
        fourthYearCount > 1
    ) {

        showStatus(
            "A team can have a maximum of one 4th-year student.",
            true
        );

        return false;

    }


    // -------------------------
    // PAYMENT
    // -------------------------

    showStep(5);


    const utr =
        document.querySelector(
            '[name="utr"]'
        );


    const receipt =
        document.getElementById(
            "receipt"
        );


    if (
        !utr ||
        !utr.value.trim()
    ) {

        showStatus(
            "Please enter your UPI Transaction ID / UTR.",
            true
        );

        utr?.focus();

        return false;

    }


    if (
        !/^[A-Za-z0-9]{8,30}$/.test(
            utr.value.trim()
        )
    ) {

        showStatus(
            "Please enter a valid UPI Transaction ID / UTR.",
            true
        );

        utr.focus();

        return false;

    }


    if (
        !receipt ||
        !receipt.files[0]
    ) {

        showStatus(
            "Please upload your payment receipt.",
            true
        );

        return false;

    }


    return true;

}


// =========================================================
// FILE → BASE64
// =========================================================

function convertFileToBase64(
    file
) {

    return new Promise(
        function (
            resolve,
            reject
        ) {

            const reader =
                new FileReader();


            reader.readAsDataURL(
                file
            );


            reader.onload =
                function () {

                    const result =
                        reader.result;


                    resolve(
                        result.split(",")[1]
                    );

                };


            reader.onerror =
                function (error) {

                    reject(error);

                };

        }
    );

}


// =========================================================
// SUCCESS
// =========================================================

function showSuccess() {

    const form =
        document.getElementById(
            "registrationForm"
        );


    const success =
        document.getElementById(
            "successScreen"
        );


    if (form) {

        form.classList.add(
            "hidden"
        );

    }


    if (success) {

        success.classList.remove(
            "hidden"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =========================================================
// STATUS
// =========================================================

function showStatus(
    message,
    isError
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


    status.innerText =
        "";

}
