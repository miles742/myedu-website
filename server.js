const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const port = Number(process.env.PORT) || 8000;
const host = process.env.HOST || "0.0.0.0";
const root = path.resolve(__dirname);
const dataDirectory = path.join(root, "data");
const usersFile = path.join(dataDirectory, "users.json");
const instructorApplicationsFile = path.join(dataDirectory, "instructor-applications.json");
const sessionLifetime = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const loginAttempts = new Map();

const mimeTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml", ".mp3": "audio/mpeg"
};

function sendJson(response, status, payload, headers = {}) {
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers });
    response.end(JSON.stringify(payload));
}

function readJson(request) {
    return new Promise((resolve, reject) => {
        let body = "";
        request.setEncoding("utf8");
        request.on("data", (chunk) => {
            body += chunk;
            if (Buffer.byteLength(body) > 32 * 1024) {
                reject(new Error("PAYLOAD_TOO_LARGE"));
                request.destroy();
            }
        });
        request.on("end", () => {
            try { resolve(JSON.parse(body || "{}")); }
            catch { reject(new Error("INVALID_JSON")); }
        });
        request.on("error", reject);
    });
}

function loadUsers() {
    try { return JSON.parse(fs.readFileSync(usersFile, "utf8")); }
    catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}

function saveUsers(users) {
    fs.mkdirSync(dataDirectory, { recursive: true });
    const temporaryFile = `${usersFile}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(users, null, 2), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporaryFile, usersFile);
}

function loadInstructorApplications() {
    try { return JSON.parse(fs.readFileSync(instructorApplicationsFile, "utf8")); }
    catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}

function saveInstructorApplications(applications) {
    fs.mkdirSync(dataDirectory, { recursive: true });
    const temporaryFile = `${instructorApplicationsFile}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(applications, null, 2), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporaryFile, instructorApplicationsFile);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    return { salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") };
}

function passwordsMatch(password, user) {
    const candidate = Buffer.from(hashPassword(password, user.passwordSalt).hash, "hex");
    const stored = Buffer.from(user.passwordHash, "hex");
    return candidate.length === stored.length && crypto.timingSafeEqual(candidate, stored);
}

function parseCookies(request) {
    const entries = (request.headers.cookie || "").split(";").filter((part) => part.includes("=")).map((part) => {
        const separator = part.indexOf("=");
        return [part.slice(0, separator).trim(), decodeURIComponent(part.slice(separator + 1))];
    });
    return Object.fromEntries(entries);
}

function sessionCookie(request, token, maxAge) {
    const secure = request.socket.encrypted || request.headers["x-forwarded-proto"] === "https";
    return `session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function currentUser(request) {
    const token = parseCookies(request).session;
    const session = token && sessions.get(token);
    if (!session) return null;
    if (session.expiresAt <= Date.now()) {
        sessions.delete(token);
        return null;
    }
    const user = loadUsers().find((item) => item.id === session.userId);
    return user ? { id: user.id, name: user.name, email: user.email } : null;
}

function loginBlocked(request) {
    const key = request.socket.remoteAddress || "unknown";
    const now = Date.now();
    const recent = (loginAttempts.get(key) || []).filter((time) => now - time < 10 * 60 * 1000);
    loginAttempts.set(key, recent);
    return recent.length >= 10;
}

function recordFailedLogin(request) {
    const key = request.socket.remoteAddress || "unknown";
    loginAttempts.set(key, [...(loginAttempts.get(key) || []), Date.now()]);
}

async function handleApi(request, response, pathname) {
    if (pathname === "/api/instructor-applications" && request.method === "POST") {
        const body = await readJson(request);
        const name = String(body.name || "").trim();
        const phone = String(body.phone || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const field = String(body.field || "").trim();
        const careerYears = Number(body.careerYears);
        const region = String(body.region || "").trim();
        const schedule = String(body.schedule || "").trim();
        const resumeUrl = String(body.resumeUrl || "").trim();
        const introduction = String(body.introduction || "").trim();

        if (name.length < 2 || name.length > 30) return sendJson(response, 400, { message: "이름은 2~30자로 입력해 주세요." });
        if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone)) return sendJson(response, 400, { message: "올바른 연락처를 입력해 주세요." });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return sendJson(response, 400, { message: "올바른 이메일 주소를 입력해 주세요." });
        if (!field || field.length > 80) return sendJson(response, 400, { message: "지원 분야를 선택해 주세요." });
        if (!Number.isFinite(careerYears) || careerYears < 0 || careerYears > 60) return sendJson(response, 400, { message: "강의 경력을 올바르게 입력해 주세요." });
        if (!region || region.length > 80) return sendJson(response, 400, { message: "활동 가능 지역을 입력해 주세요." });
        if (!schedule || schedule.length > 120) return sendJson(response, 400, { message: "활동 가능 일정을 입력해 주세요." });
        if (resumeUrl && (!/^https?:\/\//i.test(resumeUrl) || resumeUrl.length > 500)) return sendJson(response, 400, { message: "이력서 링크는 http 또는 https 주소로 입력해 주세요." });
        if (introduction.length < 30 || introduction.length > 2000) return sendJson(response, 400, { message: "자기소개는 30~2,000자로 입력해 주세요." });
        if (body.consent !== true) return sendJson(response, 400, { message: "개인정보 수집 및 이용에 동의해 주세요." });

        const applications = loadInstructorApplications();
        const duplicate = applications.some((application) => application.email === email && Date.now() - Date.parse(application.createdAt) < 24 * 60 * 60 * 1000);
        if (duplicate) return sendJson(response, 409, { message: "동일한 이메일로 접수된 지원서가 있습니다. 수정이 필요하면 대표 이메일로 문의해 주세요." });

        const application = { id: crypto.randomUUID(), name, phone, email, field, careerYears, region, schedule, resumeUrl, introduction, status: "received", createdAt: new Date().toISOString() };
        applications.push(application);
        saveInstructorApplications(applications);
        return sendJson(response, 201, { ok: true, applicationId: application.id, message: "강사 지원서가 접수되었습니다." });
    }

    if (pathname === "/api/auth/me" && request.method === "GET") {
        return sendJson(response, 200, { user: currentUser(request) });
    }

    if (pathname === "/api/auth/register" && request.method === "POST") {
        const body = await readJson(request);
        const name = String(body.name || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        if (name.length < 2 || name.length > 30) return sendJson(response, 400, { message: "이름은 2~30자로 입력해 주세요." });
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return sendJson(response, 400, { message: "올바른 이메일 주소를 입력해 주세요." });
        if (password.length < 8 || password.length > 128) return sendJson(response, 400, { message: "비밀번호는 8~128자로 입력해 주세요." });

        const users = loadUsers();
        if (users.some((user) => user.email === email)) return sendJson(response, 409, { message: "이미 가입된 이메일입니다." });
        const passwordData = hashPassword(password);
        const user = { id: crypto.randomUUID(), name, email, passwordSalt: passwordData.salt, passwordHash: passwordData.hash, createdAt: new Date().toISOString() };
        users.push(user);
        saveUsers(users);

        const token = crypto.randomBytes(32).toString("base64url");
        sessions.set(token, { userId: user.id, expiresAt: Date.now() + sessionLifetime });
        return sendJson(response, 201, { user: { id: user.id, name, email } }, { "Set-Cookie": sessionCookie(request, token, Math.floor(sessionLifetime / 1000)) });
    }

    if (pathname === "/api/auth/login" && request.method === "POST") {
        if (loginBlocked(request)) return sendJson(response, 429, { message: "로그인 시도가 너무 많습니다. 10분 후 다시 시도해 주세요." });
        const body = await readJson(request);
        const email = String(body.email || "").trim().toLowerCase();
        const password = String(body.password || "");
        const user = loadUsers().find((item) => item.email === email);
        if (!user || !passwordsMatch(password, user)) {
            recordFailedLogin(request);
            return sendJson(response, 401, { message: "이메일 또는 비밀번호가 올바르지 않습니다." });
        }

        loginAttempts.delete(request.socket.remoteAddress || "unknown");
        const token = crypto.randomBytes(32).toString("base64url");
        sessions.set(token, { userId: user.id, expiresAt: Date.now() + sessionLifetime });
        return sendJson(response, 200, { user: { id: user.id, name: user.name, email: user.email } }, { "Set-Cookie": sessionCookie(request, token, Math.floor(sessionLifetime / 1000)) });
    }

    if (pathname === "/api/auth/logout" && request.method === "POST") {
        const token = parseCookies(request).session;
        if (token) sessions.delete(token);
        return sendJson(response, 200, { ok: true }, { "Set-Cookie": sessionCookie(request, "", 0) });
    }

    return sendJson(response, 404, { message: "요청한 API를 찾을 수 없습니다." });
}

const server = http.createServer(async (request, response) => {
    try {
        const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
        const pathname = decodeURIComponent(requestUrl.pathname);
        if (pathname.startsWith("/api/")) return await handleApi(request, response, pathname);

        if (request.method !== "GET" && request.method !== "HEAD") {
            response.writeHead(405, { Allow: "GET, HEAD" });
            return response.end();
        }

        const relativePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
        const filePath = path.resolve(root, relativePath);
        const pathSegments = relativePath.split(/[\\/]/);
        const isPrivatePath = pathSegments[0] === "data" || pathSegments.some((segment) => segment.startsWith("."));
        if (isPrivatePath || (!filePath.startsWith(root + path.sep) && filePath !== root)) {
            response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            return response.end("Forbidden");
        }

        fs.stat(filePath, (statError, stats) => {
            if (statError || !stats.isFile()) {
                response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
                return response.end("Not Found");
            }
            response.writeHead(200, {
                "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
                "Cache-Control": "no-cache", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin"
            });
            if (request.method === "HEAD") response.end();
            else fs.createReadStream(filePath).pipe(response);
        });
    } catch (error) {
        console.error(error);
        if (!response.headersSent) sendJson(response, error.message === "PAYLOAD_TOO_LARGE" ? 413 : 400, { message: "요청을 처리할 수 없습니다." });
    }
});

setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions) if (session.expiresAt <= now) sessions.delete(token);
}, 60 * 60 * 1000).unref();

server.listen(port, host, () => console.log(`Website: http://localhost:${port}/`));
