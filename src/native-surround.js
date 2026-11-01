// Discover only an explicitly-labelled native YouTube surround control. Never
// infer surround/Atmos from a video title, device codec support or a fake badge.
export function findSurroundControl(root = document) {
  const candidates = Array.from(root.querySelectorAll('[aria-label]')).filter(
    (node) => {
      if (node.closest('.ytaf-ui-container')) return false;
      if (
        !node.closest('[idomkey="controls"], [idomkey="player-bar-renderer"]')
      )
        return false;
      const label = node.getAttribute('aria-label') || '';
      if (!/\b5\.1\b|\bsurround(?: sound| audio)?\b/i.test(label)) return false;
      const role = node.getAttribute('role');
      if (
        !node.matches('button, input') &&
        !['button', 'switch', 'checkbox', 'menuitemcheckbox'].includes(role)
      )
        return false;
      return (
        !node.disabled &&
        node.getAttribute('aria-disabled') !== 'true' &&
        node.getAttribute('aria-hidden') !== 'true' &&
        node.getClientRects().length > 0
      );
    }
  );
  // A single unambiguous control is required. When YouTube changes its markup,
  // leave its UI alone and show manual instructions instead of guessing.
  return candidates.length === 1 ? candidates[0] : null;
}
