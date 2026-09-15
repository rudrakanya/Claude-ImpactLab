// About: problem framing, how it works, what is inside, constraints, how Claude was used, and a 90-second demo script.
import { t, tt } from "../i18n.js";
import { esc, icon } from "../ui.js";
import { CATALOGUE } from "../data/catalogue.js";
import { JOB_SKILLS } from "../data/job_skills.js";
import { CAPSTONES } from "../data/capstones.js";
import { QUIZ_BANK } from "../data/quiz_bank.js";
import { WORK } from "../data/work_categories.js";

export function render(root, ctx) {
  const nQuiz = Object.values(QUIZ_BANK).filter(Array.isArray).flat(2).length;
  const sec = (title, body) => `<section class="glass card"><h2>${title}</h2>${body}</section>`;
  const li = (items) => `<ul style="padding-left:18px;margin:0" class="stack">${items.map((x) => `<li>${x}</li>`).join("")}</ul>`;
  root.innerHTML = `
    <section class="glass card hero"><div class="tag accent" style="margin-bottom:10px">${icon("map")} ${esc(t("about"))}</div>
      <h1>${esc(t("appName"))}</h1>
      <p class="lead">${esc(tt({ en: "A guidance tool for self-directed technology learners in Bhopal. Content is abundant; sequencing, feedback and local relevance are absent. This closes that gap on a phone, offline, from free resources only.", hi: "भोपाल के स्व-निर्देशित टेक सीखने वालों के लिए मार्गदर्शन टूल। सामग्री बहुत है; क्रम, फ़ीडबैक और स्थानीय प्रासंगिकता नहीं। यह उस कमी को फ़ोन पर, ऑफ़लाइन, सिर्फ़ मुफ़्त संसाधनों से भरता है।" }))}</p></section>
    ${sec(esc(tt({ en: "The problem", hi: "समस्या" })), `<p>${esc(tt({ en: "Young people in Bhopal learn technology on their own, on phones, from free videos and paid roadmap courses that are identical for every learner. With few visible local employers, learners cannot tell what to learn next, in what order, or toward what realistic work. Digital literacy is uneven: many start without a working model of files, accounts or basic tooling. The result is drop-off, wasted spending, and skills that do not map to work within reach.", hi: "भोपाल के युवा तकनीक खुद सीखते हैं, फ़ोन पर, मुफ़्त वीडियो और हर सीखने वाले के लिए एक जैसे पेड रोडमैप कोर्स से। कम दिखने वाले स्थानीय नियोक्ताओं के कारण वे नहीं जान पाते आगे क्या सीखें, किस क्रम में, और किस वास्तविक काम की ओर। डिजिटल साक्षरता असमान है। नतीजा: छोड़ देना, खर्च की बर्बादी, और ऐसी स्किल जो पहुंच के भीतर काम से नहीं जुड़तीं।" }))}</p>`)}
    ${sec(esc(tt({ en: "What this does differently", hi: "यह अलग क्या करता है" })), li([
      esc(tt({ en: "Deep, structured intake in under five minutes: objective, device, weekly time, English comfort and tech familiarity on linear scales, an 8-item prior-exposure checklist, and a subject picker over 96 roles/skills plus 105 locally in-demand skills.", hi: "पांच मिनट से कम में गहरी, संरचित जानकारी: लक्ष्य, डिवाइस, साप्ताहिक समय, अंग्रेज़ी सहजता और तकनीकी परिचय, 8-आइटम अनुभव सूची, और 96 भूमिकाओं/स्किल व 105 स्थानीय मांग वाली स्किल पर विषय चयन।" })),
      esc(tt({ en: "An adaptive level check cross-checks self-rating against demonstrated competence before any path is built.", hi: "रास्ता बनने से पहले एक अनुकूली स्तर जांच आत्म-मूल्यांकन को प्रदर्शित क्षमता से मिलाती है।" })),
      esc(tt({ en: "Path mapping is a deterministic lookup against a bundled catalogue: same inputs, same path, fully offline, no server.", hi: "रास्ता बंडल की गई कैटलॉग पर एक निश्चित लुकअप है: वही इनपुट, वही रास्ता, पूरी तरह ऑफ़लाइन, कोई सर्वर नहीं।" })),
      esc(tt({ en: "Every step carries a self-checkable checkpoint project; every track and tier has a capstone with acceptance criteria. Promotion needs evidence, capstone and an exit check, never elapsed time.", hi: "हर कदम पर स्व-जांच योग्य चेकपॉइंट प्रोजेक्ट; हर ट्रैक और स्तर पर स्वीकृति मानदंड वाला कैपस्टोन। पदोन्नति के लिए सबूत, कैपस्टोन और एग्ज़िट जांच चाहिए, समय नहीं।" })),
      esc(tt({ en: "Local relevance: each track shows categories of work in Bhopal, Indore or remote, and which in-demand fresher skills your path covers or misses, with one-tap free resources to fill gaps.", hi: "स्थानीय प्रासंगिकता: हर ट्रैक भोपाल, इंदौर या रिमोट में काम की श्रेणियां दिखाता है, और कौन सी मांग वाली फ्रेशर स्किल आपका रास्ता कवर करता या छोड़ता है, कमी भरने के लिए एक-टैप मुफ़्त संसाधनों के साथ।" })),
      esc(tt({ en: "Hindi and English throughout, tap-to-explain glossary, a tooling-basics module for first-time users, and a printable mentor one-pager.", hi: "हर जगह हिंदी और अंग्रेज़ी, टैप-करके-समझें शब्दकोश, पहली बार वालों के लिए टूलिंग बेसिक्स, और प्रिंट योग्य मेंटर एक-पेज सारांश।" })),
    ]))}
    ${sec(esc(tt({ en: "What is inside", hi: "अंदर क्या है" })), `<div class="impact-strip" style="margin-top:0">
      <div><b>${CATALOGUE.length}</b><span>${esc(tt({ en: "free resources", hi: "मुफ़्त संसाधन" }))}</span></div>
      <div><b>14 × 4</b><span>${esc(tt({ en: "tracks × tiers", hi: "ट्रैक × स्तर" }))}</span></div>
      <div><b>${Object.keys(CAPSTONES).length}</b><span>${esc(tt({ en: "capstones", hi: "कैपस्टोन" }))}</span></div>
      <div><b>${nQuiz}</b><span>${esc(tt({ en: "quiz items", hi: "क्विज़ सवाल" }))}</span></div>
      <div><b>${JOB_SKILLS.skills.length}</b><span>${esc(tt({ en: "local skills", hi: "स्थानीय स्किल" }))}</span></div>
      <div><b>${WORK.categories.length}</b><span>${esc(tt({ en: "work categories", hi: "काम श्रेणियां" }))}</span></div></div>
      <p class="small muted" style="margin-top:12px">${esc(tt({ en: "Sources: the Master Course-Level Tech Learning Catalogue for Bhopal (2026) and its CSV, the roadmap.sh export of 96 roles and skills, a ranked sheet of 105 in-demand fresher skills from local and remote-India postings, and hand-authored mentor pathways, capstones, quiz bank, glossary and anonymised work categories.", hi: "स्रोत: भोपाल के लिए मास्टर कोर्स-स्तर टेक लर्निंग कैटलॉग (2026) और उसकी CSV, 96 भूमिकाओं/स्किल का roadmap.sh निर्यात, स्थानीय और रिमोट-इंडिया भर्तियों से 105 मांग वाली फ्रेशर स्किल की रैंक सूची, और हाथ से लिखे मेंटर रास्ते, कैपस्टोन, क्विज़ बैंक, शब्दकोश और अनाम काम श्रेणियां।" }))}</p>`)}
    ${sec(esc(tt({ en: "Constraints we hold to", hi: "जिन सीमाओं पर हम कायम हैं" })), li([
      esc(tt({ en: "No employment promises. Work panels name categories and skills only, and say so next to every panel.", hi: "रोज़गार का कोई वादा नहीं। काम के पैनल सिर्फ़ श्रेणियां और स्किल बताते हैं, और हर पैनल के पास यही लिखा है।" })),
      esc(tt({ en: "Only resources whose terms permit free learning access; each card shows its own cost terms, language, Hindi availability and last-verified status.", hi: "सिर्फ़ ऐसे संसाधन जिनकी शर्तें मुफ़्त सीखने की अनुमति देती हैं; हर कार्ड अपनी लागत शर्तें, भाषा, हिंदी उपलब्धता और अंतिम जांच स्थिति दिखाता है।" })),
      esc(tt({ en: "Guest by default. Intake, quiz and progress live only in this session unless you save to this device or sign in. Nothing is uploaded silently.", hi: "डिफ़ॉल्ट रूप से अतिथि। जब तक आप डिवाइस पर सहेजें या साइन इन न करें, सब कुछ सिर्फ़ इस सत्र में रहता है। कुछ भी चुपचाप अपलोड नहीं होता।" })),
      esc(tt({ en: "Mobile-first, light on bandwidth: no images, no web fonts, one cached load and it works offline.", hi: "मोबाइल-प्रथम, कम बैंडविड्थ: कोई इमेज नहीं, कोई वेब फ़ॉन्ट नहीं, एक बार लोड और ऑफ़लाइन चलता है।" })),
    ]))}
    ${sec(esc(tt({ en: "How Claude is used", hi: "Claude का उपयोग कैसे हुआ" })), li([
      esc(tt({ en: "Authoring the reference data with a mentor's judgment: 56 capstones with acceptance criteria, the 116-item level-check bank, the bilingual glossary, 13 reference pathways, and the anonymised work categories were drafted with Claude and checked against the catalogue.", hi: "मेंटर के विवेक से संदर्भ डेटा लिखना: 56 कैपस्टोन, 116 स्तर जांच सवाल, द्विभाषी शब्दकोश, 13 संदर्भ रास्ते और अनाम काम श्रेणियां Claude से बनाई और कैटलॉग से जांची गईं।" })),
      esc(tt({ en: "Building the app itself with Claude Code, including the test suite that checks generated paths against mentor-written expected next steps.", hi: "ऐप खुद Claude Code से बनाया गया, उस टेस्ट सूट सहित जो बने रास्तों को मेंटर के लिखे अपेक्षित अगले कदमों से जांचता है।" })),
      esc(tt({ en: "At runtime, deliberately none: the path is deterministic and offline so it behaves identically for every learner on a weak connection. Instead, one tap copies a structured prompt with your plan that you can paste into Claude for a plain-language explanation, a weekly schedule, or a mentor-style review.", hi: "रनटाइम पर जानबूझकर कुछ नहीं: रास्ता निश्चित और ऑफ़लाइन है ताकि कमज़ोर कनेक्शन पर भी हर सीखने वाले के लिए एक जैसा चले। इसके बजाय, एक टैप आपकी योजना वाला संरचित प्रॉम्प्ट कॉपी करता है जिसे आप सरल व्याख्या, साप्ताहिक योजना या मेंटर-शैली समीक्षा के लिए Claude में चिपका सकते हैं।" })),
    ]))}
    ${sec(esc(tt({ en: "90-second demo", hi: "90 सेकंड का डेमो" })), `<ol style="padding-left:18px;margin:0" class="stack">
      <li>${esc(tt({ en: "Home: pick a common goal such as \"Get into data work\". Note the guest notice.", hi: "होम: \"डेटा के काम में आएं\" जैसा आम लक्ष्य चुनें। अतिथि सूचना देखें।" }))}</li>
      <li>${esc(tt({ en: "Intake: phone only, 4 hours a week, English 2/5. Tap an underlined word to show the glossary. Answer No to the terminal and code questions.", hi: "शुरुआत: सिर्फ़ फ़ोन, 4 घंटे/हफ़्ता, अंग्रेज़ी 2/5। रेखांकित शब्द टैप कर शब्दकोश दिखाएं। टर्मिनल और कोड के सवालों पर नहीं चुनें।" }))}</li>
      <li>${esc(tt({ en: "Level check: answer two questions correctly and watch the level move up; the result screen explains the difference from the self-rating.", hi: "स्तर जांच: दो सवाल सही दें और स्तर ऊपर जाते देखें; परिणाम स्क्रीन आत्म-मूल्यांकन से अंतर समझाती है।" }))}</li>
      <li>${esc(tt({ en: "Dashboard: switch to the calendar view, open a checkpoint, mark the first step done, finish its checkpoint and rate it. Show the in-demand skills panel and add a free resource for a gap.", hi: "डैशबोर्ड: कैलेंडर दृश्य में जाएं, चेकपॉइंट खोलें, पहला कदम पूरा करें, चेकपॉइंट पूरा कर आंकें। मांग वाली स्किल पैनल दिखाएं और कमी के लिए मुफ़्त संसाधन जोड़ें।" }))}</li>
      <li>${esc(tt({ en: "Toggle Hindi and the light theme, open the mentor one-pager, then Ask Claude to copy the mentor-review prompt.", hi: "हिंदी और लाइट थीम बदलें, मेंटर एक-पेज सारांश खोलें, फिर Ask Claude से मेंटर-समीक्षा प्रॉम्प्ट कॉपी करें।" }))}</li>
      <li>${esc(tt({ en: "Turn off the network and reload: everything still works.", hi: "नेटवर्क बंद कर रीलोड करें: सब कुछ अब भी चलता है।" }))}</li></ol>`)}
    <div class="row" style="justify-content:center"><button class="btn btn-primary" id="go">${icon("arrowRight")} ${esc(t("start"))}</button></div>`;
  root.querySelector("#go").onclick = () => ctx.go("home");
}
