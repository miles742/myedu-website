"use strict";

const profileContent = document.getElementById("mypage-content");
const profileLoading = document.getElementById("mypage-loading");
const profileForm = document.getElementById("profile-form");
const profileFormStatus = document.getElementById("profile-form-status");
const profilePhotoInput = document.getElementById("profile-photo-input");
const profilePhotoImage = document.getElementById("profile-photo-image");
const profilePhotoFallback = document.getElementById("profile-photo-fallback");
const profilePhotoRemove = document.getElementById("profile-photo-remove");
const profilePhotoStatus = document.getElementById("profile-photo-status");
const logoutButton = document.getElementById("mypage-logout");
const deleteAccountOpen = document.getElementById("account-delete-open");
const deleteAccountModal = document.getElementById("delete-account-modal");
const deleteAccountForm = document.getElementById("delete-account-form");
const deleteAccountStatus = document.getElementById("delete-account-status");
const toast = document.getElementById("mypage-toast");
let currentUser = null;
let toastTimer = null;
let deleteModalTimer = null;

function showToast(message) {
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = window.setTimeout(() => { toast.hidden = true; }, 3200);
}

function redirectToLogin() {
    window.location.replace("index.html?auth=login");
}

function formatJoinDate(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

function renderProfile(user, { preserveEmail = false } = {}) {
    currentUser = user;
    const fallback = user.name.slice(0, 1).toUpperCase();
    document.getElementById("profile-photo-name").textContent = user.name;
    document.getElementById("profile-photo-email").textContent = user.email;
    document.getElementById("profile-created-at").textContent = formatJoinDate(user.createdAt);
    profilePhotoFallback.textContent = fallback;
    profileForm.elements.name.value = user.name;
    if (!preserveEmail) profileForm.elements.email.value = user.email;
    profileForm.elements.phone.value = user.phone || "";

    if (user.avatarUrl) {
        profilePhotoImage.src = user.avatarUrl;
        profilePhotoImage.hidden = false;
        profilePhotoFallback.hidden = true;
        profilePhotoRemove.hidden = false;
    } else {
        profilePhotoImage.removeAttribute("src");
        profilePhotoImage.hidden = true;
        profilePhotoFallback.hidden = false;
        profilePhotoRemove.hidden = true;
    }
}

async function initializeMyPage() {
    try {
        if (!window.myEducationSupabase) throw new Error("회원정보 서비스를 불러오지 못했습니다.");
        const user = await window.myEducationSupabase.getCurrentUser();
        if (!user) return redirectToLogin();
        renderProfile(user);
        profileLoading.hidden = true;
        profileContent.hidden = false;
    } catch (error) {
        profileLoading.querySelector("p").textContent = error.message;
    }
}

profilePhotoInput?.addEventListener("change", async () => {
    const file = profilePhotoInput.files?.[0];
    if (!file) return;
    profilePhotoStatus.classList.remove("error");
    profilePhotoStatus.textContent = "프로필 사진을 업로드하고 있습니다...";
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        profilePhotoStatus.classList.add("error");
        profilePhotoStatus.textContent = "JPG, PNG 또는 WEBP 이미지를 선택해 주세요.";
        profilePhotoInput.value = "";
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        profilePhotoStatus.classList.add("error");
        profilePhotoStatus.textContent = "5MB 이하의 이미지를 선택해 주세요.";
        profilePhotoInput.value = "";
        return;
    }
    profilePhotoInput.disabled = true;
    try {
        const user = await window.myEducationSupabase.uploadAvatar(file);
        renderProfile(user);
        profilePhotoStatus.textContent = "프로필 사진이 변경되었습니다.";
        showToast("프로필 사진을 저장했습니다.");
    } catch (error) {
        profilePhotoStatus.classList.add("error");
        profilePhotoStatus.textContent = error.message;
    } finally {
        profilePhotoInput.disabled = false;
        profilePhotoInput.value = "";
    }
});

profilePhotoRemove?.addEventListener("click", async () => {
    profilePhotoStatus.classList.remove("error");
    profilePhotoStatus.textContent = "프로필 사진을 삭제하고 있습니다...";
    profilePhotoRemove.disabled = true;
    try {
        const user = await window.myEducationSupabase.removeAvatar();
        renderProfile(user);
        profilePhotoStatus.textContent = "기본 프로필로 변경되었습니다.";
        showToast("프로필 사진을 삭제했습니다.");
    } catch (error) {
        profilePhotoStatus.classList.add("error");
        profilePhotoStatus.textContent = error.message;
    } finally {
        profilePhotoRemove.disabled = false;
    }
});

profileForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!profileForm.reportValidity()) return;
    const submitButton = profileForm.querySelector("button[type='submit']");
    const values = new FormData(profileForm);
    const requestedEmail = String(values.get("email") || "").trim().toLowerCase();
    profileFormStatus.classList.remove("error");
    profileFormStatus.textContent = "회원정보를 저장하고 있습니다...";
    submitButton.disabled = true;
    try {
        const result = await window.myEducationSupabase.updateProfile({
            name: values.get("name"),
            email: requestedEmail,
            phone: values.get("phone")
        });
        renderProfile(result.user, { preserveEmail: result.needsEmailConfirmation });
        if (result.needsEmailConfirmation) {
            profileForm.elements.email.value = requestedEmail;
            profileFormStatus.textContent = "정보를 저장했습니다. 새 이메일로 보낸 확인 링크를 눌러 변경을 완료해 주세요.";
        } else {
            profileFormStatus.textContent = "회원정보가 저장되었습니다.";
        }
        showToast("변경사항을 저장했습니다.");
    } catch (error) {
        profileFormStatus.classList.add("error");
        profileFormStatus.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
        await window.myEducationSupabase.signOut();
        window.location.replace("index.html");
    } catch (error) {
        showToast(error.message);
        logoutButton.disabled = false;
    }
});

function openDeleteAccountModal() {
    window.clearTimeout(deleteModalTimer);
    deleteAccountStatus.textContent = "";
    deleteAccountForm.reset();
    deleteAccountModal.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
        deleteAccountModal.classList.add("open");
        deleteAccountForm.elements.password.focus();
    });
}

function closeDeleteAccountModal() {
    if (deleteAccountForm.querySelector("button[type='submit']").disabled) return;
    deleteAccountModal.classList.remove("open");
    document.body.style.removeProperty("overflow");
    deleteModalTimer = window.setTimeout(() => {
        deleteAccountModal.hidden = true;
        deleteAccountOpen.focus();
    }, 200);
}

deleteAccountOpen?.addEventListener("click", openDeleteAccountModal);
document.querySelectorAll("[data-delete-close]").forEach((button) => button.addEventListener("click", closeDeleteAccountModal));
deleteAccountModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDeleteAccountModal();
});

deleteAccountForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!deleteAccountForm.reportValidity()) return;
    const values = new FormData(deleteAccountForm);
    const submitButton = deleteAccountForm.querySelector("button[type='submit']");
    deleteAccountStatus.textContent = "";
    if (String(values.get("confirmation") || "").trim() !== "회원탈퇴") {
        deleteAccountStatus.textContent = "확인 문구 ‘회원탈퇴’를 정확히 입력해 주세요.";
        return;
    }

    submitButton.disabled = true;
    deleteAccountStatus.textContent = "계정과 회원정보를 삭제하고 있습니다...";
    try {
        await window.myEducationSupabase.deleteAccount(values.get("password"));
        window.location.replace("index.html?account=deleted");
    } catch (error) {
        deleteAccountStatus.textContent = error.message;
        submitButton.disabled = false;
    }
});

profilePhotoImage?.addEventListener("error", () => {
    profilePhotoImage.hidden = true;
    profilePhotoFallback.hidden = false;
});

initializeMyPage();
