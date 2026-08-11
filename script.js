/**
 * CODEX 4.0
 * Registration Frontend
 *
 * GitHub → Netlify → Google Apps Script
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



/* =========================================================
   GLOBAL STATE
========================================================= */

let currentStep = 1;



/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

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


        setupEventListeners();

        setupNavigation();

        updateTeamSizeUI();

        showStep(1);

    }
);



/* =========================================================
   NAVIGATION SETUP
========================================================= */

function setupNavigation() {

    const nextBtn =
        document.getElementById(
            "nextBtn"
        );

    const backBtn =
        document.getElementById(
            "backBtn"
        );


    /* CONTINUE */

    if (nextBtn) {

        nextBtn.addEventListener(
            "click",
            () => {

                if (
                    currentStep === 5
                ) {
                    return;
                }


                if (
                    !validateCurrentStep()
                ) {
                    return;
                }


                const nextStep =
                    getNextStep(
                        currentStep
                    );


                if (nextStep) {

                    showStep(
                        nextStep
                    );

                }

            }
        );

    }



    /* BACK */

    if (backBtn) {

        backBtn.addEventListener(
            "click",
            () => {

                if (
                    currentStep === 1
                ) {
                    return;
                }


                const previousStep =
                    getPreviousStep(
                        currentStep
                    );


                if (previousStep) {

                    showStep(
                        previousStep
                    );

                }

            }
        );

    }

}



/* =========================================================
   NEXT STEP
========================================================= */

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

        if (
            teamSize === "3"
        ) {

            return 4;

        }

        return 5;

    }


    if (step === 4) {

        return 5;

    }


    return null;

}



/* =========================================================
   PREVIOUS STEP
========================================================= */

function getPreviousStep(step) {

    const teamSize =
        getTeamSize();


    if (step === 5) {

        if (
            teamSize === "3"
        ) {

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



/* =========================================================
   SHOW STEP
========================================================= */

function showStep(step) {

    const teamSize =
        getTeamSize();


    /*
     * Safety:
     * Member 3 cannot be opened
     * for a 2-member team.
     */

    if (
        step === 4 &&
        teamSize !== "3"
    ) {

        step = 5;

    }


    currentStep =
        step;



    /* -----------------------------------------
       FORM PANELS
    ----------------------------------------- */

    const panels =
        document.querySelectorAll(
            ".form-step"
        );


    panels.forEach(
        panel => {

            const panelStep =
                Number(
                    panel.dataset.panel
                );


            panel.classList.toggle(
                "active",
                panelStep === currentStep
            );

        }
    );



    /* -----------------------------------------
       STEPPER
    ----------------------------------------- */

    const steps =
        document.querySelectorAll(
            ".stepper .step"
        );


    steps.forEach(
        stepButton => {

            const stepNumber =
                Number(
                    stepButton.dataset.step
                );


            stepButton.classList.toggle(
                "active",
                stepNumber === currentStep
            );


            stepButton.classList.toggle(
                "completed",
                stepNumber < currentStep
            );


            /*
             * Member 3 step only for 3-member teams.
             */

            if (
                stepNumber === 4
            ) {

                stepButton.classList.toggle(
                    "hidden",
                    teamSize !== "3"
                );

            }

        }
    );



    /* -----------------------------------------
       PROGRESS BAR
    ----------------------------------------- */

    const progressBar =
        document.getElementById(
            "progressBar"
        );


    if (progressBar) {

        /*
         * 5 total stages
         */

        const percentage =
            (currentStep / 5) * 100;


        progressBar.style.width =
            `${percentage}%`;

    }



    /* -----------------------------------------
       BUTTONS
    ----------------------------------------- */

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



    /*
     * BACK
     */

    if (backBtn) {

        if (
            currentStep === 1
        ) {

            backBtn.style.display =
                "none";

        } else {

            backBtn.style.display =
                "inline-flex";

        }

    }



    /*
     * CONTINUE
     */

    if (nextBtn) {

        if (
            currentStep === 5
        ) {

            nextBtn.style.display =
                "none";

            nextBtn.classList.add(
                "hidden"
            );

        } else {

            nextBtn.style.display =
                "inline-flex";

            nextBtn.classList.remove(
                "hidden"
            );

        }

    }



    /*
     * SUBMIT
     */

    if (submitBtn) {

        if (
            currentStep === 5
        ) {

            submitBtn.style.display =
                "inline-flex";

            submitBtn.classList.remove(
                "hidden"
            );

        } else {

            submitBtn.style.display =
                "none";

            submitBtn.classList.add(
                "hidden"
            );

        }

    }



    clearStatus();

}



/* =========================================================
   TEAM SIZE
========================================================= */

function getTeamSize() {

    const selected =
        document.querySelector(
            'input[name="teamSize"]:checked'
        );


    return selected
        ? selected.value
        : "2";

}



/* =========================================================
   TEAM SIZE UI
========================================================= */

function updateTeamSizeUI() {

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


    const choices =
        document.querySelectorAll(
            ".choice"
        );



    /* -----------------------------------------
       FIX 2 / 3 MEMBERS LIGHTING
    ----------------------------------------- */

    choices.forEach(
        choice => {

            const radio =
                choice.querySelector(
                    'input[name="teamSize"]'
                );


            if (!radio) {
                return;
            }


            choice.classList.toggle(
                "active",
                radio.checked
            );

        }
    );



    /* -----------------------------------------
       MEMBER 3
    ----------------------------------------- */

    if (member3Section) {

        member3Section.classList.toggle(
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


    /*
     * Make Member 3 required only
     * when team size = 3.
     */

    const member3Inputs =
        member3Section
            ? member3Section.querySelectorAll(
                "input, select"
            )
            : [];


    member3Inputs.forEach(
        input => {

            if (
                teamSize === "3"
            ) {

                input.setAttribute(
                    "required",
                    ""
                );

            } else {

                input.removeAttribute(
                    "required"
                );

                input.setCustomValidity(
                    ""
                );

            }

        }
    );

}



/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    const form =
        document.getElementById(
            "registrationForm"
        );


    if (!form) {
        return;
    }



    /* -----------------------------------------
       TEAM SIZE RADIO
    ----------------------------------------- */

    const teamSizeRadios =
        document.getElementsByName(
            "teamSize"
        );


    teamSizeRadios.forEach(
        radio => {

            radio.addEventListener(
                "change",
                () => {

                    updateTeamSizeUI();

                }
            );

        }
    );



    /* -----------------------------------------
       RECEIPT
    ----------------------------------------- */

    const receiptInput =
        document.getElementById(
            "receipt"
        );


    if (receiptInput) {

        receiptInput.addEventListener(
            "change",
            handleReceipt
        );

    }



    /* -----------------------------------------
       DRAG AND DROP
    ----------------------------------------- */

    const dropzone =
        document.getElementById(
            "dropzone"
        );


    if (dropzone) {

        dropzone.addEventListener(
            "dragover",
            event => {

                event.preventDefault();

                dropzone.classList.add(
                    "dragging"
                );

            }
        );


        dropzone.addEventListener(
            "dragleave",
            () => {

                dropzone.classList.remove(
                    "dragging"
                );

            }
        );


        dropzone.addEventListener(
            "drop",
            event => {

                event.preventDefault();

                dropzone.classList.remove(
                    "dragging"
                );


                const files =
                    event.dataTransfer.files;


                if (
                    files.length > 0
                ) {

                    receiptInput.files =
                        files;

                    handleReceipt({
                        target: receiptInput
                    });

                }

            }
        );

    }



    /* -----------------------------------------
       FORM SUBMISSION
    ----------------------------------------- */

    form.addEventListener(
        "submit",
        handleSubmit
    );

}



/* =========================================================
   RECEIPT HANDLER
========================================================= */

function handleReceipt(event) {

    const input =
        event.target;


    const file =
        input.files[0];


    const info =
        document.getElementById(
            "fileInfo"
        );


    const uploadTitle =
        document.getElementById(
            "uploadTitle"
        );


    const uploadSub =
        document.getElementById(
            "uploadSub"
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

        input.value = "";


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

        input.value = "";


        showStatus(
            "Payment receipt must be 10MB or smaller.",
            true
        );


        return;

    }



    if (info) {

        info.innerText =
            `Selected: ${file.name} (${(
                file.size /
                1024 /
                1024
            ).toFixed(2)} MB)`;

    }


    if (uploadTitle) {

        uploadTitle.innerText =
            "File selected ✓";

    }


    if (uploadSub) {

        uploadSub.innerText =
            file.name;

    }


    clearStatus();

}



/* =========================================================
   VALIDATE CURRENT STEP
========================================================= */

function validateCurrentStep() {

    clearStatus();


    const panel =
        document.querySelector(
            `.form-step[data-panel="${currentStep}"]`
        );


    if (!panel) {
        return true;
    }



    /*
     * Team Details
     */

    if (
        currentStep === 1
    ) {

        const teamName =
            document.getElementById(
                "teamName"
            );


        const collegeName =
            document.getElementById(
                "collegeName"
            );


        if (
            !teamName ||
            !teamName.value.trim()
        ) {

            showStatus(
                "Please enter your team name.",
                true
            );


            teamName?.focus();


            return false;

        }


        if (
            !collegeName ||
            !collegeName.value.trim()
        ) {

            showStatus(
                "Please enter your college name.",
                true
            );


            collegeName?.focus();


            return false;

        }


        return true;

    }



    /*
     * Member 1
     */

    if (
        currentStep === 2
    ) {

        return validateMember(
            1
        );

    }



    /*
     * Member 2
     */

    if (
        currentStep === 3
    ) {

        return validateMember(
            2
        );

    }



    /*
     * Member 3
     */

    if (
        currentStep === 4
    ) {

        if (
            getTeamSize() !== "3"
        ) {

            return true;

        }


        return validateMember(
            3
        );

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



    for (
        const field of fields
    ) {

        if (
            !field ||
            !field.value.trim()
        ) {

            showStatus(
                `Please complete all details for Member ${number}.`,
                true
            );


            field?.focus();


            return false;

        }

    }



    /*
     * Mobile
     */

    const phoneValue =
        phone.value.trim();


    if (
        !/^[0-9]{10}$/.test(
            phoneValue
        )
    ) {

        showStatus(
            `Member ${number}: please enter a valid 10-digit mobile number.`,
            true
        );


        phone.focus();


        return false;

    }



    /*
     * Email
     */

    const emailValue =
        email.value
            .trim()
            .toLowerCase();


    if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            emailValue
        )
    ) {

        showStatus(
            `Member ${number}: please enter a valid email address.`,
            true
        );


        email.focus();


        return false;

    }



    /*
     * Year
     */

    const allowedYears = [

        "2nd Year",

        "3rd Year",

        "4th Year"

    ];


    if (
        !allowedYears.includes(
            year.value
        )
    ) {

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
   VALIDATE ENTIRE FORM
========================================================= */

function validateEntireForm() {

    const teamSize =
        getTeamSize();



    /* TEAM */

    if (
        !validateTeamDetails()
    ) {

        showStep(1);

        return false;

    }



    /* MEMBER 1 */

    if (
        !validateMember(1)
    ) {

        showStep(2);

        return false;

    }



    /* MEMBER 2 */

    if (
        !validateMember(2)
    ) {

        showStep(3);

        return false;

    }



    /* MEMBER 3 */

    if (
        teamSize === "3"
    ) {

        if (
            !validateMember(3)
        ) {

            showStep(4);

            return false;

        }

    }



    /* 4TH YEAR RULE */

    if (
        !validateFourthYearRule()
    ) {

        return false;

    }



    /* DUPLICATES */

    if (
        !validateDuplicates()
    ) {

        return false;

    }



    /* PAYMENT */

    if (
        !validatePayment()
    ) {

        showStep(5);

        return false;

    }



    return true;

}



/* =========================================================
   TEAM VALIDATION
========================================================= */

function validateTeamDetails() {

    const teamName =
        document.getElementById(
            "teamName"
        );


    const collegeName =
        document.getElementById(
            "collegeName"
        );


    if (
        !teamName ||
        !teamName.value.trim()
    ) {

        showStatus(
            "Please enter your team name.",
            true
        );


        return false;

    }


    if (
        !collegeName ||
        !collegeName.value.trim()
    ) {

        showStatus(
            "Please enter your college name.",
            true
        );


        return false;

    }


    return true;

}



/* =========================================================
   FOURTH YEAR RULE
========================================================= */

function validateFourthYearRule() {

    const teamSize =
        getTeamSize();


    const years = [];


    const memberCount =
        teamSize === "3"
            ? 3
            : 2;


    for (
        let i = 1;
        i <= memberCount;
        i++
    ) {

        const year =
            document.querySelector(
                `[name="m${i}_year"]`
            );


        if (year) {

            years.push(
                year.value
            );

        }

    }


    const fourthYearCount =
        years.filter(
            year =>
                year === "4th Year"
        ).length;


    if (
        fourthYearCount > 1
    ) {

        showStatus(
            "A team can have a maximum of one 4th-year student.",
            true
        );


        return false;

    }


    return true;

}



/* =========================================================
   DUPLICATE EMAIL / PHONE
========================================================= */

function validateDuplicates() {

    const teamSize =
        getTeamSize();


    const memberCount =
        teamSize === "3"
            ? 3
            : 2;


    const phones = [];

    const emails = [];



    for (
        let i = 1;
        i <= memberCount;
        i++
    ) {

        const phone =
            document.querySelector(
                `[name="m${i}_phone"]`
            );


        const email =
            document.querySelector(
                `[name="m${i}_email"]`
            );


        if (
            !phone ||
            !email
        ) {

            continue;

        }


        const phoneValue =
            phone.value.trim();


        const emailValue =
            email.value
                .trim()
                .toLowerCase();



        if (
            phones.includes(
                phoneValue
            )
        ) {

            showStatus(
                "Each team member must have a different mobile number.",
                true
            );


            showStep(
                i
            );


            return false;

        }



        if (
            emails.includes(
                emailValue
            )
        ) {

            showStatus(
                "Each team member must have a different email ID.",
                true
            );


            showStep(
                i
            );


            return false;

        }



        phones.push(
            phoneValue
        );


        emails.push(
            emailValue
        );

    }



    return true;

}



/* =========================================================
   PAYMENT VALIDATION
========================================================= */

function validatePayment() {

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
            "Please enter a valid UPI Transaction ID / UTR (8–30 characters).",
            true
        );


        utr.focus();


        return false;

    }



    if (
        !receipt ||
        !receipt.files ||
        !receipt.files[0]
    ) {

        showStatus(
            "Please upload your payment receipt.",
            true
        );


        return false;

    }



    const file =
        receipt.files[0];


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

        showStatus(
            "Payment receipt must be JPG, PNG or PDF.",
            true
        );


        return false;

    }



    if (
        file.size >
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
   SUBMIT
========================================================= */

async function handleSubmit(event) {

    event.preventDefault();


    clearStatus();



    /*
     * Always validate complete form.
     */

    if (
        !validateEntireForm()
    ) {

        return;

    }



    const form =
        document.getElementById(
            "registrationForm"
        );


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


    const receiptInput =
        document.getElementById(
            "receipt"
        );



    submitBtn.disabled =
        true;


    if (nextBtn) {

        nextBtn.disabled =
            true;

    }


    if (backBtn) {

        backBtn.disabled =
            true;

    }


    submitBtn.innerText =
        "Submitting Registration...";


    statusMsg.classList.remove(
        "hidden"
    );


    statusMsg.innerText =
        "Uploading registration and payment receipt...";



    try {


        /* -----------------------------------------
           FORM DATA
        ----------------------------------------- */

        const formData =
            new FormData(form);


        const data =
            Object.fromEntries(
                formData.entries()
            );



        /* -----------------------------------------
           FIXED PAYMENT
        ----------------------------------------- */

        data.payAmount =
            String(
                CONFIG.PAYMENT_FEE
            );



        /* -----------------------------------------
           TOKEN
        ----------------------------------------- */

        data.submissionToken =
            createToken();



        /* -----------------------------------------
           RECEIPT
        ----------------------------------------- */

        const file =
            receiptInput.files[0];


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



        /* -----------------------------------------
           PROGRESS
        ----------------------------------------- */

        const progressBar =
            document.getElementById(
                "progressBar"
            );


        if (progressBar) {

            progressBar.style.width =
                "100%";

        }



        /* -----------------------------------------
           SEND TO GOOGLE APPS SCRIPT
        ----------------------------------------- */

        await fetch(
            CONFIG.API_URL,
            {

                method:
                    "POST",

                mode:
                    "no-cors",

                cache:
                    "no-cache",

                body:
                    JSON.stringify(
                        data
                    )

            }
        );



        /* -----------------------------------------
           WAIT FOR REGISTRATION ID
        ----------------------------------------- */

        statusMsg.innerText =
            "Registration received. Confirming your Registration ID...";


        const registrationId =
            await pollForRegistrationId(
                data.submissionToken
            );



        /* -----------------------------------------
           SUCCESS
        ----------------------------------------- */

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


        if (nextBtn) {

            nextBtn.disabled =
                false;

        }


        if (backBtn) {

            backBtn.disabled =
                false;

        }

    }

}



/* =========================================================
   CREATE TOKEN
========================================================= */

function createToken() {

    if (
        window.crypto &&
        window.crypto.getRandomValues
    ) {

        const bytes =
            new Uint8Array(
                18
            );


        window.crypto.getRandomValues(
            bytes
        );


        return Array.from(
            bytes,
            byte =>
                byte
                    .toString(16)
                    .padStart(
                        2,
                        "0"
                    )
        ).join("");

    }


    return (
        `${Date.now()}${Math.random()
            .toString(36)
            .slice(2)}`
    );

}



/* =========================================================
   GET REGISTRATION ID
========================================================= */

function pollForRegistrationId(
    token,
    attempts = 20
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            let count = 0;


            const check =
                () => {

                    count++;


                    const callbackName =
                        `codexCallback_${Date.now()}_${Math.random()
                            .toString(36)
                            .slice(2)}`;


                    const script =
                        document.createElement(
                            "script"
                        );


                    let finished =
                        false;



                    const cleanup =
                        () => {

                            delete window[
                                callbackName
                            ];


                            script.remove();

                        };



                    window[
                        callbackName
                    ] =
                        result => {

                            if (
                                finished
                            ) {

                                return;

                            }


                            finished =
                                true;


                            cleanup();



                            if (
                                result &&
                                result.success &&
                                result.registrationId
                            ) {

                                resolve(
                                    result.registrationId
                                );


                                return;

                            }



                            if (
                                count <
                                attempts
                            ) {

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



                    script.onerror =
                        () => {

                            if (
                                finished
                            ) {

                                return;

                            }


                            finished =
                                true;


                            cleanup();



                            if (
                                count <
                                attempts
                            ) {

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
                        `${CONFIG.API_URL}` +
                        `?action=getRegistrationId` +
                        `&token=${encodeURIComponent(
                            token
                        )}` +
                        `&callback=${encodeURIComponent(
                            callbackName
                        )}` +
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
   FILE → BASE64
========================================================= */

function convertFileToBase64(
    file
) {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            const reader =
                new FileReader();


            reader.readAsDataURL(
                file
            );


            reader.onload =
                () => {

                    const result =
                        reader.result;


                    resolve(
                        result.split(
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
   SUCCESS SCREEN
========================================================= */

function showSuccess(
    registrationId
) {

    const form =
        document.getElementById(
            "registrationForm"
        );


    const stepper =
        document.getElementById(
            "stepper"
        );


    const progressTrack =
        document.querySelector(
            ".progress-track"
        );


    const successScreen =
        document.getElementById(
            "successScreen"
        );


    const displayRegID =
        document.getElementById(
            "displayRegID"
        );



    if (form) {

        form.classList.add(
            "hidden"
        );

    }


    if (stepper) {

        stepper.classList.add(
            "hidden"
        );

    }


    if (progressTrack) {

        progressTrack.classList.add(
            "hidden"
        );

    }


    if (successScreen) {

        successScreen.classList.remove(
            "hidden"
        );

    }


    if (displayRegID) {

        displayRegID.innerText =
            registrationId;

    }


    window.scrollTo(
        {
            top: 0,
            behavior: "smooth"
        }
    );

}



/* =========================================================
   STATUS MESSAGE
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


    status.scrollIntoView(
        {
            behavior: "smooth",
            block: "center"
        }
    );

}



/* =========================================================
   CLEAR STATUS
========================================================= */

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



/* =========================================================
   END
========================================================= */
