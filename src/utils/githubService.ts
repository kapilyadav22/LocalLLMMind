/**
 * GitHub Integration Service
 * Manages GitHub account authentication via Personal Access Token (PAT),
 * remote repository listings, repo creation, remote commits, and Gist exports.
 */

export interface GitHubAccount {
  token: string;
  username: string;
  name: string;
  avatarUrl: string;
  email?: string;
  htmlUrl: string;
  publicRepos: number;
  linkedAt: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  default_branch: string;
  description?: string;
}

const GITHUB_AUTH_STORAGE_KEY = 'localllmmind_github_auth';

function getGitHubHeaders(token: string, includeContentType = false): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token.trim()}`,
    Accept: 'application/vnd.github.v3+json',
  };
  if (includeContentType) {
    headers['Content-Type'] = 'application/json';
  }
  // In Node.js / non-browser test environments, GitHub API requires a User-Agent header.
  // In browsers, the browser provides its own User-Agent and setting it triggers an unsafe header warning.
  if (typeof window === 'undefined') {
    headers['User-Agent'] = 'LocalLLMMind';
  }
  return headers;
}

export function getLinkedGitHubAccount(): GitHubAccount | null {
  try {
    const raw = localStorage.getItem(GITHUB_AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLinkedGitHubAccount(account: GitHubAccount): void {
  try {
    localStorage.setItem(GITHUB_AUTH_STORAGE_KEY, JSON.stringify(account));
  } catch (err) {
    console.error('Failed to save GitHub auth to localStorage:', err);
  }
}

export function unlinkGitHubAccount(): void {
  try {
    localStorage.removeItem(GITHUB_AUTH_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to remove GitHub auth from localStorage:', err);
  }
}

export async function verifyGitHubToken(token: string): Promise<GitHubAccount> {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('Please enter a GitHub Personal Access Token.');
  }

  const response = await fetch('https://api.github.com/user', {
    headers: getGitHubHeaders(cleanToken),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Invalid or expired GitHub token. Please verify token permissions.');
    }
    const errText = await response.text().catch(() => '');
    throw new Error(`GitHub verification failed (${response.status}): ${errText || response.statusText}`);
  }

  const user = await response.json();
  return {
    token: cleanToken,
    username: user.login || 'User',
    name: user.name || user.login || 'GitHub User',
    avatarUrl: user.avatar_url || '',
    email: user.email || undefined,
    htmlUrl: user.html_url || `https://github.com/${user.login}`,
    publicRepos: user.public_repos || 0,
    linkedAt: Date.now(),
  };
}

export async function getUserRepositories(token: string): Promise<GitHubRepo[]> {
  const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator', {
    headers: getGitHubHeaders(token),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repositories (${response.status})`);
  }

  return response.json();
}

export async function createGitHubRepository(
  token: string,
  options: { name: string; description?: string; isPrivate?: boolean }
): Promise<GitHubRepo> {
  const response = await fetch('https://api.github.com/user/repos', {
    method: 'POST',
    headers: getGitHubHeaders(token, true),
    body: JSON.stringify({
      name: options.name,
      description: options.description || 'Created with LocalLLMMind',
      private: !!options.isPrivate,
      auto_init: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Failed to create repository (${response.status})`);
  }

  return response.json();
}

export async function pushFilesToGitHubRepo(
  token: string,
  repoFullName: string,
  branch: string,
  commitMessage: string,
  files: Array<{ path: string; content: string }>
): Promise<{ commitSha: string; htmlUrl: string }> {
  if (!files || files.length === 0) {
    throw new Error('Project contains no files to push.');
  }

  const cleanBranch = branch.trim() || 'main';
  const getHeaders = getGitHubHeaders(token);
  const postHeaders = getGitHubHeaders(token, true);

  // 1. Check if target branch ref exists
  const refRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/ref/heads/${cleanBranch}`, {
    headers: getHeaders,
  });

  let latestCommitSha: string | null = null;
  let baseTreeSha: string | undefined = undefined;
  let isNewBranch = false;

  if (refRes.ok) {
    const refData = await refRes.json();
    latestCommitSha = refData.object?.sha || null;

    if (latestCommitSha) {
      const commitRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits/${latestCommitSha}`, {
        headers: getHeaders,
      });
      if (commitRes.ok) {
        const commitData = await commitRes.json();
        baseTreeSha = commitData.tree?.sha;
      }
    }
  } else {
    // Target branch does not exist yet. Check if repository has a default branch commit to branch from
    isNewBranch = true;
    const repoRes = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers: getHeaders });
    if (repoRes.ok) {
      const repoInfo = await repoRes.json();
      const defaultBranch = repoInfo.default_branch || 'main';
      const defaultRefRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/ref/heads/${defaultBranch}`, {
        headers: getHeaders,
      });
      if (defaultRefRes.ok) {
        const defaultRefData = await defaultRefRes.json();
        latestCommitSha = defaultRefData.object?.sha || null;
        if (latestCommitSha) {
          const commitRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits/${latestCommitSha}`, {
            headers: getHeaders,
          });
          if (commitRes.ok) {
            const commitData = await commitRes.json();
            baseTreeSha = commitData.tree?.sha;
          }
        }
      }
    }
  }

  // 2. Create tree containing the project files
  const treeItems = files.map((f) => ({
    path: f.path.replace(/^\/+/, ''),
    mode: '100644',
    type: 'blob',
    content: f.content ?? '',
  }));

  const treePayload: any = { tree: treeItems };
  if (baseTreeSha) {
    treePayload.base_tree = baseTreeSha;
  }

  const treeRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/trees`, {
    method: 'POST',
    headers: postHeaders,
    body: JSON.stringify(treePayload),
  });

  if (!treeRes.ok) {
    const err = await treeRes.json().catch(() => ({}));
    throw new Error(`Failed to create Git tree: ${err.message || treeRes.statusText}`);
  }
  const treeData = await treeRes.json();

  // 3. Create new commit (with parent if exists, or initial root commit if repo is empty)
  const commitPayload: any = {
    message: commitMessage,
    tree: treeData.sha,
    parents: latestCommitSha ? [latestCommitSha] : [],
  };

  const newCommitRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/commits`, {
    method: 'POST',
    headers: postHeaders,
    body: JSON.stringify(commitPayload),
  });

  if (!newCommitRes.ok) {
    const err = await newCommitRes.json().catch(() => ({}));
    throw new Error(`Failed to create Git commit: ${err.message || newCommitRes.statusText}`);
  }
  const newCommitData = await newCommitRes.json();

  // 4. Update or create branch reference
  if (isNewBranch) {
    const createRefRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/refs`, {
      method: 'POST',
      headers: postHeaders,
      body: JSON.stringify({
        ref: `refs/heads/${cleanBranch}`,
        sha: newCommitData.sha,
      }),
    });
    if (!createRefRes.ok) {
      const err = await createRefRes.json().catch(() => ({}));
      throw new Error(`Failed to create branch '${cleanBranch}': ${err.message || createRefRes.statusText}`);
    }
  } else {
    const updateRefRes = await fetch(`https://api.github.com/repos/${repoFullName}/git/refs/heads/${cleanBranch}`, {
      method: 'PATCH',
      headers: postHeaders,
      body: JSON.stringify({
        sha: newCommitData.sha,
        force: false,
      }),
    });
    if (!updateRefRes.ok) {
      const err = await updateRefRes.json().catch(() => ({}));
      throw new Error(`Failed to update branch reference: ${err.message || updateRefRes.statusText}`);
    }
  }

  return {
    commitSha: newCommitData.sha,
    htmlUrl: `https://github.com/${repoFullName}/commit/${newCommitData.sha}`,
  };
}

export async function createGitHubGist(
  token: string,
  options: { description: string; isPublic?: boolean; files: Array<{ path: string; content: string }> }
): Promise<string> {
  const gistFiles: Record<string, { content: string }> = {};
  for (const file of options.files || []) {
    const safeName = file.path.replace(/\//g, '_');
    if (safeName) {
      gistFiles[safeName] = { content: file.content || '// empty file\n' };
    }
  }

  if (Object.keys(gistFiles).length === 0) {
    gistFiles['README.md'] = { content: `# ${options.description || 'Exported Project'}\n` };
  }

  const response = await fetch('https://api.github.com/gists', {
    method: 'POST',
    headers: getGitHubHeaders(token, true),
    body: JSON.stringify({
      description: options.description || 'Gist created with LocalLLMMind',
      public: !!options.isPublic,
      files: gistFiles,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.message || `Failed to create Gist (${response.status})`);
  }

  const data = await response.json();
  return data.html_url;
}
