"use strict";

const teamProfiles = [
    {
        name: "고대운",
        role: "주임",
        photo: "images/profiles/ko-daewoon.png",
        careers: [
            "전북대학교 졸업",
            "컴퓨터 활용 자격증 2급 보유",
            "TOEIC 830점 보유",
            "안전지도사 1급",
            "레크레이션지도자 1급",
            "다수의 대학 몰입 과정 참여 경력"
        ]
    },
    {
        name: "김민재",
        role: "매니저",
        photo: "images/profiles/kim-minjae.png",
        careers: [
            "한남대학교 졸업",
            "컴퓨터 활용 자격증 2급 보유",
            "TOEIC 900점 보유",
            "안전지도사 1급",
            "레크레이션지도자 1급",
            "다수의 대학 몰입 과정 참여 경력"
        ]
    },
    {
        name: "오상우",
        role: "매니저",
        photo: "images/profiles/oh-sangwoo.png",
        careers: [
            "우송대학교 졸업",
            "HSK 4급 보유",
            "TOEIC 865점 보유"
        ]
    }
];

const teams = {
    university: { index: "01", name: "대학교육팀" },
    career: { index: "02", name: "취·창업팀" },
    pr: { index: "03", name: "홍보팀" },
    online: { index: "04", name: "온라인 교육팀" },
    "video-english": { index: "05", name: "화상영어팀" }
};

const teamKey = new URLSearchParams(window.location.search).get("team") || "university";
const selectedTeam = teams[teamKey] || teams.university;
const teamGrid = document.getElementById("team-member-grid");

document.getElementById("team-index").textContent = `TEAM ${selectedTeam.index}`;
document.getElementById("team-title").textContent = selectedTeam.name;
document.getElementById("team-description").textContent = `${selectedTeam.name}에서 교육의 가치를 함께 설계하고 좋은 경험으로 완성하는 구성원입니다.`;
document.title = `${selectedTeam.name} 구성원 | 마이에듀케이션`;

teamGrid.replaceChildren(...teamProfiles.map((profile) => {
    const card = document.createElement("article");
    card.className = "team-member-card";

    const visual = document.createElement("div");
    visual.className = "team-member-visual";
    const photo = document.createElement("img");
    photo.src = profile.photo;
    photo.alt = `${profile.name} ${profile.role} 프로필 사진`;
    visual.append(photo);

    const content = document.createElement("div");
    content.className = "team-member-content";
    const role = document.createElement("p");
    role.className = "team-member-role";
    role.textContent = profile.role;
    const name = document.createElement("h2");
    name.textContent = profile.name;
    const label = document.createElement("span");
    label.textContent = "PROFILE";
    const careers = document.createElement("ul");
    careers.className = "team-member-careers";
    careers.replaceChildren(...profile.careers.map((career) => {
        const item = document.createElement("li");
        item.textContent = career;
        return item;
    }));

    content.append(role, name, label, careers);
    card.append(visual, content);
    return card;
}));
