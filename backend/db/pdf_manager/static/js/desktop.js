// Versión optimizada para escritorio que usa imágenes WebP pre-generadas

var currentZoom = 1;
var pageWidth, pageHeight;
var lastTransformOrigin = '50% 50%';
// La constante baseUrl se elimina, se usará AppConfig global

$(document).ready(function() {
  console.log('Modo Desktop: Usando imágenes pre-generadas');
  
  // pdfUrl viene de la variable global selectedPDF definida en index.html
  // selectedPDF es el nombre del catálogo/carpeta, ej: "Catalogo Ejemplo"
  const pdfUrl = window.selectedPDF; 
  if (!pdfUrl) {
    console.error("Error: selectedPDF no está definido. Asegúrate de que se pasa desde el HTML.");
    // Podrías redirigir o mostrar un error aquí
    $('#flipbook').html('<p style="color:red; text-align:center;">Error: No se ha especificado un PDF para mostrar.</p>');
    hideLoader();
    return;
  }
  console.log("PDF seleccionado (nombre de catálogo):", pdfUrl);
  
  const flipbookContainer = document.getElementById('flipbook');
  
  // pdfBaseName es el nombre del catálogo, que es igual a pdfUrl en este contexto.
  // Se usa para construir rutas a imágenes y al PDF original.
  const pdfBaseName = pdfUrl; // pdfUrl ya es el nombre base del catálogo/directorio
  console.log("Nombre base del PDF (catálogo):", pdfBaseName);
  
  // Construir la ruta a la carpeta donde están las imágenes de las páginas del PDF procesado
  // Ruta: /api/pdfs/processed_files/NOMBRE_CATALOGO/page_X.webp
  const imagesBasePath = AppConfig.getFullPath('processed_files/' + pdfBaseName);
  console.log("Buscando imágenes en (ruta base para imágenes de página):", imagesBasePath);
  
  // Verificar si existen imágenes contando cuántas hay
  countImagesInFolder(pdfBaseName) // pdfBaseName es el nombre del catálogo
    .then(imageCount => {
      if (imageCount > 0) {
        console.log(`Encontradas ${imageCount} imágenes pre-generadas para ${pdfBaseName}`);
        // Pasar imagesBasePath que es /api/pdfs/processed_files/NOMBRE_CATALOGO
        loadPrerenderedImages(imagesBasePath, imageCount);
      } else {
        console.log(`No se encontraron imágenes pre-generadas para ${pdfBaseName}, intentando renderizar PDF directamente.`);
        // Para renderPDFDirectly, necesitamos la ruta al archivo PDF original
        // Ruta: /api/pdfs/processed_files/NOMBRE_CATALOGO/NOMBRE_CATALOGO.pdf
        // Asumimos que el archivo PDF original tiene el mismo nombre que la carpeta.
        const originalPdfPath = AppConfig.getFullPath('processed_files/' + pdfBaseName + '/' + pdfBaseName + '.pdf');
        renderPDFDirectly(originalPdfPath);
      }
    })
    .catch(error => {
      console.error('Error al verificar imágenes:', error);
      const originalPdfPath = AppConfig.getFullPath('processed_files/' + pdfBaseName + '/' + pdfBaseName + '.pdf');
      renderPDFDirectly(originalPdfPath);
    });
  
  // Función para probar si una imagen existe (se mantiene, pero las rutas se basarán en imagesBasePath)
  function testImageExists(imagePath) { // imagePath será ahora una URL completa
    return new Promise(resolve => {
      console.log("Verificando existencia de (URL completa):", imagePath);
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = imagePath;
    });
  }
  
  // Función para contar imágenes en una carpeta alternativa (esta lógica podría necesitar revisión
  // si la estructura de carpetas alternativas ya no aplica o cambia)
  // Por ahora, se asume que si countImagesInFolder falla, se va a renderPDFDirectly
  // function countImagesInAltFolder(folderPath) { ... } // Podría eliminarse o adaptarse si no se usa

  // FUNCIÓN MODIFICADA: Contar imágenes en la estructura de carpetas
  // pdfName aquí es el nombre del catálogo (pdfBaseName)
  async function countImagesInFolder(catalogName) {
    try {
      // Llamar a la API para obtener la lista de PDFs y sus detalles
      const apiUrl = AppConfig.getFullPath('listar-pdfs-procesados');
      console.log("Consultando API para metadatos de PDF:", apiUrl);
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.warn(`Error HTTP ${response.status} al consultar PDFs procesados desde ${apiUrl}.`);
        // Fallback: intentar verificar directamente si la primera imagen existe
        // Esto es menos fiable que la API pero puede servir como último recurso.
        const firstImagePath = AppConfig.getFullPath('processed_files/' + catalogName + '/page_1.webp');
        const exists = await testImageExists(firstImagePath);
        return exists ? 1 : 0; // Si existe la primera, asumimos que hay al menos una. No podemos saber el total.
      }
      
      const processedPdfs = await response.json();
      console.log("Respuesta de la API listar-pdfs-procesados:", processedPdfs);
      
      // Buscar nuestro PDF (catalogName) en la lista de procesados
      const currentPdfMeta = processedPdfs.find(pdf => pdf.name === catalogName);
      
      if (currentPdfMeta && currentPdfMeta.pages && currentPdfMeta.pages > 0) {
        console.log(`PDF '${catalogName}' encontrado en metadatos. Páginas: ${currentPdfMeta.pages}`);
        return currentPdfMeta.pages;
      } else {
        console.log(`PDF '${catalogName}' no encontrado en metadatos o sin número de páginas. Se asumirá 0 imágenes.`);
        return 0;
      }
    } catch (error) {
      console.error(`Error al contar imágenes para '${catalogName}' desde la API:`, error);
      // Como fallback muy básico, verificar si existe la primera imagen directamente
      const firstImagePath = AppConfig.getFullPath('processed_files/' + catalogName + '/page_1.webp');
      const exists = await testImageExists(firstImagePath);
      console.log(`Fallback: testImageExists para ${firstImagePath} devolvió ${exists}`);
      return exists ? 1 : 0; // Devuelve 1 si existe para intentar cargarla, 0 si no.
    }
  }
  
  // Nueva función para verificar directamente si existen imágenes (ya no es tan necesaria si la API funciona bien)
  // function checkDirectImageExistence(basePath) { ... }

  // FUNCIÓN MEJORADA: Cargar imágenes pre-generadas desde la ubicación correcta
  // basePath aquí es la ruta completa devuelta por AppConfig.getFullPath('processed_files/' + pdfBaseName)
  // ej: /api/pdfs/processed_files/CatalogoA
  function loadPrerenderedImages(imagesBaseUrl, pageCount) {
    let imagesLoaded = 0;
    pageWidth = 0;
    pageHeight = 0;
    
    console.log(`Cargando ${pageCount} imágenes. URL base para imágenes: ${imagesBaseUrl}`);
    
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const img = new Image();
      
      img.onload = function() {
        imagesLoaded++;
        console.log(`Imagen ${pageNum}/${pageCount} cargada: ${img.src}`);
        
        if (pageNum === 1) {
          pageWidth = this.naturalWidth;
          pageHeight = this.naturalHeight;
        }
        
        if (imagesLoaded === pageCount) {
          initializeFlipbook();
          hideLoader();
        }
      };
      
      img.onerror = function() {
        console.error(`Error al cargar imagen para página ${pageNum}: ${img.src}`);
        imagesLoaded++;
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-page';
        errorDiv.innerHTML = `<div class="error-message">Error al cargar página ${pageNum}</div>`;
        $(flipbookContainer).append(errorDiv);
        
        if (imagesLoaded === pageCount) {
          initializeFlipbook(); // Aunque haya errores, inicializar con lo que se tenga
          hideLoader();
        }
      };
      
      // Construir la URL completa para cada imagen de página
      // imagesBaseUrl es /api/pdfs/processed_files/NOMBRE_CATALOGO
      // Se necesita /api/pdfs/processed_files/NOMBRE_CATALOGO/page_X.webp
      const imgUrl = `${imagesBaseUrl}/page_${pageNum}.webp`;
      console.log(`Intentando cargar imagen desde URL: ${imgUrl}`);
      img.src = imgUrl;
      $(flipbookContainer).append(img);
    }
  }
  
  // FUNCIÓN EXISTENTE MODIFICADA: Renderizado directo de PDF como respaldo
  // pdfDirectUrl es la URL completa al archivo PDF original, 
  // ej: /api/pdfs/processed_files/NOMBRE_CATALOGO/NOMBRE_CATALOGO.pdf
  function renderPDFDirectly(pdfDirectUrl) {
    console.log("Intentando renderizar PDF directamente desde URL:", pdfDirectUrl);
    
    let pdfDoc = null;
    
    // Asegurar que pdfjsLib esté disponible
    if (typeof pdfjsLib === 'undefined' || typeof pdfjsLib.getDocument === 'undefined') {
        console.error("PDF.js (pdfjsLib) no está cargado. No se puede renderizar el PDF.");
        $('#flipbook').html('<p style="color:red; text-align:center;">Error: Falta la librería PDF.js para visualizar el documento.</p>');
        hideLoader();
        return;
    }

    // Configurar workerSrc si no está ya configurado globalmente en index.html
     if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = AppConfig.getStaticPath('js/pdf.worker.min.js');
        console.log("Configurando pdf.worker.min.js para renderPDFDirectly:", pdfjsLib.GlobalWorkerOptions.workerSrc);
    }
    
    pdfjsLib.getDocument(pdfDirectUrl).promise
      .then(function(pdf) {
        pdfDoc = pdf;
        const numPages = pdf.numPages;
        console.log("Número de páginas del PDF:", numPages);
        
        if (numPages === 0) {
            throw new Error("El PDF no tiene páginas.");
        }
        return pdf.getPage(1);
      })
      .then(function(page) {
        const scale = 1.2; // Escala de renderizado
        const viewport = page.getViewport({ scale: scale });
        
        pageWidth = viewport.width;
        pageHeight = viewport.height;
        
        renderAllPages(pdfDoc);
      })
      .catch(function(error) {
        console.error('Error al cargar o renderizar el PDF directamente:', error);
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-page';
        errorMsg.innerHTML = `
          <div class="error-message" style="padding:20px; text-align:center;">
            <h3>No se pudo cargar el PDF</h3>
            <p>Detalle: ${error.message}</p>
            <p>Ruta intentada: ${pdfDirectUrl}</p>
          </div>
        `;
        $(flipbookContainer).html(errorMsg); // Reemplazar contenido con error
        hideLoader();
      });
  }
  
  function renderAllPages(pdfDoc) {
    const numPages = pdfDoc.numPages;
    let pagesRendered = 0;
    $(flipbookContainer).empty(); // Limpiar antes de renderizar

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      pdfDoc.getPage(pageNum).then(function(page) {
        const scale = 1.2;
        const viewport = page.getViewport({ scale: scale });
        
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        
        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        
        page.render(renderContext).promise.then(function() {
          $(flipbookContainer).append(canvas);
          pagesRendered++;
          if (pagesRendered === numPages) {
            initializeFlipbook();
            hideLoader();
          }
        }).catch(function(renderError){
            console.error(`Error renderizando página ${pageNum}:`, renderError);
            // Añadir un placeholder para la página que falló
            const errorDiv = document.createElement('div');
            errorDiv.style.width = pageWidth + 'px'; // Usar dimensiones estimadas
            errorDiv.style.height = pageHeight + 'px';
            errorDiv.innerHTML = `<p>Error P.${pageNum}</p>`;
            $(flipbookContainer).append(errorDiv);

            pagesRendered++;
            if (pagesRendered === numPages) {
              initializeFlipbook();
              hideLoader();
            }
        });
      });
    }
  }
  
  function initializeFlipbook() {
    if (!pageWidth || !pageHeight) {
        console.warn("Dimensiones de página no disponibles, usando valores por defecto para inicializar flipbook.");
        // Establecer valores por defecto si no se pudieron obtener (ej. A4 landscape-ish ratio para dos páginas)
        pageWidth = 842; // Ancho de A4 en puntos (aproximado)
        pageHeight = 595; // Alto de A4 en puntos
        // Esto es solo un fallback, idealmente las dimensiones vienen de la primera imagen o página PDF.
    }

    const dimensions = calculateResponsiveDimensions();
    
    $('#flipbook').turn({
      width: dimensions.width,
      height: dimensions.height,
      autoCenter: true,
      display: 'double',
      acceleration: true,
      gradients: true,
      elevation: 50,
      when: {
        turning: function(e, page, view) {
          const book = $(this);
          if (page >= 2) {
            book.addClass('hard-shadow');
          } else {
            book.removeClass('hard-shadow');
          }
        }
      }
    });
    
    centerWrapper(dimensions.width, dimensions.height);
    $('#flipbook').turn('page', 1);
    console.log("Flipbook inicializado.");
  }
  
  function calculateResponsiveDimensions() {
    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();
    // Asegurar que pageAspectRatio sea válido
    const pageAspectRatio = (pageHeight && pageWidth) ? (pageWidth / pageHeight) : (842 / 595); // Fallback A4
    
    const maxWidth = viewportWidth * 0.88; // 88% del ancho del viewport
    const maxHeight = viewportHeight * 0.85; // 85% del alto del viewport
    
    const flipbookAspectRatio = 2 * pageAspectRatio; // Para dos páginas (double display)
    
    let width, height;
    
    if ((maxWidth / flipbookAspectRatio) <= maxHeight) {
      width = maxWidth;
      height = width / flipbookAspectRatio;
    } else {
      height = maxHeight;
      width = height * flipbookAspectRatio;
    }
    
    return {
      width: Math.max(100, width), // Evitar dimensiones cero o negativas
      height: Math.max(100, height)
    };
  }
  
  function centerWrapper(width, height) {
    const left = ($(window).width() - width) / 2;
    const top = ($(window).height() - height) / 2;
    
    // Asegurar que la altura no exceda el máximo permitido
    const maxHeight = $(window).height() * 0.85; // Consistente con calculateResponsiveDimensions
    height = Math.min(height, maxHeight);
    
    $("#flipbook-wrapper").css({
      width: width + "px",
      height: height + "px",
      left: left + "px",
      top: top + "px",
      "transform": "scale(1)",
      "transform-origin": "50% 50%",
      "overflow": "hidden" // Importante para el efecto de zoom
    });
  }
  
  $('#flipbook').on('click', function(event) {
    const wrapper = $("#flipbook-wrapper");
    
    if (currentZoom === 1) {
      currentZoom = 1.5; // Nivel de zoom
      
      const offset = wrapper.offset();
      const clickX = event.pageX - offset.left; // Posición X del clic relativa al wrapper
      const clickY = event.pageY - offset.top;  // Posición Y del clic relativa al wrapper
      
      // Calcular el origen del transform basado en dónde se hizo clic
      const ratioX = clickX / wrapper.width();
      const ratioY = clickY / wrapper.height();
      lastTransformOrigin = (ratioX * 100) + "% " + (ratioY * 100) + "%";
      
      wrapper.css({
        "transform-origin": lastTransformOrigin,
        "transform": `scale(${currentZoom})`
      });
      
    } else { // Si ya está con zoom, volver a normal
      currentZoom = 1;
      wrapper.css({
        // "transform-origin" se mantiene desde el último zoom para una transición suave de vuelta
        "transform": "scale(1)" 
      });
      
      // Opcional: resetear transform-origin después de la transición para el próximo clic
      wrapper.one('transitionend', function() {
        if (currentZoom === 1) { // Solo resetear si el estado final es sin zoom
          // $(this).css({"transform-origin": "50% 50%"}); // Descomentar si se desea resetear
        }
      });
    }
  });
  
  $('#prev-page').on('click', function() {
    $('#flipbook').turn('previous');
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 200);
  });
  
  $('#next-page').on('click', function() {
    $('#flipbook').turn('next');
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 200);
  });
  
  $('#first-page').on('click', function() {
    $('#flipbook').turn('page', 1);
    $(this).addClass('active');
    setTimeout(() => $(this).removeClass('active'), 200);
  });
  
  $(window).resize(function() {
    if ($('#flipbook').data('turn')) { // Verificar si turn.js está inicializado
      const dimensions = calculateResponsiveDimensions();
      $('#flipbook').turn('size', dimensions.width, dimensions.height);
      centerWrapper(dimensions.width, dimensions.height);
    }
  }).trigger('resize'); // Disparar resize inicialmente para establecer dimensiones
  
  $(document).keydown(function(e) {
    if (!$('#flipbook').is(':visible')) return; // No hacer nada si el flipbook no está visible

    switch(e.which) {
      case 37: // Flecha izquierda
        $('#flipbook').turn('previous');
        e.preventDefault();
        break;
      case 39: // Flecha derecha
        $('#flipbook').turn('next');
        e.preventDefault();
        break;
      case 36: // Home
        $('#flipbook').turn('page', 1);
        e.preventDefault();
        break;
      // Podrías añadir PageUp/PageDown si lo deseas
    }
  });
});

// Desktop.js - Funcionalidades para vista de escritorio
console.log('Desktop.js cargado');

// Función para mejorar la experiencia en desktop
function initDesktopFeatures() {
    // Atajos de teclado
    document.addEventListener('keydown', function(e) {
        // ESC para cerrar modales
        if (e.key === 'Escape') {
            const modals = document.querySelectorAll('.modal:not(.hidden)');
            modals.forEach(modal => {
                modal.classList.add('hidden');
            });
        }
        
        // Ctrl+F para buscar
        if (e.ctrlKey && e.key === 'f') {
            e.preventDefault();
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="buscar" i]');
            if (searchInput) {
                searchInput.focus();
            }
        }
    });
    
    // Mejorar tooltips para desktop
    const elements = document.querySelectorAll('[title]');
    elements.forEach(el => {
        el.addEventListener('mouseenter', function() {
            this.setAttribute('data-tooltip', this.getAttribute('title'));
            this.removeAttribute('title');
        });
        
        el.addEventListener('mouseleave', function() {
            const tooltip = this.getAttribute('data-tooltip');
            if (tooltip) {
                this.setAttribute('title', tooltip);
                this.removeAttribute('data-tooltip');
            }
        });
    });
    
    console.log('✅ Funcionalidades de desktop inicializadas');
}

// Detectar si estamos en desktop
function isDesktop() {
    return window.innerWidth > 768 && !('ontouchstart' in window);
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        if (isDesktop()) {
            initDesktopFeatures();
        }
    });
} else {
    if (isDesktop()) {
        initDesktopFeatures();
    }
}