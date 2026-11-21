/* =========================================================
   ANIMACIONES AL HACER SCROLL
   ---------------------------------------------------------
   Uso en el HTML:
     data-anim="fade-up | fade-down | fade-left | fade-right |
                zoom-in | reveal"
     data-delay="200"   -> retraso en ms (opcional)
     data-stagger       -> en un contenedor: sus hijos con
                           data-anim aparecen uno tras otro
     data-parallax="0.3"-> fondo que se mueve más lento
     data-count="100"   -> número que cuenta al aparecer
   ========================================================= */

window.VitaAnimations = (function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let observer;

  function prepararStagger(root = document) {
    root.querySelectorAll("[data-stagger]").forEach(grupo => {
      grupo.querySelectorAll(":scope > [data-anim], :scope > * > [data-anim]").forEach((el, i) => {
        if (!el.dataset.delay) el.dataset.delay = String(i * 110);
      });
    });
  }

  function animarContador(el) {
    const fin = parseFloat(el.dataset.count) || 0;
    const sufijo = el.dataset.suffix || "";
    if (reduce) { el.textContent = fin + sufijo; return; }
    const dur = 1400, t0 = performance.now();
    (function paso(t) {
      const p = Math.min((t - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(fin * eased) + sufijo;
      if (p < 1) requestAnimationFrame(paso);
    })(t0);
  }

  function crearObserver() {
    if (!("IntersectionObserver" in window) || reduce) return null;
    return new IntersectionObserver((entradas) => {
      entradas.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target;
        el.style.transitionDelay = (el.dataset.delay || 0) + "ms";
        el.classList.add("is-visible");
        if (el.dataset.count !== undefined) animarContador(el);
        observer.unobserve(el); // se anima una sola vez
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -60px 0px" });
  }

  /* Registra elementos (también los que se crean después con JS) */
  function observar(root = document) {
    prepararStagger(root);
    const els = root.querySelectorAll("[data-anim]:not(.is-visible), [data-count]");
    if (!observer) {
      // Sin soporte o con "reducir movimiento": mostrar todo de una vez
      els.forEach(el => {
        el.classList.add("is-visible");
        if (el.dataset.count !== undefined) animarContador(el);
      });
      return;
    }
    els.forEach(el => observer.observe(el));
  }

  /* Parallax + barra de progreso + navbar compacta */
  function alHacerScroll() {
    const barra = document.querySelector(".scroll-progress");
    const nav = document.getElementById("navbar");
    const fondos = [...document.querySelectorAll("[data-parallax]")];
    let pendiente = false;

    function actualizar() {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (barra) barra.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
      if (nav) nav.classList.toggle("is-scrolled", y > 40);

      if (!reduce) {
        fondos.forEach(bg => {
          const sec = bg.parentElement.getBoundingClientRect();
          if (sec.bottom < 0 || sec.top > window.innerHeight) return;
          const vel = parseFloat(bg.dataset.parallax) || 0.3;
          bg.style.transform = `translate3d(0, ${(-sec.top * vel).toFixed(1)}px, 0)`;
        });
      }
      pendiente = false;
    }

    window.addEventListener("scroll", () => {
      if (!pendiente) { pendiente = true; requestAnimationFrame(actualizar); }
    }, { passive: true });
    window.addEventListener("resize", actualizar);
    actualizar();
  }

  function init() {
    document.documentElement.classList.add("js-anim");
    observer = crearObserver();
    observar();
    alHacerScroll();
  }

  return { init, observar };
})();
