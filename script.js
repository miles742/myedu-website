const header = document.getElementById("site-header");
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.getElementById("primary-nav");
const navLinks = [...document.querySelectorAll(".primary-nav a")];
const inquiryModal = document.getElementById("inquiry-modal");
const inquiryForm = document.getElementById("inquiry-form");
const inquiryStatus = document.getElementById("inquiry-status");
const inquiryOpenButtons = [...document.querySelectorAll("[data-inquiry-open]")];
const inquiryCloseButtons = [...document.querySelectorAll("[data-inquiry-close]")];
const floatingInquiry = document.querySelector(".floating-inquiry");
const mobileAccessLink = document.getElementById("mobile-access-link");
const mobileAccessQr = document.getElementById("mobile-access-qr");
let inquiryLastFocused = null;
let inquiryCloseTimer = null;
const programModal = document.getElementById("program-modal");
const programOpenButtons = [...document.querySelectorAll("[data-program]")];
const programCloseButtons = [...document.querySelectorAll("[data-program-close]")];
const programInquiryButton = document.querySelector("[data-program-inquiry]");
const programImageDots = document.getElementById("program-image-dots");
let programLastFocused = null;
let programCloseTimer = null;
let programCarouselTimer = null;
const businessModal = document.getElementById("business-modal");
const businessOpenButtons = [...document.querySelectorAll("[data-business]")];
const businessToggleButtons = [...document.querySelectorAll("[data-business-toggle]")];
const businessCloseButtons = [...document.querySelectorAll("[data-business-close]")];
const businessInquiryButton = document.querySelector("[data-business-inquiry]");
let businessLastFocused = null;
let businessCloseTimer = null;
const backgroundMusic = document.getElementById("background-music");
const soundToggle = document.getElementById("sound-toggle");
const soundLabel = soundToggle?.querySelector(".sound-label");
const pageScrollProgress = document.getElementById("page-scroll-progress");
const portfolioCategoryTabs = [...document.querySelectorAll("[data-portfolio-category]")];
const portfolioCategoryPanels = [...document.querySelectorAll("[data-portfolio-panel]")];
const konyangCategoryTabs = [...document.querySelectorAll("[data-konyang-category]")];
const konyangCategoryPanels = [...document.querySelectorAll("[data-konyang-panel]")];
const konyangToggleButtons = [...document.querySelectorAll("[data-konyang-toggle]")];
const historyTabs = [...document.querySelectorAll("[data-history-tab]")];
const historyPanels = [...document.querySelectorAll("[data-history-panel]")];
const historyModal = document.getElementById("history-modal");
const historyCloseButtons = [...document.querySelectorAll("[data-history-close]")];
let historyLastFocused = null;
let historyCloseTimer = null;
let backgroundAutoplayPending = false;

function openHistoryModal(selectedYear, selectedTab) {
    if (!historyModal) return;
    window.clearTimeout(historyCloseTimer);
    historyLastFocused = selectedTab || document.activeElement;

    historyTabs.forEach((otherTab) => {
        const isActive = otherTab.dataset.historyTab === selectedYear;
        otherTab.classList.toggle("active", isActive);
        otherTab.setAttribute("aria-selected", String(isActive));
    });
    historyPanels.forEach((panel) => {
        const isActive = panel.dataset.historyPanel === selectedYear;
        panel.classList.toggle("active", isActive);
        panel.hidden = !isActive;
    });

    historyModal.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => {
        historyModal.classList.add("open");
        historyModal.querySelector(".history-modal-close")?.focus();
    });
}

function closeHistoryModal() {
    if (!historyModal) return;
    historyModal.classList.remove("open");
    document.body.classList.remove("modal-open");
    historyCloseTimer = window.setTimeout(() => {
        historyModal.hidden = true;
        historyLastFocused?.focus();
    }, 250);
}

historyTabs.forEach((tab, tabIndex) => {
    tab.addEventListener("click", () => openHistoryModal(tab.dataset.historyTab, tab));

    tab.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        const nextTab = historyTabs[(tabIndex + direction + historyTabs.length) % historyTabs.length];
        nextTab.focus();
    });
});

historyCloseButtons.forEach((button) => button.addEventListener("click", closeHistoryModal));
historyModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeHistoryModal();
        return;
    }
    if (event.key === "Tab") {
        event.preventDefault();
        historyModal.querySelector(".history-modal-close")?.focus();
    }
});

businessToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const category = button.closest(".business-category");
        const panel = document.getElementById(button.getAttribute("aria-controls"));
        const willOpen = button.getAttribute("aria-expanded") !== "true";

        businessToggleButtons.forEach((otherButton) => {
            const otherCategory = otherButton.closest(".business-category");
            const otherPanel = document.getElementById(otherButton.getAttribute("aria-controls"));
            otherButton.setAttribute("aria-expanded", "false");
            otherButton.setAttribute("aria-label", `${otherButton.querySelector("h3")?.textContent || "사업"} 사업 목록 열기`);
            otherCategory?.classList.remove("open");
            if (otherPanel) otherPanel.hidden = true;
        });

        if (!willOpen) return;
        button.setAttribute("aria-expanded", "true");
        button.setAttribute("aria-label", `${button.querySelector("h3")?.textContent || "사업"} 사업 목록 닫기`);
        category?.classList.add("open");
        if (panel) panel.hidden = false;
    });
});

const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const heroGalleryTrack = document.querySelector(".hero-gallery-track");
const heroGallerySet = heroGalleryTrack?.querySelector(".hero-gallery-set");

if (heroGalleryTrack && heroGallerySet) {
    const galleryClone = heroGallerySet.cloneNode(true);
    galleryClone.setAttribute("aria-hidden", "true");
    galleryClone.querySelectorAll("a").forEach((link) => link.setAttribute("tabindex", "-1"));
    heroGalleryTrack.append(galleryClone);
}

let inquiryPointerX = window.innerWidth - 74;
let inquiryPointerY = window.innerHeight - 132;
let inquiryCurrentX = inquiryPointerX;
let inquiryCurrentY = inquiryPointerY;
let inquiryAnimationFrame = null;

function initializeMobileAccessQr() {
    if (!mobileAccessLink || !mobileAccessQr) return;
    const homepageUrl = new URL("/", window.location.href).href;
    mobileAccessLink.href = homepageUrl;

    try {
        if (typeof window.qrcode !== "function") throw new Error("QR generator unavailable");
        const qr = window.qrcode(0, "M");
        qr.addData(homepageUrl);
        qr.make();
        mobileAccessQr.src = qr.createDataURL(5, 4);
        mobileAccessQr.hidden = false;
    } catch (error) {
        mobileAccessQr.hidden = true;
        console.warn("모바일 접속 QR 코드를 생성하지 못했습니다.");
    }
}

initializeMobileAccessQr();
let inquiryPointerLocked = false;

function selectCarouselSlide(carousel, index) {
    const slides = [...carousel.querySelectorAll(".carousel-slide")];
    const dots = [...carousel.querySelectorAll("[data-carousel-slide]")];
    slides.forEach((slide, slideIndex) => {
        const isActive = slideIndex === index;
        slide.classList.toggle("active", isActive);
        slide.hidden = !isActive;
    });
    dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === index;
        dot.classList.toggle("active", isActive);
        dot.setAttribute("aria-selected", String(isActive));
    });
    carousel.dataset.activeSlide = String(index);
}

document.querySelectorAll("[data-card-carousel]").forEach((carousel) => {
    const slides = carousel.querySelectorAll(".carousel-slide");
    carousel.querySelectorAll("[data-carousel-slide]").forEach((dot) => {
        dot.addEventListener("click", () => selectCarouselSlide(carousel, Number(dot.dataset.carouselSlide)));
    });
    if (slides.length > 1 && !reducedMotion.matches) {
        window.setInterval(() => {
            const nextIndex = (Number(carousel.dataset.activeSlide || 0) + 1) % slides.length;
            selectCarouselSlide(carousel, nextIndex);
        }, 4500);
    }
});

function selectPortfolioCategory(category) {
    portfolioCategoryTabs.forEach((tab) => {
        const isSelected = tab.dataset.portfolioCategory === category;
        tab.classList.toggle("active", isSelected);
        tab.setAttribute("aria-selected", String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;
    });
    portfolioCategoryPanels.forEach((panel) => {
        panel.hidden = panel.dataset.portfolioPanel !== category;
    });
}

portfolioCategoryTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectPortfolioCategory(tab.dataset.portfolioCategory));
    tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = portfolioCategoryTabs.length - 1;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + portfolioCategoryTabs.length) % portfolioCategoryTabs.length;
        else nextIndex = (index + 1) % portfolioCategoryTabs.length;
        const nextTab = portfolioCategoryTabs[nextIndex];
        selectPortfolioCategory(nextTab.dataset.portfolioCategory);
        nextTab.focus();
    });
});

if (portfolioCategoryTabs.length) {
    const initialPortfolioTab = portfolioCategoryTabs.find((tab) => tab.classList.contains("active")) || portfolioCategoryTabs[0];
    selectPortfolioCategory(initialPortfolioTab.dataset.portfolioCategory);
}

function selectKonyangCategory(category) {
    konyangCategoryTabs.forEach((tab) => {
        const isSelected = tab.dataset.konyangCategory === category;
        tab.classList.toggle("active", isSelected);
        tab.setAttribute("aria-selected", String(isSelected));
        tab.tabIndex = isSelected ? 0 : -1;
    });
    konyangCategoryPanels.forEach((panel) => {
        panel.hidden = panel.dataset.konyangPanel !== category;
    });
}

konyangCategoryTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectKonyangCategory(tab.dataset.konyangCategory));
    tab.addEventListener("keydown", (event) => {
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        let nextIndex = index;
        if (event.key === "Home") nextIndex = 0;
        else if (event.key === "End") nextIndex = konyangCategoryTabs.length - 1;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + konyangCategoryTabs.length) % konyangCategoryTabs.length;
        else nextIndex = (index + 1) % konyangCategoryTabs.length;
        const nextTab = konyangCategoryTabs[nextIndex];
        selectKonyangCategory(nextTab.dataset.konyangCategory);
        nextTab.focus();
    });
});

if (konyangCategoryTabs.length) {
    const initialKonyangTab = konyangCategoryTabs.find((tab) => tab.classList.contains("active")) || konyangCategoryTabs[0];
    selectKonyangCategory(initialKonyangTab.dataset.konyangCategory);
}

konyangToggleButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const panel = document.getElementById(button.getAttribute("aria-controls"));
        if (!panel) return;
        const willExpand = button.getAttribute("aria-expanded") !== "true";
        button.setAttribute("aria-expanded", String(willExpand));
        button.classList.toggle("active", willExpand);
        panel.hidden = !willExpand;
        requestAnimationFrame(updatePageScrollProgress);
    });
});

function pageScrollMaximum() {
    return Math.max(document.documentElement.scrollHeight - window.innerHeight, 0);
}

function updatePageScrollProgress() {
    if (!pageScrollProgress) return;
    const maximum = pageScrollMaximum();
    const progress = maximum ? Math.min(Math.max(window.scrollY / maximum, 0), 1) : 0;
    const percentage = Math.round(progress * 100);
    pageScrollProgress.style.setProperty("--scroll-progress", `${percentage}%`);
    pageScrollProgress.setAttribute("aria-valuenow", String(percentage));
}

pageScrollProgress?.addEventListener("click", (event) => {
    const bounds = pageScrollProgress.getBoundingClientRect();
    const progress = Math.min(Math.max((event.clientY - bounds.top) / bounds.height, 0), 1);
    window.scrollTo({ top: pageScrollMaximum() * progress, behavior: "smooth" });
});

pageScrollProgress?.addEventListener("keydown", (event) => {
    if (!["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const maximum = pageScrollMaximum();
    if (event.key === "Home") return window.scrollTo({ top: 0, behavior: "smooth" });
    if (event.key === "End") return window.scrollTo({ top: maximum, behavior: "smooth" });
    const direction = event.key === "ArrowUp" || event.key === "PageUp" ? -1 : 1;
    const distance = event.key.startsWith("Page") ? window.innerHeight * 0.8 : 120;
    window.scrollBy({ top: direction * distance, behavior: "smooth" });
});

updatePageScrollProgress();
window.addEventListener("scroll", updatePageScrollProgress, { passive: true });

function canFollowPointer() {
    return finePointer.matches && !reducedMotion.matches && window.innerWidth > 980;
}

function positionFloatingInquiry() {
    if (!floatingInquiry || !canFollowPointer()) {
        floatingInquiry?.classList.remove("is-cursor-following");
        inquiryAnimationFrame = null;
        return;
    }

    inquiryCurrentX += (inquiryPointerX - inquiryCurrentX) * 0.16;
    inquiryCurrentY += (inquiryPointerY - inquiryCurrentY) * 0.16;
    floatingInquiry.style.setProperty("--inquiry-x", `${inquiryCurrentX}px`);
    floatingInquiry.style.setProperty("--inquiry-y", `${inquiryCurrentY}px`);

    if (Math.abs(inquiryPointerX - inquiryCurrentX) > 0.2 || Math.abs(inquiryPointerY - inquiryCurrentY) > 0.2) {
        inquiryAnimationFrame = requestAnimationFrame(positionFloatingInquiry);
    } else {
        inquiryAnimationFrame = null;
    }
}

function followInquiryPointer(event) {
    if (!floatingInquiry || !canFollowPointer() || inquiryPointerLocked) return;
    const buttonSize = 50;
    const cursorGap = 24;
    inquiryPointerX = Math.min(event.clientX + cursorGap, window.innerWidth - buttonSize - 12);
    inquiryPointerY = Math.min(event.clientY + cursorGap, window.innerHeight - buttonSize - 12);
    floatingInquiry.classList.add("is-cursor-following");
    if (!inquiryAnimationFrame) inquiryAnimationFrame = requestAnimationFrame(positionFloatingInquiry);
}

document.addEventListener("pointermove", followInquiryPointer, { passive: true });
floatingInquiry?.addEventListener("pointerenter", () => { inquiryPointerLocked = true; });
floatingInquiry?.addEventListener("pointerleave", () => { inquiryPointerLocked = false; });
window.addEventListener("resize", () => {
    if (!canFollowPointer()) floatingInquiry?.classList.remove("is-cursor-following");
});

if (backgroundMusic) backgroundMusic.volume = 0.2;

function updateSoundButton(isPlaying) {
    if (!soundToggle) return;
    soundToggle.classList.toggle("is-playing", isPlaying);
    soundToggle.setAttribute("aria-pressed", String(isPlaying));
    soundToggle.setAttribute("aria-label", isPlaying ? "배경음악 정지" : "배경음악 재생");
    if (soundLabel) soundLabel.textContent = isPlaying ? "SOUND OFF" : "SOUND ON";
}

async function startBackgroundMusic() {
    if (!backgroundMusic) return false;

    try {
        await backgroundMusic.play();
        backgroundAutoplayPending = false;
        updateSoundButton(true);
        return true;
    } catch (error) {
        backgroundAutoplayPending = true;
        updateSoundButton(false);
        return false;
    }
}

function stopBackgroundMusic() {
    if (!backgroundMusic) return;
    backgroundAutoplayPending = false;
    backgroundMusic.pause();
    backgroundMusic.currentTime = 0;
    updateSoundButton(false);
}

window.addEventListener("load", startBackgroundMusic, { once: true });
window.addEventListener("pageshow", () => {
    if (backgroundMusic?.paused) startBackgroundMusic();
});

async function resumeAutoplayAfterInteraction(event) {
    if (!backgroundAutoplayPending || event.target.closest?.("#sound-toggle")) return;
    const started = await startBackgroundMusic();
    if (started) {
        document.removeEventListener("pointerdown", resumeAutoplayAfterInteraction, true);
        document.removeEventListener("keydown", resumeAutoplayAfterInteraction, true);
    }
}

document.addEventListener("pointerdown", resumeAutoplayAfterInteraction, true);
document.addEventListener("keydown", resumeAutoplayAfterInteraction, true);

soundToggle?.addEventListener("click", async () => {
    if (!backgroundMusic) return;

    if (backgroundMusic.paused) {
        await startBackgroundMusic();
    } else {
        stopBackgroundMusic();
    }
});

const businessDetails = {
    university: {
        number: "01",
        en: "UNIVERSITY EDUCATION",
        title: "대학 교육",
        summary: "대학의 교육 목표와 학생 특성을 분석해 교과·비교과 프로그램을 기획하고, 참여자 경험과 운영 성과를 함께 고려하는 맞춤형 교육 서비스입니다.",
        audience: "대학 및 대학생",
        scope: "기획·운영·성과 관리",
        points: ["교육 목표와 대상에 맞춘 커리큘럼 기획", "강사 및 학습 운영 체계 구성", "참여 현황과 결과를 고려한 운영 관리"]
    },
    global: {
        number: "02",
        en: "GLOBAL EDUCATION",
        title: "외국어 교육",
        summary: "학습자의 수준과 활용 목적에 맞춰 실용적인 언어 경험을 제공하고, 지속적인 참여와 성장을 지원하는 외국어 교육 프로그램입니다.",
        audience: "대학생·청소년·기관",
        scope: "수준별 어학 교육",
        points: ["학습 수준과 목표를 반영한 과정 설계", "말하기와 활용 중심의 참여형 수업", "집중 과정부터 장기 과정까지 유연한 구성"]
    },
    camp: {
        number: "03",
        en: "EDUCATION CAMP",
        title: "교육 캠프",
        summary: "학습과 체험, 협업 활동을 하나의 흐름으로 연결해 참가자가 몰입하며 배우고 성장할 수 있도록 구성하는 캠프형 교육 서비스입니다.",
        audience: "청소년 및 대학생",
        scope: "캠프 기획·현장 운영",
        points: ["주제와 대상에 맞춘 활동형 프로그램", "교육과 생활 운영을 고려한 현장 설계", "참여자 안전과 몰입을 위한 운영 관리"]
    },
    public: {
        number: "04",
        en: "PUBLIC EDUCATION",
        title: "공공기관 교육",
        summary: "공공기관과 지방자치단체의 사업 목적을 이해하고, 대상과 지역 환경에 적합한 교육 프로그램을 기획·운영하는 맞춤형 서비스입니다.",
        audience: "공공기관 및 지자체",
        scope: "정책 연계 교육 운영",
        points: ["사업 목적과 대상에 맞춘 프로그램 제안", "행정 일정과 현장을 고려한 안정적인 운영", "운영 결과 정리와 후속 개선 지원"]
    }
};

function openBusinessModal(businessKey) {
    const business = businessDetails[businessKey];
    if (!businessModal || !business) return;

    window.clearTimeout(businessCloseTimer);
    businessLastFocused = document.activeElement;
    document.getElementById("business-detail-number").textContent = business.number;
    document.getElementById("business-detail-en").textContent = business.en;
    document.getElementById("business-title").textContent = business.title;
    document.getElementById("business-summary").textContent = business.summary;
    document.getElementById("business-audience").textContent = business.audience;
    document.getElementById("business-scope").textContent = business.scope;

    const points = document.getElementById("business-points");
    const pointItems = business.points.map((point) => {
        const item = document.createElement("li");
        item.textContent = point;
        return item;
    });
    points.replaceChildren(...pointItems);

    businessModal.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => {
        businessModal.classList.add("open");
        businessModal.querySelector(".business-close")?.focus();
    });
}

function closeBusinessModal() {
    if (!businessModal) return;
    businessModal.classList.remove("open");
    document.body.classList.remove("modal-open");
    businessCloseTimer = window.setTimeout(() => {
        businessModal.hidden = true;
        businessLastFocused?.focus();
    }, 250);
}

businessOpenButtons.forEach((button) => {
    button.addEventListener("click", () => openBusinessModal(button.dataset.business));
});
businessCloseButtons.forEach((button) => button.addEventListener("click", closeBusinessModal));
businessInquiryButton?.addEventListener("click", () => {
    closeBusinessModal();
    window.setTimeout(openInquiryModal, 260);
});

businessModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeBusinessModal();
        return;
    }

    if (event.key !== "Tab") return;
    const focusable = [...businessModal.querySelectorAll("button, [href]")]
        .filter((element) => !element.disabled && element.offsetParent !== null);
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

const programDetails = {
    "language-month": {
        index: "PROJECT 01",
        category: "KONYANG UNIVERSITY · LANGUAGE IMMERSION",
        title: "외국어와 한 달 살기",
        image: "images/logo 3.jpg",
        imageAlt: "외국어와 한 달 살기 프로그램 참가자 단체 사진",
        summary: "대학생이 일정 기간 외국어를 집중적으로 경험하며 학습 습관과 실용적인 언어 활용 역량을 함께 키울 수 있도록 설계한 몰입형 프로그램입니다.",
        audience: "대학생",
        format: "집중형 외국어 과정",
        points: ["외국어 몰입 환경과 학습 루틴 조성", "수준과 목표를 고려한 단계별 학습", "참여자 간 교류를 통한 학습 동기 강화"]
    },
    "toeic-pakpak": {
        index: "PROJECT 02",
        category: "KONYANG UNIVERSITY · TOEIC PROGRAM",
        title: "토익팍팍",
        image: "images/수업 사진 3.jpg",
        imageAlt: "토익팍팍 집중 수업 현장",
        summary: "대학생의 목표 점수 달성을 돕기 위해 핵심 개념 학습과 문제 풀이, 학습 관리를 유기적으로 연결한 집중형 토익 프로그램입니다.",
        audience: "대학생",
        format: "토익 집중 교육",
        points: ["핵심 영역별 전략과 문제 풀이", "목표에 따른 집중 학습 구성", "꾸준한 참여를 돕는 학습 관리"]
    },
    "international-dys": {
        index: "PROJECT 03",
        category: "KONYANG UNIVERSITY · DESIGN YOUR SPEC",
        title: "국제 DYS",
        image: "images/3_3주차 수업사진(5).jpg",
        imageAlt: "건양대학교 국제 DYS 수업 현장",
        summary: "DYS는 ‘DESIGN YOUR SPEC’의 약자로, 건양대학교 신입생의 어학 역량과 진로 경쟁력 향상에 특화된 토익·토익스피킹 프로그램입니다. 학생과 강사가 긴밀히 소통하며 몰입도 높은 수업을 함께 만들고, 운영진의 체계적인 학습 관리로 안정적으로 운영됩니다.",
        audience: "건양대학교 신입생",
        format: "토익·토익스피킹 집중 교육",
        points: ["학생·강사 간 적극적인 소통 중심 수업", "몰입도 높은 토익·토익스피킹 과정", "운영진의 체계적인 출결 및 학습 관리"]
    },
    "gyeryong-english-camp": {
        index: "PROJECT 04",
        category: "GYERYONG CITY · ENGLISH CAMP",
        title: "계룡시 영어캠프",
        image: "images/롸.jpg",
        imageAlt: "계룡시 청소년 영어캠프 단체사진",
        imageSecondary: "images/계룡시 영어캠프 간식.jpg",
        imageSecondaryAlt: "계룡시 영어캠프 참가 학생들의 간식 시간",
        imageTertiary: "images/계룡시 영어캠프 활동 1.jpg",
        imageTertiaryAlt: "계룡시 영어캠프 참여형 말하기 활동",
        imageQuaternary: "images/계룡시 영어캠프 활동 2.jpg",
        imageQuaternaryAlt: "계룡시 영어캠프 창의 영어 활동",
        imageFit: "contain",
        summary: "계룡시 학생들이 영어를 즐겁고 자연스럽게 경험할 수 있도록 체험 활동과 의사소통 중심 수업을 결합해 운영하는 몰입형 영어캠프입니다.",
        audience: "계룡시 학생",
        format: "체험·소통형 영어캠프",
        points: ["참여형 활동을 통한 영어 자신감 향상", "수준과 연령을 고려한 맞춤형 수업", "안전하고 체계적인 캠프 운영 관리"]
    },
    "gyeryong-toeic-speaking": {
        index: "PROJECT 05",
        category: "GYERYONG CITY · TOEIC & TOEIC SPEAKING",
        title: "계룡시 토익&토익스피킹",
        image: "images/계룡 토익.jpg",
        imageAlt: "계룡시 성인 TOEIC 교육 과정 수료 현장",
        imageSecondary: "images/계룡 토스.jpg",
        imageSecondaryAlt: "계룡시 TOEIC Speaking 교육 과정 수료 현장",
        summary: "건양대학교 평생교육원과 계룡시가 함께 성인 학습자의 실용 영어 역량 향상을 위해 운영한 TOEIC·TOEIC Speaking 교육 과정입니다. 목표 시험에 맞춘 집중 학습과 실전 연습을 통해 학습자의 자신감과 성취도를 높였습니다.",
        audience: "계룡시 성인 학습자",
        format: "TOEIC·TOEIC Speaking 실전 과정",
        points: ["TOEIC 핵심 영역별 전략과 실전 문제 풀이", "TOEIC Speaking 유형별 답변 구성과 발화 훈련", "과정별 학습 관리와 수료 성과 지원"]
    },
    "gyeryong-talk-conversation": {
        index: "PROJECT 06",
        category: "GYERYONG CITY · PRACTICAL ENGLISH",
        title: "계룡시 톡-쏘는 회화 교육프로그램",
        image: "images/계룡시 생활영어 1.jpg",
        imageAlt: "계룡시 톡-쏘는 회화 교육프로그램 수업 현장",
        imageSecondary: "images/계룡시 생활영어 2.jpg",
        imageSecondaryAlt: "계룡시 톡-쏘는 회화 교육프로그램 참여자 활동 현장",
        summary: "계룡시 시민들이 일상에서 바로 활용할 수 있는 영어 표현을 자연스럽게 익히도록 구성한 생활 밀착형 회화 교육프로그램입니다. 다양한 상황별 말하기 활동과 참여형 수업을 통해 영어에 대한 부담을 낮추고 실전 의사소통 자신감을 높입니다.",
        audience: "계룡시 시민",
        format: "생활 밀착형 실용 영어회화",
        points: ["일상에서 바로 쓰는 상황별 핵심 표현 학습", "참여와 소통 중심의 반복 말하기 연습", "영어 회화 자신감을 높이는 실전 활동"]
    },
    "kndu-language-course": {
        index: "PROJECT 07",
        category: "KOREA NATIONAL DEFENSE UNIVERSITY · LANGUAGE COURSE",
        title: "국방대학교 어학강좌",
        image: "images/ss.png",
        imageAlt: "국방대학교 건물 전경",
        imageFit: "contain",
        summary: "국방대학교 교육생의 어학 역량 향상을 위해 학습 목표와 교육 환경을 고려해 구성한 맞춤형 어학강좌입니다.",
        audience: "국방대학교 교육생",
        format: "맞춤형 어학강좌",
        points: ["교육생의 수준과 목표를 고려한 강좌 구성", "실용적인 언어 활용 중심의 단계별 학습", "안정적인 과정 운영과 체계적인 학습 지원"]
    },
    "staff-global-competency": {
        index: "PROJECT 08",
        category: "KONYANG UNIVERSITY · STAFF GLOBAL COMPETENCY",
        title: "직원 국제화 역량강화 프로그램",
        image: "images/4_대전 종강식 사진 (7).jpg",
        imageAlt: "직원 국제화 역량강화 프로그램 참여자 기프트 전달 현장",
        imageSecondary: "images/KakaoTalk_20260202_162528974_01.jpg",
        imageSecondaryAlt: "건양대학교 직원 국제화 역량강화 프로그램 종강식",
        summary: "대학기관 내 교직원의 국제화 역량과 실무 영어 활용 능력을 높이기 위해 운영하는 맞춤형 교육 프로그램입니다. 원어민 강사와 한국인 강사가 영어 회화와 TOEIC 수업을 진행하며, 참여자의 수준과 학습 목표에 맞춘 체계적인 교육을 제공합니다.",
        audience: "대학기관 교직원",
        format: "영어 회화·TOEIC 맞춤 교육",
        points: ["원어민 강사와 함께하는 실용 영어 회화 수업", "한국인 전문 강사의 TOEIC 영역별 학습", "교직원의 수준과 업무 활용 목표를 반영한 과정 운영"]
    },
    "career-english-interview": {
        index: "PROJECT 09",
        category: "KONYANG UNIVERSITY · CAREER ENGLISH INTERVIEW",
        title: "커리어역량강화 영어면접준비반",
        image: "images/커리어역량강화 오리엔테이션.jpg",
        imageAlt: "건양대학교 커리어역량강화 프로그램 오리엔테이션 현장",
        imageSecondary: "images/KakaoTalk_20260205_030607790_14.jpg",
        imageSecondaryAlt: "커리어역량강화 영어면접준비반 온라인 회화 수업",
        imageTertiary: "images/3_원어민 시뮬레이션 사진(1).png",
        imageTertiaryAlt: "원어민 강사와 진행한 영어면접 시뮬레이션",
        imageQuaternary: "images/커리어역량강화 영어면접 수업.jpg",
        imageQuaternaryAlt: "건양대학교 커리어역량강화 영어면접준비반 수업 현장",
        summary: "해외 대학 어학연수나 해외 진출을 준비하는 학생들이 출국 전 현지 생활과 면접 상황에 필요한 실전 영어를 익히는 프로그램입니다. 원어민 강사와 전문 강사의 지도 아래 현지 회화, 영어 인터뷰, 상황별 의사소통을 반복 연습하며 해외 환경에 대한 적응력과 자신감을 높입니다.",
        audience: "해외 어학연수·진출 준비 대학생",
        format: "현지 회화·영어면접 실전 과정",
        points: ["원어민 강사와 함께하는 현지 상황별 회화 연습", "실제 질문과 답변을 활용한 영어면접 시뮬레이션", "출국 전 실전 의사소통 역량과 자신감 강화"]
    },
    "australia-internship-conversation": {
        index: "PROJECT 10",
        category: "KONYANG UNIVERSITY · AUSTRALIA INTERNSHIP ENGLISH",
        title: "호주 인턴쉽 회화 교육 프로그램",
        image: "images/1_수업사진 (1).jpg",
        imageAlt: "호주 인턴쉽 회화 교육 프로그램 단체 수업 현장",
        imageSecondary: "images/호주 인턴십 종강식.jpg",
        imageSecondaryAlt: "호주 인턴쉽 회화 교육 프로그램 수료증 수여 현장",
        imageTertiary: "images/호주 인턴십 친목식사.jpg",
        imageTertiaryAlt: "호주 인턴쉽 참가 학생 친목 식사 현장",
        imageQuaternary: "images/호주 인턴십 회화수업.jpg",
        imageQuaternaryAlt: "원어민 강사의 호주 인턴쉽 회화 개별 코칭 현장",
        summary: "호주 인턴쉽을 준비하는 대학생이 출국 전 현지 생활과 업무 환경에서 필요한 전문 회화 역량을 집중적으로 익히도록 지원하는 단기 교육 프로그램입니다. 원어민 강사와 전문 강사의 실전 수업, 개별 코칭, 참여자 관리를 통해 현지 적응력과 의사소통 자신감을 높입니다.",
        audience: "호주 인턴쉽 참가 예정 대학생",
        format: "단기 집중 실전 회화·관리 과정",
        points: ["호주 생활과 인턴 업무 상황을 반영한 실용 회화 교육", "원어민 강사의 실전 말하기 연습과 개별 피드백", "출국 전 학습 진도와 참여 상태를 고려한 체계적인 관리"]
    },
    "short-term-study-toeic-speaking": {
        index: "PROJECT 11",
        category: "KONYANG UNIVERSITY · SHORT-TERM STUDY ABROAD",
        title: "해외대학 단기 어학연수 대비 실전 토익스피킹 역량 강화 프로그램",
        image: "images/해외대학 단기연수 수업 1.jpg",
        imageAlt: "해외대학 단기 어학연수 대비 실전 수업 현장",
        imageSecondary: "images/해외대학 단기연수 수업 2.jpg",
        imageSecondaryAlt: "해외대학 단기 어학연수 대비 소그룹 회화 수업",
        imageTertiary: "images/해외대학 단기연수 수업 3.jpg",
        imageTertiaryAlt: "원어민 강사의 실전 발음 및 회화 수업",
        summary: "미국과 필리핀 등 해외 대학의 단기 어학연수를 준비하는 학생들이 방학 기간을 활용해 출국 전 실전 영어 역량을 집중적으로 강화하는 프로그램입니다. 원어민 강사와 전문 강사가 회화 수업, TOEIC Speaking 훈련, 상황별 실전 활동을 병행해 현지 수업과 생활에 원활하게 적응하도록 지원합니다.",
        audience: "해외 단기 어학연수 예정 대학생",
        format: "방학 집중 회화·TOEIC Speaking 과정",
        points: ["원어민 강사와 함께하는 실전 발음 및 회화 훈련", "TOEIC Speaking 유형별 답변 구성과 말하기 연습", "해외 대학 수업과 현지 생활을 고려한 상황별 활동"]
    },
    "seocheon-youth-english-camp": {
        index: "PROJECT 12",
        category: "SEOCHEON COUNTY · YOUTH ENGLISH CAMP",
        title: "서천군 영어캠프",
        image: "images/서천군 영어캠프 수료식.jpg",
        imageAlt: "서천군 청소년 영어캠프 발표회 및 수료식",
        imageSecondary: "images/서천군 영어캠프 활동 1.jpg",
        imageSecondaryAlt: "서천군 영어캠프 청소년 협업 프로젝트 활동",
        imageTertiary: "images/서천군 영어캠프 활동 2.jpg",
        imageTertiaryAlt: "서천군 영어캠프 창의 체험 활동",
        imageQuaternary: "images/서천군 영어캠프 활동 3.jpg",
        imageQuaternaryAlt: "서천군 영어캠프 학생 참여형 학습 활동",
        summary: "서천군 지역 내 초등학생과 중학생이 학교 공간에서 일정 기간 함께 생활하고 학습하며 영어에 대한 자신감과 실력을 키우는 몰입형 청소년 캠프입니다. 영어 수업과 협업 프로젝트, 창의 체험 활동, 발표회를 연결해 학생들이 자연스럽게 소통하고 성취감을 경험하며 성장하도록 지원합니다.",
        audience: "서천군 소재 초·중등 학생",
        format: "학교 연계 몰입형 청소년 영어캠프",
        points: ["영어 사용에 대한 부담을 낮추는 참여형 수업", "협업 프로젝트와 체험 활동을 통한 실전 의사소통", "발표회와 수료 과정을 통한 자신감 및 성취감 강화"]
    },
    "foreign-language-competency": {
        index: "PROJECT 13",
        category: "KONYANG UNIVERSITY · LANGUAGE COMPETENCY",
        title: "외국어 활용 역량강화 교육",
        image: "images/외국어 활용역량 토익중급반.png",
        imageAlt: "건양대학교 프리미엄 TOEIC 중급 과정 단체사진",
        imageSecondary: "images/외국어 활용역량 임상의약학과 토익반.jpg",
        imageSecondaryAlt: "외국어 활용 역량강화 교육 임상의약학과 TOEIC반 단체사진",
        imageTertiary: "images/외국어 활용역량 토익1반.jpg",
        imageTertiaryAlt: "외국어 활용 역량강화 교육 TOEIC 1반 단체사진",
        imageQuaternary: "images/외국어 활용역량 토익 수업.jpg",
        imageQuaternaryAlt: "외국어 활용 역량강화 TOEIC 수업 현장",
        imageQuinary: "images/외국어 활용역량 지텔프 수업.jpg",
        imageQuinaryAlt: "외국어 활용 역량강화 G-TELP 수업 현장",
        summary: "교내 학기 중 학생들의 외국어 활용 역량과 학습 자신감을 함께 높이기 위해 운영하는 맞춤형 어학 교육 프로그램입니다. TOEIC, TOEIC Speaking, G-TELP 등 학생들의 전공과 목표에 필요한 과정을 수준별로 구성하고, 실전 문제 풀이와 반복 훈련을 통해 구체적인 성취를 지원합니다.",
        audience: "외국어 역량 향상을 원하는 대학생",
        format: "학기 중 수준별 시험·실전 어학 과정",
        points: ["TOEIC·TOEIC Speaking·G-TELP 과정별 맞춤 수업", "학과와 학습 수준을 고려한 반별 교육 운영", "반복적인 실전 훈련을 통한 성적 및 자신감 향상"]
    },
    "military-dys": {
        index: "PROJECT 14",
        category: "KONYANG UNIVERSITY · MILITARY DESIGN YOUR SPEC",
        title: "군사 DYS",
        image: "images/군사 DYS 수업 1.jpg",
        imageAlt: "군사학과 신입생 군사 DYS TOEIC 수업 현장",
        imageSecondary: "images/군사 DYS 수업 2.jpg",
        imageSecondaryAlt: "군사 DYS 영어 역량강화 수업 현장",
        imageTertiary: "images/군사 DYS 수업 3.jpg",
        imageTertiaryAlt: "군사 DYS TOEIC 집중 학습 현장",
        imageQuaternary: "images/군사 DYS 수업 4.jpg",
        imageQuaternaryAlt: "군사 DYS 영어 회화 수업 현장",
        summary: "군사 DYS는 국제 DYS와 별도로 군사학과 신입생을 위해 설계한 ‘Design Your Spec’ 프로그램입니다. 군사학과의 진로 특성과 학습 목표를 반영한 TOEIC 교육과 영어 회화 수업을 통해 신입생의 어학 역량, 의사소통 자신감, 향후 진로 경쟁력을 체계적으로 높입니다.",
        audience: "군사학과 신입생",
        format: "군사학과 맞춤 TOEIC·영어 회화 과정",
        points: ["군사학과 신입생의 수준을 고려한 TOEIC 교육", "실용적인 의사소통 능력을 높이는 영어 회화 수업", "전공 진로와 어학 역량을 연결한 Design Your Spec 과정"]
    }
};

function selectProgramSlide(index) {
    const imageContainer = document.querySelector(".program-detail-image");
    const images = [...(imageContainer?.querySelectorAll(":scope > img[data-program-image]") || [])];
    const dots = [...(programImageDots?.querySelectorAll("[data-program-slide]") || [])].filter((dot) => !dot.hidden);
    images.forEach((image, imageIndex) => {
        const isActive = imageIndex === index;
        image.classList.toggle("active", isActive);
        image.hidden = !isActive;
    });
    dots.forEach((dot, dotIndex) => {
        const isActive = dotIndex === index;
        dot.classList.toggle("active", isActive);
        dot.setAttribute("aria-selected", String(isActive));
    });
    if (imageContainer) imageContainer.dataset.activeSlide = String(index);
}

function startProgramCarousel() {
    window.clearInterval(programCarouselTimer);
    if (programImageDots?.hidden || reducedMotion.matches) return;
    programCarouselTimer = window.setInterval(() => {
        const imageContainer = document.querySelector(".program-detail-image");
        const imageCount = imageContainer?.querySelectorAll(":scope > img[data-program-image]").length || 1;
        const nextIndex = (Number(imageContainer?.dataset.activeSlide || 0) + 1) % imageCount;
        selectProgramSlide(nextIndex);
    }, 4500);
}

programImageDots?.querySelectorAll("[data-program-slide]").forEach((dot) => {
    dot.addEventListener("click", () => {
        selectProgramSlide(Number(dot.dataset.programSlide));
        startProgramCarousel();
    });
});

function openProgramModal(programKey) {
    const program = programDetails[programKey];
    if (!programModal || !program) return;

    window.clearTimeout(programCloseTimer);
    programLastFocused = document.activeElement;
    document.getElementById("program-index").textContent = program.index;
    document.getElementById("program-category").textContent = program.category;
    document.getElementById("program-title").textContent = program.title;
    document.getElementById("program-summary").textContent = program.summary;
    document.getElementById("program-audience").textContent = program.audience;
    document.getElementById("program-format").textContent = program.format;

    const programImages = [
        { src: program.image, alt: program.imageAlt },
        { src: program.imageSecondary, alt: program.imageSecondaryAlt },
        { src: program.imageTertiary, alt: program.imageTertiaryAlt },
        { src: program.imageQuaternary, alt: program.imageQuaternaryAlt },
        { src: program.imageQuinary, alt: program.imageQuinaryAlt }
    ].filter((item) => item.src);
    const imageElements = [
        document.getElementById("program-image"),
        document.getElementById("program-image-secondary"),
        document.getElementById("program-image-tertiary"),
        document.getElementById("program-image-quaternary"),
        document.getElementById("program-image-quinary")
    ];
    const imageContainer = imageElements[0].closest(".program-detail-image");
    const programDots = [...programImageDots.querySelectorAll("[data-program-slide]")];

    imageElements.forEach((image, index) => {
        const imageData = programImages[index];
        image.toggleAttribute("data-program-image", Boolean(imageData));
        image.classList.toggle("active", index === 0 && Boolean(imageData));
        image.hidden = index !== 0 || !imageData;
        if (imageData) {
            image.src = imageData.src;
            image.alt = imageData.alt;
        } else {
            image.removeAttribute("src");
            image.alt = "";
        }
    });
    programDots.forEach((dot, index) => {
        dot.hidden = index >= programImages.length;
    });

    const showWholeImage = program.imageFit === "contain";
    imageContainer.classList.toggle("fit-whole", showWholeImage);
    if (showWholeImage) imageContainer.style.setProperty("--program-image-bg", `url("${program.image}")`);
    else imageContainer.style.removeProperty("--program-image-bg");
    if (programImages.length > 1) {
        imageContainer.classList.add("carousel-images");
        programImageDots.hidden = false;
        selectProgramSlide(0);
        startProgramCarousel();
    } else {
        window.clearInterval(programCarouselTimer);
        imageContainer.classList.remove("carousel-images");
        programImageDots.hidden = true;
    }

    const points = document.getElementById("program-points");
    const pointItems = program.points.map((point) => {
        const item = document.createElement("li");
        item.textContent = point;
        return item;
    });
    points.replaceChildren(...pointItems);

    programModal.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => {
        programModal.classList.add("open");
        programModal.querySelector(".program-close")?.focus();
    });
}

function closeProgramModal() {
    if (!programModal) return;
    window.clearInterval(programCarouselTimer);
    programModal.classList.remove("open");
    document.body.classList.remove("modal-open");
    programCloseTimer = window.setTimeout(() => {
        programModal.hidden = true;
        programLastFocused?.focus();
    }, 250);
}

programOpenButtons.forEach((button) => {
    button.addEventListener("click", () => openProgramModal(button.dataset.program));
});
programCloseButtons.forEach((button) => button.addEventListener("click", closeProgramModal));
programInquiryButton?.addEventListener("click", () => {
    closeProgramModal();
    window.setTimeout(openInquiryModal, 260);
});

programModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeProgramModal();
        return;
    }

    if (event.key !== "Tab") return;
    const focusable = [...programModal.querySelectorAll("button, [href]")]
        .filter((element) => !element.disabled && element.offsetParent !== null);
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

function goBusiness() {
    document.getElementById("business")?.scrollIntoView({ behavior: "smooth" });
}

function contactUs() {
    openInquiryModal();
}

function openInquiryModal() {
    if (!inquiryModal) return;
    window.clearTimeout(inquiryCloseTimer);
    inquiryLastFocused = document.activeElement;
    inquiryModal.hidden = false;
    document.body.classList.add("modal-open");
    requestAnimationFrame(() => {
        inquiryModal.classList.add("open");
        inquiryModal.querySelector(".inquiry-form input")?.focus();
    });
}

function closeInquiryModal() {
    if (!inquiryModal) return;
    inquiryModal.classList.remove("open");
    document.body.classList.remove("modal-open");
    inquiryCloseTimer = window.setTimeout(() => {
        inquiryModal.hidden = true;
        inquiryLastFocused?.focus();
    }, 250);
}

inquiryOpenButtons.forEach((button) => button.addEventListener("click", openInquiryModal));
inquiryCloseButtons.forEach((button) => button.addEventListener("click", closeInquiryModal));

inquiryModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeInquiryModal();
        return;
    }

    if (event.key !== "Tab") return;
    const focusable = [...inquiryModal.querySelectorAll("button, input, select, textarea, [href]")]
        .filter((element) => !element.disabled && element.offsetParent !== null);
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

inquiryForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!inquiryForm.reportValidity()) return;

    const data = new FormData(inquiryForm);
    const submitButton = inquiryForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    if (inquiryStatus) inquiryStatus.textContent = "문의 내용을 접수하고 있습니다...";

    try {
        if (!window.myEducationSupabase) throw new Error("문의 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
        await window.myEducationSupabase.insertInquiry({
            user_id: authenticatedUser?.id || null,
            organization: String(data.get("organization") || "").trim(),
            name: String(data.get("name") || "").trim(),
            email: String(data.get("email") || "").trim().toLowerCase(),
            phone: String(data.get("phone") || "").trim(),
            program: String(data.get("program") || "").trim(),
            preferred_schedule: String(data.get("schedule") || "").trim() || null,
            message: String(data.get("message") || "").trim(),
            consent: data.get("consent") === "on"
        });
        inquiryForm.reset();
        if (inquiryStatus) inquiryStatus.textContent = "문의가 접수되었습니다. 확인 후 연락드리겠습니다.";
        window.setTimeout(closeInquiryModal, 1800);
    } catch (error) {
        if (inquiryStatus) inquiryStatus.textContent = error.message || "문의 접수 중 오류가 발생했습니다.";
    } finally {
        submitButton.disabled = false;
    }
});

function closeMenu() {
    menuButton?.classList.remove("active");
    navigation?.classList.remove("open");
    document.body.classList.remove("menu-open");
    menuButton?.setAttribute("aria-expanded", "false");
    menuButton?.setAttribute("aria-label", "메뉴 열기");
}

menuButton?.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");
    menuButton.classList.toggle("active", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
});

navLinks.forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("resize", () => { if (window.innerWidth > 980) closeMenu(); });

const faqButtons = [...document.querySelectorAll(".faq-question")];

faqButtons.forEach((button) => {
    button.addEventListener("click", () => {
        const currentItem = button.closest(".faq-item");
        const currentAnswer = document.getElementById(button.getAttribute("aria-controls"));
        const willOpen = button.getAttribute("aria-expanded") !== "true";

        faqButtons.forEach((otherButton) => {
            const otherItem = otherButton.closest(".faq-item");
            const otherAnswer = document.getElementById(otherButton.getAttribute("aria-controls"));
            otherButton.setAttribute("aria-expanded", "false");
            otherItem?.classList.remove("open");
            if (otherAnswer) otherAnswer.hidden = true;
        });

        if (willOpen) {
            button.setAttribute("aria-expanded", "true");
            currentItem?.classList.add("open");
            if (currentAnswer) currentAnswer.hidden = false;
        }
    });
});

function updateHeader() {
    header?.classList.toggle("scrolled", window.scrollY > 20);
}

updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const revealElements = document.querySelectorAll(".reveal");
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        entry.target.classList.toggle("revealed", entry.isIntersecting);
    });
}, { threshold: 0.12, rootMargin: "0px 0px -70px" });

revealElements.forEach((element) => revealObserver.observe(element));

const sections = document.querySelectorAll("main section[id]");
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        navLinks.forEach((link) => {
            link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
        });
    });
}, { rootMargin: "-35% 0px -58%", threshold: 0 });

sections.forEach((section) => sectionObserver.observe(section));

// Member authentication
const authModal = document.getElementById("auth-modal");
const authOpenButton = document.getElementById("auth-open-button");
const authCloseButtons = [...document.querySelectorAll("[data-auth-close]")];
const loginTab = document.getElementById("login-tab");
const registerTab = document.getElementById("register-tab");
const authTabs = document.querySelector(".auth-tabs");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");
const findIdForm = document.getElementById("find-id-form");
const passwordResetForm = document.getElementById("password-reset-form");
const loginStatus = document.getElementById("login-status");
const registerStatus = document.getElementById("register-status");
const findIdStatus = document.getElementById("find-id-status");
const passwordResetStatus = document.getElementById("password-reset-status");
const userMenu = document.getElementById("user-menu");
const userMenuButton = document.getElementById("user-menu-button");
const userMenuPanel = document.getElementById("user-menu-panel");
const logoutButton = document.getElementById("logout-button");
const authToast = document.getElementById("auth-toast");
let authLastFocused = null;
let authCloseTimer = null;
let toastTimer = null;
let authenticatedUser = null;

function showAuthToast(message) {
    if (!authToast) return;
    window.clearTimeout(toastTimer);
    authToast.textContent = message;
    authToast.hidden = false;
    toastTimer = window.setTimeout(() => { authToast.hidden = true; }, 3200);
}

function switchAuthView(view) {
    const showLogin = view === "login";
    const showRegister = view === "register";
    loginTab?.classList.toggle("active", showLogin);
    registerTab?.classList.toggle("active", showRegister);
    loginTab?.setAttribute("aria-selected", String(showLogin));
    registerTab?.setAttribute("aria-selected", String(showRegister));
    if (authTabs) authTabs.hidden = !showLogin && !showRegister;
    if (loginForm) loginForm.hidden = !showLogin;
    if (registerForm) registerForm.hidden = !showRegister;
    if (findIdForm) findIdForm.hidden = view !== "find-id";
    if (passwordResetForm) passwordResetForm.hidden = view !== "reset-password";
    [loginStatus, registerStatus, findIdStatus, passwordResetStatus].forEach((status) => {
        if (!status) return;
        status.textContent = "";
        status.classList.remove("success");
    });

    const copy = {
        login: ["다시 만나 반가워요.", "로그인하고 마이에듀케이션의 서비스를 이용해 보세요."],
        register: ["함께 시작해 볼까요?", "간단한 정보만 입력하면 바로 회원이 될 수 있어요."],
        "find-id": ["가입 아이디를 확인해요.", "가입할 때 입력한 이름과 연락처를 알려 주세요."],
        "reset-password": ["비밀번호를 다시 설정해요.", "가입 이메일로 안전한 재설정 링크를 보내드릴게요."]
    }[view] || ["다시 만나 반가워요.", "로그인하고 마이에듀케이션의 서비스를 이용해 보세요."];
    document.getElementById("auth-title").textContent = copy[0];
    document.getElementById("auth-description").textContent = copy[1];
    const activeForm = { login: loginForm, register: registerForm, "find-id": findIdForm, "reset-password": passwordResetForm }[view];
    activeForm?.querySelector("input")?.focus();
}

function switchAuthTab(tab) {
    switchAuthView(tab);
}

function openAuthModal(tab = "login") {
    if (!authModal) return;
    window.clearTimeout(authCloseTimer);
    authLastFocused = document.activeElement;
    authModal.hidden = false;
    document.body.classList.add("modal-open");
    switchAuthTab(tab);
    requestAnimationFrame(() => authModal.classList.add("open"));
}

function closeAuthModal() {
    if (!authModal) return;
    authModal.classList.remove("open");
    document.body.classList.remove("modal-open");
    authCloseTimer = window.setTimeout(() => {
        authModal.hidden = true;
        authLastFocused?.focus();
    }, 250);
}

function renderAuthState(user) {
    authenticatedUser = user || null;
    if (!authOpenButton || !userMenu) return;
    authOpenButton.hidden = Boolean(user);
    userMenu.hidden = !user;
    userMenuPanel.hidden = true;
    userMenuButton?.setAttribute("aria-expanded", "false");
    if (!user) return;
    document.getElementById("user-name").textContent = `${user.name}님`;
    document.getElementById("user-email").textContent = user.email;
    const avatarImage = document.getElementById("user-avatar-image");
    const avatarFallback = document.getElementById("user-avatar-fallback");
    avatarFallback.textContent = user.name.slice(0, 1).toUpperCase();
    if (user.avatarUrl) {
        avatarImage.src = user.avatarUrl;
        avatarImage.hidden = false;
        avatarFallback.hidden = true;
    } else {
        avatarImage.removeAttribute("src");
        avatarImage.hidden = true;
        avatarFallback.hidden = false;
    }
}

authOpenButton?.addEventListener("click", () => openAuthModal("login"));
authCloseButtons.forEach((button) => button.addEventListener("click", closeAuthModal));
loginTab?.addEventListener("click", () => switchAuthTab("login"));
registerTab?.addEventListener("click", () => switchAuthTab("register"));
document.querySelectorAll("[data-auth-view]").forEach((button) => {
    button.addEventListener("click", () => switchAuthView(button.dataset.authView));
});

userMenuButton?.addEventListener("click", () => {
    const willOpen = userMenuPanel.hidden;
    userMenuPanel.hidden = !willOpen;
    userMenuButton.setAttribute("aria-expanded", String(willOpen));
});

document.addEventListener("click", (event) => {
    if (userMenu && !userMenu.contains(event.target)) {
        userMenuPanel.hidden = true;
        userMenuButton?.setAttribute("aria-expanded", "false");
    }
});

authModal?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") return closeAuthModal();
    if (event.key !== "Tab") return;
    const focusable = [...authModal.querySelectorAll("button, input")].filter((element) => !element.hidden && element.offsetParent !== null);
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

loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    const submitButton = loginForm.querySelector("button[type='submit']");
    const formData = new FormData(loginForm);
    loginStatus.textContent = "";
    submitButton.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("로그인 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
        const user = await window.myEducationSupabase.signIn(formData.get("email"), formData.get("password"));
        renderAuthState(user);
        loginForm.reset();
        closeAuthModal();
        closeMenu();
        showAuthToast(`${user.name}님, 환영합니다.`);
    } catch (error) {
        loginStatus.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

findIdForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!findIdForm.reportValidity()) return;
    const submitButton = findIdForm.querySelector("button[type='submit']");
    const formData = new FormData(findIdForm);
    findIdStatus.classList.remove("success");
    findIdStatus.textContent = "가입 정보를 확인하고 있습니다...";
    submitButton.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("계정 찾기 서비스를 불러오지 못했습니다.");
        const maskedEmail = await window.myEducationSupabase.findMemberId(formData.get("name"), formData.get("phone"));
        findIdStatus.classList.toggle("success", Boolean(maskedEmail));
        findIdStatus.textContent = maskedEmail
            ? `회원님의 아이디는 ${maskedEmail} 입니다.`
            : "일치하는 가입 정보를 찾지 못했습니다. 이름과 연락처를 확인해 주세요.";
    } catch (error) {
        findIdStatus.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

passwordResetForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!passwordResetForm.reportValidity()) return;
    const submitButton = passwordResetForm.querySelector("button[type='submit']");
    const formData = new FormData(passwordResetForm);
    passwordResetStatus.classList.remove("success");
    passwordResetStatus.textContent = "재설정 메일을 보내고 있습니다...";
    submitButton.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("비밀번호 찾기 서비스를 불러오지 못했습니다.");
        await window.myEducationSupabase.requestPasswordReset(formData.get("email"));
        passwordResetForm.reset();
        passwordResetStatus.classList.add("success");
        passwordResetStatus.textContent = "가입된 이메일이라면 재설정 링크가 전송됩니다. 받은편지함을 확인해 주세요.";
    } catch (error) {
        passwordResetStatus.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!registerForm.reportValidity()) return;
    const submitButton = registerForm.querySelector("button[type='submit']");
    const formData = new FormData(registerForm);
    registerStatus.textContent = "";
    if (formData.get("password") !== formData.get("passwordConfirm")) {
        registerStatus.textContent = "비밀번호가 서로 일치하지 않습니다.";
        return;
    }
    submitButton.disabled = true;
    try {
        if (!window.myEducationSupabase) throw new Error("회원가입 서비스를 불러오지 못했습니다. 페이지를 새로고침해 주세요.");
        const result = await window.myEducationSupabase.signUp(formData.get("name"), formData.get("email"), formData.get("password"), formData.get("phone"));
        registerForm.reset();
        closeAuthModal();
        closeMenu();
        if (result.needsEmailConfirmation) {
            renderAuthState(null);
            showAuthToast("가입을 환영합니다! 입력한 주소로 인증 메일을 보냈습니다.");
        } else {
            renderAuthState(result.user);
            showAuthToast(`${result.user.name}님, 가입이 완료되었습니다.`);
        }
    } catch (error) {
        registerStatus.textContent = error.message;
    } finally {
        submitButton.disabled = false;
    }
});

logoutButton?.addEventListener("click", async () => {
    try {
        if (!window.myEducationSupabase) throw new Error("로그아웃 서비스를 불러오지 못했습니다.");
        await window.myEducationSupabase.signOut();
        renderAuthState(null);
        closeMenu();
        showAuthToast("안전하게 로그아웃되었습니다.");
    } catch (error) {
        showAuthToast(error.message);
    }
});

if (window.myEducationSupabase) {
    window.myEducationSupabase.getCurrentUser()
    .then((user) => {
        renderAuthState(user);
        const url = new URL(window.location.href);
        if (url.searchParams.get("account") === "deleted") {
            showAuthToast("회원 탈퇴가 완료되었습니다. 그동안 이용해 주셔서 감사합니다.");
            url.searchParams.delete("account");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
        if (!user && url.searchParams.get("auth") === "login") {
            openAuthModal("login");
            url.searchParams.delete("auth");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
    })
    .catch((error) => {
        renderAuthState(null);
        showAuthToast(error.message);
    });
    window.myEducationSupabase.onAuthStateChange(renderAuthState);
} else {
    renderAuthState(null);
}
