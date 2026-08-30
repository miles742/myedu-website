(function initializeSupabase() {
    "use strict";

    const supabaseUrl = "https://rmhbnquzuerwaysinqfw.supabase.co";
    const supabasePublishableKey = "sb_publishable_Mq2P8YU-JlVe6N2m5IzvJg_YJa9oBUP";

    if (!window.supabase?.createClient) {
        console.error("Supabase 라이브러리를 불러오지 못했습니다.");
        return;
    }

    const client = window.supabase.createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: true
        }
    });

    function getAuthCallbackUrl(flow) {
        const callbackUrl = new URL("/auth-callback.html", window.location.href);
        callbackUrl.searchParams.set("flow", flow);
        if (window.location.pathname.toLowerCase().includes("/l2k-edu/")) {
            callbackUrl.searchParams.set("return", "l2k");
        }
        return callbackUrl.href;
    }

    function displayUser(user) {
        if (!user) return null;
        const email = user.email || "";
        const name = String(user.user_metadata?.name || email.split("@")[0] || "회원").trim();
        return {
            id: user.id,
            name,
            email,
            phone: String(user.user_metadata?.phone || "").trim(),
            avatarUrl: String(user.user_metadata?.avatar_url || "").trim(),
            createdAt: user.created_at || ""
        };
    }

    function friendlyError(error, fallback = "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.") {
        const messages = {
            invalid_credentials: "이메일 또는 비밀번호가 올바르지 않습니다.",
            email_not_confirmed: "이메일 인증을 먼저 완료해 주세요.",
            user_already_exists: "이미 가입된 이메일입니다.",
            email_exists: "이미 가입된 이메일입니다.",
            signup_disabled: "현재 회원가입이 중지되어 있습니다.",
            weak_password: "더 안전한 비밀번호를 입력해 주세요.",
            over_email_send_rate_limit: "인증 이메일 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요."
        };
        return new Error(messages[error?.code] || (navigator.onLine ? error?.message : "인터넷 연결을 확인해 주세요.") || fallback);
    }

    async function signIn(email, password) {
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw friendlyError(error);
        return displayUser(data.user);
    }

    async function signUp(name, email, password, phone = "") {
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: {
                data: { name, phone: String(phone || "").trim() },
                emailRedirectTo: getAuthCallbackUrl("signup")
            }
        });
        if (error) throw friendlyError(error);
        return {
            user: displayUser(data.user),
            needsEmailConfirmation: !data.session
        };
    }

    async function signOut() {
        const { error } = await client.auth.signOut({ scope: "local" });
        if (error) throw friendlyError(error);
    }

    async function findMemberId(name, phone) {
        const { data, error } = await client.rpc("find_member_email", {
            p_name: String(name || "").trim(),
            p_phone: String(phone || "").replace(/\D/g, "")
        });
        if (error) throw friendlyError(error, "아이디를 확인하지 못했습니다.");
        return data || null;
    }

    async function requestPasswordReset(email) {
        const { error } = await client.auth.resetPasswordForEmail(String(email || "").trim().toLowerCase(), {
            redirectTo: getAuthCallbackUrl("password-reset")
        });
        if (error) throw friendlyError(error, "비밀번호 재설정 메일을 보내지 못했습니다.");
    }

    async function updatePassword(password) {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw friendlyError(error, "비밀번호를 변경하지 못했습니다.");
    }

    async function deleteAccount(password) {
        const { data: currentData, error: currentError } = await client.auth.getUser();
        if (currentError || !currentData.user?.email) throw friendlyError(currentError, "로그인 정보를 확인하지 못했습니다.");

        const verification = await client.auth.signInWithPassword({
            email: currentData.user.email,
            password: String(password || "")
        });
        if (verification.error) throw friendlyError(verification.error, "비밀번호를 확인하지 못했습니다.");

        const { error } = await client.rpc("delete_current_user");
        if (error) throw friendlyError(error, "회원 탈퇴를 완료하지 못했습니다.");
        await client.auth.signOut({ scope: "local" });
    }

    async function getCurrentUser() {
        const { data, error } = await client.auth.getUser();
        if (error) {
            if (error.name === "AuthSessionMissingError") return null;
            throw friendlyError(error);
        }
        return displayUser(data.user);
    }

    async function updateProfile({ name, email, phone }) {
        const normalizedName = String(name || "").trim();
        const normalizedEmail = String(email || "").trim().toLowerCase();
        const normalizedPhone = String(phone || "").trim();
        const { data: currentData, error: currentError } = await client.auth.getUser();
        if (currentError) throw friendlyError(currentError);
        const currentUser = currentData.user;
        const updates = {
            data: { ...currentUser.user_metadata, name: normalizedName, phone: normalizedPhone }
        };
        if (normalizedEmail && normalizedEmail !== currentUser.email) updates.email = normalizedEmail;
        const { data, error } = await client.auth.updateUser(updates, {
            emailRedirectTo: getAuthCallbackUrl("email-change")
        });
        if (error) throw friendlyError(error, "회원정보를 수정하지 못했습니다.");
        return {
            user: displayUser(data.user),
            needsEmailConfirmation: Boolean(updates.email)
        };
    }

    async function uploadAvatar(file) {
        const { data: currentData, error: currentError } = await client.auth.getUser();
        if (currentError) throw friendlyError(currentError);
        const path = `${currentData.user.id}/avatar`;
        const { error: uploadError } = await client.storage.from("avatars").upload(path, file, {
            upsert: true,
            contentType: file.type,
            cacheControl: "3600"
        });
        if (uploadError) throw friendlyError(uploadError, "프로필 사진을 업로드하지 못했습니다.");
        const { data: publicData } = client.storage.from("avatars").getPublicUrl(path);
        const avatarUrl = `${publicData.publicUrl}?v=${Date.now()}`;
        const { data, error } = await client.auth.updateUser({
            data: { ...currentData.user.user_metadata, avatar_url: avatarUrl }
        });
        if (error) throw friendlyError(error, "프로필 사진 정보를 저장하지 못했습니다.");
        return displayUser(data.user);
    }

    async function removeAvatar() {
        const { data: currentData, error: currentError } = await client.auth.getUser();
        if (currentError) throw friendlyError(currentError);
        const path = `${currentData.user.id}/avatar`;
        const { error: removeError } = await client.storage.from("avatars").remove([path]);
        if (removeError) throw friendlyError(removeError, "프로필 사진을 삭제하지 못했습니다.");
        const { data, error } = await client.auth.updateUser({
            data: { ...currentData.user.user_metadata, avatar_url: null }
        });
        if (error) throw friendlyError(error, "프로필 사진 정보를 수정하지 못했습니다.");
        return displayUser(data.user);
    }

    async function insert(table, values, fallback) {
        const { error } = await client.from(table).insert(values);
        if (error) {
            console.error(`Supabase ${table} insert failed`, error.code);
            if (!navigator.onLine) throw new Error("인터넷 연결을 확인해 주세요.");
            throw new Error(fallback);
        }
    }

    window.myEducationSupabase = {
        client,
        displayUser,
        friendlyError,
        signIn,
        signUp,
        signOut,
        findMemberId,
        requestPasswordReset,
        updatePassword,
        deleteAccount,
        getCurrentUser,
        updateProfile,
        uploadAvatar,
        removeAvatar,
        insertInquiry(values) {
            return insert("inquiries", values, "문의 내용을 접수하지 못했습니다.");
        },
        insertInstructorApplication(values) {
            return insert("instructor_applications", values, "지원서를 접수하지 못했습니다.");
        },
        onAuthStateChange(callback) {
            return client.auth.onAuthStateChange((_event, session) => callback(displayUser(session?.user)));
        }
    };
})();
