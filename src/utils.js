const CONTENT_INTENT_REGEX = /^.+(?=Content)/g;

export function extractLaunchParams() {
  if (window.launchParams) {
    return JSON.parse(window.launchParams);
  } else {
    return {};
  }
}

function getYTURL() {
  const ytURL = new URL('https://www.youtube.com/tv#/');
  // Avoid env_forceFullAnimation: It forces software animations that cause heavy lag on TV CPUs.
  ytURL.searchParams.append('env_enableWebSpeech', '1');
  ytURL.searchParams.append('env_enableVoice', '1');
  return ytURL;
}

/**
 * Creates a new URLSearchPrams with the contents of `a` and `b`
 * @param {URLSearchParams} a
 * @param {URLSearchParams} b
 * @returns {URLSearchParams}
 */
function concatSearchParams(a, b) {
  return new URLSearchParams([...a.entries(), ...b.entries()]);
}

export function handleLaunch(params) {
  console.info('handleLaunch', params);
  let ytURL = getYTURL();

  let { target, contentTarget = target } = params;

  switch (typeof contentTarget) {
    case 'string': {
      if (contentTarget.indexOf(ytURL.origin) === 0) {
        console.info('Launching from direct contentTarget');
        ytURL = contentTarget;
      } else {
        console.info('Launching from partial contentTarget');
        if (contentTarget.indexOf('v=v=') === 0)
          contentTarget = contentTarget.substring(2);

        ytURL.search = concatSearchParams(
          ytURL.searchParams,
          new URLSearchParams(contentTarget)
        );
      }
      break;
    }
    case 'object': {
      console.info('Voice launch');
      const { intent, intentParam } = contentTarget;
      const search = ytURL.searchParams;
      const voiceContentIntent = intent
        .match(CONTENT_INTENT_REGEX)?.[0]
        ?.toLowerCase();

      search.set('inApp', true);
      search.set('vs', 9);
      voiceContentIntent && search.set('va', voiceContentIntent);

      search.append('launch', 'voice');
      voiceContentIntent === 'search' && search.append('launch', 'search');

      search.set('vq', intentParam);
      break;
    }
    default: {
      console.info('Default launch');
    }
  }

  window.location.href = ytURL.toString();
}

export async function waitForChildAdd(
  parent,
  predicate,
  observeAttributes,
  abortSignal
) {
  return new Promise((resolve, reject) => {
    const obs = new MutationObserver((mutations) => {
      for (const mut of mutations) {
        switch (mut.type) {
          case 'attributes': {
            if (predicate(mut.target)) {
              obs.disconnect();
              resolve(mut.target);
              return;
            }
            break;
          }
          case 'childList': {
            for (const node of mut.addedNodes) {
              if (predicate(node)) {
                obs.disconnect();
                resolve(node);
                return;
              }
            }
            break;
          }
        }
      }
    });

    if (abortSignal) {
      abortSignal.addEventListener('abort', () => {
        obs.disconnect();
        reject(new Error('aborted'));
      });
    }

    obs.observe(parent, {
      subtree: true,
      attributes: observeAttributes,
      childList: true
    });
  });
}
