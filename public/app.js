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

function render(result) {
  titleEl.textContent = result.title;
  rowsEl.replaceChildren();

  for (const row of result.rows) {
    const isSelected = result.selectedColor && row.color === result.selectedColor;
    const item = document.createElement("article");
    item.className = `row${isSelected ? " selected" : ""}`;

    const colorCell = document.createElement("div");
    colorCell.className = "cell color";
    colorCell.innerHTML = `
      <p class="color-name" tabindex="0"></p>
      <div class="cell-actions">
        <button class="row-copy" type="button">Copy color</button>
      </div>
    `;
    colorCell.querySelector(".color-name").textContent = row.color;
    colorCell.querySelector(".row-copy").addEventListener("click", (event) => {
      copyText(row.color, event.currentTarget);
    });

    const imageCell = document.createElement("div");
    imageCell.className = "cell images";
    const list = document.createElement("div");
    list.className = "image-list";

    if (row.images.length) {
      for (const name of row.images) {
        const line = document.createElement("p");
        line.className = "image-name";
        line.tabIndex = 0;
        line.textContent = name;
        list.append(line);
      }
    } else {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "None";
      list.append(empty);
    }

    const actions = document.createElement("div");
    actions.className = "cell-actions";
    const copyImages = document.createElement("button");
    copyImages.className = "row-copy";
    copyImages.type = "button";
    copyImages.textContent = "Copy images";
    copyImages.disabled = row.images.length === 0;
    copyImages.addEventListener("click", (event) => {
      copyText(row.images.join("\n"), event.currentTarget);
    });
    actions.append(copyImages);

    imageCell.append(list, actions);
    item.append(colorCell, imageCell);
    rowsEl.append(item);
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
