// Versión optimizada para celulares - muestra una sola página a la vez

// Factor de zoom global: 1 = estado base, 2.0 = zoom in.
var currentZoom = 1;
// Variables para almacenar la relación de aspecto de la primera página
var pageWidth, pageHeight;
// Variable para almacenar el último punto de origen del zoom
var lastTransformOrigin = '50% 50%';

$(document).ready(function() {
  console.log('Modo Mobile: Visualización de una página a la vez');
  
  if (typeof $.fn.turn !== 'function') {
    console.error('Turn.js NO se ha cargado en mobile.js. Verifica la URL y el orden de los scripts.');
    // Turn.js no se usa directamente en mobile para el flip, pero se verifica por consistencia.
  } else {
    console.log('Turn.js parece estar cargado (verificado en mobile.js).');
  }
  
  const pdfUrl = window.selectedPDF; 
  if (!pdfUrl) {
    console.error("Error: selectedPDF no está definido en mobile.js.");
    $('#flipbook').html('<p style="color:red; text-align:center;">Error: No se especificó PDF.</p>');
    hideLoader();
    return;
  }
  console.log("Cargando PDF en móvil (nombre de catálogo):", pdfUrl);
  
  const flipbookContainer = document.getElementById('flipbook');
  $(flipbookContainer).empty();
  
  let canvasPages = []; 
  const pdfBaseName = pdfUrl; // pdfUrl es el nombre del catálogo
  console.log("Nombre base del PDF para buscar imágenes (móvil):", pdfBaseName);
  
  const imagesBasePath = AppConfig.getFullPath('processed_files/' + pdfBaseName);
  console.log("Buscando imágenes en (móvil):", imagesBasePath);
  
  countImagesInFolder(pdfBaseName)
    .then(imageData => { // imageData aquí es directamente el pageCount o 0
      const pageCount = imageData;
      if (pageCount > 0) {
        console.log(`Usando ${pageCount} imágenes pre-generadas (móvil)`);
        loadPrerenderedImages(imagesBasePath, pageCount);
      } else {
        console.log('No se encontraron imágenes pre-generadas, renderizando PDF (móvil)');
        const originalPdfPath = AppConfig.getFullPath('processed_files/' + pdfBaseName + '/' + pdfBaseName + '.pdf');
        renderPDFDirectly(originalPdfPath);
      }
    })
    .catch(error => {
      console.error('Error al verificar imágenes pre-generadas (móvil):', error);
      const originalPdfPath = AppConfig.getFullPath('processed_files/' + pdfBaseName + '/' + pdfBaseName + '.pdf');
      renderPDFDirectly(originalPdfPath);
    });
  
  function testImageExists(imagePath) {
    return new Promise(resolve => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = imagePath;
    });
  }
  
  async function countImagesInFolder(catalogName) {
    try {
      const apiUrl = AppConfig.getFullPath('listar-pdfs-procesados');
      const response = await fetch(apiUrl);
      if (!response.ok) {
        console.warn(`Error HTTP ${response.status} en countImagesInFolder (móvil).`);
        const firstImagePath = AppConfig.getFullPath('processed_files/' + catalogName + '/page_1.webp');
        const exists = await testImageExists(firstImagePath);
        return exists ? 1 : 0;
      }
      const processedPdfs = await response.json();
      const currentPdfMeta = processedPdfs.find(pdf => pdf.name === catalogName);
      return (currentPdfMeta && currentPdfMeta.pages) ? currentPdfMeta.pages : 0;
    } catch (error) {
      console.error('Error en countImagesInFolder (móvil):', error);
      const firstImagePath = AppConfig.getFullPath('processed_files/' + catalogName + '/page_1.webp');
      const exists = await testImageExists(firstImagePath);
      return exists ? 1 : 0;
    }
  }
  
  function loadPrerenderedImages(imagesBaseUrl, pageCount) {
    let imagesLoaded = 0;
    pageWidth = 0; pageHeight = 0;
    console.log(`Cargando ${pageCount} imágenes desde ${imagesBaseUrl} (móvil)`);

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const img = new Image();
      img.onload = function() {
        imagesLoaded++;
        console.log(`Imagen ${pageNum}/${pageCount} cargada (móvil)`);
        if (pageNum === 1) {
          pageWidth = this.naturalWidth;
          pageHeight = this.naturalHeight;
        }
        canvasPages[pageNum-1] = img;
        if (imagesLoaded === pageCount) {
          prepareFlipbookMobile(canvasPages, pageCount);
          hideLoader();
        }
      };
      img.onerror = function() {
        console.error(`Error al cargar imagen ${pageNum}: ${img.src} (móvil)`);
        imagesLoaded++;
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-page';
        errorDiv.innerHTML = `<div class="error-message">Error P.${pageNum}</div>`;
        canvasPages[pageNum-1] = errorDiv;
        if (imagesLoaded === pageCount) {
          prepareFlipbookMobile(canvasPages, pageCount);
          hideLoader();
        }
      };
      img.src = `${imagesBaseUrl}/page_${pageNum}.webp`;
    }
  }
  
  function renderPDFDirectly(pdfDirectUrl) {
    console.log("Renderizando PDF directamente desde: ", pdfDirectUrl, " (móvil)");
    if (typeof pdfjsLib === 'undefined') {
        console.error("PDF.js no cargado en mobile.js");
        $('#flipbook').html('<p style="color:red; text-align:center;">Error: Librería PDF no cargada.</p>');
        hideLoader();
        return;
    }
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = AppConfig.getStaticPath('js/pdf.worker.min.js');
    }

    pdfjsLib.getDocument(pdfDirectUrl).promise.then(function(pdf) {
      const numPages = pdf.numPages;
      console.log("Número de páginas PDF (móvil):", numPages);
      if (numPages === 0) throw new Error("PDF sin páginas.");
      
      let pagesRendered = 0;
      canvasPages = new Array(numPages);

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        pdf.getPage(pageNum).then(function(page) {
          const scale = 1.5; // Escala para móviles puede ser mayor
          const viewport = page.getViewport({ scale: scale });
          if (pageNum === 1) {
            pageWidth = viewport.width;
            pageHeight = viewport.height;
          }
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d', { willReadFrequently: true });
          page.render({ canvasContext: context, viewport: viewport }).promise.then(function() {
            canvasPages[pageNum-1] = canvas;
            pagesRendered++;
            if (pagesRendered === numPages) {
              prepareFlipbookMobile(canvasPages, numPages);
              hideLoader();
            }
          }).catch(renderError => {
            console.error(`Error renderizando página ${pageNum} PDF (móvil):`, renderError);
            canvasPages[pageNum-1] = document.createElement('div'); // Placeholder
            pagesRendered++;
            if (pagesRendered === numPages) prepareFlipbookMobile(canvasPages, numPages); hideLoader();
          });
        });
      }
    }).catch(function(error) {
      console.error('Error al cargar PDF (móvil):', error);
      $('#flipbook').html(`<p style='color:red; text-align:center;'>Error al cargar PDF: ${error.message}</p>`);
      hideLoader();
    });
  }
  
  function prepareFlipbookMobile(pages, totalPages) {
    $(flipbookContainer).empty().data({
        'allPages': pages,
        'currentPage': 1,
        'totalPages': totalPages
    });
    if (pages.length > 0 && pages[0]) {
        $(flipbookContainer).append(pages[0]);
        applyPageStyles($(flipbookContainer).find('canvas, img'));
    }
    if (!pageWidth && pages[0] && pages[0].tagName === 'IMG') { pageWidth = pages[0].naturalWidth; pageHeight = pages[0].naturalHeight; }
    else if (!pageWidth && pages[0] && pages[0].tagName === 'CANVAS') { pageWidth = pages[0].width; pageHeight = pages[0].height; }
    
    const dimensions = calculateResponsiveDimensionsMobile();
    centerWrapperMobile(dimensions.width, dimensions.height);
    setupNavigationMobile();
    console.log('Flipbook móvil inicializado.');
  }

  function applyPageStyles(element) {
    element.css({
      'width': '100%',
      'height': '100%',
      'object-fit': 'contain'
    });
  }
  
  function setupNavigationMobile() {
    $('#prev-page').off('click').on('click', function() {
      const data = $(flipbookContainer).data();
      if (data.currentPage > 1) showPageMobile(data.currentPage - 1);
    });
    $('#next-page').off('click').on('click', function() {
      const data = $(flipbookContainer).data();
      if (data.currentPage < data.totalPages) showPageMobile(data.currentPage + 1);
    });
    $('#first-page').off('click').on('click', () => showPageMobile(1));
    setupSwipeNavigationMobile();
  }
  
  function setupSwipeNavigationMobile() {
    let touchStartX = 0;
    const wrapper = document.getElementById('flipbook-wrapper');
    wrapper.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
    wrapper.addEventListener('touchend', e => {
      if (currentZoom !== 1) return;
      const touchEndX = e.changedTouches[0].screenX;
      if (touchEndX < touchStartX - 50) $('#next-page').click();
      if (touchEndX > touchStartX + 50) $('#prev-page').click();
    }, {passive: true});
  }
  
  function showPageMobile(pageNumber) {
    const data = $(flipbookContainer).data();
    if (pageNumber < 1 || pageNumber > data.totalPages || !data.allPages[pageNumber-1]) return;
    $(flipbookContainer).data('currentPage', pageNumber).empty().append(data.allPages[pageNumber-1]);
    applyPageStyles($(flipbookContainer).find('canvas, img'));
    // Recalcular y centrar por si las dimensiones de la página cambian (aunque no deberían drásticamente)
    const dimensions = calculateResponsiveDimensionsMobile();
    centerWrapperMobile(dimensions.width, dimensions.height);
    console.log(`Mostrando página ${pageNumber}/${data.totalPages} (móvil)`);
  }
  
  function calculateResponsiveDimensionsMobile() {
    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();
    const pageAspectRatio = (pageHeight && pageWidth) ? (pageWidth / pageHeight) : (842 / 1191); // A4 portrait fallback
    
    const maxWidth = viewportWidth * 0.92;
    const maxHeight = viewportHeight * 0.85; // Menos espacio para UI en móvil
    
    let width, height;
    if ((maxWidth / pageAspectRatio) <= maxHeight) {
      width = maxWidth;
      height = width / pageAspectRatio;
    } else {
      height = maxHeight;
      width = height * pageAspectRatio;
    }
    return { width: Math.max(50, width), height: Math.max(50, height) };
  }
  
  function centerWrapperMobile(width, height) {
    const left = Math.max(0, ($(window).width() - width) / 2);
    const top = Math.max(0, ($(window).height() - height) / 2);
    $("#flipbook-wrapper").css({
      width: width + "px", height: height + "px",
      left: left + "px", top: top + "px",
      transform: "scale(1)", "transform-origin": "50% 50%", overflow: "hidden"
    });
    $("#flipbook").css({ width: "100%", height: "100%", display: "flex", justifyContent: "center", alignItems: "center" });
    applyPageStyles($("#flipbook canvas, #flipbook img"));
  }
  
  $('#flipbook-wrapper').on('click', function(event) {
    event.stopPropagation();
    const wrapper = $(this);
    if (currentZoom === 1) {
      currentZoom = 1.7;
      const offset = wrapper.offset();
      const clickX = event.pageX - offset.left;
      const clickY = event.pageY - offset.top;
      lastTransformOrigin = `${(clickX / wrapper.width()) * 100}% ${(clickY / wrapper.height()) * 100}%`;
      wrapper.css({ "transform-origin": lastTransformOrigin, transform: `scale(${currentZoom})` });
    } else {
      currentZoom = 1;
      wrapper.css({ transform: "scale(1)" }); // transform-origin se mantiene para suavizar
      // Opcional: wrapper.one('transitionend', () => { if(currentZoom === 1) wrapper.css({"transform-origin": "50% 50%"}); });
    }
  });
  
  $(window).resize(function() {
    const dimensions = calculateResponsiveDimensionsMobile();
    centerWrapperMobile(dimensions.width, dimensions.height);
  }).trigger('resize');
});