# El tiro de papel

Minijuego para una pausa de oficina. Arrastra desde la bola hacia arriba y a la derecha, suelta y observa si entra en la papelera. Un gesto es un tiro; puedes repetir después del resultado. Diseñado primero para móvil.

**Estado:** prototipo jugable pendiente de prueba de usuarios. La dificultad, los textos y la presentación podrán ajustarse tras esa prueba.

## Probar en local

Requiere Node.js 20 o posterior. No hay dependencias de terceros.

```sh
npm ci
npm test
npm run dev
```

Abre `http://localhost:4173`. `npm run build` genera `dist/` para GitHub Pages.

## Controles

- Arrastra desde la bola para apuntar. La longitud del gesto determina la fuerza; la velocidad del dedo no interviene.
- En «Jugar sin arrastrar» puedes escoger ángulo y fuerza y pulsar «Lanzar».
- Tras el resultado, «Otra bola» inicia una ronda con otra posición de la papelera. El juego guarda solo la mejor racha en el navegador.
- El sonido comienza apagado en cada carga y se activa de forma voluntaria.

## Publicación

La acción de GitHub Actions ejecuta pruebas, construye el sitio y despliega `dist/` en Pages. En **Settings → Pages**, selecciona **GitHub Actions** como fuente de publicación. La URL prevista es <https://goyoaga.github.io/el-tiro-de-papel/>.

El contador usa GoatCounter en `eltirodepapel.goatcounter.com`. Además de la visita, se registra una ronda completada. El enlace de apoyo en la pantalla de resultado lleva a <https://ko-fi.com/arielgoyoaga>.
