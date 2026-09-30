<div align="center">

# 🗑️ El tiro de papel

### Una bola. Una papelera. Un solo tiro.

**¿La meterás a la primera o necesitarás otra pausa de café?**

[![Jugar](https://img.shields.io/badge/▶_JUGAR_AHORA-175C5D?style=for-the-badge&logoColor=white)](https://goyoaga.github.io/el-tiro-de-papel/)
[![Ko-fi](https://img.shields.io/badge/☕_INVÍTAME_UN_CAFÉ-FF5E5B?style=for-the-badge&logo=ko-fi&logoColor=white)](https://ko-fi.com/arielgoyoaga)

![Canvas 2D](https://img.shields.io/badge/Canvas-2D-264D46?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-F7DF1E?style=for-the-badge&logo=javascript&logoColor=222)
![CSS](https://img.shields.io/badge/CSS-Interfaz-1572B6?style=for-the-badge&logo=css&logoColor=white)
![GitHub Pages](https://img.shields.io/badge/GitHub_Pages-Hosting-222222?style=for-the-badge&logo=github&logoColor=white)

`🎮 Juego gratuito` · `📱 Móvil primero` · `🪶 Sin cuentas ni servidor de juego`

</div>

---

## ✨ La pausa más corta de la oficina

Tienes una bola de papel y una papelera a la vista. **Desliza desde la bola hacia arriba y a la derecha**: la dirección del gesto marca el ángulo y su longitud, la fuerza. Suelta para lanzar. Verás la trayectoria completa y sabrás si entró, rozó el borde o qué conviene ajustar para el siguiente intento.

<div align="center">

**🧻 APUNTA → ↗️ DESLIZA → 🗑️ LANZA → 🔁 AJUSTA**

</div>

| Detalle | Cómo funciona |
| :--- | :--- |
| 🎯 Objetivo | Conseguir que la bola entre por la abertura de la papelera. |
| 👆 Control | Un gesto desde la bola. Puedes ver la dirección antes de soltar; la rapidez del dedo no altera el tiro. |
| 🗑️ Variación | La papelera cambia de posición entre rondas, pero permanece quieta durante cada lanzamiento. |
| 🏆 Racha | Cada enceste suma uno; un fallo reinicia la racha. La mejor se guarda solo en tu navegador, si está disponible. |
| ⌨️ Alternativa | «Jugar sin arrastrar» permite elegir ángulo y fuerza con controles accesibles y lanzar con un botón. |
| 🔊 Sonido | Empieza desactivado en cada visita; puedes activarlo desde la cabecera. |

> [!NOTE]
> **Prototipo jugable en revisión.** Estamos comprobando en móvil si la dificultad, el gesto y el resultado invitan a repetir. La trayectoria usa un modelo sencillo y determinista; no simula todos los rebotes de una bola real.

## 🚀 Jugar

Abre **[goyoaga.github.io/el-tiro-de-papel](https://goyoaga.github.io/el-tiro-de-papel/)**. En móvil, coloca el dedo sobre la bola, deslízalo hacia la papelera y suelta. En escritorio puedes hacer el mismo gesto con el ratón. Si el gesto es demasiado corto, puedes volver a apuntar sin perder el intento.

Después del resultado, pulsa **Otra bola** para probar con otra posición. El botón **Favoritos** te indica cómo guardar la página en tu navegador.

Si te divertiste y te apetece apoyar estos juegos gratuitos, puedes **[invitarme un café en Ko-fi ☕](https://ko-fi.com/arielgoyoaga)**. Es completamente opcional.

## 📊 Visitas y partidas

GoatCounter registra las visitas y el evento `ronda-completada` al terminar cada lanzamiento válido. Las estadísticas se consultan en `eltirodepapel.goatcounter.com`; GitHub Insights mide la actividad del repositorio, no las visitas al juego. No se envían la fuerza, el ángulo ni el resultado de cada tiro. Si el navegador bloquea la analítica, la partida continúa.

## 🧰 Ejecutarlo en local

Necesitas Node.js 22 o superior.

```bash
git clone https://github.com/goyoaga/el-tiro-de-papel.git
cd el-tiro-de-papel
npm ci
npm test
npm run dev
```

Abre `http://localhost:4173`. Para generar los archivos de publicación:

```bash
npm run build
```

El resultado queda en `dist/`. El proyecto no necesita instalar bibliotecas de juego ni un servidor permanente.

## 📦 Publicación y estructura

La escena se dibuja con **Canvas 2D**; los botones, textos y controles son HTML y CSS. `src/model.js` calcula la trayectoria y el contacto independientemente de la frecuencia de fotogramas. `src/main.js` gestiona gestos, estados y dibujo. Los tests de `src/model.test.js` comprueban tiros conocidos y que las distintas posiciones pueden alcanzarse.

`npm run build` ejecuta un script de Node que copia el HTML y `src/` a `dist/`: **no usa Vite ni empaqueta el código**. El workflow de `.github/workflows/deploy.yml` ejecuta `npm ci`, tests y build al enviar cambios a `main`, y publica `dist/` mediante GitHub Actions en Pages. Las rutas relativas permiten servirlo bajo `/el-tiro-de-papel/`.

## 🎨 Diseño y créditos

La interfaz sigue la familia visual de UNA-MAS-GAMES: fondo cálido, títulos editoriales, líneas finas y resultado con **Otra bola** como acción principal y Ko-fi debajo. La bola, la papelera y la escena de oficina se dibujan en código; no se distribuyen modelos ni imágenes ajenos. **DM Sans** y **Playfair Display** se cargan desde Google Fonts, con fuentes del sistema como alternativa. Las insignias de este README provienen de Shields.io.

---

<div align="center"><sub>Hecho para la pausa del café. Y para intentarlo una vez más. 🧻</sub></div>
