"use strict";

const l2kAuthModal = document.getElementById("auth-modal");
const l2kAuthOpenButton = document.getElementById("auth-open-button");
const l2kAuthCloseButtons = [...document.querySelectorAll("[data-auth-close]")];
const l2kLoginTab = document.getElementById("login-tab");
const l2kRegisterTab = document.getElementById("register-tab");
const l2kAuthTabs = document.querySelector(".auth-tabs");
const l2kLoginForm = document.getElementById("login-form");
const l2kRegisterForm = document.getElementById("register-form");
const l2kFindIdForm = document.getElementById("find-id-form");
const l2kPasswordResetForm = document.getElementById("password-reset-form");
const l2kUserMenu = document.getElementById("user-menu");
const l2kUserMenuButton = document.getElementById("user-menu-button");
const l2kUserMenuPanel = document.getElementById("user-menu-panel");
const l2kLogoutButton = document.getElementById("logout-button");
const l2kAuthToast = document.getElementById("auth-toast");
let l2kAuthLastFocused = null;
let l2kAuthCloseTimer = null;
let l2kToastTimer = null;

const l2kAuthForms = {
    login: l2kLoginForm,
    register: l2kRegisterForm,
    "find-id": l2kFindIdForm,
    "reset-password": l2kPasswordResetForm
};

const l2kAuthStatuses = {
    login: document.getElementById("login-status"),
    register: document.getElementById("register-status"),
    "find-id": document.getElementById("find-id-status"),
    "reset-password": document.getElementById("password-reset-status")
};

function showL2kAuthToast(message) {
    if (!l2kAuthToast) return;
    window.clearTimeout(l2kToastTimer);
    l2kAuthToast.textContent = message;
    l2kAuthToast.hidden = false;
    l2kToastTimer = window.setTimeout(() => { l2kAuthToast.hidden = true; }, 3400);
}

function switchL2kAuthView(view) {
    const showLogin = view === "login";
    const showRegister = view === "register";
    l2kLoginTab?.classList.toggle("active", showLogin);
    l2kRegisterTab?.classList.toggle("active", showRegister);
    l2kLoginTab?.setAttribute("aria-selected", String(showLogin));
    l2kRegisterTab?.setAttribute("aria-selected", String(showRegister));
    if (l2kAuthTabs) l2kAuthTabs.hidden = !showLogin && !showRegister;

    Object.entries(l2kAuthForms).forEach(([name, form]) => {
        if (form) form.hidden = name !== view;
    });
    Object.values(l2kAuthStatuses).forEach((status) => {
        if (!status) return;
        status.textContent = "";
        status.classList.remove("success");
    });

    const copy = {
        login: ["다시 만나 반가워요.", "로그인하고 L2K EDU의 서비스를 이용해 보세요."],
        register: ["글로벌 여정을 시작해요.", "간단한 정보로 L2K EDU 회원이 될 수 있어요."],
        "find-id": ["가입 아이디를 확인해요.", "가입할 때 입력한 이름과 연락처를 알려 주세요."],
        "reset-password": ["비밀번호를 다시 설정해요.", "가입 이메일로 안전한 재설정 링크를 보내드릴게요."]
    }[view];
    if (copy) {
        document.getElementById("auth-title").textContent = copy[0];
        document.getElementById("auth-description").textContent = copy[1];
    }
    l2kAuthForms[view]?.querySelector("input")?.focus();
}

function openL2kAuthModal(view = "login") {
    if (!l2kAuthModal) return;
    window.clearTimeout(l2kAuthCloseTimer);
    l2kAuthLastFocused = document.activeElement;
    l2kAuthModal.hidden = false;
    document.body.classList.add("modal-open");
    switchL2kAuthView(view);
    requestAnimationFrame(() => l2kAuthModal.classList.add("open"));
}

function closeL2kAuthModal() {
    if (!l2kAuthModal) return;
    l2kAuthModal.classList.remove("open");
    document.body.classList.remove("modal-open");
    l2kAuthCloseTimer = window.setTimeout(() => {
        l2kAuthModal.hidden = true;
        l2kAuthLastFocused?.focus();
    }, 250);
}

function renderL2kAuthState(user) {
    if (!l2kAuthOpenButton || !l2kUserMenu) return;
    l2kAuthOpenButton.hidden = Boolean(user);
    l2kUserMenu.hidden = !user;
    if (l2kUserMenuPanel) l2kUserMenuPanel.hidden = true;
    l2kUserMenuButton?.setAttribute("aria-expanded", "false");
    if (!user) return;
    document.getElementById("user-name").textContent = `${user.name}님`;
    document.getElementById("user-email").textContent = user.email;
    document.getElementById("user-initial").textContent = user.name.slice(0, 1).toUpperCase();
}

l2kAuthOpenButton?.addEventListener("click", () => {
    closeMenu();
    openL2kAuthModal("login");
});
l2kAuthCloseButtons.forEach((button) => button.addEventListener("click", closeL2kAuthModal));
l2kLoginTab?.addEventListener("click", () => switchL2kAuthView("login"));
l2kRegisterTab?.addEventListener("click", () => switchL2kAuthView("register"));
document.querySelectorAll("[data-auth-view]").forEach((button) => {
    button.addEventListener("click", () => switchL2kAuthView(button.dataset.authView));
});

l2kUserMenuButton?.addEventListener("click", () => {
    const willOpen = l2kUserMenuPanel.hidden;
    l2kUserMenuPanel.hidden = !willOpen;
    l2kUserMenuButton.setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("click", (event) => {
    if (l2kUserMenu && !l2kUserMenu.contains(event.target)) {
        l2kUserMenuPanel.hidden = true;
        l2kUserMenuButton?.setAttribute("aria-expanded", "false");
    }
});

l2kAuthModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") return closeL2kAuthModal();
    if (event.key !== "Tab") return;
    const focusable = [...l2kAuthModal.querySelectorAll("button, input")].filter((element) => !element.hidden && element.offsetParent !== null);
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
    }
});

l2kLoginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!l2kLoginForm.reportValidity()) return;
    const submitButton = l2kLoginForm.querySelector("button[type='submit']");
    const values = new FormData(l2kLoginForm);
    l2kAuthStatuses.login.textContent = "";
    submitButton.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("로그인 서비스를 불러오지 못했습니다.");
        const user = await window.myEducationSupabase.signIn(values.get("email"), values.get("password"));
        renderL2kAuthState(user);
        l2kLoginForm.reset();
        closeL2kAuthModal();
        showL2kAuthToast(`${user.name}님, 환영합니다.`);
    } catch (error) {
        l2kAuthStatuses.login.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

l2kRegisterForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!l2kRegisterForm.reportValidity()) return;
    const submitButton = l2kRegisterForm.querySelector("button[type='submit']");
    const values = new FormData(l2kRegisterForm);
    l2kAuthStatuses.register.textContent = "";
    if (values.get("password") !== values.get("passwordConfirm")) {
        l2kAuthStatuses.register.textContent = "비밀번호가 서로 일치하지 않습니다.";
        return;
    }
    submitButton.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("회원가입 서비스를 불러오지 못했습니다.");
        const result = await window.myEducationSupabase.signUp(values.get("name"), values.get("email"), values.get("password"), values.get("phone"));
        l2kRegisterForm.reset();
        closeL2kAuthModal();
        if (result.needsEmailConfirmation) {
            renderL2kAuthState(null);
            showL2kAuthToast("가입을 환영합니다! 입력한 주소로 인증 메일을 보냈습니다.");
        } else {
            renderL2kAuthState(result.user);
            showL2kAuthToast(`${result.user.name}님, 가입이 완료되었습니다.`);
        }
    } catch (error) {
        l2kAuthStatuses.register.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

l2kFindIdForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!l2kFindIdForm.reportValidity()) return;
    const submitButton = l2kFindIdForm.querySelector("button[type='submit']");
    const values = new FormData(l2kFindIdForm);
    const status = l2kAuthStatuses["find-id"];
    status.classList.remove("success");
    status.textContent = "가입 정보를 확인하고 있습니다...";
    submitButton.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("계정 찾기 서비스를 불러오지 못했습니다.");
        const maskedEmail = await window.myEducationSupabase.findMemberId(values.get("name"), values.get("phone"));
        status.classList.toggle("success", Boolean(maskedEmail));
        status.textContent = maskedEmail ? `회원님의 아이디는 ${maskedEmail} 입니다.` : "일치하는 가입 정보를 찾지 못했습니다.";
    } catch (error) {
        status.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

l2kPasswordResetForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!l2kPasswordResetForm.reportValidity()) return;
    const submitButton = l2kPasswordResetForm.querySelector("button[type='submit']");
    const values = new FormData(l2kPasswordResetForm);
    const status = l2kAuthStatuses["reset-password"];
    status.classList.remove("success");
    status.textContent = "재설정 메일을 보내고 있습니다...";
    submitButton.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("비밀번호 찾기 서비스를 불러오지 못했습니다.");
        await window.myEducationSupabase.requestPasswordReset(values.get("email"));
        l2kPasswordResetForm.reset();
        status.classList.add("success");
        status.textContent = "가입된 이메일이라면 재설정 링크가 전송됩니다.";
    } catch (error) {
        status.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

l2kLogoutButton?.addEventListener("click", async () => {
    try {
        if (!window.myEducationSupabase) throw new Error("로그아웃 서비스를 불러오지 못했습니다.");
        await window.myEducationSupabase.signOut();
        renderL2kAuthState(null);
        showL2kAuthToast("안전하게 로그아웃되었습니다.");
    } catch (error) {
        showL2kAuthToast(error.message);
    }
});

if (window.myEducationSupabase) {
    window.myEducationSupabase.getCurrentUser()
    .then((user) => {
        renderL2kAuthState(user);
        const url = new URL(window.location.href);
        if (!user && url.searchParams.get("auth") === "login") {
            openL2kAuthModal("login");
            url.searchParams.delete("auth");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
    })
    .catch((error) => {
        renderL2kAuthState(null);
        showL2kAuthToast(error.message);
    });
    window.myEducationSupabase.onAuthStateChange(renderL2kAuthState);
} else {
    renderL2kAuthState(null);
}
