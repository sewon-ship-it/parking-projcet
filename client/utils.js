export async function getConfig() {
  const res = await fetch("/config");
  return await res.json();
}

export async function loadCSV(url) {
  const text = await fetch(url).then(r=>r.text());
  return new Promise((resolve) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data)
    });
  });
}

export function groupBy(arr, key) {
  return arr.reduce((acc, row) => {
    const k = row[key];
    acc[k] = acc[k] || [];
    acc[k].push(row);
    return acc;
  }, {});
}

export function downloadCanvasPNG(canvas, anchorEl) {
  anchorEl.href = canvas.toDataURL("image/png");
}

