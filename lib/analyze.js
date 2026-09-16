const PRODUCT_PATH = /\/products\/([^/?#]+)/i;

export function absoluteSrc(src) {
  if (!src) return "";
  return String(src).startsWith("//") ? `https:${src}` : String(src);
}

export function filenameFromSrc(src) {
  if (!src) return "";
  try {
    const url = new URL(absoluteSrc(src));
    return decodeURIComponent(url.pathname.split("/").pop() || "");
  } catch {
    return String(src).split("?")[0].split("/").pop() || "";
  }
}

export function thumbnailSrc(src, size = 100) {
  const absolute = absoluteSrc(src);
  if (!absolute) return "";
  try {
    const url = new URL(absolute);
    url.searchParams.set("width", String(size));
    url.searchParams.set("height", String(size));
    url.searchParams.set("crop", "center");
    return url.toString();
  } catch {
    return absolute;
  }
}

export function parseProductUrl(raw) {
  if (!raw || typeof raw !== "string") {
    throw new Error("Paste a product URL first.");
  }

  const trimmed = raw.trim();
  let url;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("That does not look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http and https product URLs are supported.");
  }

  const match = url.pathname.match(PRODUCT_PATH);
  if (!match) {
    throw new Error("Use a Shopify product URL that contains /products/.");
  }

  const handle = decodeURIComponent(match[1]);
  const variantId = url.searchParams.get("variant");

  return {
    origin: url.origin,
    handle,
    variantId,
    jsUrl: `${url.origin}/products/${handle}.js`,
  };
}

function mediaSrc(item) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.src || item.preview_image?.src || "";
}

function mediaList(product) {
  if (Array.isArray(product.media) && product.media.length) {
    return product.media;
  }

  return (product.images || []).map((image, index) => ({
    id: `img-${index}`,
    src: typeof image === "string" ? image : image?.src,
    position: index + 1,
  }));
}

export function analyzeProduct(product, selectedVariantId) {
  const variants = product.variants || [];
  const mediaIdToColor = new Map();
  const srcToColor = new Map();
  let selectedColor = null;

  for (const variant of variants) {
    const color = variant.option1 || variant.title || "Unknown";
    if (selectedVariantId && String(variant.id) === String(selectedVariantId)) {
      selectedColor = color;
    }
    if (variant.featured_media?.id != null) {
      mediaIdToColor.set(variant.featured_media.id, color);
    }
    if (variant.featured_image?.src) {
      srcToColor.set(filenameFromSrc(variant.featured_image.src), color);
    }
  }

  const grouped = [];
  let currentColor = null;
  let currentImages = [];

  const flush = () => {
    if (!currentColor) return;
    const existing = grouped.find((row) => row.color === currentColor);
    if (existing) {
      existing.images.push(...currentImages);
    } else {
      grouped.push({ color: currentColor, images: [...currentImages] });
    }
    currentImages = [];
  };

  for (const item of mediaList(product)) {
    const name = filenameFromSrc(mediaSrc(item));
    if (!name) continue;
    const color = mediaIdToColor.get(item.id) || srcToColor.get(name);
    if (color) {
      if (currentColor === null) {
        currentColor = color;
      } else if (color !== currentColor) {
        flush();
        currentColor = color;
      }
    } else if (currentColor) {
      const src = absoluteSrc(mediaSrc(item));
      currentImages.push({
        name,
        src,
        thumb: thumbnailSrc(src, 100),
      });
    }
  }
  flush();

  const colorOption = (product.options || []).find(
    (option) => String(option.name || "").toLowerCase() === "color",
  );
  const colorCount = colorOption?.values?.length || grouped.length;
  const imageCount = mediaList(product).length;
  const unlinkedCount = grouped.reduce((sum, row) => sum + row.images.length, 0);

  return {
    title: product.title || "Untitled product",
    handle: product.handle || "",
    selectedColor,
    colorCount,
    imageCount,
    unlinkedCount,
    rows: grouped,
  };
}
