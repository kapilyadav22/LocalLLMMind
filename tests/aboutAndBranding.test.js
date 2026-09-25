import test from 'node:test';
import assert from 'node:assert/strict';
import {
  APP_NAME,
  APP_SHORT_NAME,
  DEVELOPER_NAME,
  DEVELOPER_HANDLE,
  DEVELOPER_WATERMARK,
  DOCKERHUB_IMAGE_URL,
  DOCKERHUB_PULL_CMD,
  SOCIAL_PROFILES,
} from '../src/constants/appConstants.js';

test('App branding adheres to LocalLLMMind everywhere', () => {
  assert.equal(APP_NAME, 'LocalLLMMind');
  assert.equal(APP_SHORT_NAME, 'LocalLLMMind');
  assert.equal(DEVELOPER_NAME, 'Kapil Yadav');
  assert.equal(DEVELOPER_HANDLE, '@kapilyadav22');
  assert.equal(DEVELOPER_WATERMARK, 'Crafted by Kapil Yadav');
  assert.equal(DOCKERHUB_IMAGE_URL, 'https://hub.docker.com/r/kapilyadav22/localllmmind');
  assert.equal(DOCKERHUB_PULL_CMD, 'docker pull kapilyadav22/localllmmind');
});

test('SOCIAL_PROFILES strictly contains only social media profiles from linktr.ee/kapilyadav22', () => {
  const allowedSocialDomains = [
    'github.com',
    'linkedin.com',
    'x.com',
    'twitter.com',
    'youtube.com',
    't.me',
    'instagram.com',
  ];

  assert.equal(SOCIAL_PROFILES.length, 6);

  const profileIds = SOCIAL_PROFILES.map((p) => p.id);
  assert.deepEqual(profileIds.sort(), ['github', 'instagram', 'linkedin', 'telegram', 'x', 'youtube'].sort());

  for (const profile of SOCIAL_PROFILES) {
    assert.ok(profile.url, `Profile ${profile.id} must have a url`);
    const parsed = new URL(profile.url);
    const domainMatch = allowedSocialDomains.some((dom) => parsed.hostname.endsWith(dom));
    assert.ok(domainMatch, `URL ${profile.url} must only be a recognized social media profile`);
    assert.ok(profile.handle, `Profile ${profile.id} must display a handle`);
  }

  // Specific link checks
  const github = SOCIAL_PROFILES.find((p) => p.id === 'github');
  assert.equal(github.url, 'https://github.com/kapilyadav22');

  const linkedin = SOCIAL_PROFILES.find((p) => p.id === 'linkedin');
  assert.equal(linkedin.url, 'https://www.linkedin.com/in/kapilyadav22');

  const x = SOCIAL_PROFILES.find((p) => p.id === 'x');
  assert.equal(x.url, 'https://x.com/kapilyadav2210');

  const youtube = SOCIAL_PROFILES.find((p) => p.id === 'youtube');
  assert.equal(youtube.url, 'https://youtube.com/@kapilyadav0180');

  const telegram = SOCIAL_PROFILES.find((p) => p.id === 'telegram');
  assert.equal(telegram.url, 'https://t.me/programminghub22');

  const instagram = SOCIAL_PROFILES.find((p) => p.id === 'instagram');
  assert.equal(instagram.url, 'https://instagram.com/kapilyadav__');
});
