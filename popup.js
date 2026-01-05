// ========== STATE ==========
let githubToken = null;

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', async () => {
  await loadToken();
  setupTabs();
  setupEventListeners();
  fetchTrendingRepos('daily');
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
async function fetchGitHub(endpoint, headers = {}) {
  try {
    const defaultHeaders = {
      'Accept': 'application/vnd.github.v3+json'
    };

    if (githubToken) {
      defaultHeaders['Authorization'] = `token ${githubToken}`;
    }

    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers: { ...defaultHeaders, ...headers }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.error('GitHub API error:', error);
    return null;
  }
}

// ========== REPO STATS ==========
async function fetchRepoStats() {
  const repo = document.getElementById('repoInput').value.trim();
  if (!repo) {
    showStatus('Please enter a repository in the format: owner/repo', 'error', 'statsContainer');
    return;
  }

  const container = document.getElementById('statsContainer');
  container.innerHTML = '<div class="empty-state"><p>Loading...</p></div>';

  const data = await fetchGitHub(`/repos/${repo}`);
  if (!data || data.message) {
    container.innerHTML = '<div class="empty-state"><p>Repository not found. Check the name and try again.</p></div>';
    return;
  }

  const languages = await fetchGitHub(`/repos/${repo}/languages`);
  const topLanguage = languages ? Object.keys(languages).sort((a, b) => languages[b] - languages[a])[0] : 'Unknown';

  container.innerHTML = `
    <div class="bookmark-item">
      <div class="bookmark-title">
        <a href="#" data-repo-url="${data.full_name}">${data.name}</a>
      </div>
      <div class="bookmark-meta">${data.full_name}</div>
      <div class="bookmark-category">${topLanguage}</div>
      <div class="bookmark-notes">
        ⭐ ${data.stargazers_count} | 🍴 ${data.forks_count} | 👁️ ${data.watchers_count}<br>
        <br>
        ${data.description || 'No description available'}<br>
        <br>
        <strong>Stats:</strong><br>
        • Language: ${topLanguage}<br>
        • Open Issues: ${data.open_issues_count}<br>
        • Watchers: ${data.watchers_count}<br>
        • License: ${data.license?.name || 'None'}<br>
        • Last Updated: ${new Date(data.updated_at).toLocaleDateString()}
      </div>
    </div>
  `;
}

// ========== TRENDING REPOS ==========
async function fetchTrendingRepos(period = 'daily') {
  const container = document.getElementById('trendingList');
  container.innerHTML = '<div class="empty-state"><p>Loading trending repositories...</p></div>';

  const date = new Date();
  date.setDate(date.getDate() - (period === 'daily' ? 1 : period === 'weekly' ? 7 : 30));
  const dateStr = date.toISOString().split('T')[0];

  const data = await fetchGitHub(`/search/repositories?q=created:>${dateStr}&sort=stars&order=desc&per_page=30`);

  if (!data || !data.items) {
    container.innerHTML = '<div class="empty-state"><p>Unable to fetch trending repositories.</p></div>';
    return;
  }

  container.innerHTML = data.items.map(repo => `
    <div class="bookmark-item">
      <div class="bookmark-title">
        <a href="#" data-repo-url="${repo.full_name}">${repo.name}</a>
      </div>
      <div class="bookmark-meta">${repo.full_name}</div>
      <div class="bookmark-category">${repo.language || 'Unknown'}</div>
      <div class="bookmark-notes">
        ⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count}<br>
        ${repo.description ? repo.description.substring(0, 100) + '...' : 'No description'}
      </div>
    </div>
  `).join('');
}

// ========== STARRED REPOS ==========
async function fetchStarredRepos(sort = 'stars') {
  if (!githubToken) {
    document.getElementById('starredList').innerHTML = '<div class="empty-state"><p>Please add your GitHub token to see your starred repos.</p></div>';
    return;
  }

  const container = document.getElementById('starredList');
  container.innerHTML = '<div class="empty-state"><p>Loading your starred repositories...</p></div>';

  const data = await fetchGitHub('/user/starred?per_page=50&sort=' + (sort === 'stars' ? 'desc' : sort));

  if (!data || data.length === 0) {
    container.innerHTML = '<div class="empty-state"><p>No starred repositories yet.</p></div>';
    return;
  }

  let repos = data;
  if (sort === 'stars') {
    repos = repos.sort((a, b) => b.stargazers_count - a.stargazers_count);
  } else if (sort === 'updated') {
    repos = repos.sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  } else if (sort === 'name') {
    repos = repos.sort((a, b) => a.name.localeCompare(b.name));
  }

  container.innerHTML = repos.map(repo => `
    <div class="bookmark-item">
      <div class="bookmark-title">
        <a href="#" data-repo-url="${repo.full_name}">${repo.name}</a>
      </div>
      <div class="bookmark-meta">${repo.full_name}</div>
      <div class="bookmark-category">${repo.language || 'Unknown'}</div>
      <div class="bookmark-notes">
        ⭐ ${repo.stargazers_count} | 🍴 ${repo.forks_count}<br>
        ${repo.description ? repo.description.substring(0, 100) + '...' : 'No description'}
      </div>
    </div>
  `).join('');
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
