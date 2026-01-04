// RepoStats - Popup Script
// Detects current tab and displays repository stats

document.addEventListener('DOMContentLoaded', async () => {
  // Get current tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  // Check if we're on a GitHub repo
  const isGitHubRepo = /github\.com\/[^/]+\/[^/]+/.test(tab.url);
  
  if (isGitHubRepo && tab.url !== 'chrome://newtab/') {
    // Extract owner and repo from URL
    const urlParts = tab.url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (urlParts) {
      const owner = urlParts[1];
      const repo = urlParts[2];
      
      // Show loading
      document.getElementById('loadingState').style.display = 'block';
      
      try {
        // Fetch repo data from GitHub API
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch repository');
        }
        
        const data = await response.json();
        
        // Calculate health score
        const stars = data.stargazers_count || 0;
        const forks = data.forks_count || 0;
        const openIssues = data.open_issues_count || 0;
        const watchers = data.watchers_count || 0;
        const lastUpdate = new Date(data.updated_at);
        const daysSinceUpdate = Math.floor((Date.now() - lastUpdate) / (1000 * 60 * 60 * 24));
        
        // Calculate scores
        const maintenanceScore = Math.max(0, Math.min(100, 100 - (daysSinceUpdate * 2)));
        const activityScore = Math.min(100, (data.network_count || 0) * 5);
        const communityScore = Math.min(100, Math.floor((stars / Math.max(1, forks + 1)) * 10));
        
        // Calculate overall grade
        const avgScore = (maintenanceScore + activityScore + communityScore) / 3;
        let grade = 'A';
        if (avgScore < 90) grade = 'B';
        if (avgScore < 80) grade = 'C';
        if (avgScore < 70) grade = 'D';
        if (avgScore < 60) grade = 'F';
        
        // Update UI
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('resultsState').style.display = 'block';
        
        document.getElementById('gradeDisplay').textContent = grade;
        document.getElementById('maintenanceScore').textContent = Math.round(maintenanceScore);
        document.getElementById('activityScore').textContent = Math.round(activityScore);
        document.getElementById('communityScore').textContent = Math.round(communityScore);
        
        document.getElementById('starsCount').textContent = stars.toLocaleString();
        document.getElementById('forksCount').textContent = forks.toLocaleString();
        document.getElementById('issuesCount').textContent = openIssues;
        
        // Last update
        const updateDate = lastUpdate.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
        document.getElementById('lastUpdate').textContent = updateDate;
        
        // Language
        document.getElementById('language').textContent = data.language || 'Not specified';
        
        // License
        document.getElementById('license').textContent = data.license?.name || 'None';
        
        // Contributors
        document.getElementById('contributors').textContent = data.network_count || 0;
        
        // Risk indicators
        const risks = [];
        if (daysSinceUpdate > 180) risks.push('⚠️ No updates in 6+ months');
        if (openIssues > 100) risks.push(`⚠️ ${openIssues} open issues`);
        if (data.archived) risks.push('⚠️ Repository is archived');
        if (!data.license) risks.push('⚠️ No license specified');
        
        if (risks.length > 0) {
          document.getElementById('riskIndicators').style.display = 'block';
          document.getElementById('riskList').innerHTML = risks
            .map(r => `<div style="margin-bottom: 4px;">• ${r}</div>`)
            .join('');
        }
        
      } catch (error) {
        console.error('Error fetching repo:', error);
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        
        // Retry button
        document.getElementById('retryBtn').addEventListener('click', () => {
          location.reload();
        });
      }
    } else {
      showError();
    }
  } else {
    showError();
  }
});

function showError() {
  document.getElementById('loadingState').style.display = 'none';
  document.getElementById('resultsState').style.display = 'none';
  document.getElementById('errorState').style.display = 'block';
  
  document.getElementById('retryBtn').addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.tabs.update(tabs[0].id, { url: tabs[0].url });
    });
  });
}
