const header = document.getElementById("site-header");
const menuButton = document.querySelector(".menu-button");
const navigation = document.getElementById("primary-nav");
const navLinks = [...document.querySelectorAll(".primary-nav a")];
const contactForm = document.getElementById("contact-form");
const formStatus = document.getElementById("form-status");

function updateHeader() {
    header?.classList.toggle("scrolled", window.scrollY > 24);
}

function closeMenu() {
    menuButton?.classList.remove("active");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "메뉴 열기");
    navigation?.classList.remove("open");
    document.body.classList.remove("menu-open");
}

menuButton?.addEventListener("click", () => {
    const isOpen = menuButton.classList.toggle("active");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
    navigation?.classList.toggle("open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
});

navLinks.forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
    });
}, { threshold: 0.14 });

document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));

contactForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;
    formStatus.textContent = "문의 내용이 확인되었습니다. 실제 발송을 위해 메일 또는 서버 연동이 필요합니다.";
    contactForm.reset();
});

document.getElementById("current-year").textContent = new Date().getFullYear();

const l2kMobileUrl = "https://myedu-website.vercel.app/l2k-edu/index.html";
const l2kMobileAccessLink = document.getElementById("l2k-mobile-access-link");
const l2kMobileQr = document.getElementById("l2k-mobile-qr");

if (l2kMobileAccessLink) l2kMobileAccessLink.href = l2kMobileUrl;
if (l2kMobileQr && window.qrcode) {
    const qrCode = window.qrcode(0, "M");
    qrCode.addData(l2kMobileUrl);
    qrCode.make();
    l2kMobileQr.src = qrCode.createDataURL(5, 2);
}

const mainLogo = document.getElementById("main-logo");
const familySiteSelect = document.getElementById("family-site-select");
const cursorInquiry = document.getElementById("cursor-inquiry");
const soundToggle = document.getElementById("sound-toggle");

mainLogo?.addEventListener("click", (event) => {
    event.preventDefault();
    window.location.reload();
});

familySiteSelect?.addEventListener("change", () => {
    const destination = familySiteSelect.value;
    if (!destination) return;
    window.open(destination, "_blank", "noopener,noreferrer");
    familySiteSelect.value = "";
});

function openInquiryForm() {
    document.getElementById("contact")?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => contactForm?.querySelector("input")?.focus({ preventScroll: true }), 700);
}

cursorInquiry?.addEventListener("click", openInquiryForm);

if (cursorInquiry && window.matchMedia("(pointer: fine)").matches) {
    let cursorX = window.innerWidth / 2;
    let cursorY = window.innerHeight / 2;
    let targetX = cursorX;
    let targetY = cursorY;
    let cursorPaused = false;

    document.addEventListener("pointermove", (event) => {
        targetX = Math.min(window.innerWidth - 72, Math.max(12, event.clientX + 18));
        targetY = Math.min(window.innerHeight - 72, Math.max(12, event.clientY + 18));
        cursorInquiry.classList.add("active");
    }, { passive: true });

    cursorInquiry.addEventListener("pointerenter", () => { cursorPaused = true; });
    cursorInquiry.addEventListener("pointerleave", () => { cursorPaused = false; });

    const followCursor = () => {
        if (!cursorPaused) {
            cursorX += (targetX - cursorX) * .16;
            cursorY += (targetY - cursorY) * .16;
            cursorInquiry.style.setProperty("--cursor-x", `${cursorX}px`);
            cursorInquiry.style.setProperty("--cursor-y", `${cursorY}px`);
        }
        window.requestAnimationFrame(followCursor);
    };
    window.requestAnimationFrame(followCursor);
}

let ambientContext = null;
let ambientMaster = null;
let ambientStarted = false;

function createAmbientMusic() {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) throw new Error("이 브라우저에서는 배경 음악을 지원하지 않습니다.");
    ambientContext = new AudioContext();
    ambientMaster = ambientContext.createGain();
    ambientMaster.gain.value = 0;
    ambientMaster.connect(ambientContext.destination);

    [130.81, 164.81, 196, 246.94].forEach((frequency, index) => {
        const oscillator = ambientContext.createOscillator();
        const toneGain = ambientContext.createGain();
        oscillator.type = index % 2 ? "sine" : "triangle";
        oscillator.frequency.value = frequency;
        toneGain.gain.value = index === 0 ? .022 : .012;
        oscillator.connect(toneGain).connect(ambientMaster);
        oscillator.start();
    });

    const pulse = ambientContext.createOscillator();
    const pulseDepth = ambientContext.createGain();
    pulse.frequency.value = .08;
    pulseDepth.gain.value = .008;
    pulse.connect(pulseDepth).connect(ambientMaster.gain);
    pulse.start();
    ambientStarted = true;
}

soundToggle?.addEventListener("click", async () => {
    try {
        if (!ambientStarted) createAmbientMusic();
        await ambientContext.resume();
        const turningOn = soundToggle.getAttribute("aria-pressed") !== "true";
        ambientMaster.gain.cancelScheduledValues(ambientContext.currentTime);
        ambientMaster.gain.linearRampToValueAtTime(turningOn ? .75 : 0, ambientContext.currentTime + .35);
        soundToggle.setAttribute("aria-pressed", String(turningOn));
        soundToggle.setAttribute("aria-label", turningOn ? "배경 음악 끄기" : "배경 음악 켜기");
        soundToggle.querySelector("strong").textContent = "MUSIC";
    } catch (error) {
        window.showL2kAuthToast?.(error.message);
    }
});
