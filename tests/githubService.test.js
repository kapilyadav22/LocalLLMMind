import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for node environment
const storage = new Map();
globalThis.localStorage = {
  getItem: (k) => (storage.has(k) ? storage.get(k) : null),
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear(),
};

test('GitHub Service - storage and account management', async () => {
  storage.clear();
  const {
    getLinkedGitHubAccount,
    saveLinkedGitHubAccount,
    unlinkGitHubAccount,
    verifyGitHubToken,
  } = await import('../src/utils/githubService.ts');

  assert.equal(getLinkedGitHubAccount(), null);

  const mockAccount = {
    token: 'ghp_test1234567890',
    username: 'octocat',
    name: 'Mona Lisa Octocat',
    avatarUrl: 'https://github.com/images/error/octocat_happy.gif',
    email: 'octocat@github.com',
    htmlUrl: 'https://github.com/octocat',
    publicRepos: 8,
    linkedAt: Date.now(),
  };

  saveLinkedGitHubAccount(mockAccount);
  const retrieved = getLinkedGitHubAccount();
  assert.ok(retrieved);
  assert.equal(retrieved.username, 'octocat');
  assert.equal(retrieved.token, 'ghp_test1234567890');

  unlinkGitHubAccount();
  assert.equal(getLinkedGitHubAccount(), null);

  // verifyGitHubToken rejects empty token
  await assert.rejects(async () => {
    await verifyGitHubToken('');
  }, /Personal Access Token/);
});

test('GitHub Service - verifyGitHubToken with mock fetch', async () => {
  const originalFetch = globalThis.fetch;
  const { verifyGitHubToken } = await import('../src/utils/githubService.ts');

  try {
    globalThis.fetch = async (url, opts) => {
      assert.ok(opts.headers.Authorization.includes('ghp_valid_mock_token'));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          login: 'developer',
          name: 'Jane Developer',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345',
          html_url: 'https://github.com/developer',
          public_repos: 42,
          email: 'jane@example.com',
        }),
      };
    };

    const verified = await verifyGitHubToken('ghp_valid_mock_token');
    assert.equal(verified.username, 'developer');
    assert.equal(verified.name, 'Jane Developer');
    assert.equal(verified.publicRepos, 42);
    assert.equal(verified.avatarUrl, 'https://avatars.githubusercontent.com/u/12345');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GitHub Service - getUserRepositories and createGitHubRepository', async () => {
  const originalFetch = globalThis.fetch;
  const { getUserRepositories, createGitHubRepository } = await import('../src/utils/githubService.ts');

  try {
    globalThis.fetch = async (url, opts) => {
      const urlStr = String(url);
      if (urlStr.includes('/user/repos') && opts?.method === 'POST') {
        const body = JSON.parse(opts.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            id: 101,
            name: body.name,
            full_name: `octocat/${body.name}`,
            private: body.private,
            html_url: `https://github.com/octocat/${body.name}`,
            default_branch: 'main',
          }),
        };
      }
      if (urlStr.includes('/user/repos')) {
        return {
          ok: true,
          status: 200,
          json: async () => [
            { id: 1, name: 'repo-one', full_name: 'octocat/repo-one', private: false, default_branch: 'main' },
            { id: 2, name: 'repo-two', full_name: 'octocat/repo-two', private: true, default_branch: 'master' },
          ],
        };
      }
      throw new Error(`Unexpected URL: ${urlStr}`);
    };

    const repos = await getUserRepositories('ghp_test_token');
    assert.equal(repos.length, 2);
    assert.equal(repos[0].name, 'repo-one');
    assert.equal(repos[1].default_branch, 'master');

    const created = await createGitHubRepository('ghp_test_token', {
      name: 'awesome-app',
      description: 'Test project',
      isPrivate: true,
    });
    assert.equal(created.name, 'awesome-app');
    assert.equal(created.full_name, 'octocat/awesome-app');
    assert.equal(created.private, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GitHub Service - pushFilesToGitHubRepo commits to existing branch', async () => {
  const originalFetch = globalThis.fetch;
  const { pushFilesToGitHubRepo } = await import('../src/utils/githubService.ts');

  const history = [];
  try {
    globalThis.fetch = async (url, opts) => {
      const urlStr = String(url);
      history.push({ url: urlStr, method: opts?.method || 'GET' });

      // 1. Get branch ref
      if (urlStr.includes('/git/ref/heads/main')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ object: { sha: 'sha_base_commit' } }),
        };
      }
      // 2. Get base commit
      if (urlStr.includes('/git/commits/sha_base_commit')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ tree: { sha: 'sha_base_tree' } }),
        };
      }
      // 3. Create tree
      if (urlStr.includes('/git/trees')) {
        const body = JSON.parse(opts.body);
        assert.equal(body.base_tree, 'sha_base_tree');
        assert.equal(body.tree.length, 2);
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: 'sha_new_tree' }),
        };
      }
      // 4. Create commit
      if (urlStr.includes('/git/commits') && opts?.method === 'POST') {
        const body = JSON.parse(opts.body);
        assert.equal(body.tree, 'sha_new_tree');
        assert.deepEqual(body.parents, ['sha_base_commit']);
        return {
          ok: true,
          status: 201,
          json: async () => ({ sha: 'sha_new_commit_123' }),
        };
      }
      // 5. Update branch ref
      if (urlStr.includes('/git/refs/heads/main') && opts?.method === 'PATCH') {
        const body = JSON.parse(opts.body);
        assert.equal(body.sha, 'sha_new_commit_123');
        return {
          ok: true,
          status: 200,
          json: async () => ({}),
        };
      }

      throw new Error(`Unhandled URL: ${urlStr}`);
    };

    const result = await pushFilesToGitHubRepo(
      'ghp_test_token',
      'octocat/my-project',
      'main',
      'feat: add new feature',
      [
        { path: 'src/index.js', content: 'console.log("hello");' },
        { path: 'package.json', content: '{"name": "test"}' },
      ]
    );

    assert.equal(result.commitSha, 'sha_new_commit_123');
    assert.equal(result.htmlUrl, 'https://github.com/octocat/my-project/commit/sha_new_commit_123');
    assert.equal(history.length, 5);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('GitHub Service - createGitHubGist creates gist', async () => {
  const originalFetch = globalThis.fetch;
  const { createGitHubGist } = await import('../src/utils/githubService.ts');

  try {
    globalThis.fetch = async (url, opts) => {
      assert.equal(opts.method, 'POST');
      assert.ok(String(url).endsWith('/gists'));
      const body = JSON.parse(opts.body);
      assert.ok(body.files['main.py']);
      assert.equal(body.files['main.py'].content, 'print(1)');
      return {
        ok: true,
        status: 201,
        json: async () => ({ html_url: 'https://gist.github.com/octocat/gist12345' }),
      };
    };

    const gistUrl = await createGitHubGist('ghp_test_token', {
      description: 'My snippet',
      isPublic: false,
      files: [{ path: 'main.py', content: 'print(1)' }],
    });

    assert.equal(gistUrl, 'https://gist.github.com/octocat/gist12345');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
