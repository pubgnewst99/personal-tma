const content = `
## 📄 Original Content

![Image 1](./assets/HCrwd71aUAMwjW0.jpg)
![Image 2](./assets/HCvR6W9aUAwk357.jpg)

The dream of modern personalized technology
`;
const API_BASE = "https://personal-tma.pubgnewst99.workers.dev";
function getAssetUrl(filePath, source) {
  const url = new URL(`${API_BASE}/api/assets`, "http://localhost:3000");
  url.searchParams.set("path", filePath);
  url.searchParams.set("source", source);
  url.searchParams.set("v", "2");
  return url.toString();
}

const rewrittenContent = content.replace(
  /!\[(.*?)\]\(\.\/(.*?)\)/g,
  (match, alt, relPath) => {
    const assetUrl = getAssetUrl(relPath, "bacaan");
    return `![${alt}](${assetUrl})`;
  }
);
console.log(rewrittenContent);
