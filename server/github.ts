// GitHub Integration - Replit Connector
import { Octokit } from '@octokit/rest'

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

// Get authenticated user info
export async function getAuthenticatedUser() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

// List user repositories
export async function listRepositories() {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: 100
  });
  return data;
}

// Create a new file in a repository
export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string = 'main'
) {
  const octokit = await getUncachableGitHubClient();
  
  // Check if file exists to get its SHA
  let sha: string | undefined;
  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch
    });
    if ('sha' in data) {
      sha = data.sha;
    }
  } catch (error: any) {
    // File doesn't exist, that's okay
    if (error.status !== 404) {
      throw error;
    }
  }
  
  // Create or update the file
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
    sha
  });
  
  return data;
}

// Create multiple files in a single commit
export async function createMultipleFiles(
  owner: string,
  repo: string,
  files: Array<{ path: string; content: string }>,
  message: string,
  branch: string = 'main'
) {
  const octokit = await getUncachableGitHubClient();
  
  // Get the current commit SHA for the branch
  const { data: refData } = await octokit.git.getRef({
    owner,
    repo,
    ref: `heads/${branch}`
  });
  const latestCommitSha = refData.object.sha;
  
  // Get the tree SHA for the latest commit
  const { data: commitData } = await octokit.git.getCommit({
    owner,
    repo,
    commit_sha: latestCommitSha
  });
  const baseTreeSha = commitData.tree.sha;
  
  // Create blobs for each file
  const blobs = await Promise.all(
    files.map(async (file) => {
      const { data: blobData } = await octokit.git.createBlob({
        owner,
        repo,
        content: Buffer.from(file.content).toString('base64'),
        encoding: 'base64'
      });
      return {
        path: file.path,
        mode: '100644' as const,
        type: 'blob' as const,
        sha: blobData.sha
      };
    })
  );
  
  // Create a new tree
  const { data: treeData } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: blobs
  });
  
  // Create a new commit
  const { data: newCommitData } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: treeData.sha,
    parents: [latestCommitSha]
  });
  
  // Update the reference to point to the new commit
  await octokit.git.updateRef({
    owner,
    repo,
    ref: `heads/${branch}`,
    sha: newCommitData.sha
  });
  
  return newCommitData;
}

// Get repository info
export async function getRepository(owner: string, repo: string) {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.repos.get({ owner, repo });
  return data;
}

// List branches
export async function listBranches(owner: string, repo: string) {
  const octokit = await getUncachableGitHubClient();
  const { data } = await octokit.repos.listBranches({ owner, repo });
  return data;
}
