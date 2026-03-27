const https = require('https');
https.get("https://personal-tma.pubgnewst99.workers.dev/content/L2hvbWUvZHdpa2kvQmFjYWFuL2ktYnVpbHQtYS1jbGF1ZGUtY29kZS1jaGllZi1vZi1zdGFmZi5tZA", (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    // extract img tags
    const imgMatches = data.match(/<img[^>]*>/g);
    console.log("Found IMG tags:", imgMatches);
  });
});
