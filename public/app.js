const form = document.querySelector("#crawl-form");
const urlInput = document.querySelector("#url-input");
const toggleBtn = document.querySelector("#toggle-btn");
const statusEl = document.querySelector("#status");
const errorEl = document.querySelector("#error");
const resultEl = document.querySelector("#result");
const titleEl = document.querySelector("#product-title");
const rowsEl = document.querySelector("#rows");

let controller = null;

function setBusy(busy) {
  toggleBtn.textContent = busy ? "Stop" : "Start";
  toggleBtn.classList.toggle("stop", busy);
  toggleBtn.classList.toggle("start", !busy);
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

function colorCell(color) {
  const cell = document.createElement("div");
  cell.className = "cell color";
  cell.innerHTML = `
    <p class="color-name" tabindex="0"></p>
    <div class="cell-actions">
      <button class="row-copy" type="button">Copy color</button>
    </div>
  `;
  cell.querySelector(".color-name").textContent = color;
  cell.querySelector(".row-copy").addEventListener("click", (event) => {
    copyText(color, event.currentTarget);
  });
  return cell;
}

function renderImageRow(color, image, selected) {
  const item = document.createElement("article");
  item.className = `row${selected ? " selected" : ""}`;

  const imageCell = document.createElement("div");
  imageCell.className = "cell images";

  const line = document.createElement("div");
  line.className = "image-row";

  const thumb = document.createElement("img");
  thumb.className = "thumb";
  thumb.src = image.thumb || image.src;
  thumb.alt = image.name;
  thumb.width = 150;
  thumb.height = 150;
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
  });

  line.append(thumb, name, copy);
  imageCell.append(line);
  item.append(colorCell(color), imageCell);
  return item;
}

function renderEmptyRow(color, selected) {
  const item = document.createElement("article");
  item.className = `row${selected ? " selected" : ""}`;
  const imageCell = document.createElement("div");
  imageCell.className = "cell images";
  imageCell.innerHTML = `<p class="empty">None</p>`;
  item.append(colorCell(color), imageCell);
  return item;
}

function render(result) {
  titleEl.textContent = result.title;
  rowsEl.replaceChildren();

  for (const row of result.rows) {
    const isSelected = result.selectedColor && row.color === result.selectedColor;
    if (!row.images.length) {
      rowsEl.append(renderEmptyRow(row.color, isSelected));
      continue;
    }
    for (const image of row.images) {
      rowsEl.append(renderImageRow(row.color, image, isSelected));
    }
  }

  resultEl.hidden = false;
  if (result.selectedColor) {
    rowsEl.querySelector(".row.selected")?.scrollIntoView({
      block: "center",
      behavior: "smooth",
    });
  }
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
    const selected = payload.selectedColor
      ? ` Highlighted ${payload.selectedColor}.`
      : "";
    statusEl.textContent = `Found ${payload.rows.length} colors.${selected}`;
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

document.querySelector("[data-copy-target='product-title']").addEventListener(
  "click",
  (event) => copyText(titleEl.textContent, event.currentTarget),
);
