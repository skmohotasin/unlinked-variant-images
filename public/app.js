const form = document.querySelector("#crawl-form");
const urlInput = document.querySelector("#url-input");
const toggleBtn = document.querySelector("#toggle-btn");
const stickyBtn = document.querySelector("#toggle-btn-sticky");
const runButtons = [toggleBtn, stickyBtn];
const statusEl = document.querySelector("#status");
const errorEl = document.querySelector("#error");
const resultEl = document.querySelector("#result");
const titleEl = document.querySelector("#product-title");
const rowsEl = document.querySelector("#rows");

let controller = null;

function setBusy(busy) {
  for (const button of runButtons) {
    button.textContent = busy ? "Stop" : "Start";
    button.classList.toggle("stop", busy);
    button.classList.toggle("start", !busy);
  }
  urlInput.disabled = busy;
}

function showError(message) {
  errorEl.hidden = !message;
  errorEl.textContent = message || "";
}

async function copyText(text, button) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const helper = document.createElement("textarea");
    helper.value = text;
    document.body.append(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
  }
  if (button) {
    const original = button.textContent;
    button.classList.add("copied");
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.classList.remove("copied");
      button.textContent = original;
    }, 1200);
  }
}

function imageLine(image) {
  const line = document.createElement("div");
  line.className = "image-row";

  const thumb = document.createElement("img");
  thumb.className = "thumb";
  thumb.src = image.thumb || image.src;
  thumb.alt = image.name;
  thumb.width = 100;
  thumb.height = 100;
  thumb.loading = "lazy";
  thumb.addEventListener("error", () => {
    if (thumb.src !== image.src) {
      thumb.src = image.src;
      return;
    }
    thumb.classList.add("thumb-fallback");
  });

  const name = document.createElement("p");
  name.className = "image-name";
  name.tabIndex = 0;
  name.textContent = image.name;

  const copy = document.createElement("button");
  copy.className = "row-copy";
  copy.type = "button";
  copy.textContent = "Copy";
  copy.addEventListener("click", (event) => {
    copyText(image.name, event.currentTarget);
    line.classList.add("copied-row");
  });

  line.append(thumb, name, copy);
  return line;
}

function renderGroup(row) {
  const item = document.createElement("article");
  item.className = "row";

  const colorCell = document.createElement("div");
  colorCell.className = "cell color";
  const colorName = document.createElement("p");
  colorName.className = "color-name";
  colorName.textContent = `${row.color} (${row.images.length})`;
  colorCell.append(colorName);

  const imageCell = document.createElement("div");
  imageCell.className = "cell images";
  const list = document.createElement("div");
  list.className = "image-list";

  if (row.images.length) {
    for (const image of row.images) {
      list.append(imageLine(image));
    }
  } else {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "None";
    list.append(empty);
  }

  imageCell.append(list);
  item.append(colorCell, imageCell);
  return item;
}

function render(result) {
  titleEl.textContent = result.title;
  document.querySelector("#count-colors").textContent = String(result.colorCount);
  document.querySelector("#count-images").textContent = String(result.imageCount);
  document.querySelector("#count-unlinked").textContent = String(result.unlinkedCount);
  document.querySelector("#head-color").textContent =
    `Variant color (${result.colorCount})`;
  document.querySelector("#head-images").textContent =
    `Unlinked image names (${result.unlinkedCount})`;

  rowsEl.replaceChildren();
  for (const row of result.rows) {
    rowsEl.append(renderGroup(row));
  }

  resultEl.hidden = false;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (controller) {
    controller.abort();
    controller = null;
    setBusy(false);
    statusEl.textContent = "Stopped.";
    return;
  }

  showError("");
  statusEl.textContent = "Crawling product…";
  setBusy(true);
  controller = new AbortController();

  try {
    const response = await fetch("/api/crawl", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: urlInput.value }),
      signal: controller.signal,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Crawl failed.");
    }
    render(payload);
    statusEl.textContent = `Found ${payload.rows.length} colors.`;
  } catch (error) {
    if (error.name === "AbortError") {
      statusEl.textContent = "Stopped.";
    } else {
      resultEl.hidden = true;
      showError(error.message || "Crawl failed.");
      statusEl.textContent = "";
    }
  } finally {
    controller = null;
    setBusy(false);
  }
});
