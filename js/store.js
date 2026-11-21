/* =========================================================
   "BASE DE DATOS" SIMULADA CON localStorage
   ---------------------------------------------------------
   localStorage es un pequeño almacén clave → texto que vive
   en el navegador. Guardamos ahí objetos convertidos a JSON
   (JSON.stringify) y los leemos de vuelta (JSON.parse).

   Funciona como si fueran dos "tablas":
     vita_carrito  -> el carrito actual
     vita_pedidos  -> el historial de pedidos enviados

   Todas las funciones están juntas en este objeto para que,
   el día que exista un backend real, sólo se cambie este
   archivo (por fetch('/api/pedidos', ...)) y el resto de la
   app siga igual.
   ========================================================= */

window.VitaStore = (function () {
  const KEY_CART   = "vita_carrito";
  const KEY_ORDERS = "vita_pedidos";
  const KEY_SEQ    = "vita_folio";

  // Si localStorage está bloqueado (modo privado, etc.) usamos memoria.
  const memoria = {};
  function leer(key, porDefecto) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : porDefecto;
    } catch (e) {
      return key in memoria ? memoria[key] : porDefecto;
    }
  }
  function escribir(key, valor) {
    memoria[key] = valor;
    try { localStorage.setItem(key, JSON.stringify(valor)); } catch (e) { /* sin persistencia */ }
  }

  /* ---------------- Carrito ---------------- */
  function getCart() { return leer(KEY_CART, []); }

  function addToCart(linea) {
    const cart = getCart();
    // Si ya existe la misma combinación (producto + opciones + nota), sumamos cantidad
    const igual = cart.find(l => l.clave === linea.clave);
    if (igual) igual.cantidad += linea.cantidad;
    else cart.push(linea);
    escribir(KEY_CART, cart);
    return cart;
  }

  function updateQty(clave, delta) {
    let cart = getCart();
    const l = cart.find(x => x.clave === clave);
    if (l) l.cantidad += delta;
    cart = cart.filter(x => x.cantidad > 0);
    escribir(KEY_CART, cart);
    return cart;
  }

  function removeFromCart(clave) {
    const cart = getCart().filter(x => x.clave !== clave);
    escribir(KEY_CART, cart);
    return cart;
  }

  function clearCart() { escribir(KEY_CART, []); }

  function cartTotal(cart = getCart()) {
    return cart.reduce((s, l) => s + l.precioUnitario * l.cantidad, 0);
  }

  function cartCount(cart = getCart()) {
    return cart.reduce((s, l) => s + l.cantidad, 0);
  }

  /* ---------------- Pedidos ---------------- */
  function getOrders() { return leer(KEY_ORDERS, []); }

  // Simula el "INSERT" de un pedido y regresa el registro creado
  function createOrder(datosCliente) {
    const cart = getCart();
    if (!cart.length) return null;

    const folio = leer(KEY_SEQ, 0) + 1;
    escribir(KEY_SEQ, folio);

    const pedido = {
      id: "VC-" + String(folio).padStart(4, "0"),
      creado: new Date().toISOString(),
      cliente: datosCliente.cliente,
      matricula: datosCliente.matricula || null,
      modalidad: datosCliente.modalidad,
      horaRecogida: datosCliente.hora,
      pago: datosCliente.pago,
      productos: cart,
      total: cartTotal(cart)
    };

    const pedidos = getOrders();
    pedidos.unshift(pedido);
    escribir(KEY_ORDERS, pedidos);
    clearCart();
    return pedido;
  }

  function clearOrders() { escribir(KEY_ORDERS, []); }

  /* Estado simulado: se calcula con el tiempo transcurrido desde
     que se creó el pedido, así sobrevive a recargar la página. */
  const ESTADOS = [
    { desde: 0,  id: "recibido",   texto: "Recibido" },
    { desde: 20, id: "preparando", texto: "En preparación" },
    { desde: 60, id: "listo",      texto: "¡Listo para recoger!" }
  ];
  function orderStatus(pedido) {
    const seg = (Date.now() - new Date(pedido.creado).getTime()) / 1000;
    let actual = ESTADOS[0], idx = 0;
    ESTADOS.forEach((e, i) => { if (seg >= e.desde) { actual = e; idx = i; } });
    return { ...actual, paso: idx, total: ESTADOS.length };
  }

  return {
    getCart, addToCart, updateQty, removeFromCart, clearCart, cartTotal, cartCount,
    getOrders, createOrder, clearOrders, orderStatus, ESTADOS
  };
})();
