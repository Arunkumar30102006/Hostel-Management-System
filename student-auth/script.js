// Check if student is already logged in
try {
    const activeSession = JSON.parse(localStorage.getItem("loggedInStudent"));
    if (activeSession && activeSession.studentId) {
        window.location.href = "dashboard.html";
    }
} catch (e) {
    localStorage.removeItem("loggedInStudent");
}

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const formTitle = document.getElementById("formTitle");
const formSubtitle = document.getElementById("formSubtitle");

const switchToRegister = document.getElementById("switchToRegister");
const switchToLogin = document.getElementById("switchToLogin");
const forgotPasswordLink = document.getElementById("forgotPasswordLink");

const message = document.getElementById("message");


/* TAB TOGGLING */

function showLogin() {
    loginForm.classList.remove("hidden");
    registerForm.classList.add("hidden");

    loginTab.classList.add("active");
    registerTab.classList.remove("active");

    formTitle.textContent = "Welcome back";
    formSubtitle.textContent = "Sign in to access your student portal";

    clearErrors();
    clearMessage();
}

function showRegister() {
    loginForm.classList.add("hidden");
    registerForm.classList.remove("hidden");

    loginTab.classList.remove("active");
    registerTab.classList.add("active");

    formTitle.textContent = "Create your account";
    formSubtitle.textContent = "Register to access the student portal";

    clearErrors();
    clearMessage();
}

loginTab.addEventListener("click", showLogin);
registerTab.addEventListener("click", showRegister);

switchToRegister.addEventListener("click", showRegister);
switchToLogin.addEventListener("click", showLogin);

if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener("click", (e) => {
        e.preventDefault();
        showMessage(
            "For password assistance, please contact the hostel office at warden@kct.ac.in or visit the warden desk.",
            "success"
        );
    });
}


/* PASSWORD VISIBILITY */

document.querySelectorAll(".show-password").forEach(button => {
    button.addEventListener("click", () => {
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);

        if (input.type === "password") {
            input.type = "text";
            button.textContent = "Hide";
            button.setAttribute("aria-label", "Hide password");
        } else {
            input.type = "password";
            button.textContent = "Show";
            button.setAttribute("aria-label", "Show password");
        }
    });
});


/* HELPER: GET ALL REGISTERED ACCOUNTS */

function getRegisteredAccounts() {
    let accounts = [];

    try {
        const storedList = localStorage.getItem("studentAccounts");
        if (storedList) {
            accounts = JSON.parse(storedList);
            if (!Array.isArray(accounts)) accounts = [];
        }

        // Migrate legacy single studentAccount if present
        const legacyStudent = localStorage.getItem("studentAccount");
        if (legacyStudent) {
            const parsedLegacy = JSON.parse(legacyStudent);
            if (parsedLegacy && parsedLegacy.studentId) {
                const alreadyIncluded = accounts.some(
                    acc => acc.studentId.toUpperCase() === parsedLegacy.studentId.toUpperCase()
                );
                if (!alreadyIncluded) {
                    accounts.push(parsedLegacy);
                    localStorage.setItem("studentAccounts", JSON.stringify(accounts));
                }
            }
        }
    } catch (err) {
        console.error("Error reading accounts from storage:", err);
        accounts = [];
    }

    return accounts;
}


/* REGISTER */

registerForm.addEventListener("submit", function(event) {
    event.preventDefault();

    clearErrors();
    clearMessage();

    const studentId = document.getElementById("studentId").value.trim();
    const studentName = document.getElementById("studentName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;
    const terms = document.getElementById("terms").checked;

    let valid = true;

    if (studentId === "") {
        showError("studentId", "Student ID is required.");
        valid = false;
    } else if (studentId.length < 3) {
        showError("studentId", "Student ID must be at least 3 characters.");
        valid = false;
    }

    if (studentName === "") {
        showError("studentName", "Full name is required.");
        valid = false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@kct\.ac\.in$/i;
    if (email === "") {
        showError("email", "College email is required.");
        valid = false;
    } else if (!emailRegex.test(email)) {
        showError("email", "Use your college email address (ending with @kct.ac.in).");
        valid = false;
    }

    if (password.length < 6) {
        showError("registerPassword", "Password must contain at least 6 characters.");
        valid = false;
    }

    if (confirmPassword === "") {
        showError("confirmPassword", "Please confirm your password.");
        valid = false;
    } else if (password !== confirmPassword) {
        showError("confirmPassword", "Passwords do not match.");
        valid = false;
    }

    if (!terms) {
        document.getElementById("termsError").textContent = "Please accept the terms and conditions.";
        valid = false;
    }

    if (!valid) {
        return;
    }

    const accounts = getRegisteredAccounts();

    // Check duplicate Student ID (case-insensitive)
    const existingId = accounts.find(
        acc => acc.studentId.toUpperCase() === studentId.toUpperCase()
    );
    if (existingId) {
        showMessage("An account with this Student ID already exists.", "error-message");
        return;
    }

    // Check duplicate Email (case-insensitive)
    const existingEmail = accounts.find(
        acc => acc.email.toLowerCase() === email.toLowerCase()
    );
    if (existingEmail) {
        showMessage("An account with this college email already exists.", "error-message");
        return;
    }

    const newStudent = {
        studentId: studentId.toUpperCase(),
        name: studentName,
        email: email.toLowerCase(),
        password: password
    };

    accounts.push(newStudent);
    localStorage.setItem("studentAccounts", JSON.stringify(accounts));
    // Also save legacy single account for backwards compatibility
    localStorage.setItem("studentAccount", JSON.stringify(newStudent));

    showMessage("Registration successful! You can now sign in.", "success");

    // Auto-fill login field with the registered Student ID
    document.getElementById("loginStudentId").value = newStudent.studentId;

    registerForm.reset();

    setTimeout(() => {
        showLogin();
        // Keep login field filled with the student ID
        document.getElementById("loginStudentId").value = newStudent.studentId;
        showMessage("Registration successful! Please enter your password to sign in.", "success");
    }, 1200);
});


/* LOGIN */

loginForm.addEventListener("submit", function(event) {
    event.preventDefault();

    clearErrors();
    clearMessage();

    const loginIdentifier = document.getElementById("loginStudentId").value.trim();
    const password = document.getElementById("loginPassword").value;

    let valid = true;

    if (loginIdentifier === "") {
        showError("loginStudentId", "Please enter your Student ID or college email.");
        valid = false;
    }

    if (password === "") {
        showError("loginPassword", "Password is required.");
        valid = false;
    }

    if (!valid) {
        return;
    }

    const accounts = getRegisteredAccounts();

    if (accounts.length === 0) {
        showMessage("No registered account found. Please register first.", "error-message");
        return;
    }

    // Match by Student ID (case-insensitive) OR College Email (case-insensitive)
    const matchingAccount = accounts.find(acc =>
        acc.studentId.toUpperCase() === loginIdentifier.toUpperCase() ||
        acc.email.toLowerCase() === loginIdentifier.toLowerCase()
    );

    if (!matchingAccount) {
        showMessage("No account found with this Student ID or email.", "error-message");
        return;
    }

    if (matchingAccount.password !== password) {
        showMessage("Incorrect password. Please try again.", "error-message");
        return;
    }

    // Login successful: Store session user (excluding plain-text password)
    const sessionUser = {
        studentId: matchingAccount.studentId,
        name: matchingAccount.name,
        email: matchingAccount.email
    };

    localStorage.setItem("loggedInStudent", JSON.stringify(sessionUser));
    window.location.href = "dashboard.html";
});


/* ERROR HELPERS */

function showError(fieldId, messageText) {
    const field = document.getElementById(fieldId);
    const error = document.getElementById(fieldId + "Error");

    if (field) {
        field.classList.add("input-error");
    }

    if (error) {
        error.textContent = messageText;
    }
}

function clearErrors() {
    document.querySelectorAll(".error").forEach(error => {
        error.textContent = "";
    });

    document.querySelectorAll("input").forEach(input => {
        input.classList.remove("input-error");
    });
}

function showMessage(text, type) {
    message.textContent = text;
    message.className = "message " + type;
}

function clearMessage() {
    message.textContent = "";
    message.className = "message";
}