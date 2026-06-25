(() => {
  const preview = document.getElementById("previewArea");
  const grid = document.querySelector(".content-grid");
  if (!preview || !grid) return;

  const placeholder = document.createElement("div");
  placeholder.className = "preview-slot-placeholder";
  preview.parentNode.insertBefore(placeholder, preview);

  const DESKTOP_QUERY = "(min-width: 1221px)";
  const media = window.matchMedia(DESKTOP_QUERY);

  function clearFixed() {
    preview.classList.remove("is-js-fixed");
    preview.style.left = "";
    preview.style.width = "";
    preview.style.top = "";
    placeholder.classList.remove("is-active");
    placeholder.style.width = "";
    placeholder.style.height = "";
  }

  function syncPreview() {
    if (!media.matches) {
      clearFixed();
      return;
    }

    const wasFixed = preview.classList.contains("is-js-fixed");
    if (!wasFixed) {
      placeholder.classList.remove("is-active");
      preview.classList.remove("is-js-fixed");
      preview.style.left = "";
      preview.style.width = "";
    }

    const sourceRect = (wasFixed ? placeholder : preview).getBoundingClientRect();
    const slotWidth = Math.max(280, sourceRect.width);

    placeholder.style.width = `${slotWidth}px`;
    placeholder.style.height = `${Math.max(1, preview.offsetHeight)}px`;
    placeholder.classList.add("is-active");

    preview.classList.add("is-js-fixed");
    preview.style.left = `${sourceRect.left}px`;
    preview.style.width = `${slotWidth}px`;
    preview.style.top = "18px";
  }

  let raf = 0;
  function requestSync() {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(syncPreview);
  }

  window.addEventListener("resize", requestSync);
  window.addEventListener("scroll", requestSync, { passive: true });
  media.addEventListener?.("change", requestSync);

  const observer = new MutationObserver(requestSync);
  observer.observe(preview, { childList: true, subtree: true, attributes: true });

  requestSync();
})();
