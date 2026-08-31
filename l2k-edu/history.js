const header = document.getElementById("site-header");
const menuButton = document.querySelector(".menu-button");
const navigation = document.getElementById("primary-nav");
const navigationLinks = [...document.querySelectorAll(".primary-nav a")];
const journeyVideo = document.getElementById("journey-video");

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

navigationLinks.forEach((link) => link.addEventListener("click", closeMenu));
window.addEventListener("scroll", updateHeader, { passive: true });
updateHeader();

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
        });
    }, { threshold: .12 });

    document.querySelectorAll(".reveal").forEach((element) => revealObserver.observe(element));
} else {
    document.querySelectorAll(".reveal").forEach((element) => element.classList.add("visible"));
}

if (journeyVideo && "IntersectionObserver" in window) {
    const videoObserver = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) journeyVideo.play().catch(() => {});
        else journeyVideo.pause();
    }, { threshold: .35 });
    videoObserver.observe(journeyVideo);
}

document.getElementById("current-year").textContent = new Date().getFullYear();
