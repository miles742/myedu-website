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
