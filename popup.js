// ========== STATE ==========
let githubToken = null;
let userData = {
  prs: [],
  issues: [],
  workflows: [],
  trackedRepos: [],
  commits: []
};

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  await loadToken();
  setupTabs();
  setupEventListeners();
  loadUserData();
  updateDashboard();
});

// ========== TAB SYSTEM ==========
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.dataset.tab;
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(tabName).classList.add('active');
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  // Repo link click handler
  document.addEventListener('click', (e) => {
    const repoLink = e.target.closest('[data-repo-url]');
    if (repoLink) {
      e.preventDefault();
      const url = repoLink.getAttribute('data-repo-url');
      const fullUrl = url.startsWith('http') ? url : `https://github.com/${url}`;
      chrome.tabs.create({ url: fullUrl });
    }
  });
}

// ========== TOKEN MANAGEMENT ==========
async function loadToken() {
  const result = await chrome.storage.local.get('githubToken');
  githubToken = result.githubToken || null;
  const tokenInput = document.getElementById('githubToken');
  if (tokenInput && githubToken) {
    tokenInput.value = githubToken.substring(0, 10) + '...';
  }
}

async function saveToken() {
  const token = document.getElementById('githubToken').value.trim();
  if (!token.startsWith('ghp_')) {
    showStatus('Invalid token format. Must start with ghp_', 'error', 'tokenStatus');
    return;
  }

  try {
    // Verify token
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${token}`
      }
    });

    if (!response.ok) {
      showStatus('Invalid token. Please check and try again.', 'error', 'tokenStatus');
      return;
    }

    githubToken = token;
    await chrome.storage.local.set({ githubToken });
    showStatus('✓ Token saved successfully!', 'success', 'tokenStatus');

    // Load data with new token
    await loadUserData();
    updateDashboard();
  } catch (error) {
    showStatus('Error validating token', 'error', 'tokenStatus');
  }
}

function resetToken() {
  if (confirm('Clear GitHub token?')) {
    githubToken = null;
    chrome.storage.local.set({ githubToken: null });
    document.getElementById('githubToken').value = '';
    showStatus('Token cleared', 'success', 'tokenStatus');
  }
}

// ========== GITHUB API CALLS ==========
async function fetchGitHub(endpoint) {
  if (!githubToken) return null;

  try {
    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    return response.json();
  } catch (error) {
    console.error('GitHub API error:', error);
    return null;
  }
}

// ========== LOAD USER DATA ==========
async function loadUserData() {
  if (!githubToken) return;

  // Get user info
  const user = await fetchGitHub('/user');
  if (!user) return;

  // Load PRs
  userData.prs = await fetchGitHub('/search/issues?q=is:pr is:open involves:' + user.login + '&per_page=50');

  // Load Issues
  userData.issues = await fetchGitHub('/issues?state=open&per_page=50');

  // Load workflows (requires repo context)
  userData.workflows = [];

  // Load commits
  userData.commits = await fetchGitHub('/user/repos?sort=updated&per_page=10');

  // Save to storage
  await chrome.storage.local.set({ userData });
}

// ========== DASHBOARD ==========
function updateDashboard() {
  const prCount = userData.prs?.items?.length || 0;
  const issueCount = userData.issues?.length || 0;
  const repoCount = userData.trackedRepos?.length || 0;

  document.getElementById('pr-count').textContent = prCount;
  document.getElementById('issue-count').textContent = issueCount;
  document.getElementById('repo-count').textContent = repoCount;
  document.getElementById('workflow-count').textContent = '0';
}

// ========== PR TAB ==========
async function filterPRs() {
  const filter = document.getElementById('prFilter').value;
  const list = document.getElementById('prsList');

  if (!userData.prs?.items) {
    list.innerHTML = '<div class="empty-state"><p>No PRs found. Add your GitHub token to get started.</p></div>';
    return;
  }

  let filtered = userData.prs.items;

  if (filter === 'drafts') {
    filtered = filtered.filter(pr => pr.draft);
  } else if (filter === 'review') {
    filtered = filtered.filter(pr => !pr.draft);
  }

  list.innerHTML = filtered.map(pr => `
    <div class="bookmark-item">
      <div class="bookmark-title">
        <a href="#" data-repo-url="${pr.repository_url.split('/').slice(-2).join('/')}">${pr.title}</a>
      </div>
      <div class="bookmark-meta">${pr.repository_url.split('/').slice(-2).join('/')}</div>
      <div class="bookmark-category">${pr.state}</div>
    </div>
  `).join('') || '<div class="empty-state"><p>No PRs match your filter.</p></div>';
}

// ========== ISSUES TAB ==========
async function filterIssues() {
  const filter = document.getElementById('issueFilter').value;
  const list = document.getElementById('issuesList');

  if (!userData.issues) {
    list.innerHTML = '<div class="empty-state"><p>No issues found. Add your GitHub token to get started.</p></div>';
    return;
  }

  let filtered = userData.issues;

  if (filter === 'assigned') {
    filtered = filtered.filter(issue => issue.assignee);
  } else if (filter === 'mentioned') {
    filtered = filtered.filter(issue => issue.state === 'open');
  }

  list.innerHTML = filtered.map(issue => `
    <div class="bookmark-item">
      <div class="bookmark-title">
        <a href="#" data-repo-url="${issue.repository_url.split('/').slice(-2).join('/')}">${issue.title}</a>
      </div>
      <div class="bookmark-meta">${issue.repository_url.split('/').slice(-2).join('/')}</div>
      <div class="bookmark-category">${issue.state}</div>
    </div>
  `).join('') || '<div class="empty-state"><p>No issues match your filter.</p></div>';
}

// ========== STATUS MESSAGES ==========
function showStatus(message, type, elementId) {
  const statusEl = document.getElementById(elementId);
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
    if (type === 'success') {
      setTimeout(() => {
        statusEl.className = 'status';
      }, 3000);
    }
  }
}
