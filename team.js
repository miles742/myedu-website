const teamProfiles = {
    "lee-heeyeon": {
        name: "이희연",
        role: "대표",
        initial: "이",
        photo: "images/profiles/lee-heeyeon.png",
        careers: [
            "Adalaide TAFE 동시통역학과 졸업",
            "現 마이에듀케이션 대표",
            "前 마이랭귀지 대표",
            "前 대전시청 전문 통역사",
            "토익브레이커 LC/RC 출간",
            "토익 X-peed 700 LC/RC 출간",
            "건양대, 국간사, 순천향대 등 다수 대학 토익 및 오픽 강의 진행",
            "건양대학교 학과별 학기 중 프로그램 토익스피킹 강의 진행",
            "건양대학교 서천군·계룡시 영어캠프 등 다수 영어캠프 운영",
            "건양대학교 계룡시 토익·토익스피킹 보조강사 활동",
            "건양대학교 방학 중 토익 몰입 교육 다수 운영"
        ]
    },
    "ko-daewoon": {
        name: "고대운",
        role: "주임",
        initial: "고",
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
    "kim-minjae": {
        name: "김민재",
        role: "매니저",
        initial: "김",
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
    "oh-sangwoo": {
        name: "오상우",
        role: "매니저",
        initial: "오",
        photo: "images/profiles/oh-sangwoo.png",
        careers: [
            "우송대학교 졸업",
            "HSK 4급 보유",
            "TOEIC 865점 보유"
        ]
    }
};

const profileKey = new URLSearchParams(window.location.search).get("member");
const profile = teamProfiles[profileKey] || teamProfiles["lee-heeyeon"];

document.getElementById("profile-name").textContent = profile.name;
document.getElementById("profile-role").textContent = profile.role;
const profileInitial = document.getElementById("profile-initial");
const profilePhoto = document.getElementById("profile-photo");

profileInitial.textContent = profile.initial;

if (profile.photo) {
    profilePhoto.src = profile.photo;
    profilePhoto.alt = `${profile.name} ${profile.role} 프로필 사진`;
    profilePhoto.hidden = false;
    profileInitial.hidden = true;
}

const profileCareers = document.getElementById("profile-careers");
if (profile.careers?.length) {
    profileCareers.replaceChildren(...profile.careers.map((career) => {
        const item = document.createElement("li");
        item.textContent = career;
        return item;
    }));
} else {
    const item = document.createElement("li");
    item.textContent = "상세 담당 업무와 주요 프로젝트 이력은 업데이트 예정입니다.";
    profileCareers.replaceChildren(item);
}

document.title = `${profile.name} ${profile.role} | 마이에듀케이션`;
