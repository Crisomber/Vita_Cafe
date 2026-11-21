/* =========================================================
   APP PRINCIPAL: navegación, menú, carrito y pedidos
   ========================================================= */
(function () {
  const Store = window.VitaStore;
  let MENU;     // se llena al cargar data/menu.json
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  let dinero;
  const fmt = n => dinero.format(n);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let categoriaActiva;

  /* =============== NAVEGACIÓN =============== */
  function initNav() {
    const nav = $("#menu-principal");
    const toggle = $("#btn-menu");

    toggle.addEventListener("click", () => {
      const abierto = nav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", abierto);
    });

    // Cerrar menú móvil al elegir una sección
    $$('a[href^="#"]').forEach(a => a.addEventListener("click", () => {
      nav.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    }));

    // Resaltar el enlace de la sección visible
    const mapa = { bienvenida: "inicio", servicios: "inicio" };
    const links = $$(".nav-link");
    const io = new IntersectionObserver(entradas => {
      entradas.forEach(e => {
        if (!e.isIntersecting) return;
        const id = mapa[e.target.id] || e.target.id;
        links.forEach(l => l.classList.toggle("is-active", l.getAttribute("href") === "#" + id));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    $$("main .section").forEach(s => io.observe(s));
  }

  /* =============== MENÚ =============== */
  function renderCategorias() {
    $("#categorias").innerHTML = MENU.categorias.map((c, i) => `
      <button class="category ${c.id === categoriaActiva ? "is-active" : ""}" role="tab"
              aria-selected="${c.id === categoriaActiva}" data-cat="${c.id}"
              data-anim="fade-up" data-delay="${i * 140}">
        <span class="category__img"><img src="${c.imagen}" alt="" loading="lazy"></span>
        <span class="category__name">${c.nombre}</span>
      </button>`).join("");

    $$(".category").forEach(btn => btn.addEventListener("click", () => {
      categoriaActiva = btn.dataset.cat;
      $$(".category").forEach(b => {
        const on = b === btn;
        b.classList.toggle("is-active", on);
        b.setAttribute("aria-selected", on);
      });
      renderProductos();
    }));
    window.VitaAnimations.observar($("#categorias"));
  }

  function renderProductos() {
    const lista = MENU.productos.filter(p => p.categoria === categoriaActiva);
    const cont = $("#productos");
    cont.innerHTML = lista.map((p, i) => `
      <article class="product" data-anim="fade-up" data-delay="${i * 70}">
        <div class="product__top">
          <h3>${p.nombre}</h3>
          <span class="product__price">${fmt(p.precio)}</span>
        </div>
        <p>${p.descripcion}</p>
        <div class="product__foot">
          <div class="tags">${p.etiquetas.map(t => `<span class="tag">${t}</span>`).join("")}</div>
          <button class="btn btn--small" data-add="${p.id}">
            ${p.opciones.length ? "Personalizar" : "Agregar"} +
          </button>
        </div>
      </article>`).join("");

    $$("[data-add]", cont).forEach(b => b.addEventListener("click", () => abrirProducto(b.dataset.add)));
    window.VitaAnimations.observar(cont);
  }

  /* =============== MODAL DE PRODUCTO =============== */
  function abrirProducto(id) {
    const p = MENU.productos.find(x => x.id === id);
    const form = $("#form-producto");

    const grupos = p.opciones.map(key => {
      const g = MENU.opciones[key];
      const tipo = g.tipo === "uno" ? "radio" : "checkbox";
      return `
        <fieldset class="field">
          <legend>${g.nombre}</legend>
          <div class="chips">
            ${g.valores.map((v, i) => `
              <label class="chip">
                <input type="${tipo}" name="${key}" value="${v.id}" data-extra="${v.extra}"
                       ${tipo === "radio" && i === 0 ? "checked" : ""}>
                <span>${v.nombre}${v.extra ? ` <small>+${fmt(v.extra)}</small>` : ""}</span>
              </label>`).join("")}
          </div>
        </fieldset>`;
    }).join("");

    form.innerHTML = `
      <div class="modal__head">
        <div>
          <span class="eyebrow">${MENU.categorias.find(c => c.id === p.categoria).nombre}</span>
          <h2>${p.nombre}</h2>
        </div>
        <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
      </div>
      <p class="modal__desc">${p.descripcion}</p>
      ${grupos}
      <label class="field">Nota para cocina (opcional)
        <input name="nota" maxlength="80" placeholder="Ej. sin hielo, bien tostado…">
      </label>
      <div class="qty-row">
        <div class="qty">
          <button type="button" data-q="-1" aria-label="Menos">−</button>
          <output name="cantidad">1</output>
          <button type="button" data-q="1" aria-label="Más">+</button>
        </div>
        <button type="submit" class="btn btn--primary" value="ok">Agregar <span data-subtotal></span></button>
      </div>`;

    let cantidad = 1;
    const recalcular = () => {
      const extras = $$("input:checked", form).reduce((s, i) => s + Number(i.dataset.extra || 0), 0);
      $("[data-subtotal]", form).textContent = fmt((p.precio + extras) * cantidad);
      $("output", form).textContent = cantidad;
      return extras;
    };
    form.oninput = recalcular;
    $$("[data-q]", form).forEach(b => b.onclick = () => {
      cantidad = Math.max(1, Math.min(20, cantidad + Number(b.dataset.q)));
      recalcular();
    });
    recalcular();

    form.onsubmit = (ev) => {
      ev.preventDefault();
      const extras = recalcular();
      const elegidas = p.opciones.flatMap(key => {
        const g = MENU.opciones[key];
        return $$(`input[name="${key}"]:checked`, form).map(i => {
          const v = g.valores.find(x => x.id === i.value);
          return { grupo: g.nombre, valor: v.nombre };
        });
      });
      const nota = form.nota.value.trim();
      Store.addToCart({
        clave: p.id + "|" + elegidas.map(o => o.valor).join(",") + "|" + nota,
        productoId: p.id,
        nombre: p.nombre,
        opciones: elegidas,
        nota,
        precioUnitario: p.precio + extras,
        cantidad
      });
      $("#modal-producto").close();
      actualizarCarrito();
      toast(`${p.nombre} agregado al carrito`);
      $("#btn-carrito").classList.remove("bump"); void $("#btn-carrito").offsetWidth;
      $("#btn-carrito").classList.add("bump");
    };

    $("#modal-producto").showModal();
  }

  /* =============== CARRITO =============== */
  function actualizarCarrito() {
    const cart = Store.getCart();
    $("#cart-count").textContent = Store.cartCount(cart);
    $("#cart-count").classList.toggle("is-empty", cart.length === 0);
    $("#cart-total").textContent = fmt(Store.cartTotal(cart));
    $("#btn-checkout").disabled = cart.length === 0;

    $("#cart-items").innerHTML = cart.length ? cart.map(l => `
      <div class="line">
        <div class="line__info">
          <strong>${esc(l.nombre)}</strong>
          ${l.opciones.length ? `<small>${l.opciones.map(o => esc(o.valor)).join(" · ")}</small>` : ""}
          ${l.nota ? `<small class="line__note">“${esc(l.nota)}”</small>` : ""}
          <span class="line__price">${fmt(l.precioUnitario * l.cantidad)}</span>
        </div>
        <div class="qty qty--sm">
          <button data-dec="${esc(l.clave)}" aria-label="Quitar uno">−</button>
          <output>${l.cantidad}</output>
          <button data-inc="${esc(l.clave)}" aria-label="Agregar uno">+</button>
        </div>
      </div>`).join("")
      : `<div class="empty"><img src="img/logo-icono.png" alt=""><p>Tu carrito está vacío.</p><a href="#menu" class="btn btn--small" data-close>Ver menú</a></div>`;

    $$("[data-inc]").forEach(b => b.onclick = () => { Store.updateQty(b.dataset.inc, 1); actualizarCarrito(); });
    $$("[data-dec]").forEach(b => b.onclick = () => { Store.updateQty(b.dataset.dec, -1); actualizarCarrito(); });
    $$("#cart-items [data-close]").forEach(b => b.onclick = cerrarPaneles);
  }

  /* =============== PANELES LATERALES =============== */
  function abrirPanel(id) {
    cerrarPaneles();
    $("#" + id).classList.add("is-open");
    $("#" + id).setAttribute("aria-hidden", "false");
    $("#backdrop").hidden = false;
    document.body.classList.add("no-scroll");
  }
  function cerrarPaneles() {
    $$(".drawer").forEach(d => { d.classList.remove("is-open"); d.setAttribute("aria-hidden", "true"); });
    $("#backdrop").hidden = true;
    document.body.classList.remove("no-scroll");
  }

  /* =============== CHECKOUT =============== */
  function horarios() {
    const ahora = new Date();
    const slots = [];
    const d = new Date(ahora);
    d.setMinutes(Math.ceil((d.getMinutes() + 15) / 15) * 15, 0, 0);
    const abre = new Date(ahora); abre.setHours(9, 0, 0, 0);
    const cierra = new Date(ahora); cierra.setHours(18, 0, 0, 0);
    if (d < abre) d.setTime(abre.getTime());
    let manana = false;
    if (d > cierra) { manana = true; d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); cierra.setDate(cierra.getDate() + 1); }
    while (d <= cierra && slots.length < 16) {
      slots.push(d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }) + (manana ? " (mañana)" : ""));
      d.setMinutes(d.getMinutes() + 15);
    }
    return ["Lo antes posible", ...slots];
  }

  function abrirCheckout() {
    const cart = Store.getCart();
    if (!cart.length) return;
    $("#select-hora").innerHTML = horarios().map(h => `<option>${h}</option>`).join("");
    $("#checkout-summary").innerHTML = `
      ${cart.map(l => `<div><span>${l.cantidad}× ${esc(l.nombre)}</span><span>${fmt(l.precioUnitario * l.cantidad)}</span></div>`).join("")}
      <div class="summary__total"><span>Total</span><span>${fmt(Store.cartTotal(cart))}</span></div>`;
    cerrarPaneles();
    $("#modal-checkout").showModal();
  }

  function enviarPedido(ev) {
    ev.preventDefault();
    const f = ev.target;
    if (!f.cliente.value.trim()) {
      f.cliente.focus();
      f.cliente.classList.add("is-invalid");
      toast("Escribe tu nombre para el pedido");
      return;
    }
    const pedido = Store.createOrder({
      cliente: f.cliente.value.trim(),
      matricula: f.matricula.value.trim(),
      modalidad: f.modalidad.value,
      hora: f.hora.value,
      pago: f.pago.value
    });
    f.reset();
    $("#modal-checkout").close();
    actualizarCarrito();
    renderPedidos();
    mostrarTicket(pedido);
  }

  /* =============== TICKET Y ESTADO =============== */
  let timerTicket;
  function stepper(pedido) {
    const st = Store.orderStatus(pedido);
    return `
      <ol class="stepper" data-paso="${st.paso}">
        ${Store.ESTADOS.map((e, i) => `<li class="${i <= st.paso ? "done" : ""}">${e.texto}</li>`).join("")}
      </ol>`;
  }

  function mostrarTicket(pedido) {
    const t = $("#ticket");
    const pintar = () => {
      t.innerHTML = `
        <div class="modal__head">
          <h2>¡Pedido enviado!</h2>
          <button type="button" class="icon-btn" data-close-modal aria-label="Cerrar">✕</button>
        </div>
        <div class="ticket__folio">
          <span>Tu folio</span>
          <strong>${pedido.id}</strong>
          <small>A nombre de ${esc(pedido.cliente)} · ${esc(pedido.modalidad)} · ${esc(pedido.horaRecogida)}</small>
        </div>
        ${stepper(pedido)}
        <div class="summary">
          ${pedido.productos.map(l => `<div><span>${l.cantidad}× ${esc(l.nombre)}</span><span>${fmt(l.precioUnitario * l.cantidad)}</span></div>`).join("")}
          <div class="summary__total"><span>Total (${esc(pedido.pago)})</span><span>${fmt(pedido.total)}</span></div>
        </div>
        <div class="ticket__actions">
          <button class="btn btn--ghost-dark" data-descargar>Descargar ticket (.json)</button>
          <button class="btn btn--primary" data-close-modal>Listo</button>
        </div>`;
      $("[data-descargar]", t).onclick = () => descargarJSON(pedido);
    };
    pintar();
    clearInterval(timerTicket);
    timerTicket = setInterval(() => {
      if (!$("#modal-ticket").open) return clearInterval(timerTicket);
      const s = $(".stepper", t);
      if (s && Number(s.dataset.paso) !== Store.orderStatus(pedido).paso) s.outerHTML = stepper(pedido);
    }, 1000);
    $("#modal-ticket").showModal();
  }

  function descargarJSON(pedido) {
    const blob = new Blob([JSON.stringify(pedido, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pedido-${pedido.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  function renderPedidos() {
    const pedidos = Store.getOrders();
    $("#orders-list").innerHTML = pedidos.length ? pedidos.map(p => {
      const st = Store.orderStatus(p);
      const fecha = new Date(p.creado).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" });
      return `
        <button class="order" data-ver="${p.id}">
          <div><strong>${p.id}</strong><small>${fecha} · ${p.productos.reduce((s, l) => s + l.cantidad, 0)} productos</small></div>
          <div class="order__right"><span class="status status--${st.id}">${st.texto}</span><span>${fmt(p.total)}</span></div>
        </button>`;
    }).join("") : `<div class="empty"><p>Aún no has hecho pedidos.</p></div>`;

    $$("[data-ver]").forEach(b => b.onclick = () => {
      cerrarPaneles();
      mostrarTicket(Store.getOrders().find(p => p.id === b.dataset.ver));
    });
  }

  /* =============== TOAST =============== */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("is-show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("is-show"), 2200);
  }

  /* =============== EVENTOS GENERALES =============== */
  function initEventos() {
    $("#btn-carrito").addEventListener("click", () => abrirPanel("carrito"));
    $("#btn-pedidos").addEventListener("click", () => { renderPedidos(); abrirPanel("pedidos"); });
    $("#backdrop").addEventListener("click", cerrarPaneles);
    $$(".drawer [data-close]").forEach(b => b.addEventListener("click", cerrarPaneles));
    $("#btn-checkout").addEventListener("click", abrirCheckout);
    $("#form-checkout").addEventListener("submit", enviarPedido);
    $("#form-checkout").cliente.addEventListener("input", e => e.target.classList.remove("is-invalid"));
    $("#btn-borrar-historial").addEventListener("click", () => {
      if (confirm("¿Borrar todo el historial de pedidos de este navegador?")) { Store.clearOrders(); renderPedidos(); }
    });

    // Cerrar modales: botón ✕ o clic fuera del contenido
    document.addEventListener("click", e => {
      if (e.target.closest("[data-close-modal]")) e.target.closest("dialog")?.close();
    });
    $$("dialog").forEach(d => d.addEventListener("click", e => { if (e.target === d) d.close(); }));
    document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarPaneles(); });
  }

  /* =============== CARGA DEL MENÚ (JSON) =============== */
  async function cargarMenu() {
    const res = await fetch("data/menu.json", { cache: "no-cache" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  function errorMenu() {
    $("#productos").innerHTML = `
      <div class="menu-error">
        <strong>No se pudo cargar el menú.</strong>
        <p>El menú vive en <code>data/menu.json</code> y el navegador no permite leerlo si abres
        el archivo con doble clic. Ábrelo desde el enlace de GitHub Pages o con un servidor local
        (por ejemplo, la extensión <em>Live Server</em> de VS Code).</p>
      </div>`;
  }

  /* =============== ARRANQUE =============== */
  document.addEventListener("DOMContentLoaded", async () => {
    $("#anio").textContent = new Date().getFullYear();
    window.VitaAnimations.init();
    initNav();
    initEventos();

    try {
      MENU = await cargarMenu();
    } catch (e) {
      console.warn("Menú no disponible:", e);
      errorMenu();
      return;
    }
    dinero = new Intl.NumberFormat("es-MX", { style: "currency", currency: MENU.moneda });
    categoriaActiva = MENU.categorias[0].id;
    const contador = $('[data-count="18"]');
    if (contador) contador.dataset.count = MENU.productos.length;

    renderCategorias();
    renderProductos();
    actualizarCarrito();
  });
})();
