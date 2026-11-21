# Vita Café · sitio web (HTML + CSS + JS)

**En línea:** https://crisomber.github.io/Vita_Cafe/

No usa base de datos. Para probarlo en tu compu ábrelo con un servidor local (por ejemplo, la extensión
*Live Server* de VS Code o `python3 -m http.server`), porque el navegador no deja leer `menu.json` con doble clic.

## Estructura
```
Vita_Cafe/
├── index.html        Una sola página: Inicio · Menú · Conóceme · Contacto
├── css/styles.css    Estilos, paleta del diseño y animaciones
├── data/menu.json    Catálogo del menú en JSON (categorías, productos, precios, opciones)
├── img/              Imágenes extraídas y optimizadas del PDF
└── js/
    ├── store.js      "Base de datos" simulada con localStorage (carrito y pedidos)
    ├── animations.js Animaciones al hacer scroll (IntersectionObserver)
    └── app.js        Navegación, menú, carrito, checkout y ticket
```

## ¿Cómo se simula el pedido sin base de datos?
| Qué | Dónde | Por qué |
|---|---|---|
| Menú (sólo lectura) | `data/menu.json`, cargado con `fetch()` | Es justo lo que devolvería una API; para cambiar el menú sólo editas este archivo |
| Carrito y pedidos | `localStorage` (`vita_carrito`, `vita_pedidos`) | Persiste al recargar, como si fueran tablas |
| Estado del pedido | Calculado por tiempo: Recibido → En preparación (20 s) → Listo (60 s) | Simula la cocina |
| Ticket | Botón "Descargar ticket (.json)" | Muestra el registro tal como lo recibiría un backend |

Cuando haya backend, sólo se cambia `store.js` por llamadas `fetch('/api/...')`.

## Animaciones
Agrega a cualquier elemento `data-anim="fade-up|fade-down|fade-left|fade-right|zoom-in|reveal"`,
y opcionalmente `data-delay="200"`. Un contenedor con `data-stagger` anima sus hijos en cascada.
`data-parallax="0.3"` en un fondo y `data-count="100"` para contadores.
Respeta la preferencia "reducir movimiento" del sistema.
