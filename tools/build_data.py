"""Build bundled, offline data modules for the app from the source files.

Inputs (repo root):
  master_course_list_v3.csv
  Master Course-Level Tech Learning Catalogue for Bhopal (2026).md   (picks table)
  roadmap-sh-export/all_roadmaps.csv
  data/*.json                                   (hand-authored: work categories, reference
                                                 pathways, quiz bank, capstones, glossary,
                                                 synthetic profiles)
Outputs:
  app/js/data/*.js   ES modules, identical for every learner, no runtime computation.

Run:  python tools/build_data.py
"""
import csv, json, re, os, sys, hashlib
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "app", "js", "data")
os.makedirs(OUT, exist_ok=True)

TRACKS = [
    (1, "Digital literacy & computer basics", "डिजिटल साक्षरता और कंप्यूटर की बुनियादी बातें", "💻"),
    (2, "Typing, productivity & office tools", "टाइपिंग, उत्पादकता और ऑफ़िस टूल", "⌨️"),
    (3, "Computational thinking & programming fundamentals", "कम्प्यूटेशनल सोच और प्रोग्रामिंग की नींव", "🧩"),
    (4, "Web development", "वेब डेवलपमेंट", "🌐"),
    (5, "Data literacy, spreadsheets, SQL & databases", "डेटा साक्षरता, स्प्रेडशीट, SQL और डेटाबेस", "🗄️"),
    (6, "Data science, analytics & statistics", "डेटा साइंस, एनालिटिक्स और सांख्यिकी", "📊"),
    (7, "AI, ML, deep learning, LLMs & prompting", "AI, ML, डीप लर्निंग, LLM और प्रॉम्प्टिंग", "🤖"),
    (8, "Computer science core", "कंप्यूटर साइंस कोर", "🧠"),
    (9, "Git, Linux/CLI, DevOps & cloud", "Git, Linux/CLI, DevOps और क्लाउड", "☁️"),
    (10, "Cybersecurity", "साइबर सुरक्षा", "🛡️"),
    (11, "Mobile development", "मोबाइल डेवलपमेंट", "📱"),
    (12, "Web3/blockchain", "Web3/ब्लॉकचेन", "⛓️"),
    (13, "Scientific computing (Julia, R)", "वैज्ञानिक कंप्यूटिंग (Julia, R)", "🔬"),
    (14, "Soft & career skills", "सॉफ्ट और करियर स्किल", "🤝"),
]
TIERS = ["Newbie", "Apprentice", "Adept", "Master"]
TIER_LABELS = [("Intern/Newbie", "इंटर्न/नौसिखिया"), ("Fresher", "फ्रेशर"), ("Developer", "डेवलपर"), ("Master", "मास्टर")]

# roadmap.sh title -> track id (one-to-one, hand-mapped)
ROADMAP_TRACK = {
    "R Programming": 13, "Power BI": 5, "Frontend": 4, "Backend": 4, "Full Stack": 4, "Android": 11,
    "DevOps": 9, "DevSecOps": 10, "Data Analyst": 6, "AI Engineer": 7, "AI and Data Scientist": 7,
    "Data Engineer": 5, "Machine Learning": 7, "PostgreSQL": 5, "iOS": 11, "Blockchain": 12, "QA": 4,
    "Software Architect": 8, "API Design": 4, "Cyber Security": 10, "UX Design": 14, "Technical Writer": 14,
    "Game Developer": 3, "Server Side Game Developer": 4, "MLOps": 7, "Product Manager": 14,
    "Engineering Manager": 14, "Developer Relations": 14, "BI Analyst": 5, "AI Red Teaming": 10,
    "Network Engineer": 10, "Forward Deployed Engineer": 7, "Claude Code": 7, "Python for Data Analysis": 6,
    "Vibe Coding": 7, "LeetCode": 8, "Python": 3, "Computer Science": 8, "SQL": 5, "OpenClaw": 7,
    "React": 4, "Vue": 4, "Angular": 4, "JavaScript": 4, "TypeScript": 4, "Node.js": 4, "System Design": 8,
    "Java": 3, "ASP.NET Core": 4, "Spring Boot": 4, "Flutter": 11, "C Programming": 3, "C++": 3, "Rust": 3,
    "Go": 3, "AI Product Builders": 7, "Design Architecture": 8, "React Native": 11, "Design System": 4,
    "Prompt Engineering": 7, "MongoDB": 5, "Linux": 9, "Kubernetes": 9, "Docker": 9, "AWS": 9, "Terraform": 9,
    "Data Structures & Algorithms": 8, "Redis": 5, "Git and GitHub": 9, "PHP": 4, "Cloudflare": 9,
    "AI Agents": 7, "Next.js": 4, "Kotlin": 11, "HTML": 4, "CSS": 4, "Swift & Swift UI": 11, "Shell / Bash": 9,
    "Laravel": 4, "Elasticsearch": 5, "WordPress": 4, "Django": 4, "Ruby": 3, "Ruby on Rails": 4, "Scala": 3,
    "Frontend Beginner": 4, "Backend Beginner": 4, "DevOps Beginner": 9, "Git and GitHub Beginner": 9,
    "API Security": 10, "Backend Performance": 4, "Frontend Performance": 4, "Code Review": 14,
}
# Plain-language aliases learners actually type, mapped to a track.
ALIASES = [
    ("Computer basics", "कंप्यूटर की बुनियादी बातें", 1), ("Using a smartphone & internet safely", "स्मार्टफोन और इंटरनेट का सुरक्षित उपयोग", 1),
    ("Email & online accounts", "ईमेल और ऑनलाइन खाते", 1), ("Typing", "टाइपिंग", 2), ("MS Word / Excel / PowerPoint", "MS Word / Excel / PowerPoint", 2),
    ("Google Docs & Sheets", "Google Docs और Sheets", 2), ("Data entry", "डेटा एंट्री", 2), ("Coding for beginners", "शुरुआती लोगों के लिए कोडिंग", 3),
    ("Scratch / block coding", "Scratch / ब्लॉक कोडिंग", 3), ("Make a website", "वेबसाइट बनाना", 4), ("Make a mobile app", "मोबाइल ऐप बनाना", 11),
    ("Excel for data analysis", "डेटा विश्लेषण के लिए Excel", 5), ("Databases", "डेटाबेस", 5), ("Data analysis", "डेटा विश्लेषण", 6),
    ("Statistics", "सांख्यिकी", 6), ("ChatGPT / AI tools", "ChatGPT / AI टूल", 7), ("Generative AI", "जनरेटिव AI", 7), ("Deep learning", "डीप लर्निंग", 7),
    ("Algorithms & problem solving", "एल्गोरिदम और समस्या समाधान", 8), ("Operating systems & networks", "ऑपरेटिंग सिस्टम और नेटवर्क", 8),
    ("Cloud computing", "क्लाउड कंप्यूटिंग", 9), ("Ethical hacking", "एथिकल हैकिंग", 10), ("IT support / networking", "IT सपोर्ट / नेटवर्किंग", 10),
    ("Crypto / smart contracts", "क्रिप्टो / स्मार्ट कॉन्ट्रैक्ट", 12), ("Julia", "Julia", 13), ("MATLAB / Scilab", "MATLAB / Scilab", 13),
    ("English communication", "अंग्रेज़ी संचार", 14), ("Interview preparation", "इंटरव्यू की तैयारी", 14), ("Resume & LinkedIn", "रिज़्यूमे और LinkedIn", 14),
    ("Freelancing", "फ्रीलांसिंग", 14), ("Technical writing", "तकनीकी लेखन", 14), ("UI/UX design", "UI/UX डिज़ाइन", 14),
]

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def rid(url, name):
    return hashlib.sha1((url.strip().rstrip("/").lower() + "|" + name).encode("utf-8")).hexdigest()[:8]

def parse_hours(s):
    s = (s or "").replace(",", "")
    m = re.findall(r"\d+(?:\.\d+)?", s)
    if not m:
        return None
    lo, hi = float(m[0]), float(m[-1])
    return [int(lo), int(hi)]

def track_ids(s):
    ids = []
    for m in re.finditer(r"(\d+)\.", s or ""):
        ids.append(int(m.group(1)))
    return ids

def tier_ids(s):
    s = s or ""
    if "All" in s:
        return [0, 1, 2, 3]
    return [i for i, t in enumerate(TIERS) if t in s]

def trim_coverage(name, cov):
    cov = (cov or "").strip()
    pats = [
        (rf"^Teaches {re.escape(name)} through structured lessons or projects covering ", ""),
        (rf"^Provides guided exercises or challenges centered on {re.escape(name)}, building practical competence in ", "Guided exercises building practical competence in "),
        (rf"^Explains {re.escape(name)} as a structured learning reference for ", "Structured reference for "),
        (rf"^Organizes lessons and learning resources for ", "Lesson library for "),
        (rf"^Deliberate practice: {re.escape(name)}\.?", "Deliberate practice challenges."),
    ]
    for p, r in pats:
        cov2 = re.sub(p, r, cov)
        if cov2 != cov:
            cov = cov2
            break
    cov = cov[0].upper() + cov[1:] if cov else cov
    return cov[:240]

def device_need(t, pre, track):
    t = (t or "").lower()
    if re.search(r"wargame|practice track|labs|practice platform|interactive practice|university materials|course materials|ocw", t):
        return "computer"
    if re.search(r"linux command line|command line|terminal", (pre or "").lower()):
        return "computer"
    if re.search(r"video|tutorial|book|roadmap|channel|documentation|reference|hub|lessons|interactive|game", t):
        return "phone"
    return "any"

def fmt_kind(t):
    """Checkpoint template family, derived from the resource type."""
    t = (t or "").lower()
    if "wargame" in t or "practice" in t or "challenge" in t or "game" in t:
        return "practice"
    if "video" in t or "tutorial" in t or "channel" in t:
        return "video"
    if "book" in t or "documentation" in t or "reference" in t or "standard" in t:
        return "reading"
    if "roadmap" in t or "hub" in t or "portal" in t or "library" in t or "syllabus" in t or "platform" in t:
        return "map"
    if "project" in t:
        return "project"
    return "course"

def status_code(s):
    s = (s or "").lower()
    if s.startswith("active/reachable"):
        return "ok"
    if s.startswith("active;"):
        return "ok"
    if "restricted" in s:
        return "restricted"
    return "flagged"

def hindi_code(h):
    return {"Yes": "Y", "Partial": "P"}.get((h or "").strip(), "N")

# ---------------- catalogue ----------------
rows = list(csv.DictReader(open(os.path.join(ROOT, "master_course_list_v3.csv"), encoding="utf-8")))
resources = []
seen = set()
for r in rows:
    name = r["course_name"].strip()
    url = r["url"].strip()
    _id = rid(url, name)
    while _id in seen:
        _id = _id[:7] + "x"
    seen.add(_id)
    cost = r["cost"].strip()
    if cost not in ("free", "free-with-account", "free-to-audit", "freemium", "eligibility-based"):
        print("WARN unexpected cost", cost, name, file=sys.stderr)
    tr = track_ids(r["primary_track"])
    sec = track_ids(r["secondary_tracks"])
    resources.append(OrderedDict(
        id=_id, n=name, p=r["parent_platform"].strip(), u=url, t=r["type"].strip(), c=cost,
        l=r["language"].strip()[:60], h=hindi_code(r["hindi_available"]),
        tr=tr[0] if tr else 0, sec=sec, ti=tier_ids(r["tier"]), hr=parse_hours(r["est_hours"]), hrs=r["est_hours"].strip(),
        pre=r["prerequisites"].strip()[:120], cov=trim_coverage(name, r["coverage_summary"]),
        st=status_code(r["last_verified_status"]),
        dev=device_need(r["type"], r["prerequisites"], tr[0] if tr else 0), k=fmt_kind(r["type"]),
    ))
print("resources", len(resources))

byurl = {}
for res in resources:
    byurl.setdefault(res["u"].strip().rstrip("/").lower(), res["id"])

# ---------------- picks ----------------
md = open(os.path.join(ROOT, "Master Course-Level Tech Learning Catalogue for Bhopal (2026).md"), encoding="utf-8").read()
sec = md.split("## Recommended primary-plus-alternative picks")[1].split("## Data and update protocol")[0]
picks = {}
for line in sec.splitlines():
    if not line.startswith("| ") or line.startswith("| Track") or line.startswith("|---"):
        continue
    cells = [c.strip() for c in line.strip("|").split("|")]
    track = int(re.match(r"(\d+)\.", cells[0]).group(1))
    tier = TIERS.index(cells[1])
    urls = [re.search(r"\((https?://[^)]+)\)", c).group(1).strip().rstrip("/").lower() for c in cells[2:4]]
    ids = [byurl[u] for u in urls]
    picks[f"{track}-{tier}"] = {"primary": ids[0], "alt": ids[1]}
print("picks", len(picks))

# ---------------- roles / subjects picker ----------------
roads = list(csv.DictReader(open(os.path.join(ROOT, "roadmap-sh-export", "all_roadmaps.csv"), encoding="utf-8")))
subjects = []
seen_titles = set()
for r in roads:
    title = r["Title"].strip()
    cat = r["Category"].strip()
    if cat == "New Roadmap":
        continue
    if title in seen_titles:
        continue
    seen_titles.add(title)
    tid = ROADMAP_TRACK.get(title)
    if tid is None:
        print("WARN unmapped roadmap", title, file=sys.stderr)
        continue
    subjects.append({"id": "rm-" + slug(title) + ("-" + slug(cat) if cat in ("Absolute Beginners", "Best Practices") else ""),
                     "label": title if cat not in ("Best Practices",) else f"{title} best practices",
                     "hi": None, "cat": cat, "track": tid, "url": r["URL"].strip()})
for en, hi, tid in ALIASES:
    subjects.append({"id": "al-" + slug(en), "label": en, "hi": hi, "cat": "Plain language", "track": tid, "url": None})
for tid, en, hi, emoji in TRACKS:
    subjects.append({"id": f"tr-{tid}", "label": en, "hi": hi, "cat": "Track", "track": tid, "url": None})
print("subjects", len(subjects))

# ---------------- AI/DS topic breakdown ----------------
ai_rows = list(csv.DictReader(open(os.path.join(ROOT, "roadmap-sh-export", "ai_data_scientist_resources.csv"), encoding="utf-8")))
ai_topics = OrderedDict()
for r in ai_rows:
    ai_topics.setdefault(r["Topic"], OrderedDict()).setdefault(r["Subtopic"] or "General", []).append(
        {"label": r["Label"], "url": r["URL"], "type": r["Type"]})
ai_topics = [{"topic": t, "subtopics": [{"name": s, "resources": rs} for s, rs in subs.items()]} for t, subs in ai_topics.items()]

# ---------------- local in-demand fresher skills (Top_100_Local_Tech_Fresher_Skills-v2.xlsx) ----------------
# Category -> track, with role-based overrides where one category spans two tracks.
SKILL_CAT_TRACK = {"Frontend Development": 4, "Backend Development": 4, "Databases & Storage": 5, "DevOps & Cloud": 9,
                   "Mobile Development": 11, "Data Science & AI": 6, "QA & Testing": 4, "Hardware & Systems": 8,
                   "All Job Roles": 14, "AI Development": 7}
SKILL_ROLE_TRACK = {"Machine Learning Eng": 7, "AI Engineer": 7, "Computer Vision Eng": 7, "MLOps Engineer": 7,
                    "Network Engineer": 10, "Software Engineer": 3}
SKILL_NAME_TRACK = {"MS Office": 2, "Google Suite": 2, "Agile / Scrum Methodologies": 14, "Jira / Issue Tracking": 14,
                    "Data Structures & Algorithms (DSA)": 8, "Object-Oriented Programming (OOP)": 3,
                    "Vector Databases (Pinecone/Milvus)": 7, "Git & GitHub/GitLab": 9, "C++ / Systems Programming": 3,
                    "Linux / Unix Command Line": 9, "Bash & Shell Scripting": 9, "Systems Troubleshooting & Debugging": 9,
                    "Prompt Engineering / LLMs": 7, "Prompt Engineering /RAG": 7, "RAG (Retrieval-Augmented Gen)": 7}
# Keyword overrides for matching skills against catalogue resource names/coverage.
SKILL_KW = {"HTML5 & Semantic Markup": ["html"], "CSS3 & Flexbox/Grid": ["css", "flexbox", "grid"], "JavaScript (ES6+)": ["javascript", " js"],
            "Redux / State Management": ["redux", "state management"], "Tailwind CSS / Bootstrap": ["tailwind", "bootstrap"], "Next.js (SSR/SSG)": ["next.js", "nextjs"],
            "Web Sockets / Real-time Comm": ["websocket", "real-time"], "Responsive Web Design": ["responsive"], "Jest / Unit Testing UI": ["jest", "testing"],
            "Figma to Code Translation": ["figma", "ui design", "design"], "Web Accessibility (a11y)": ["accessib"], "Python (Django/FastAPI)": ["django", "fastapi", "flask"],
            "Java / Spring Boot": ["java ", "java:", "spring"], "C++ / Systems Programming": ["c++", "systems programming"], "C# / .NET Core": ["c#", ".net"], "Go (Golang)": ["golang", " go "],
            "RESTful API Design": ["rest", "api"], "Microservices Architecture": ["microservice"], "JWT & OAuth Authentication": ["jwt", "oauth", "authentication"],
            "Message Queues (Kafka/RabbitMQ)": ["kafka", "rabbitmq", "queue"], "Redis & Caching Strategies": ["redis", "cach"], "Object-Oriented Programming (OOP)": ["object-oriented", "oop", "classes"],
            "Data Structures & Algorithms (DSA)": ["algorithm", "data structure", "dsa"], "SQL (MySQL / PostgreSQL)": ["sql", "mysql", "postgres"], "NoSQL (MongoDB / Cassandra)": ["mongodb", "nosql", "cassandra"],
            "Database Normalization": ["normali", "database design", "relational"], "SQL Query Optimization / Tuning": ["query", "index", "database systems"], "PL/SQL or T-SQL": ["pl/sql", "t-sql", "oracle"],
            "ORMs (Hibernate / Prisma)": ["orm", "hibernate", "prisma"], "Cloud Databases (DynamoDB / RDS)": ["dynamodb", "rds", "cloud database"], "Firebase / Supabase": ["firebase", "supabase"],
            "Data Warehousing (Snowflake/Redshift)": ["warehouse", "snowflake", "redshift"], "Vector Databases (Pinecone/Milvus)": ["vector", "embedding"], "Git & GitHub/GitLab": ["git"],
            "Docker / Containerization": ["docker", "container"], "Kubernetes (K8s)": ["kubernetes"], "AWS Core (EC2, S3, IAM)": ["aws"], "Microsoft Azure Basics": ["azure"], "Google Cloud Platform (GCP)": ["google cloud", "gcp"],
            "CI/CD Pipelines (Jenkins/Actions)": ["ci/cd", "pipeline", "jenkins"], "Linux / Unix Command Line": ["linux", "command line", "shell"], "Bash & Shell Scripting": ["bash", "shell"],
            "Infrastructure as Code (Terraform)": ["terraform", "infrastructure"], "Ansible / Configuration Mgmt": ["ansible"], "Nginx / Apache Web Servers": ["nginx", "apache", "web server"],
            "Monitoring (Prometheus/Grafana)": ["monitor", "prometheus", "grafana", "sre"], "Agile / Scrum Methodologies": ["agile", "scrum"], "Jira / Issue Tracking": ["jira"],
            "Flutter & Dart": ["flutter", "dart"], "React Native": ["react native"], "Swift": ["swift", "ios"], "Kotlin": ["kotlin"], "Android Studio & SDK": ["android"],
            "Core Data / Room Database": ["room", "core data", "persistence"], "Mobile UI / UX Principles": ["material", "compose", "app ui"], "Push Notifications Integration": ["notification", "firebase"],
            "App Store & Play Store Deployment": ["publish", "play store", "deploy"], "REST API Consumption in Mobile": ["connect to the internet", "api", "networked"],
            "Data Wrangling (Pandas/NumPy)": ["pandas", "numpy", "data cleaning", "wrangl"], "Data Visualization (Tableau/PowerBI)": ["visuali", "power bi", "tableau"], "Python for Data Science": ["python", "data science"],
            "Scikit-Learn (Traditional ML)": ["scikit", "machine learning", "ml "], "Deep Learning (TensorFlow/PyTorch)": ["deep learning", "neural", "tensorflow", "pytorch", "fast.ai", "fastbook"],
            "Natural Language Processing (NLP)": ["nlp", "language processing", "llm course"], "Computer Vision (OpenCV)": ["vision", "opencv", "cs231n"], "Prompt Engineering / LLMs": ["prompt", "llm", "generative"],
            "RAG (Retrieval-Augmented Gen)": ["rag", "retrieval", "langchain", "chat with your data"], "Big Data Tools (Hadoop/Spark)": ["big data", "hadoop", "spark"], "Statistical Modeling": ["statistic", "regression", "probability"],
            "Web Scraping (BeautifulSoup/Scrapy)": ["scrap", "networked programs", "web services"], "Jupyter Notebooks": ["jupyter", "notebook", "kaggle"], "A/B Testing Methodologies": ["a/b", "hypothesis", "experiment"],
            "Model Deployment (MLOps basics)": ["mlops", "production ml", "deploy"], "Manual Testing & Test Planning": ["testing", "quality assurance"], "Selenium WebDriver": ["selenium"], "Cypress / Playwright": ["cypress", "playwright"],
            "API Testing (Postman/SoapUI)": ["api testing", "postman"], "Mobile Testing (Appium)": ["appium", "mobile testing"], "JUnit / TestNG / PyTest": ["junit", "pytest", "unit test", "testing"], "Performance Testing (JMeter)": ["performance", "jmeter"],
            "Behavior Driven Dev (Cucumber)": ["cucumber", "bdd"], "Bug Lifecycle & Reporting": ["bug", "quality assurance", "debug"], "Test Automation Framework Design": ["automation", "quality assurance"],
            "Embedded C": ["embedded", "arduino", "c programming", "c and c++"], "Real-Time Operating Systems (RTOS)": ["rtos", "operating system"], "Microcontroller Programming (ARM/AVR)": ["microcontroller", "arduino", "computation structures"],
            "IoT Protocols (MQTT, CoAP)": ["iot", "mqtt"], "Hardware-in-the-loop (HIL) Testing": ["hardware", "hil"], "PCB Layout / Design Basics": ["pcb", "circuit", "esim", "ngspice"], "TCP/IP & Networking Protocols": ["network", "tcp"],
            "Systems Troubleshooting & Debugging": ["troubleshoot", "debug", "missing semester", "linux"], "Serial Comm (I2C, SPI, UART)": ["i2c", "spi", "uart", "serial", "arduino"], "Hardware testing (Oscilloscope/Multimeter)": ["oscilloscope", "multimeter", "electronics"],
            "Verbal Communication": ["communication", "interview", "soft skills", "english"], "Written Communication": ["writing", "communication", "english", "documentation"], "MS Office": ["office", "word", "excel", "powerpoint"], "Google Suite": ["google", "sheets", "docs", "workspace"],
            "Prompt Engineering /RAG": ["prompt", "rag", "retrieval"], "TypeScript": ["typescript"], "React.js": ["react"], "Angular": ["angular"], "Vue.js": ["vue"], "Node.js": ["node"], "GraphQL": ["graphql"], "Express.js": ["express", "node"]}
job_skills = []
try:
    import openpyxl
    wb = openpyxl.load_workbook(os.path.join(ROOT, "data", "Top_100_Local_Tech_Fresher_Skills-v2.xlsx"), data_only=True)
    ws = wb.worksheets[0]
    for row in list(ws.iter_rows(values_only=True))[1:]:
        if not row[0]:
            continue
        rank, cat, role, skill, stype, demand = [str(c).strip() if c is not None else "" for c in row[:6]]
        track = SKILL_NAME_TRACK.get(skill) or SKILL_ROLE_TRACK.get(role) or SKILL_CAT_TRACK.get(cat, 14)
        kws = SKILL_KW.get(skill) or [re.sub(r"\(.*?\)", "", skill).split("/")[0].strip().lower()]
        job_skills.append({"rank": int(rank), "cat": cat, "role": role, "skill": skill, "type": stype, "demand": demand, "track": track, "kw": kws})
    print("job skills", len(job_skills))
except Exception as e:  # keep the build usable without openpyxl
    print("WARN job skills not built:", e, file=sys.stderr)
# Skills also become searchable subjects in the intake picker (deduplicated against roadmap labels).
existing = {s["label"].lower() for s in subjects}
for js_ in job_skills:
    short = re.sub(r"\s*\(.*?\)", "", js_["skill"]).strip()
    if short.lower() in existing or any(short.lower() == e for e in existing):
        continue
    existing.add(short.lower())
    subjects.append({"id": "sk-" + slug(short), "label": short, "hi": None, "cat": "Local demand", "track": js_["track"], "url": None, "demand": js_["demand"]})
print("subjects incl. skills", len(subjects))

# ---------------- write modules ----------------
def write_module(name, const, obj, comment=""):
    path = os.path.join(OUT, name + ".js")
    with open(path, "w", encoding="utf-8") as f:
        f.write(f"// Generated by tools/build_data.py. Do not edit by hand. {comment}\n")
        f.write(f"export const {const} = ")
        json.dump(obj, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("wrote", os.path.relpath(path, ROOT), os.path.getsize(path), "bytes")

write_module("catalogue", "CATALOGUE", resources, "881 free-resource rows from master_course_list_v3.csv")
write_module("picks", "PICKS", picks, "anchor/alternative per track x tier from the catalogue markdown")
write_module("subjects", "SUBJECTS", subjects, "roadmap.sh roles/skills + plain-language aliases + tracks")
write_module("ai_topics", "AI_TOPICS", ai_topics, "roadmap.sh AI & Data Scientist topic breakdown")
write_module("job_skills", "JOB_SKILLS", {
    "source": "Top_100_Local_Tech_Fresher_Skills-v2.xlsx: in-demand skills for fresher roles across local (Bhopal/Indore) and remote-India postings, mid-2026; categories, roles, skill type and demand level only.",
    "skills": job_skills,
}, "local in-demand fresher skills")
write_module("tracks", "TRACKS", {
    "tracks": [{"id": i, "en": en, "hi": hi, "emoji": e} for i, en, hi, e in TRACKS],
    "tiers": TIERS, "tierLabels": [{"en": en, "hi": hi} for en, hi in TIER_LABELS],
})

# authored JSON -> modules
AUTHORED = [
    ("work_categories.json", "work_categories", "WORK"),
    ("reference_pathways.json", "reference_pathways", "REFERENCE_PATHWAYS"),
    ("quiz_bank.json", "quiz_bank", "QUIZ_BANK"),
    ("capstones.json", "capstones", "CAPSTONES"),
    ("glossary.json", "glossary", "GLOSSARY"),
    ("synthetic_profiles.json", "synthetic_profiles", "SYNTHETIC_PROFILES"),
]
for fn, mod, const in AUTHORED:
    p = os.path.join(ROOT, "data", fn)
    if not os.path.exists(p):
        print("SKIP missing", fn, file=sys.stderr)
        continue
    obj = json.load(open(p, encoding="utf-8"))
    # resolve any "url:" references in reference pathways / profiles to resource ids
    def resolve(o):
        if isinstance(o, dict):
            return {k: resolve(v) for k, v in o.items()}
        if isinstance(o, list):
            return [resolve(v) for v in o]
        if isinstance(o, str) and o.startswith("url:"):
            u = o[4:].strip().rstrip("/").lower()
            if u not in byurl:
                print("WARN unresolved url ref", o, "in", fn, file=sys.stderr)
                return None
            return byurl[u]
        return o
    write_module(mod, const, resolve(obj), f"from data/{fn}")

# sanity: every track x tier has at least a few resources
from collections import Counter
cnt = Counter()
for res in resources:
    for ti in res["ti"]:
        cnt[(res["tr"], ti)] += 1
for tid, *_ in TRACKS:
    print(tid, [cnt[(tid, ti)] for ti in range(4)])
