const applicationForm = document.getElementById("instructor-application-form");
const applicationStatus = document.getElementById("application-status");
const introduction = applicationForm?.elements.introduction;
const introductionCount = document.getElementById("introduction-count");

function updateIntroductionCount() {
    if (introductionCount && introduction) introductionCount.textContent = introduction.value.length.toLocaleString("ko-KR");
}

function normalizePhone(value) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length < 4) return digits;
    if (digits.startsWith("02")) return digits.length <= 5 ? `${digits.slice(0, 2)}-${digits.slice(2)}` : `${digits.slice(0, 2)}-${digits.slice(2, digits.length - 4)}-${digits.slice(-4)}`;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

introduction?.addEventListener("input", updateIntroductionCount);
applicationForm?.elements.phone?.addEventListener("input", (event) => {
    event.target.value = normalizePhone(event.target.value);
});
updateIntroductionCount();

applicationForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    applicationStatus.classList.remove("success");

    if (!applicationForm.reportValidity()) {
        applicationStatus.textContent = "필수 항목을 확인해 주세요.";
        return;
    }

    const formData = new FormData(applicationForm);
    const payload = {
        name: formData.get("name"),
        phone: formData.get("phone"),
        email: formData.get("email"),
        field: formData.get("field"),
        careerYears: Number(formData.get("careerYears")),
        region: formData.get("region"),
        schedule: formData.get("schedule"),
        resumeUrl: formData.get("resumeUrl"),
        introduction: formData.get("introduction"),
        consent: formData.get("consent") === "on"
    };

    const submitButton = applicationForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    applicationStatus.textContent = "지원서를 접수하고 있습니다...";

    try {
        if (!window.myEducationSupabase) throw new Error("지원서 접수 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
        await window.myEducationSupabase.insertInstructorApplication({
            user_id: authenticatedUser?.id || null,
            name: String(payload.name || "").trim(),
            phone: String(payload.phone || "").trim(),
            email: String(payload.email || "").trim().toLowerCase(),
            field: String(payload.field || "").trim(),
            career_years: payload.careerYears,
            region: String(payload.region || "").trim(),
            available_schedule: String(payload.schedule || "").trim(),
            resume_url: String(payload.resumeUrl || "").trim() || null,
            introduction: String(payload.introduction || "").trim(),
            consent: payload.consent
        });

        applicationForm.reset();
        updateIntroductionCount();
        applicationStatus.classList.add("success");
        applicationStatus.textContent = "지원서가 접수되었습니다. 검토 후 입력하신 연락처로 안내드리겠습니다.";
    } catch (error) {
        applicationStatus.textContent = error.message || "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.";
    } finally {
        submitButton.disabled = false;
    }
});

const authOpenButton = document.getElementById("application-auth-open");
const authModal = document.getElementById("application-auth-modal");
const authCloseButtons = [...document.querySelectorAll("[data-application-auth-close]")];
const loginTab = document.getElementById("application-login-tab");
const registerTab = document.getElementById("application-register-tab");
const loginForm = document.getElementById("application-login-form");
const registerForm = document.getElementById("application-register-form");
const loginStatus = document.getElementById("application-login-status");
const registerStatus = document.getElementById("application-register-status");
const userMenu = document.getElementById("application-user-menu");
const userButton = document.getElementById("application-user-button");
const userPanel = document.getElementById("application-user-panel");
const logoutButton = document.getElementById("application-logout");
const authToast = document.getElementById("application-auth-toast");
let authCloseTimer;
let toastTimer;
let authenticatedUser = null;

function showAuthToast(message) {
    window.clearTimeout(toastTimer);
    authToast.textContent = message;
    authToast.hidden = false;
    toastTimer = window.setTimeout(() => { authToast.hidden = true; }, 3200);
}

function switchAuthTab(tab) {
    const showLogin = tab === "login";
    loginTab.classList.toggle("active", showLogin);
    registerTab.classList.toggle("active", !showLogin);
    loginTab.setAttribute("aria-selected", String(showLogin));
    registerTab.setAttribute("aria-selected", String(!showLogin));
    loginForm.hidden = !showLogin;
    registerForm.hidden = showLogin;
    loginStatus.textContent = "";
    registerStatus.textContent = "";
    document.getElementById("application-auth-title").textContent = showLogin ? "다시 만나 반가워요." : "함께 시작해 볼까요?";
    document.getElementById("application-auth-description").textContent = showLogin ? "로그인하고 강사 지원 서비스를 이용해 보세요." : "간단한 정보만 입력하면 바로 회원이 될 수 있어요.";
    (showLogin ? loginForm : registerForm).querySelector("input")?.focus();
}

function openAuthModal(tab = "login") {
    window.clearTimeout(authCloseTimer);
    authModal.hidden = false;
    document.body.classList.add("modal-open");
    switchAuthTab(tab);
    requestAnimationFrame(() => authModal.classList.add("open"));
}

function closeAuthModal() {
    authModal.classList.remove("open");
    document.body.classList.remove("modal-open");
    authCloseTimer = window.setTimeout(() => { authModal.hidden = true; authOpenButton.focus(); }, 250);
}

function renderAuthState(user) {
    authenticatedUser = user || null;
    authOpenButton.hidden = Boolean(user);
    userMenu.hidden = !user;
    userPanel.hidden = true;
    userButton.setAttribute("aria-expanded", "false");
    if (!user) return;
    document.getElementById("application-user-name").textContent = `${user.name}님`;
    document.getElementById("application-user-email").textContent = user.email;
    document.getElementById("application-user-avatar").textContent = user.name.slice(0, 1).toUpperCase();
}

authOpenButton.addEventListener("click", () => openAuthModal("login"));
authCloseButtons.forEach((button) => button.addEventListener("click", closeAuthModal));
loginTab.addEventListener("click", () => switchAuthTab("login"));
registerTab.addEventListener("click", () => switchAuthTab("register"));
userButton.addEventListener("click", () => {
    userPanel.hidden = !userPanel.hidden;
    userButton.setAttribute("aria-expanded", String(!userPanel.hidden));
});

document.addEventListener("click", (event) => {
    if (!userMenu.contains(event.target)) {
        userPanel.hidden = true;
        userButton.setAttribute("aria-expanded", "false");
    }
});

authModal.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeAuthModal();
});

loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const button = loginForm.querySelector("button[type='submit']");
    const formData = new FormData(loginForm);
    loginStatus.textContent = "";
    button.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("로그인 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
        const user = await window.myEducationSupabase.signIn(formData.get("email"), formData.get("password"));
        renderAuthState(user);
        loginForm.reset();
        closeAuthModal();
        showAuthToast(`${user.name}님, 환영합니다.`);
    } catch (error) {
        loginStatus.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!registerForm.reportValidity()) return;
    const button = registerForm.querySelector("button[type='submit']");
    const formData = new FormData(registerForm);
    registerStatus.textContent = "";
    if (formData.get("password") !== formData.get("passwordConfirm")) {
        registerStatus.textContent = "비밀번호가 서로 일치하지 않습니다.";
        return;
    }
    button.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("회원가입 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
        const result = await window.myEducationSupabase.signUp(formData.get("name"), formData.get("email"), formData.get("password"));
        registerForm.reset();
        closeAuthModal();
        if (result.needsEmailConfirmation) {
            renderAuthState(null);
            showAuthToast("가입 확인 이메일을 보냈습니다. 이메일 인증 후 로그인해 주세요.");
        } else {
            renderAuthState(result.user);
            showAuthToast(`${result.user.name}님, 가입이 완료되었습니다.`);
        }
    } catch (error) {
        registerStatus.textContent = error.message;
    } finally {
        button.disabled = false;
    }
});

logoutButton.addEventListener("click", async () => {
    try {
        if (!window.myEducationSupabase) throw new Error("로그아웃 서비스를 불러오지 못했습니다.");
        await window.myEducationSupabase.signOut();
        renderAuthState(null);
        showAuthToast("로그아웃되었습니다.");
    } catch (error) {
        showAuthToast(error.message);
    }
});

if (window.myEducationSupabase) {
    window.myEducationSupabase.getCurrentUser().then(renderAuthState).catch((error) => {
        renderAuthState(null);
        showAuthToast(error.message);
    });
    window.myEducationSupabase.onAuthStateChange(renderAuthState);
} else {
    renderAuthState(null);
}
