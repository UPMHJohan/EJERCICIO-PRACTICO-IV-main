const datosTexto = JSON.parse(document.getElementById("texto-datos").textContent);
const oraciones = datosTexto.match(/[^.!?]+[.!?]+/g) || [datosTexto];
let indiceOracion = 0;
let palabras = []; // Contendrá las palabras de la oración actual

const contenedorTexto = document.getElementById("texto-prueba");
const entrada = document.getElementById("entrada-usuario");
const marcadorTiempo = document.getElementById("tiempo-restante");
const barraProgreso = document.getElementById("barra-progreso");
const pantallaResultado = document.getElementById("pantalla-resultado");
const valorWpm = document.getElementById("valor-wpm");
const insigniaRacha = document.getElementById("insignia-racha");
const insigniaVelocidad = document.getElementById("insignia-velocidad");
const iconoVelocidad = document.getElementById("icono-velocidad");
const etiquetaVelocidad = document.getElementById("etiqueta-velocidad");

const DURACION_SEGUNDOS = 60;
const PALABRAS_POR_RACHA = 4;

let indiceActual = 0;
let palabrasCorrectas = 0;
let rachaActual = 0;
let temporizadorRacha = null;
let tiempoRestante = DURACION_SEGUNDOS;
let intervalo = null;
let pruebaIniciada = false;
let pruebaTerminada = false;

// Iconos (SVG en trazo, heredan el color via currentColor)
const ICONOS_VELOCIDAD = {
    caracol: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 48c0-10 8-18 18-18s18 8 18 18" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle cx="42" cy="26" r="14" stroke="currentColor" stroke-width="3"/>
        <path d="M42 26c0-5-4-9-9-9s-7 3-7 7 3 6 6 6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="6" y1="48" x2="44" y2="48" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <line x1="10" y1="34" x2="6" y2="28" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <circle cx="6" cy="28" r="1.6" fill="currentColor"/>
    </svg>`,
    liebre: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="28" cy="44" rx="16" ry="12" fill="currentColor"/>
        <circle cx="46" cy="34" r="9" fill="currentColor"/>
        <path d="M40 16c-2 8 0 14 4 18" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <path d="M50 14c2 8 0 15-3 19" stroke="currentColor" stroke-width="4" stroke-linecap="round"/>
        <path d="M12 44c-4 2-6 5-6 8" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
    chita: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 40c4-10 12-16 22-16 8 0 14 4 18 10 3 5 8 6 12 4" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="46" cy="24" r="7" fill="currentColor"/>
        <path d="M40 20l-4-4M52 20l4-4" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
        <path d="M10 40c0 6 4 10 10 10M22 44c0 5 3 9 8 9" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
        <circle cx="20" cy="30" r="1.6" fill="currentColor"/>
        <circle cx="28" cy="26" r="1.6" fill="currentColor"/>
        <circle cx="36" cy="30" r="1.6" fill="currentColor"/>
    </svg>`,
};

// Determina la categoria de velocidad segun las palabras por minuto:
// Caracol <30 p/m, Liebre entre 30 y 60 p/m, Chita >60 p/m
function obtenerCategoriaVelocidad(palabrasPorMinuto) {
    if (palabrasPorMinuto < 30) {
        return { clave: "caracol", etiqueta: "Caracol" };
    }
    if (palabrasPorMinuto <= 60) {
        return { clave: "liebre", etiqueta: "Liebre" };
    }
    return { clave: "chita", etiqueta: "Chita" };
}

function mostrarImagenVelocidad(palabrasPorMinuto) {
    if (!iconoVelocidad || !etiquetaVelocidad || !insigniaVelocidad) {
        return;
    }
    const categoria = obtenerCategoriaVelocidad(palabrasPorMinuto);
    iconoVelocidad.innerHTML = ICONOS_VELOCIDAD[categoria.clave];
    insigniaVelocidad.className = `insignia-velocidad categoria-${categoria.clave}`;
    etiquetaVelocidad.textContent = categoria.etiqueta;
}

// Muestra la insignia de racha al acertar varias palabras seguidas
function mostrarRacha(cantidad) {
    if (!insigniaRacha) {
        return;
    }
    insigniaRacha.textContent = `🔥 Racha x${cantidad}`;
    insigniaRacha.classList.remove("mostrar");
    // Fuerza un reflow para poder reiniciar la animacion aunque se repita seguido
    void insigniaRacha.offsetWidth;
    insigniaRacha.classList.add("mostrar");

    clearTimeout(temporizadorRacha);
    temporizadorRacha = setTimeout(() => {
        insigniaRacha.classList.remove("mostrar");
    }, 1600);
}

function dibujarTexto() {
    contenedorTexto.innerHTML = palabras
        .map((palabra, indice) => {
            const letras = palabra
                .split("")
                .map((letra) => `<span class="letra">${letra}</span>`)
                .join("");
            return `<span class="palabra" data-indice="${indice}">${letras}</span>`;
        })
        .join(" ");
    marcarPalabraActual();
}

function marcarPalabraActual() {
    document.querySelectorAll(".palabra").forEach((elemento) => elemento.classList.remove("actual"));
    const elementoActual = document.querySelector(`.palabra[data-indice="${indiceActual}"]`);
    if (elementoActual) {
        elementoActual.classList.add("actual");
        elementoActual.scrollIntoView({ block: "center", behavior: "smooth" });
    }
}

// Colorea letra por letra la palabra que se esta escribiendo en este momento
function actualizarLetrasPalabraActual() {
    const elementoActual = document.querySelector(`.palabra[data-indice="${indiceActual}"]`);
    if (!elementoActual) {
        return;
    }

    const palabraObjetivo = palabras[indiceActual];
    const letras = elementoActual.querySelectorAll(".letra");
    const escrito = entrada.value;

    letras.forEach((letraElemento, indice) => {
        letraElemento.classList.remove("correcta", "incorrecta", "cursor");
        if (indice < escrito.length) {
            letraElemento.classList.add(escrito[indice] === palabraObjetivo[indice] ? "correcta" : "incorrecta");
        } else if (indice === escrito.length) {
            letraElemento.classList.add("cursor");
        }
    });
}

function iniciarCuentaRegresiva() {
    intervalo = setInterval(() => {
        tiempoRestante -= 1;
        marcadorTiempo.textContent = tiempoRestante;
        if (tiempoRestante <= 0) {
            finalizarPrueba();
        }
    }, 1000);
}

function finalizarPrueba() {
    if (pruebaTerminada) {
        return;
    }
    pruebaTerminada = true;

    clearInterval(intervalo);
    entrada.disabled = true;

    const segundosUsados = DURACION_SEGUNDOS - tiempoRestante;
    const minutos = segundosUsados > 0 ? segundosUsados / 60 : 1 / 60;
    const palabrasPorMinuto = Math.round(palabrasCorrectas / minutos);

    valorWpm.textContent = palabrasPorMinuto;
    mostrarImagenVelocidad(palabrasPorMinuto);
    pantallaResultado.classList.add("visible");

    fetch("/guardar_resultado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ velocidad: palabrasPorMinuto }),
    });
}

// Se ejecuta cuando el usuario confirma una palabra con espacio o enter
function procesarPalabra() {
    const escrita = entrada.value.trim();
    const elementoActual = document.querySelector(`.palabra[data-indice="${indiceActual}"]`);
    const palabraObjetivo = palabras[indiceActual];

    if (elementoActual) {
        const letras = elementoActual.querySelectorAll(".letra");
        letras.forEach((letraElemento, indice) => {
            letraElemento.classList.remove("cursor");
            const correcta = indice < escrita.length && escrita[indice] === palabraObjetivo[indice];
            letraElemento.classList.toggle("correcta", correcta);
            letraElemento.classList.toggle("incorrecta", !correcta);
        });

        const esCorrecta = escrita === palabraObjetivo;
        elementoActual.classList.toggle("correcta", esCorrecta);
        elementoActual.classList.toggle("incorrecta", !esCorrecta);

        if (esCorrecta && !elementoActual.dataset.contada) {
            palabrasCorrectas += 1;
            elementoActual.dataset.contada = "1";

            rachaActual += 1;
            if (rachaActual > 0 && rachaActual % PALABRAS_POR_RACHA === 0) {
                mostrarRacha(rachaActual);
            }
        } else if (!esCorrecta) {
            rachaActual = 0;
        }
    }

    indiceActual += 1;
    entrada.value = "";
    barraProgreso.style.width = `${(indiceActual / palabras.length) * 100}%`;

    if (indiceActual >= palabras.length) {
    indiceOracion += 1;
    cargarOracionActual(); // Pasa a la siguiente oración
    return;
}

    marcarPalabraActual();
}

// Permite volver a la palabra anterior si quedo marcada como incorrecta
function retrocederPalabra() {
    const palabraAnterior = document.querySelector(`.palabra[data-indice="${indiceActual - 1}"]`);
    if (!palabraAnterior || !palabraAnterior.classList.contains("incorrecta")) {
        return;
    }

    indiceActual -= 1;
    palabraAnterior.classList.remove("correcta", "incorrecta");
    palabraAnterior.querySelectorAll(".letra").forEach((letra) => {
        letra.classList.remove("correcta", "incorrecta", "cursor");
    });

    barraProgreso.style.width = `${(indiceActual / palabras.length) * 100}%`;
    marcarPalabraActual();
}

entrada.addEventListener("input", (evento) => {
    if (pruebaTerminada) {
        return;
    }

    if (!pruebaIniciada) {
        pruebaIniciada = true;
        iniciarCuentaRegresiva();
    }

    if (evento.target.value.endsWith(" ")) {
        procesarPalabra();
        return;
    }

    actualizarLetrasPalabraActual();
});

entrada.addEventListener("keydown", (evento) => {
    if (pruebaTerminada) {
        return;
    }

    if (evento.key === "Enter") {
        evento.preventDefault();
        if (entrada.value.trim().length > 0) {
            entrada.value += " ";
            entrada.dispatchEvent(new Event("input"));
        }
        return;
    }

    if (evento.key === "Backspace" && entrada.value.length === 0 && indiceActual > 0) {
        evento.preventDefault();
        retrocederPalabra();
    }
});

function cargarOracionActual() {
    if (indiceOracion < oraciones.length) {
        // Extrae las palabras únicamente de la oración que toca escribir
        palabras = oraciones[indiceOracion].trim().split(/\s+/).filter(Boolean);
        indiceActual = 0;
        dibujarTexto();
    } else {
        finalizarPrueba();
    }
}
cargarOracionActual();
entrada.focus();
