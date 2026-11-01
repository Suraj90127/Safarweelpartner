const http = require('http');
const { exec } = require('child_process');

http.get('http://localhost:8081/json/list', res => {
  let data = '';
  res.on('data', chunk => (data += chunk));
  res.on('end', () => {
    try {
      const list = JSON.parse(data);
      if (list && list.length > 0 && list[0].devtoolsFrontendUrl) {
        const url = `http://localhost:8081${list[0].devtoolsFrontendUrl}`;
        console.log(`Opening React Native DevTools in browser:\n${url}`);
        const startCmd =
          process.platform === 'win32'
            ? `start chrome "${url}" || start "" "${url}"`
            : process.platform === 'darwin'
            ? `open -a "Google Chrome" "${url}" || open "${url}"`
            : `google-chrome "${url}" || xdg-open "${url}"`;
        exec(startCmd);
      } else {
        console.log('No active React Native app target found on port 8081.');
        console.log('Please ensure your app is running on the device.');
      }
    } catch (e) {
      console.error('Failed to parse targets from Metro:', e.message);
    }
  });
}).on('error', err => {
  console.error('Metro bundler is not running on port 8081:', err.message);
});
