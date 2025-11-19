/**
 * Vercel Serverless Function: Save Global 3D Embed Config
 *
 * Endpoint: /api/save-global-config
 * Method: POST
 * Body: { content: "...", path: "3d-embed-config-global.json", message: "..." }
 *
 * Saves to: no3d-tools-website/3d-embed-config-global.json
 * Uses GITHUB_TOKEN from environment variables for authentication
 */

export default async (req, res) => {
  // Always set JSON content type
  res.setHeader('Content-Type', 'application/json');

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).json({ ok: true });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST.',
      success: false
    });
  }

  try {
    // Validate environment
    if (!process.env.GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN not configured');
      return res.status(500).json({
        error: 'Server configuration error: GITHUB_TOKEN not set',
        success: false
      });
    }

    // Get request body (Vercel auto-parses JSON)
    const { content, path, message } = req.body || {};

    if (!content) {
      return res.status(400).json({
        error: 'Missing required parameter: content',
        success: false
      });
    }

    const filePath = path || '3d-embed-config-global.json';
    const commitMessage = message || 'Update global 3D embed config';

    // Repository configuration for no3d-tools-website
    const owner = 'node-dojo';
    const repo = 'no3d-tools-website';
    const branch = 'main';

    // Get current file SHA if it exists (required for updates)
    let sha = null;
    try {
      const getFileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
      const getFileResponse = await fetch(getFileUrl, {
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'NO3D-Tools-Website',
          'X-GitHub-Api-Version': '2022-11-28'
        }
      });

      if (getFileResponse.ok) {
        const fileData = await getFileResponse.json();
        sha = fileData.sha;
        console.log(`📋 Found existing file, SHA: ${sha.substring(0, 7)}...`);
      }
    } catch (error) {
      console.log(`📋 File does not exist yet, will create new: ${error.message}`);
    }

    // Convert content to base64
    const contentBase64 = Buffer.from(content, 'utf8').toString('base64');

    // Prepare request body
    const requestBody = {
      message: commitMessage,
      content: contentBase64,
      branch: branch
    };

    if (sha) {
      requestBody.sha = sha;
    }

    // Save file to GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    console.log(`📤 Saving file to GitHub: ${filePath}`);

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        'User-Agent': 'NO3D-Tools-Website',
        'X-GitHub-Api-Version': '2022-11-28'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`GitHub API error: ${response.status} ${response.statusText}`, errorText);
      
      return res.status(response.status).json({
        error: `GitHub API error: ${response.status} ${response.statusText}`,
        message: errorText,
        success: false
      });
    }

    const result = await response.json();

    console.log(`✅ File saved successfully: ${filePath}`);
    console.log(`   Commit SHA: ${result.commit.sha.substring(0, 7)}`);

    return res.status(200).json({
      success: true,
      message: 'Global config file saved successfully',
      commit: {
        sha: result.commit.sha,
        url: result.commit.html_url
      },
      content: {
        path: result.content.path,
        sha: result.content.sha,
        url: result.content.html_url
      }
    });

  } catch (error) {
    console.error('❌ Error saving global config:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      success: false
    });
  }
};

