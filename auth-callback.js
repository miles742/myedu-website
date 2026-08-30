"use strict";

const resultIcon = document.getElementById("auth-result-icon");
const resultTitle = document.getElementById("auth-result-title");
const resultMessage = document.getElementById("auth-result-message");
const resultLink = document.getElementById("auth-result-link");
const passwordUpdateForm = document.getElementById("password-update-form");
const passwordUpdateStatus = document.getElementById("password-update-status");
const authReturnTarget = new URLSearchParams(window.location.search).get("return") === "l2k"
    ? "l2k-edu/index.html"
    : "index.html";

function readAuthError() {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    return query.get("error_description") || hash.get("error_description") || query.get("error") || hash.get("error");
}

function showResult(type, title, message, href, linkText) {
    resultIcon.className = `auth-result-icon is-${type}`;
    resultIcon.replaceChildren();
    resultTitle.textContent = title;
    resultMessage.textContent = message;
    passwordUpdateForm.hidden = true;
    resultLink.href = href;
    resultLink.textContent = linkText;
    resultLink.hidden = false;
}

passwordUpdateForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!passwordUpdateForm.reportValidity()) return;
    const values = new FormData(passwordUpdateForm);
    const password = String(values.get("password") || "");
    const submitButton = passwordUpdateForm.querySelector("button[type='submit']");
    passwordUpdateStatus.textContent = "";
    if (password !== values.get("passwordConfirm")) {
        passwordUpdateStatus.textContent = "비밀번호가 서로 일치하지 않습니다.";
        return;
    }

    submitButton.disabled = true;
    try {
        await window.myEducationSupabase.updatePassword(password);
        await window.myEducationSupabase.signOut();
        passwordUpdateForm.reset();
        showResult("success", "비밀번호가 변경되었습니다.", "새 비밀번호로 다시 로그인해 주세요.", `${authReturnTarget}?auth=login`, "로그인 화면으로");
    } catch (error) {
        passwordUpdateStatus.textContent = error.message;
        submitButton.disabled = false;
    }
});

async function completeAuthentication() {
    const suppliedError = readAuthError();
    if (suppliedError) {
        showResult("error", "인증 링크를 확인해 주세요.", suppliedError, `${authReturnTarget}?auth=login`, "로그인 화면으로");
        return;
    }

    if (!window.myEducationSupabase) {
        showResult("error", "인증 서비스를 불러오지 못했습니다.", "인터넷 연결을 확인한 뒤 링크를 다시 열어 주세요.", authReturnTarget, "홈으로 이동");
        return;
    }

    try {
        const client = window.myEducationSupabase.client;
        let { data: sessionData } = await client.auth.getSession();
        const code = new URLSearchParams(window.location.search).get("code");

        if (!sessionData.session && code) {
            const exchange = await client.auth.exchangeCodeForSession(code);
            if (exchange.error) throw exchange.error;
            sessionData = exchange.data;
        }

        const user = sessionData.session?.user || (await client.auth.getUser()).data.user;
        const flow = new URLSearchParams(window.location.search).get("flow");
        const hashType = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("type");
        const isEmailChange = flow === "email-change";

        if (!user) {
            showResult("error", "인증 정보를 확인하지 못했습니다.", "링크가 만료되었거나 이미 사용되었습니다. 로그인하거나 인증 메일을 다시 요청해 주세요.", `${authReturnTarget}?auth=login`, "로그인 화면으로");
            return;
        }

        if (flow === "password-reset" || hashType === "recovery") {
            resultIcon.className = "auth-result-icon is-success";
            resultIcon.replaceChildren();
            resultTitle.textContent = "새 비밀번호를 설정해 주세요.";
            resultMessage.textContent = "안전한 비밀번호를 입력하면 바로 변경됩니다.";
            resultLink.hidden = true;
            passwordUpdateForm.hidden = false;
            passwordUpdateForm.elements.password.focus();
            return;
        }

        if (isEmailChange && user.new_email) {
            showResult("success", "첫 번째 이메일 확인이 완료되었습니다.", "보안을 위해 기존 주소와 새 주소로 받은 확인 메일을 모두 확인해 주세요.", "mypage.html", "마이페이지로 이동");
            return;
        }

        showResult(
            "success",
            isEmailChange ? "이메일 변경이 완료되었습니다." : "회원가입이 완료되었습니다.",
            isEmailChange ? "변경된 이메일 주소를 마이페이지에서 확인할 수 있습니다." : "마이에듀케이션에 오신 것을 환영합니다.",
            isEmailChange ? "mypage.html" : authReturnTarget,
            isEmailChange ? "마이페이지로 이동" : "홈으로 이동"
        );
    } catch (error) {
        showResult("error", "인증을 완료하지 못했습니다.", error?.message || "링크가 만료되었거나 이미 사용되었습니다. 다시 요청해 주세요.", `${authReturnTarget}?auth=login`, "로그인 화면으로");
    }
}

completeAuthentication();
