/**
 * Vercel Serverless Function: Get GitHub Repository Contents
 *
 * Endpoint: /api/get-github-contents
 * Method: GET
 *
 * Query Parameters:
 *   - owner: Repository owner (e.g., "node-dojo")
 *   - repo: Repository name (e.g., "no3d-prints-library")
 *   - branch: Branch name (default: "main")
 *   - path: Optional path within repository (default: "")
 *
 * Returns: Array of repository contents (files/directories)
 *
 * Uses GITHUB_TOKEN from environment variables for authentication
 */

export default async (req, res) => {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      contents: []
    });
  }

  try {
    // Validate environment
    if (!process.env.GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error: GITHUB_TOKEN not set',
        contents: []
      });
    }

    // Get query parameters
    const { owner, repo, branch = 'main', path = '' } = req.query;

    if (!owner || !repo) {
      return res.status(400).json({
        error: 'Missing required parameters: owner and repo are required',
        contents: []
      });
    }

    // Construct GitHub API URL
    const apiPath = path ? `/${path}` : '';
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents${apiPath}?ref=${branch}`;

    console.log(`Fetching GitHub contents from: ${apiUrl}`);

    // Fetch from GitHub API with authentication
    // GitHub accepts both "token" and "Bearer" formats, but "Bearer" is preferred
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'NO3D-Tools-Website',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub API error: ${response.status} ${response.statusText}`, errorText);
      
      return res.status(response.status).json({
        error: `GitHub API error: ${response.status} ${response.statusText}`,
        message: errorText,
        contents: []
      });
    }

    const contents = await response.json();

    // Handle GitHub API error responses
    if (contents.message) {
      console.error(`GitHub API error message: ${contents.message}`);
      return res.status(404).json({
        error: contents.message,
        contents: []
      });
    }

    // Return contents array
    return res.status(200).json({
      contents: Array.isArray(contents) ? contents : [contents],
      owner,
      repo,
      branch,
      path
    });

  } catch (error) {
    console.error('Error fetching GitHub contents:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      contents: []
    });
  }
};


