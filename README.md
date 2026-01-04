# RepoStats 📊 

**Stop guessing if a library is safe. Know instantly.**

RepoStats is a free, open-source Chrome extension that analyzes any GitHub repository in real-time. It gives you an instant **Health Grade (A-F)** based on maintenance, community trust, and activity.

## 🚀 Why Use This?

When you find a new library, you have to check:
- "When was the last commit?"
- "How many open issues?"
- "Is the maintainer active?"
- "Do people actually use this?"

**RepoStats does all of this in 2 seconds.** One click. Instant decision.

## ✨ Features

- **📊 Instant Health Score:** Get an A-F grade for every repo you visit.
- **🔍 Smart Analysis:** Weighs maintenance, community, and activity to give you a real grade.
- **⚠️ Risk Alerts:** Warns you about abandoned projects, single maintainers, and red flags.
- **📈 Detailed Metrics:** See maintenance score, activity level, and community engagement at a glance.
- **🔒 Private & Secure:** Runs entirely in your browser. No tracking. No data selling. No logins.


## 🎯 Use Cases

### Choosing a New Dependency
"Should I use this library?"
↓
Click RepoStats
↓
See: Grade A, 50k+ stars, updated yesterday
↓
"Safe to use" ✅


### Auditing Existing Dependencies
"Is this library still maintained?"
↓
Click RepoStats
↓
See: Grade F, last update 3 years ago, archived
↓
"Find an alternative" ⚠️

### Comparing Multiple Libraries
Library A: Grade A (React - 200k stars, daily commits)
Library B: Grade C (Vue - 30k stars, monthly updates)
Library C: Grade F (Old framework - archived, no activity)
↓
"Library A is the safest bet"


## 📊 How the Health Score Works

We calculate a weighted score based on **public GitHub API data**:

| Factor | Weight | What We Measure |
| :--- | :--- | :--- |
| **Maintenance** | 35% | Last commit date, update frequency, archival status |
| **Activity** | 35% | Number of contributors, recent commits, commit velocity |
| **Community** | 30% | Stars, forks, watchers, issue resolution rate |

**Formula:**
Overall Score = (Maintenance × 0.35) + (Activity × 0.35) + (Community × 0.30)

### Grade Breakdown
- **A (90-100):** Production-ready, actively maintained
- **B (80-89):** Solid, reliable project
- **C (70-79):** Functional but monitor for updates
- **D (60-69):** Use with caution
- **F (<60):** Risky, consider alternatives

## ⚠️ Risk Indicators

RepoStats automatically flags:
- Repository is archived
- No updates in 1+ year
- Single maintainer for popular project
- High issue-to-star ratio
- No license specified
- Large number of open issues

## 🔐 Privacy & Transparency

**We only use:**
- ✅ Public GitHub API data (stars, forks, commits, etc)
- ✅ Runs entirely in your browser
- ✅ No backend servers tracking you

**We never:**
- ❌ Track your browsing
- ❌ Collect personal data
- ❌ Store private repo information
- ❌ Sell data to anyone
- ❌ Require logins or authentication

**The algorithm is transparent:**
- All calculation logic is in `popup.js`
- Fork the repo and audit it yourself
- No secret black-box scoring

## 🛠️ Developer Features

### GitHub Token (Optional)
Add a GitHub Personal Access Token to increase your API rate limit:
1. Install RepoStats
2. Go to extension options
3. Paste your token (no login required)

### For Open Source Authors
- Your metrics are completely transparent
- See exactly how your repo is scored
- No hidden calculations
- Improve your score by maintaining your project well

## 🐛 Found a Bug?

Open an issue on GitHub:
[github.com/boringeuropeandev/repostats/issues](https://github.com/boringeuropeandev/repostats/issues)

## 🤝 Contributing

Pull requests welcome! We're committed to:
- Transparent algorithms
- Community feedback
- Open development

## 📄 License

MIT © [BoringEuropeanDev](https://twitter.com/BoringEuropeanDev)

---

*Built with ❤️ for developers who value their time.*

🚀 Stop wasting hours vetting libraries. Let RepoStats do it for you.
