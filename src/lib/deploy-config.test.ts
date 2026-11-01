import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentConfigErrors, deploymentVariables } from './deploy-config';
const valid = {
  VITE_PUBLIC_SITE_URL: 'https://owen1night.github.io/el-zhady/',
  VITE_SUPABASE_URL: 'https://test-project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_testpublic',
  VITE_TURNSTILE_SITE_KEY: 'test_public_site_key',
};
test('deployment requires all four public variables and the actual GitHub Pages subpath', () => {
  assert.deepEqual(deploymentConfigErrors(valid), []);
  for (const name of deploymentVariables) assert(deploymentConfigErrors({ ...valid, [name]: '' }).some(error => error.includes(name)));
  assert(deploymentConfigErrors({ ...valid, VITE_PUBLIC_SITE_URL: 'https://owen1night.github.io/' }).length > 0);
});
test('invalid deployment credentials fail without putting supplied values in diagnostics', () => {
  const supplied = 'sb_secret_test_only_do_not_use';
  const errors = deploymentConfigErrors({ ...valid, VITE_SUPABASE_PUBLISHABLE_KEY: supplied });
  assert(errors.length > 0); assert(!errors.join('\n').includes(supplied));
});
