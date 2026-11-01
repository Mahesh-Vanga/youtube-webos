import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runtime } from './runtime.mjs';

const { videoRectangle } = await runtime().import('src/video-framing.ts');
test('original at 100 percent leaves native video geometry untouched', () => {
  assert.equal(videoRectangle(1920, 1080, 1920, 1080, 'original', 100), null);
});
test('Fill covers a 16:9 TV with 4:3 video by cropping rather than stretching', () => {
  const rect = videoRectangle(1920, 1080, 1440, 1080, 'fill', 100);
  assert.equal(rect.width, 1920);
  assert.equal(rect.height, 1440);
  assert.equal(rect.top, -180);
  assert.equal(rect.left, 0);
  assert.equal(rect.width / rect.height, 4 / 3);
});
test('4:3 frame fits a widescreen source without distorting it', () => {
  const rect = videoRectangle(1920, 1080, 1920, 1080, '4:3', 100);
  assert.equal(rect.width, 1440);
  assert.equal(rect.height, 810);
  assert.equal(rect.left, 240);
  assert.equal(rect.top, 135);
});
test('zoom enlarges only video and remains centered', () => {
  const rect = videoRectangle(1920, 1080, 1920, 1080, 'original', 150);
  assert.equal(rect.width, 2880);
  assert.equal(rect.height, 1620);
  assert.equal(rect.left, -480);
  assert.equal(rect.top, -270);
});
test('frame presets and zoom preserve source ratio and finite bounds', () => {
  for (const mode of ['original', 'fill', '16:9', '4:3', '21:9']) {
    for (const source of [
      [1920, 1080],
      [1080, 1920],
      [1920, 800],
      [640, 480]
    ]) {
      const rect = videoRectangle(1920, 1080, ...source, mode, 125);
      assert.ok(
        Math.abs(rect.width / rect.height - source[0] / source[1]) < 0.00001
      );
      assert.ok(Math.abs(rect.left + rect.width / 2 - 960) < 0.00001);
      assert.ok(Math.abs(rect.top + rect.height / 2 - 540) < 0.00001);
    }
  }
});
test('metadata not available and invalid dimensions do not override the video', () => {
  assert.equal(videoRectangle(1920, 1080, 0, 0, 'fill', 100), null);
  assert.equal(videoRectangle(1920, 1080, 1920, 1080, 'fill', NaN), null);
});
