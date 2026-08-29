const CONFIG = {
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

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
    const qr = document.getElementById("paymentQR");
    const fee = document.getElementById("displayFee");

    if (qr) qr.src = CONFIG.QR_IMAGE_URL;
    if (fee) fee.textContent = `₹${CONFIG.PAYMENT_FEE} per team`;

    setupTeamSize();
    setupNavigation();
    setupPaymentHelpers();
    setupFileUpload();
    setupRealtimeValidation();
    setupConfirmationPassActions();
    compactTeamSizeSelector();

    showStep(1);

    /*
     * Existing registration handling is now done through Supabase.
     * If this page was opened with ?view=pass, load the registration
     * belonging to the currently authenticated user.
     */
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.get("view") === "pass") {
        await loadExistingRegistration();
    }
});


/* =========================================================
   TEAM SIZE
========================================================= */

function getTeamSize() {
    return document.querySelector(
        'input[name="teamSize"]:checked'
    )?.value || "2";
}


function updateTeamSizeUI() {
    document.querySelectorAll(".choice").forEach(choice => {
        const radio = choice.querySelector(
            'input[name="teamSize"]'
        );

        if (radio) {
            choice.classList.toggle("active", radio.checked);
        }
    });
}


function compactTeamSizeSelector() {
    document.querySelectorAll(".choice span").forEach(span => {
        span.style.padding = "9px 10px";
        span.style.fontSize = "10px";
    });

    document.querySelectorAll(".choice-row").forEach(row => {
        row.style.gap = "8px";
    });
}


function setupTeamSize() {
    document
        .querySelectorAll('input[name="teamSize"]')
        .forEach(radio => {
            radio.addEventListener("change", () => {
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

    if (step) {
        step.classList.toggle("hidden", !isThree);
    }

    if (!section) return;

    if (!isThree && currentStep === 4) {
        currentStep = 5;
    }

    if (currentStep !== 4) {
        section.classList.add("hidden");
    }

    section
        .querySelectorAll("input, select")
        .forEach(field => {
            if (isThree) {
                field.setAttribute("required", "");
            } else {
                field.removeAttribute("required");
                field.setCustomValidity("");
            }
        });
}


/* =========================================================
   STEP SEQUENCE & NAVIGATION
========================================================= */

function getStepSequence() {
    return getTeamSize() === "3"
        ? [1, 2, 3, 4, 5]
        : [1, 2, 3, 5];
}


function setupNavigation() {
    const nextBtn = document.getElementById("nextBtn");
    const backBtn = document.getElementById("backBtn");

    if (nextBtn) {
        nextBtn.addEventListener("click", nextStep);
    }

    if (backBtn) {
        backBtn.addEventListener("click", previousStep);
    }

    document
        .querySelectorAll(".stepper .step")
        .forEach(button => {
            button.addEventListener("click", () => {
                const target = Number(button.dataset.step);
                const sequence = getStepSequence();

                if (
                    sequence.includes(target) &&
                    target <= maxReachedStep
                ) {
                    showStep(target);
                }
            });
        });
}


function nextStep(event) {
    if (event) {
        event.preventDefault();
    }

    if (!validateCurrentStep()) {
        return;
    }

    const sequence = getStepSequence();
    const index = sequence.indexOf(currentStep);

    if (index < sequence.length - 1) {
        const next = sequence[index + 1];

        maxReachedStep = Math.max(
            maxReachedStep,
            next
        );

        showStep(next);
    }
}


function previousStep(event) {
    if (event) {
        event.preventDefault();
    }

    const sequence = getStepSequence();
    const index = sequence.indexOf(currentStep);

    if (index > 0) {
        showStep(sequence[index - 1]);
    }
}


function showStep(step) {
    const sequence = getStepSequence();

    if (!sequence.includes(step)) {
        step = sequence[0];
    }

    currentStep = step;

    updateMember3State();

    document
        .querySelectorAll(".form-step")
        .forEach(panel => {
            const panelStep = Number(
                panel.dataset.panel
            );

            const isCurrent =
                panelStep === currentStep;

            panel.classList.toggle(
                "active",
                isCurrent
            );

            if (
                panelStep !== 4 ||
                getTeamSize() === "3"
            ) {
                panel.classList.toggle(
                    "hidden",
                    !isCurrent
                );
            }
        });

    document
        .querySelectorAll(".stepper .step")
        .forEach(button => {
            const number = Number(
                button.dataset.step
            );

            const visible =
                number !== 4 ||
                getTeamSize() === "3";

            button.classList.toggle(
                "hidden",
                !visible
            );

            button.classList.toggle(
                "active",
                number === currentStep
            );

            button.classList.toggle(
                "completed",
                number < currentStep ||
                number <= maxReachedStep
            );
        });

    const progressBar =
        document.getElementById("progressBar");

    if (progressBar) {
        const index =
            sequence.indexOf(currentStep);

        progressBar.style.width =
            `${((index + 1) / sequence.length) * 100}%`;
    }

    updateNavigation();
    clearStatus();
}


function updateNavigation() {
    const nextBtn =
        document.getElementById("nextBtn");

    const backBtn =
        document.getElementById("backBtn");

    const submitBtn =
        document.getElementById("submitBtn");

    if (backBtn) {
        backBtn.style.display =
            currentStep === 1
                ? "none"
                : "inline-flex";
    }

    if (nextBtn) {
        nextBtn.classList.toggle(
            "hidden",
            currentStep === 5
        );

        nextBtn.style.display =
            currentStep === 5
                ? "none"
                : "inline-flex";
    }

    if (submitBtn) {
        submitBtn.classList.toggle(
            "hidden",
            currentStep !== 5
        );

        submitBtn.style.display =
            currentStep === 5
                ? "inline-flex"
                : "none";
    }
}


/* =========================================================
   PAYMENT HELPERS & UPI
========================================================= */

function setupPaymentHelpers() {
    const copyBtn =
        document.getElementById("copyUpiBtn");

    const upiLink =
        document.getElementById("upiPayLink");

    if (copyBtn) {
        copyBtn.addEventListener(
            "click",
            async () => {
                try {
                    await navigator.clipboard.writeText(
                        CONFIG.UPI_ID
                    );

                    const originalText =
                        copyBtn.textContent;

                    copyBtn.textContent =
                        "✓ Copied UPI ID!";

                    copyBtn.classList.add(
                        "copied"
                    );

                    setTimeout(() => {
                        copyBtn.textContent =
                            originalText;

                        copyBtn.classList.remove(
                            "copied"
                        );
                    }, 2000);
                } catch (error) {
                    prompt(
                        "Copy this UPI ID:",
                        CONFIG.UPI_ID
                    );
                }
            }
        );
    }

    if (upiLink) {
        upiLink.href =
            `upi://pay?pa=${CONFIG.UPI_ID}` +
            `&pn=${encodeURIComponent(CONFIG.EVENT_NAME)}` +
            `&am=${CONFIG.PAYMENT_FEE}` +
            `&cu=INR`;
    }
}


/* =========================================================
   FILE UPLOAD & PREVIEW
========================================================= */

function setupFileUpload() {
    const receiptInput =
        document.getElementById("receipt");

    const fileInfo =
        document.getElementById("fileInfo");

    const dropzoneLabel =
        document.getElementById("dropzoneLabel");

    const dropzonePrompt =
        document.getElementById("dropzonePrompt");

    const previewContainer =
        document.getElementById("previewContainer");

    const previewMedia =
        document.getElementById("previewMedia");

    const previewFileName =
        document.getElementById("previewFileName");

    const previewFileSize =
        document.getElementById("previewFileSize");

    const removeFileBtn =
        document.getElementById("removeFileBtn");

    if (!receiptInput) {
        return;
    }

    function handleFile(file) {
        if (!file) {
            resetPreview();
            return;
        }

        const allowed = [
            "image/jpeg",
            "image/png",
            "application/pdf"
        ];

        if (!allowed.includes(file.type)) {
            receiptInput.value = "";

            resetPreview();

            showStatus(
                "Please upload a JPG, PNG or PDF payment receipt.",
                true
            );

            return;
        }

        if (file.size > CONFIG.MAX_FILE_SIZE) {
            receiptInput.value = "";

            resetPreview();

            showStatus(
                "Payment receipt must be 10MB or smaller.",
                true
            );

            return;
        }

        clearStatus();

        const sizeFormatted =
            (file.size / (1024 * 1024))
                .toFixed(2) + " MB";

        if (fileInfo) {
            fileInfo.textContent =
                `Selected: ${file.name} (${sizeFormatted})`;
        }

        if (previewFileName) {
            previewFileName.textContent =
                file.name;
        }

        if (previewFileSize) {
            previewFileSize.textContent =
                sizeFormatted;
        }

        if (previewMedia) {
            previewMedia.innerHTML = "";

            if (file.type.startsWith("image/")) {
                const img =
                    document.createElement("img");

                img.src =
                    URL.createObjectURL(file);

                img.alt =
                    "Receipt preview";

                img.className =
                    "receipt-thumbnail";

                previewMedia.appendChild(img);
            } else {
                const pdfBadge =
                    document.createElement("div");

                pdfBadge.className =
                    "pdf-badge";

                pdfBadge.innerHTML =
                    "<span>PDF</span><b>Document</b>";

                previewMedia.appendChild(
                    pdfBadge
                );
            }
        }

        if (dropzonePrompt) {
            dropzonePrompt.classList.add(
                "hidden"
            );
        }

        if (previewContainer) {
            previewContainer.classList.remove(
                "hidden"
            );
        }
    }


    function resetPreview() {
        receiptInput.value = "";

        if (fileInfo) {
            fileInfo.textContent =
                "No file selected";
        }

        if (dropzonePrompt) {
            dropzonePrompt.classList.remove(
                "hidden"
            );
        }

        if (previewContainer) {
            previewContainer.classList.add(
                "hidden"
            );
        }

        if (previewMedia) {
            previewMedia.innerHTML = "";
        }
    }


    receiptInput.addEventListener(
        "change",
        () => {
            handleFile(
                receiptInput.files[0]
            );
        }
    );


    if (removeFileBtn) {
        removeFileBtn.addEventListener(
            "click",
            event => {
                event.preventDefault();
                event.stopPropagation();

                resetPreview();
            }
        );
    }


    if (dropzoneLabel) {
        ["dragenter", "dragover"]
            .forEach(eventName => {
                dropzoneLabel.addEventListener(
                    eventName,
                    event => {
                        event.preventDefault();
                        event.stopPropagation();

                        dropzoneLabel.classList.add(
                            "dragover"
                        );
                    }
                );
            });


        ["dragleave", "drop"]
            .forEach(eventName => {
                dropzoneLabel.addEventListener(
                    eventName,
                    event => {
                        event.preventDefault();
                        event.stopPropagation();

                        dropzoneLabel.classList.remove(
                            "dragover"
                        );
                    }
                );
            });


        dropzoneLabel.addEventListener(
            "drop",
            event => {
                const files =
                    event.dataTransfer.files;

                if (
                    files &&
                    files.length > 0
                ) {
                    receiptInput.files =
                        files;

                    handleFile(files[0]);
                }
            }
        );
    }
}


/* =========================================================
   REAL-TIME VALIDATION
========================================================= */

function setupRealtimeValidation() {
    const yearSelects =
        document.querySelectorAll(
            'select[name$="_year"]'
        );

    yearSelects.forEach(select => {
        select.addEventListener(
            "change",
            () => {
                checkYearConstraints();
            }
        );
    });


    const contactInputs =
        document.querySelectorAll(
            'input[name$="_phone"], input[name$="_email"]'
        );

    contactInputs.forEach(input => {
        input.addEventListener(
            "blur",
            () => {
                checkContactUniqueness();
            }
        );
    });
}


function checkYearConstraints() {
    const teamSize =
        getTeamSize();

    const count =
        teamSize === "3" ? 3 : 2;

    let fourthYearCount = 0;

    for (let i = 1; i <= count; i++) {
        const value =
            document.querySelector(
                `[name="m${i}_year"]`
            )?.value;

        if (value === "4th Year") {
            fourthYearCount++;
        }
    }

    if (fourthYearCount > 1) {
        showStatus(
            "CODEX 4.0 rules allow a maximum of ONE 4th-year student per team.",
            true
        );

        return false;
    }

    clearStatus();

    return true;
}


function checkContactUniqueness() {
    const teamSize =
        getTeamSize();

    const count =
        teamSize === "3" ? 3 : 2;

    const phones = new Set();
    const emails = new Set();

    for (let i = 1; i <= count; i++) {
        const phone =
            document.querySelector(
                `[name="m${i}_phone"]`
            )?.value.trim();

        const email =
            document.querySelector(
                `[name="m${i}_email"]`
            )?.value
                .trim()
                .toLowerCase();

        if (phone) {
            if (phones.has(phone)) {
                showStatus(
                    `Mobile number ${phone} is entered more than once. Each member must have a unique phone number.`,
                    true
                );

                return false;
            }

            phones.add(phone);
        }

        if (email) {
            if (emails.has(email)) {
                showStatus(
                    `Email ${email} is entered more than once. Each member must have a unique email ID.`,
                    true
                );

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
    const panel =
        document.querySelector(
            `.form-step[data-panel="${currentStep}"]`
        );

    if (!panel) {
        return true;
    }

    for (
        const field of panel.querySelectorAll(
            "input, select, textarea"
        )
    ) {
        if (
            field.disabled ||
            field.type === "hidden"
        ) {
            continue;
        }

        if (!field.checkValidity()) {
            field.reportValidity();

            return false;
        }
    }

    if (
        currentStep === 1 &&
        !document.querySelector(
            'input[name="teamSize"]:checked'
        )
    ) {
        showStatus(
            "Please select a team size.",
            true
        );

        return false;
    }

    if (!checkYearConstraints()) {
        return false;
    }

    if (!checkContactUniqueness()) {
        return false;
    }

    return true;
}


function validateCompleteForm(form) {
    const teamSize =
        getTeamSize();

    const member3Fields =
        document.querySelectorAll(
            "#member3Section input, #member3Section select"
        );

    member3Fields.forEach(field => {
        if (teamSize === "3") {
            field.setAttribute(
                "required",
                ""
            );
        } else {
            field.removeAttribute(
                "required"
            );
        }
    });


    if (!form.checkValidity()) {
        form.reportValidity();

        return false;
    }


    const years = [];

    for (
        let i = 1;
        i <= (teamSize === "3" ? 3 : 2);
        i++
    ) {
        const element =
            document.querySelector(
                `[name="m${i}_year"]`
            );

        if (element) {
            years.push(element.value);
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
            "Only 2nd Year, 3rd Year and 4th Year students are eligible.",
            true
        );

        return false;
    }


    if (
        years.filter(
            year => year === "4th Year"
        ).length > 1
    ) {
        showStatus(
            "A team can have a maximum of one 4th-year student.",
            true
        );

        return false;
    }


    const phones = new Set();
    const emails = new Set();

    const count =
        teamSize === "3" ? 3 : 2;


    for (let i = 1; i <= count; i++) {
        const phone =
            document.querySelector(
                `[name="m${i}_phone"]`
            )?.value.trim();

        const email =
            document.querySelector(
                `[name="m${i}_email"]`
            )?.value
                .trim()
                .toLowerCase();


        if (!/^[0-9]{10}$/.test(phone || "")) {
            showStatus(
                `Member ${i}: please enter a valid 10-digit mobile number.`,
                true
            );

            return false;
        }


        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
                email || ""
            )
        ) {
            showStatus(
                `Member ${i}: please enter a valid email address.`,
                true
            );

            return false;
        }


        if (phones.has(phone)) {
            showStatus(
                "Each team member must have a different mobile number.",
                true
            );

            return false;
        }


        if (emails.has(email)) {
            showStatus(
                "Each team member must have a different email ID.",
                true
            );

            return false;
        }


        phones.add(phone);
        emails.add(email);
    }


    const utr =
        document.querySelector(
            '[name="utr"]'
        )?.value.trim() || "";


    if (
        !/^[A-Za-z0-9]{8,30}$/.test(utr)
    ) {
        showStatus(
            "Please enter a valid UPI Transaction ID / UTR.",
            true
        );

        return false;
    }


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


    if (
        ![
            "image/jpeg",
            "image/png",
            "application/pdf"
        ].includes(receipt.type)
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
   LEGACY SUBMISSION BLOCK
========================================================= */

/*
 * IMPORTANT:
 *
 * Registration submission is intentionally NOT implemented here.
 *
 * supabase-registration.js owns the submit event and sends the
 * registration directly to Supabase.
 *
 * Keeping a second submit listener here would risk:
 *
 * 1. Duplicate registrations
 * 2. Google Apps Script requests
 * 3. Conflicting success screens
 *
 * Therefore this file only provides validation/UI helpers.
 */


/* =========================================================
   SUCCESS / CONFIRMATION PASS
========================================================= */

function populatePassMembers(data) {
    const memberList =
        document.getElementById(
            "passMemberList"
        );

    if (!memberList) {
        return;
    }

    memberList.innerHTML = "";

    const count =
        parseInt(
            data.teamSize,
            10
        ) === 3
            ? 3
            : 2;


    for (let i = 1; i <= count; i++) {
        const name =
            data[`m${i}_name`] ||
            `Member ${i}`;

        const roll =
            data[`m${i}_roll`] ||
            "-";

        const branch =
            data[`m${i}_branch`] ||
            "-";

        const year =
            data[`m${i}_year`] ||
            "-";

        const section =
            data[`m${i}_section`] ||
            "-";

        const email =
            data[`m${i}_email`] ||
            "";


        const li =
            document.createElement("li");


        li.innerHTML = `
            <div class="member-badge">
                ${i === 1
                    ? "👑 LEADER"
                    : "MEMBER " + i}
            </div>

            <div class="member-info">
                <strong>
                    ${escapeHtml(name)}
                </strong>

                <small>
                    Roll: ${escapeHtml(roll)}
                    · ${escapeHtml(branch)}
                    (Sec ${escapeHtml(section)})
                    · ${escapeHtml(year)}
                    ${email
                        ? ` · ${escapeHtml(email)}`
                        : ""}
                </small>
            </div>
        `;


        memberList.appendChild(li);
    }
}


function renderPassScreen(
    data,
    options = {}
) {
    const {
        isNew = false,
        statusText = "Under Review"
    } = options;


    const form =
        document.getElementById(
            "registrationForm"
        );

    const main =
        document.querySelector("main");


    if (form) {
        form.classList.add("hidden");
    }

    if (main) {
        main.classList.add("hidden");
    }


    const successScreen =
        document.getElementById(
            "successScreen"
        );


    if (!successScreen) {
        return;
    }


    successScreen.classList.remove(
        "hidden"
    );


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    const h2 =
        successScreen.querySelector(
            "h2"
        );

    const msg =
        document.getElementById(
            "successMessageText"
        );


    if (isNew) {
        if (h2) {
            h2.textContent =
                "Registration Submitted!";
        }

        if (msg) {
            msg.textContent =
                "Thank you for registering for CODEX 4.0. Your submission has been received. A confirmation email will be sent to all team members.";
        }
    } else {
        if (h2) {
            h2.textContent =
                "Your Registration";
        }

        if (msg) {
            msg.textContent =
                "Here is your CODEX 4.0 confirmation slip. Keep this safe for on-spot check-in.";
        }
    }


    const teamName =
        data.teamName ??
        data.team_name ??
        "-";

    const collegeName =
        data.collegeName ??
        data.college_name ??
        "-";

    const teamSize =
        data.teamSize ??
        data.team_size ??
        2;

    const utr =
        data.utr ??
        data.transaction_id ??
        "-";

    const registrationId =
        data.registrationId ??
        data.registration_id ??
        "GENERATING ID...";


    const teamNameEl =
        document.getElementById(
            "passTeamName"
        );

    const collegeEl =
        document.getElementById(
            "passCollege"
        );

    const teamSizeEl =
        document.getElementById(
            "passTeamSize"
        );

    const utrEl =
        document.getElementById(
            "passUtr"
        );

    const regIdEl =
        document.getElementById(
            "passRegId"
        );

    const statusEl =
        document.getElementById(
            "passStatusText"
        );


    if (teamNameEl) {
        teamNameEl.textContent =
            teamName;
    }

    if (collegeEl) {
        collegeEl.textContent =
            collegeName;
    }

    if (teamSizeEl) {
        teamSizeEl.textContent =
            `${teamSize} Members`;
    }

    if (utrEl) {
        utrEl.textContent =
            utr;
    }

    if (regIdEl) {
        regIdEl.textContent =
            registrationId;
    }

    if (statusEl) {
        statusEl.textContent =
            data.status ||
            statusText;
    }


    populatePassMembers(data);
}


/* =========================================================
   NEW REGISTRATION SUCCESS
========================================================= */

function showSuccess(data) {
    lastSubmittedData = data;

    renderPassScreen(
        data,
        {
            isNew: true,
            statusText:
                data.status ||
                "Pending"
        }
    );
}


/* =========================================================
   EXISTING REGISTRATION
========================================================= */

function showExistingRegistration(data) {
    if (
        !data ||
        !(
            data.registrationId ||
            data.registration_id
        )
    ) {
        window.location.replace(
            "./auth.html"
        );

        return;
    }


    renderPassScreen(
        data,
        {
            isNew: false,
            statusText:
                data.status ||
                "Pending"
        }
    );


    const regIdEl =
        document.getElementById(
            "passRegId"
        );


    if (regIdEl) {
        regIdEl.textContent =
            data.registrationId ||
            data.registration_id;

        regIdEl.classList.add(
            "highlight-pulse"
        );
    }


    const printBtn =
        document.getElementById(
            "printSlipBtn"
        );


    if (printBtn) {
        printBtn.style.display =
            "inline-flex";
    }
}


/* =========================================================
   LOAD EXISTING REGISTRATION FROM SUPABASE
========================================================= */

async function loadExistingRegistration() {
    const registrationApi =
        window.CODEX_SUPABASE_REGISTRATION;

    if (
        !registrationApi ||
        !registrationApi.client
    ) {
        console.error(
            "Supabase registration client is not available."
        );

        return;
    }


    const successScreen =
        document.getElementById(
            "successScreen"
        );


    if (successScreen) {
        successScreen.classList.remove(
            "hidden"
        );

        const h2 =
            successScreen.querySelector(
                "h2"
            );

        if (h2) {
            h2.textContent =
                "Loading your registration...";
        }
    }


    try {
        const client =
            registrationApi.client;


        const {
            data: sessionData,
            error: sessionError
        } = await client.auth.getSession();


        if (sessionError) {
            throw new Error(
                sessionError.message
            );
        }


        const user =
            sessionData?.session?.user;


        if (!user) {
            window.location.replace(
                "./auth.html"
            );

            return;
        }


        const {
            data,
            error
        } = await client
            .from("registrations")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();


        if (error) {
            throw new Error(
                `Unable to load registration: ${error.message}`
            );
        }


        if (!data) {
            window.location.replace(
                "./auth.html"
            );

            return;
        }


        const registrationData = {
            registrationId:
                data.registration_id,

            registration_id:
                data.registration_id,

            teamName:
                data.team_name,

            team_name:
                data.team_name,

            teamSize:
                data.team_size,

            team_size:
                data.team_size,

            collegeName:
                data.college_name,

            college_name:
                data.college_name,

            leader_email:
                data.leader_email,

            user_id:
                data.user_id,

            m1_name:
                data.member1_name,

            m1_roll:
                data.member1_roll,

            m1_email:
                data.member1_email,

            m1_phone:
                data.member1_phone,

            m1_year:
                data.member1_year,

            m1_branch:
                data.member1_branch,

            m1_section:
                data.member1_section,

            m2_name:
                data.member2_name,

            m2_roll:
                data.member2_roll,

            m2_email:
                data.member2_email,

            m2_phone:
                data.member2_phone,

            m2_year:
                data.member2_year,

            m2_branch:
                data.member2_branch,

            m2_section:
                data.member2_section,

            m3_name:
                data.member3_name,

            m3_roll:
                data.member3_roll,

            m3_email:
                data.member3_email,

            m3_phone:
                data.member3_phone,

            m3_year:
                data.member3_year,

            m3_branch:
                data.member3_branch,

            m3_section:
                data.member3_section,

            utr:
                data.transaction_id,

            transaction_id:
                data.transaction_id,

            receipt_url:
                data.receipt_url,

            payment_amount:
                data.payment_amount,

            status:
                data.status,

            created_at:
                data.created_at
        };


        sessionStorage.setItem(
            "codex-existing-reg",
            JSON.stringify(
                registrationData
            )
        );


        sessionStorage.setItem(
            "codex-auth-email",
            data.leader_email ||
            user.email ||
            ""
        );


        showExistingRegistration(
            registrationData
        );

    } catch (error) {
        console.error(
            "Unable to load existing registration:",
            error
        );

        showStatus(
            error.message ||
            "Unable to load your registration.",
            true
        );
    }
}


/* =========================================================
   CONFIRMATION PASS ACTIONS
========================================================= */

function setupConfirmationPassActions() {
    const printBtn =
        document.getElementById(
            "printSlipBtn"
        );

    const copyRegIdBtn =
        document.getElementById(
            "copyRegIdBtn"
        );


    if (printBtn) {
        printBtn.addEventListener(
            "click",
            () => {
                window.print();
            }
        );
    }


    if (copyRegIdBtn) {
        copyRegIdBtn.addEventListener(
            "click",
            async () => {
                const regId =
                    document.getElementById(
                        "passRegId"
                    )?.textContent || "";


                if (
                    regId &&
                    regId !==
                        "GENERATING ID..." &&
                    regId !==
                        "CONFIRMED (See Email)"
                ) {
                    try {
                        await navigator.clipboard.writeText(
                            regId
                        );

                        const original =
                            copyRegIdBtn.textContent;

                        copyRegIdBtn.textContent =
                            "✓ Copied ID!";

                        setTimeout(() => {
                            copyRegIdBtn.textContent =
                                original;
                        }, 2000);

                    } catch (error) {
                        prompt(
                            "Copy Registration ID:",
                            regId
                        );
                    }

                } else {
                    alert(
                        "Registration ID is not available yet."
                    );
                }
            }
        );
    }
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

    status.textContent =
        message;

    status.style.color =
        isError
            ? "var(--danger, #fb7185)"
            : "var(--muted, #94a3b8)";
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

    status.textContent = "";
}


/* =========================================================
   HTML ESCAPING
========================================================= */

function escapeHtml(str) {
    if (!str) {
        return "";
    }

    return String(str)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );
}