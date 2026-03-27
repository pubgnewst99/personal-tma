const https = require('https');
https.get("https://personal-tma.pubgnewst99.workers.dev/api/content/L2hvbWUvZHdpa2kvQmFjYWFuL2ktYnVpbHQtYS1jbGF1ZGUtY29kZS1jaGllZi1vZi1zdGFmZi5tZA", (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    try {
      const db = JSON.parse(data);
      console.log("Content exists:", !!db.content);
      if (db.content) {
          console.log("Image matches in markdown:", db.content.match(/!\[.*?\]\(.*?\)/g));
      }
    } catch(e) {
      console.log("Error parsing JSON:", e.message, "\nRaw data:", data);
    }
  });
});
