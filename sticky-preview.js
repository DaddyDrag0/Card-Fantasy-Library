(() => {
  const preview = document.getElementById("previewArea");
  if (!preview) return;

  const placeholder = document.createElement("div");
  placeholder.className = "preview-slot-placeholder";
  preview.parentNode.insertBefore(placeholder, preview);

  const DESKTOP_QUERY = "(min-width: 1221px)";
  const media = window.matchMedia(DESKTOP_QUERY);
  const FLOAT_TOP = 18;
  let lastSlotTop = 0;

  function clearFixed() {
    preview.classList.remove("is-js-fixed");
    preview.style.left = "";
    preview.style.width = "";
    preview.style.top = "";
    placeholder.classList.remove("is-active");
    placeholder.style.width = "";
    placeholder.style.height = "";
  }

  function getSlotRect() {
    const isFixed = preview.classList.contains("is-js-fixed");
    return (isFixed ? placeholder : preview).getBoundingClientRect();
  }

  function syncPreview() {
    if (!media.matches) {
      clearFixed();
      return;
    }

    const rect = getSlotRect();
    const slotTop = rect.top + window.scrollY;
    const slotLeft = rect.left;
    const slotWidth = Math.max(280, rect.width);
    lastSlotTop = slotTop || lastSlotTop;

    if (window.scrollY + FLOAT_TOP < (lastSlotTop || slotTop)) {
      clearFixed();
      return;
    }

    const height = Math.max(1, preview.offsetHeight);
    placeholder.style.width = `${slotWidth}px`;
    placeholder.style.height = `${height}px`;
    placeholder.classList.add("is-active");

    preview.classList.add("is-js-fixed");
    preview.style.left = `${slotLeft}px`;
    preview.style.width = `${slotWidth}px`;
    preview.style.top = `${FLOAT_TOP}px`;
  }

  let raf = 0;
  function requestSync() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(syncPreview);
  }

  window.addEventListener("resize", () => {
    lastSlotTop = 0;
    clearFixed();
    requestSync();
  });
  window.addEventListener("scroll", requestSync, { passive: true });
  media.addEventListener?.("change", () => {
    lastSlotTop = 0;
    clearFixed();
    requestSync();
  });

  const observer = new MutationObserver(requestSync);
  observer.observe(preview, { childList: true, subtree: true, attributes: true });

  requestSync();
})();
