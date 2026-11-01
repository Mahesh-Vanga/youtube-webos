// Use the documented Application Manager launch operation. Do not write private
// TV audio/scaler settings or claim that requesting a codec changes Sound Out.
const pending = new Set();

export function launchTVApp(id, params = {}) {
  return new Promise((resolve, reject) => {
    let bridge;
    let finished = false;
    const timeout = window.setTimeout(
      () =>
        finish(
          new Error('The TV did not respond. Use the TV Settings button.')
        ),
      5000
    );
    function finish(error, result) {
      if (finished) return;
      finished = true;
      window.clearTimeout(timeout);
      if (bridge) pending.delete(bridge);
      if (error) reject(error);
      else resolve(result);
    }
    function receive(value) {
      try {
        const response = typeof value === 'string' ? JSON.parse(value) : value;
        if (response?.returnValue === true) finish(null, response);
        else
          finish(
            new Error(response?.errorText || 'The TV could not open this app.')
          );
      } catch {
        finish(new Error('The TV returned an unreadable response.'));
      }
    }
    try {
      if (typeof window.webOS?.service?.request === 'function') {
        window.webOS.service.request('luna://com.webos.applicationManager', {
          method: 'launch',
          parameters: { id, params },
          onSuccess: receive,
          onFailure: (error) =>
            finish(
              new Error(error?.errorText || 'The TV rejected this request.')
            )
        });
      } else if (typeof window.PalmServiceBridge === 'function') {
        bridge = new window.PalmServiceBridge();
        pending.add(bridge);
        bridge.onservicecallback = receive;
        bridge.call(
          'luna://com.webos.applicationManager/launch',
          JSON.stringify({ id, params })
        );
      } else
        finish(
          new Error(
            'TV services are unavailable here. Use the TV Settings button.'
          )
        );
    } catch (error) {
      finish(error);
    }
  });
}

export function openTVSoundSettings() {
  return launchTVApp('com.palm.app.settings', { target: 'sound' });
}
