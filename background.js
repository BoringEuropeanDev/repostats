// RepoStats Service Worker - Background Tasks

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open onboarding page
    chrome.tabs.create({
      url: 'chrome-extension://' + chrome.runtime.id + '/onboarding.html',
    });

    // Initialize storage
    chrome.storage.local.set({
      savedRepos: [],
      analysisHistory: [],
      githubToken: null,
      settings: {
        autoAnalyze: true,
        notifications: true,
      },
    });
  }
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'ANALYZE_REPO') {
    // Trigger analysis
    analyzeRepository(request.repo).then(sendResponse);
    return true; // Keep listener alive for async response
  }

  if (request.type === 'SAVE_REPO') {
    saveRepositoryData(request.data).then(sendResponse);
    return true;
  }
});

async function analyzeRepository(repo) {
  try {
    const { owner, name } = repo;
    const baseUrl = `https://api.github.com/repos/${owner}/${name}`;

    const response = await fetch(baseUrl);
    if (!response.ok) {
      return { error: 'Repository not found' };
    }

    const data = await response.json();

    return {
      owner: data.owner.login,
      name: data.name,
      stars: data.stargazers_count,
      forks: data.forks_count,
      openIssues: data.open_issues_count,
      language: data.language,
      license: data.license?.spdx_id,
      lastUpdated: data.pushed_at,
      isArchived: data.archived,
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function saveRepositoryData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['savedRepos'], (result) => {
      const repos = result.savedRepos || [];
      const index = repos.findIndex(r => r.owner === data.owner && r.name === data.name);

      if (index === -1) {
        repos.push(data);
      }

      chrome.storage.local.set({ savedRepos: repos }, () => {
        resolve({ success: true, saved: repos.length });
      });
    });
  });
}

// Periodic background sync (optional - for future notifications feature)
chrome.alarms.create('checkRepositoryHealth', { periodInMinutes: 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkRepositoryHealth') {
    checkSavedRepositoriesHealth();
  }
});

async function checkSavedRepositoriesHealth() {
  chrome.storage.local.get(['savedRepos', 'settings'], async (result) => {
    const repos = result.savedRepos || [];
    const settings = result.settings || {};

    if (!settings.notifications || repos.length === 0) {
      return;
    }

    // Check each repo for updates
    for (const repo of repos) {
      const health = await analyzeRepository({
        owner: repo.owner,
        name: repo.name,
      });

      // Notify if there are concerning changes
      if (health.isArchived && !repo.isArchived) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'images/icon-128.png',
          title: `⚠️ ${repo.name} was archived`,
          message: 'A repository you're tracking has been archived.',
        });
      }
    }
  });
}
