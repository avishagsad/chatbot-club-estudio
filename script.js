(() => {
  'use strict';

  const ui = {
    eyebrow: document.querySelector('#eyebrow'),
    pageTitle: document.querySelector('#page-title'),
    introCopy: document.querySelector('#intro-copy'),
    chatTitle: document.querySelector('#chat-title'),
    chatSubtitle: document.querySelector('#chat-subtitle'),
    dayLabel: document.querySelector('#day-label'),
    conversation: document.querySelector('#conversation'),
    nameForm: document.querySelector('#name-form'),
    nameLabel: document.querySelector('#name-label'),
    nameInput: document.querySelector('#name-input'),
    sendButton: document.querySelector('#send-button'),
    notice: document.querySelector('#notice'),
    choices: document.querySelector('#choices'),
    footerCopy: document.querySelector('#footer-copy'),
    pageNote: document.querySelector('#page-note')
  };

  let arbol;
  let nombre = '';
  let nodoActual = '';

  function reemplazarNombre(texto) {
    return texto.replaceAll('{nombre}', nombre);
  }

  function mostrarAviso(texto, comoMensaje = false) {
    ui.notice.textContent = texto;
    ui.notice.hidden = comoMensaje;
    if (comoMensaje) agregarMensaje(texto, 'error');
  }

  function agregarMensaje(texto, tipo = 'bot') {
    const mensaje = document.createElement('p');
    mensaje.className = tipo === 'user' ? 'message user' : tipo === 'error' ? 'message error' : 'message';
    mensaje.textContent = texto;
    ui.conversation.append(mensaje);
    mensaje.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function validarArbol(datos) {
    if (!datos || typeof datos !== 'object' || !datos.configuracion || !datos.nodos) {
      throw new Error('El archivo no contiene configuración y nodos.');
    }
    const nodos = datos.nodos;
    for (const [id, nodo] of Object.entries(nodos)) {
      if (typeof nodo.texto !== 'string' || !Array.isArray(nodo.opciones)) {
        throw new Error(datos.configuracion.errorNodo.replace('{nodo}', id));
      }
      for (const opcion of nodo.opciones) {
        if (!opcion || typeof opcion.texto !== 'string' || !nodos[opcion.siguiente]) {
          throw new Error(datos.configuracion.errorDestino
            .replace('{opcion}', opcion?.texto ?? '')
            .replace('{destino}', opcion?.siguiente ?? ''));
        }
      }
    }
    if (!nodos[datos.configuracion.inicio]) {
      throw new Error(`El nodo inicial «${datos.configuracion.inicio}» no existe.`);
    }
  }

  function aplicarConfiguracion(config) {
    document.title = config.tituloDocumento;
    ui.eyebrow.textContent = config.etiquetaSuperior;
    ui.pageTitle.textContent = config.tituloPagina;
    ui.introCopy.textContent = config.descripcionPagina;
    ui.chatTitle.textContent = config.nombreBot;
    ui.chatSubtitle.textContent = config.subtituloBot;
    ui.dayLabel.textContent = config.etiquetaConversacion;
    ui.nameLabel.textContent = config.textoCampoNombre;
    ui.nameInput.placeholder = config.placeholderNombre;
    ui.sendButton.setAttribute('aria-label', config.ariaEnviarNombre);
    ui.choices.setAttribute('aria-label', config.ariaOpciones);
    ui.conversation.setAttribute('aria-label', config.ariaConversacion);
    ui.notice.setAttribute('aria-label', config.ariaError);
    ui.footerCopy.textContent = config.textoPie;
    ui.pageNote.textContent = config.notaPagina;
  }

  function mostrarNodo(id) {
    const nodo = arbol.nodos[id];
    if (!nodo) {
      const detalle = arbol.configuracion.errorNodo.replace('{nodo}', id);
      mostrarAviso(arbol.configuracion.errorArbol.replace('{detalle}', detalle));
      return;
    }

    nodoActual = id;
    ui.notice.hidden = true;
    ui.choices.replaceChildren();
    ui.nameForm.hidden = nodo.solicitaDato !== 'nombre';
    agregarMensaje(reemplazarNombre(nodo.texto));

    for (const opcion of nodo.opciones) {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.className = `choice-button${opcion.estilo === 'principal' ? ' is-primary' : ''}`;
      boton.textContent = opcion.texto;
      boton.addEventListener('click', () => elegirOpcion(opcion));
      ui.choices.append(boton);
    }

    if (nodo.solicitaDato === 'nombre') {
      ui.nameInput.value = '';
      requestAnimationFrame(() => ui.nameInput.focus());
    } else if (ui.choices.firstElementChild) {
      ui.choices.firstElementChild.focus({ preventScroll: true });
    }
  }

  function elegirOpcion(opcion) {
    agregarMensaje(opcion.texto, 'user');
    if (opcion.siguiente === arbol.configuracion.inicio) {
      nombre = '';
      ui.conversation.replaceChildren();
    }
    mostrarNodo(opcion.siguiente);
  }

  ui.nameForm.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const capturado = ui.nameInput.value.trim();
    if (!capturado) {
      ui.notice.hidden = false;
      ui.notice.textContent = arbol.configuracion.errorNombreVacio;
      ui.nameInput.focus();
      return;
    }
    if (capturado.length > 40) {
      ui.notice.hidden = false;
      ui.notice.textContent = arbol.configuracion.errorNombreLargo;
      ui.nameInput.focus();
      return;
    }

    nombre = capturado;
    ui.notice.hidden = true;
    agregarMensaje(nombre, 'user');
    ui.nameForm.hidden = true;
    mostrarNodo('menu');
  });

  async function iniciar() {
    try {
      const respuesta = await fetch('./arbol_decision.json', { cache: 'no-store' });
      if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);
      arbol = await respuesta.json();
      validarArbol(arbol);
      aplicarConfiguracion(arbol.configuracion);
      mostrarNodo(arbol.configuracion.inicio);
    } catch (error) {
      if (arbol?.configuracion?.errorArbol) {
        mostrarAviso(arbol.configuracion.errorArbol.replace('{detalle}', error.message));
        return;
      }
      const esArchivoLocal = window.location.protocol === 'file:';
      const texto = esArchivoLocal
        ? 'errorSinServidor'
        : 'errorCarga';
      const mensaje = arbol?.configuracion?.[texto]
        ?? (esArchivoLocal
          ? 'Iniciá un servidor local para que el navegador pueda cargar arbol_decision.json.'
          : 'No se pudo cargar la conversación. Revisá arbol_decision.json y volvé a intentarlo.');
      mostrarAviso(mensaje);
      if (error instanceof SyntaxError) {
        ui.notice.textContent = `${mensaje} ${error.message}`;
      }
    }
  }

  iniciar();
})();
