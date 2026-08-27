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

    function displayUser(user) {
        if (!user) return null;
        const email = user.email || "";
        const name = String(user.user_metadata?.name || email.split("@")[0] || "회원").trim();
        return { id: user.id, name, email };
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

    async function signUp(name, email, password) {
        const { data, error } = await client.auth.signUp({
            email,
            password,
            options: { data: { name } }
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

    async function getCurrentUser() {
        const { data, error } = await client.auth.getUser();
        if (error) {
            if (error.name === "AuthSessionMissingError") return null;
            throw friendlyError(error);
        }
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
        getCurrentUser,
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
