/**
 * CODEX 4.0
 * Frontend Registration Logic
 *
 * Hosted on Netlify
 * Backend: Google Apps Script
 */


const CONFIG = {

    // YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL
    API_URL:
        "https://script.google.com/macros/s/AKfycbwqbA-ujJmA0dHwx9z8YY9fuk86DdjkpxU-y0m1sZ9fvNBLc4qHa1apQEiy23hVOfkBKQ/exec",


    // LOCAL PAYMENT QR
    QR_IMAGE_URL:
        "./codex-payment-qr.png",


    EVENT_NAME:
        "CODEX 4.0",


    ORGANIZER:
        "Coders' Club",


    PAYMENT_FEE:
        "₹300 per team",


    MAX_FILE_SIZE:
        10 * 1024 * 1024

};


/* =========================================================
   PAGE INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    function () {

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
                CONFIG.PAYMENT_FEE;

        }


        setupEventListeners();

    }
);


/* =========================================================
   EVENT LISTENERS
========================================================= */

function setupEventListeners() {

    const form =
        document.getElementById(
            "registrationForm"
        );


    if (!form) {

        console.error(
            "Registration form not found."
        );

        return;

    }


    const teamSizeRadios =
        document.getElementsByName(
            "teamSize"
        );


    const member3Section =
        document.getElementById(
            "member3Section"
        );


    const member3Inputs =
        member3Section
            ? member3Section.querySelectorAll(
                "input, select"
            )
            : [];


    const receiptInput =
        document.getElementById(
            "receipt"
        );


    const progressBar =
        document.getElementById(
            "progressBar"
        );


    /*
     * TEAM SIZE
     */

    teamSizeRadios.forEach(
        function (radio) {

            radio.addEventListener(
                "change",
                function (event) {

                    if (
                        event.target.value === "3"
                    ) {

                        member3Section
                            .classList
                            .remove(
                                "hidden"
                            );


                        member3Inputs
                            .forEach(
                                function (input) {

                                    input.setAttribute(
                                        "required",
                                        ""
                                    );

                                }
                            );


                        if (progressBar) {

                            progressBar.style.width =
                                "66%";

                        }

                    } else {

                        member3Section
                            .classList
                            .add(
                                "hidden"
                            );


                        member3Inputs
                            .forEach(
                                function (input) {

                                    input.removeAttribute(
                                        "required"
                                    );

                                    /*
                                     * Clear old
                                     * Member 3 data
                                     */

                                    input.value = "";

                                }
                            );


                        if (progressBar) {

                            progressBar.style.width =
                                "33%";

                        }

                    }

                }
            );

        }
    );


    /*
     * PAYMENT RECEIPT
     */

    if (receiptInput) {

        receiptInput.addEventListener(
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
                            "No file selected (Max 10MB)";

                    }

                    return;

                }


                /*
                 * Check file type
                 */

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

                    alert(
                        "Only JPG, JPEG, PNG or PDF files are allowed."
                    );


                    event.target.value =
                        "";


                    if (info) {

                        info.innerText =
                            "No file selected (Max 10MB)";

                    }

                    return;

                }


                /*
                 * Check size
                 */

                if (
                    file.size >
                    CONFIG.MAX_FILE_SIZE
                ) {

                    alert(
                        "File is too large. Maximum size is 10 MB."
                    );


                    event.target.value =
                        "";


                    if (info) {

                        info.innerText =
                            "No file selected (Max 10MB)";

                    }

                    return;

                }


                /*
                 * Display selected file
                 */

                if (info) {

                    info.innerText =
                        `Selected: ${file.name} ` +
                        `(${formatFileSize(file.size)})`;

                }

            }
        );

    }


    /*
     * FORM SUBMISSION
     */

    form.addEventListener(
        "submit",
        handleSubmit
    );

}


/* =========================================================
   SUBMIT FORM
========================================================= */

async function handleSubmit(event) {

    event.preventDefault();


    const form =
        document.getElementById(
            "registrationForm"
        );


    const submitButton =
        document.getElementById(
            "submitBtn"
        );


    const statusMessage =
        document.getElementById(
            "statusMessage"
        );


    const receiptInput =
        document.getElementById(
            "receipt"
        );


    /*
     * Browser validation
     */

    if (
        !form.checkValidity()
    ) {

        form.reportValidity();

        return;

    }


    /*
     * Receipt validation
     */

    const receiptFile =
        receiptInput &&
        receiptInput.files
            ? receiptInput.files[0]
            : null;


    if (!receiptFile) {

        showError(
            "Please upload your payment receipt."
        );

        return;

    }


    if (
        receiptFile.size >
        CONFIG.MAX_FILE_SIZE
    ) {

        showError(
            "Payment receipt must be less than 10 MB."
        );

        return;

    }


    /*
     * Prevent duplicate submissions
     */

    submitButton.disabled =
        true;


    submitButton.innerText =
        "Submitting Registration...";


    showStatus(
        "Uploading payment receipt and submitting your registration...",
        false
    );


    try {

        /*
         * Convert receipt to Base64
         */

        const receiptBase64 =
            await convertFileToBase64(
                receiptFile
            );


        /*
         * Collect form data
         */

        const formData =
            new FormData(form);


        const data =
            Object.fromEntries(
                formData.entries()
            );


        /*
         * Add receipt information
         */

        data.receiptBase64 =
            receiptBase64;


        data.receiptType =
            receiptFile.type;


        data.receiptName =
            receiptFile.name;


        /*
         * Generate a client reference.
         *
         * This is NOT the official registration ID.
         */

        data.clientReference =
            createClientReference();


        /*
         * Progress
         */

        const progressBar =
            document.getElementById(
                "progressBar"
            );


        if (progressBar) {

            progressBar.style.width =
                "100%";

        }


        /*
         * SEND TO GOOGLE APPS SCRIPT
         *
         * no-cors is required because
         * Apps Script Web Apps don't expose
         * normal CORS response headers.
         */

        await fetch(
            CONFIG.API_URL,
            {

                method: "POST",

                mode: "no-cors",

                cache: "no-store",

                headers: {

                    "Content-Type":
                        "text/plain;charset=utf-8"

                },

                body:
                    JSON.stringify(data)

            }
        );


        /*
         * Important:
         *
         * Because no-cors is used, the browser
         * cannot read the Apps Script response.
         *
         * The request has been sent successfully
         * from the browser's perspective.
         *
         * The backend creates the official ID
         * and stores the data.
         */


        showSuccess(
            data.teamName
        );


    } catch (error) {

        console.error(
            "CODEX registration error:",
            error
        );


        showError(
            "Unable to submit your registration. " +
            "Please check your internet connection " +
            "and try again."
        );


        submitButton.disabled =
            false;


        submitButton.innerText =
            "Submit Registration";

    }

}


/* =========================================================
   BASE64 CONVERSION
========================================================= */

function convertFileToBase64(
    file
) {

    return new Promise(
        function (resolve, reject) {

            const reader =
                new FileReader();


            reader.onload =
                function () {

                    const result =
                        reader.result;


                    const base64 =
                        result.split(",")[1];


                    resolve(
                        base64
                    );

                };


            reader.onerror =
                function (error) {

                    reject(
                        error
                    );

                };


            reader.readAsDataURL(
                file
            );

        }
    );

}


/* =========================================================
   SUCCESS
========================================================= */

function showSuccess(
    teamName
) {

    const form =
        document.getElementById(
            "registrationForm"
        );


    const progressContainer =
        document.querySelector(
            ".progress-container"
        );


    const successScreen =
        document.getElementById(
            "successScreen"
        );


    const statusMessage =
        document.getElementById(
            "statusMessage"
        );


    if (form) {

        form.classList.add(
            "hidden"
        );

    }


    if (progressContainer) {

        progressContainer.classList.add(
            "hidden"
        );

    }


    if (statusMessage) {

        statusMessage.classList.add(
            "hidden"
        );

    }


    if (successScreen) {

        successScreen.classList.remove(
            "hidden"
        );

    }


    /*
     * Since the browser cannot read the
     * Apps Script response because of
     * no-cors, don't display a fake
     * CODEX4-XXXX registration ID.
     *
     * Instead display a submission reference.
     */

    const registrationId =
        document.getElementById(
            "displayRegID"
        );


    if (registrationId) {

        registrationId.innerText =
            "SUBMITTED";

    }


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


/* =========================================================
   ERROR
========================================================= */

function showError(
    message
) {

    const statusMessage =
        document.getElementById(
            "statusMessage"
        );


    if (!statusMessage) {

        alert(message);

        return;

    }


    statusMessage.classList.remove(
        "hidden"
    );


    statusMessage.innerText =
        message;


    statusMessage.style.color =
        "var(--error)";


    statusMessage.scrollIntoView({

        behavior: "smooth",

        block: "center"

    });

}


/* =========================================================
   STATUS
========================================================= */

function showStatus(
    message,
    isError
) {

    const statusMessage =
        document.getElementById(
            "statusMessage"
        );


    if (!statusMessage) {

        return;

    }


    statusMessage.classList.remove(
        "hidden"
    );


    statusMessage.innerText =
        message;


    statusMessage.style.color =
        isError
            ? "var(--error)"
            : "var(--text-muted)";

}


/* =========================================================
   FILE SIZE
========================================================= */

function formatFileSize(
    bytes
) {

    if (
        bytes < 1024
    ) {

        return (
            bytes +
            " B"
        );

    }


    if (
        bytes < 1024 * 1024
    ) {

        return (
            (bytes / 1024)
                .toFixed(1) +
            " KB"
        );

    }


    return (
        (bytes / (1024 * 1024))
            .toFixed(2) +
        " MB"
    );

}


/* =========================================================
   CLIENT REFERENCE
========================================================= */

function createClientReference() {

    const timestamp =
        Date.now()
            .toString(36)
            .toUpperCase();


    const random =
        Math.random()
            .toString(36)
            .substring(
                2,
                7
            )
            .toUpperCase();


    return (
        "CLIENT-" +
        timestamp +
        "-" +
        random
    );

}
