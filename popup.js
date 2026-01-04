// RepoStats - Repository Health Analysis

class RepoStatsAnalyzer {
  constructor() {
    this.apiToken = null;
    this.currentRepo = null;
    this.setupEventListeners();
    this.loadFromStorage();
  }

  setupEventListeners() {
    document.getElementById('retry-btn')?.addEventListener('click', () => this.analyzeCurrentRepo());
    document.getElementById('view-full-btn')?.addEventListener('click', () => this.openFullReport());
    document.getElementById('save-repo-btn')?.addEventListener('click', () => this.saveToVault());
  }

  loadFromStorage() {
    chrome.storage.local.get(['githubToken'], (result) => {
      this.apiToken = result.githubToken;
      this.analyzeCurrentRepo();
    });
  }

  async analyzeCurrentRepo() {
    try {
      this.showLoading();
      const repo = await this.getCurrentRepository();

      if (!repo) {
        this.showNoRepo();
        return;
      }

      const stats = await this.fetchRepositoryStats(repo);
      const healthScore = this.calculateHealthScore(stats);
      this.displayStats(stats, healthScore);
    } catch (error) {
      this.showError(error.message);
      console.error('RepoStats Error:', error);
    }
  }

  async getCurrentRepository() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const url = tabs[0].url;
        const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);

        if (match) {
          resolve({
            owner: match[1],
            name: match[2],
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  async fetchRepositoryStats(repo) {
    const { owner, name } = repo;
    const baseUrl = `https://api.github.com/repos/${owner}/${name}`;

    // Fetch main repo data
    const repoResponse = await fetch(baseUrl, {
      headers: this.apiToken ? { Authorization: `token ${this.apiToken}` } : {},
    });

    if (!repoResponse.ok) {
      throw new Error(`Repository not found or API limit reached`);
    }

    const repoData = await repoResponse.json();

    // Fetch contributors count
    const contributorsResponse = await fetch(`${baseUrl}/contributors`, {
      headers: this.apiToken ? { Authorization: `token ${this.apiToken}` } : {},
    });

    const contributorsData = contributorsResponse.ok ? await contributorsResponse.json() : [];

    // Calculate days since last update
    const lastUpdated = new Date(repoData.pushed_at);
    const daysSinceUpdate = Math.floor((Date.now() - lastUpdated) / (1000 * 60 * 60 * 24));

    return {
      name: repoData.name,
      owner: repoData.owner.login,
      stars: repoData.stargazers_count,
      forks: repoData.forks_count,
      openIssues: repoData.open_issues_count,
      watchers: repoData.watchers_count,
      language: repoData.language || 'Unknown',
      license: repoData.license?.spdx_id || 'None',
      description: repoData.description,
      lastUpdated: repoData.pushed_at,
      daysSinceUpdate,
      contributors: contributorsData.length,
      isArchived: repoData.archived,
      isFork: repoData.fork,
      hasWiki: repoData.has_wiki,
      hasPages: repoData.has_pages,
      hasDownloads: repoData.has_downloads,
      defaultBranch: repoData.default_branch,
      topics: repoData.topics || [],
      visibility: repoData.private ? 'Private' : 'Public',
    };
  }

  calculateHealthScore(stats) {
    let score = 100;
    let maintenance = 100;
    let activity = 100;
    let community = 100;

    // Maintenance Score (freshness)
    if (stats.isArchived) {
      maintenance = 0;
    } else if (stats.daysSinceUpdate > 365) {
      maintenance = 20;
    } else if (stats.daysSinceUpdate > 180) {
      maintenance = 50;
    } else if (stats.daysSinceUpdate > 90) {
      maintenance = 80;
    }

    // Activity Score (commit frequency, contributors)
    if (stats.contributors === 0) {
      activity = 20;
    } else if (stats.contributors < 3) {
      activity = 50;
    } else if (stats.contributors < 10) {
      activity = 75;
    }

    // Community Score (stars, forks, engagement)
    if (stats.stars > 10000) {
      community = 100;
    } else if (stats.stars > 1000) {
      community = 95;
    } else if (stats.stars > 100) {
      community = 85;
    } else if (stats.stars > 10) {
      community = 70;
    } else {
      community = 40;
    }

    score = (maintenance * 0.35 + activity * 0.35 + community * 0.30);

    return {
      overall: Math.round(score),
      maintenance: Math.round(maintenance),
      activity: Math.round(activity),
      community: Math.round(community),
      grade: this.scoreToGrade(Math.round(score)),
    };
  }

  scoreToGrade(score) {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  getGradeClass(grade) {
    const gradeMap = {
      'A': 'grade-a',
      'B': 'grade-b',
      'C': 'grade-c',
      'D': 'grade-d',
      'F': 'grade-f',
    };
    return gradeMap[grade] || 'grade-a';
  }

  displayStats(stats, healthScore) {
    // Update gauge
    const gaugeCircle = document.getElementById('gauge-circle');
    gaugeCircle.className = `gauge-circle ${this.getGradeClass(healthScore.grade)}`;
    document.getElementById('gauge-score').textContent = healthScore.grade;

    // Update scores
    document.getElementById('maintenance-score').textContent = `${healthScore.maintenance}%`;
    document.getElementById('activity-score').textContent = `${healthScore.activity}%`;
    document.getElementById('community-score').textContent = `${healthScore.community}%`;

    // Update metrics
    document.getElementById('metric-stars').textContent = stats.stars.toLocaleString();
    document.getElementById('metric-forks').textContent = stats.forks.toLocaleString();
    document.getElementById('metric-issues').textContent = stats.openIssues.toLocaleString();

    // Update details
    document.getElementById('last-update').textContent = `${stats.daysSinceUpdate} days ago`;
    document.getElementById('language').textContent = stats.language;
    document.getElementById('license').textContent = stats.license;
    document.getElementById('contributors').textContent = stats.contributors;

    // Show risk indicators if needed
    const risks = this.identifyRisks(stats);
    if (risks.length > 0) {
      const riskSection = document.getElementById('risk-section');
      riskSection.classList.add('active');
      const riskList = document.getElementById('risk-list');
      riskList.innerHTML = risks.map(risk => `<div class="risk-item">⚠️ ${risk}</div>`).join('');
    }

    // Store current repo
    this.currentRepo = stats;

    this.hideLoading();
    this.showStats();
  }

  identifyRisks(stats) {
    const risks = [];

    if (stats.isArchived) {
      risks.push('Repository is archived and no longer maintained');
    }

    if (stats.daysSinceUpdate > 365) {
      risks.push('No updates in over a year - may be unmaintained');
    }

    if (stats.daysSinceUpdate > 180 && stats.stars > 1000) {
      risks.push('Popular repo with stale updates - check for active forks');
    }

    if (stats.contributors === 1 && stats.stars > 100) {
      risks.push('Single maintainer for popular project - burnout risk');
    }

    if (stats.openIssues > stats.stars / 10) {
      risks.push('High issue-to-star ratio - possible unaddressed bugs');
    }

    if (!stats.license) {
      risks.push('No license specified - legal ambiguity');
    }

    return risks;
  }

  saveToVault() {
    if (!this.currentRepo) return;

    chrome.storage.local.get(['savedRepos'], (result) => {
      const repos = result.savedRepos || [];
      const exists = repos.some(r => r.owner === this.currentRepo.owner && r.name === this.currentRepo.name);

      if (!exists) {
        repos.push({
          ...this.currentRepo,
          savedAt: new Date().toISOString(),
        });
        chrome.storage.local.set({ savedRepos: repos });
        alert('✅ Repository saved to Vault!');
        document.getElementById('save-repo-btn').textContent = 'Saved ✓';
        document.getElementById('save-repo-btn').disabled = true;
      }
    });
  }

  openFullReport() {
    if (this.currentRepo) {
      const reportUrl = `https://repobase.io/report/${this.currentRepo.owner}/${this.currentRepo.name}`;
      chrome.tabs.create({ url: reportUrl });
    }
  }

  showLoading() {
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('stats').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('no-repo').classList.add('hidden');
  }

  showStats() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('stats').classList.remove('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('no-repo').classList.add('hidden');
  }

  showError(message) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('stats').classList.add('hidden');
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('no-repo').classList.add('hidden');
    document.querySelector('.error-message').textContent = message;
  }

  showNoRepo() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('stats').classList.add('hidden');
    document.getElementById('error').classList.add('hidden');
    document.getElementById('no-repo').classList.remove('hidden');
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  new RepoStatsAnalyzer();
});
