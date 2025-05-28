// Factor de zoom global para tablets: 1 = estado base, 1.5 = zoom in
var currentZoom = 1;
// Variables para almacenar la relación de aspecto de la primera página
var pageWidth, pageHeight;
// Variable para almacenar el último punto de origen del zoom
var lastTransformOrigin = '50% 50%';

$(document).ready(function() {
  console.log('Modo Tablet: Visualización adaptada para tablets');
  
  if (typeof $.fn.turn !== 'function') {
    console.error('Turn.js NO se ha cargado en tablet.js.');
  } else {
    console.log('Turn.js cargado correctamente (tablet.js).');
  }
  
  const pdfUrl = window.selectedPDF;
  if (!pdfUrl) {
    console.error("Error: selectedPDF no está definido en tablet.js.");
    $('#flipbook').html('<p style="color:red; text-align:center;">Error: No se especificó PDF.</p>');
    hideLoader();
    return;
  }
  console.log("Cargando PDF en tablet (nombre de catálogo):", pdfUrl);
  
  const flipbookContainer = document.getElementById('flipbook');
  const pdfBaseName = pdfUrl; // pdfUrl es el nombre del catálogo
  console.log("Nombre base del PDF (catálogo, tablet):", pdfBaseName);
  
  const imagesBasePath = AppConfig.getFullPath('processed_files/' + pdfBaseName);
  console.log("Buscando imágenes en (tablet):", imagesBasePath);
  
  countImagesInFolder(pdfBaseName)
    .then(pageCount => {
      if (pageCount > 0) {
        console.log(`Usando ${pageCount} imágenes pre-generadas (tablet)`);
        loadPrerenderedImages(imagesBasePath, pageCount);
      } else {
        console.log('No se encontraron imágenes pre-generadas, renderizando PDF (tablet)');
        const originalPdfPath = AppConfig.getFullPath('processed_files/' + pdfBaseName + '/' + pdfBaseName + '.pdf');
        renderPDFDirectly(originalPdfPath);
      }
    })
    .catch(error => {
      console.error('Error al verificar imágenes (tablet):', error);
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
        console.warn(`Error HTTP ${response.status} en countImagesInFolder (tablet).`);
        const firstImagePath = AppConfig.getFullPath('processed_files/' + catalogName + '/page_1.webp');
        const exists = await testImageExists(firstImagePath);
        return exists ? 1 : 0;
      }
      const processedPdfs = await response.json();
      const currentPdfMeta = processedPdfs.find(pdf => pdf.name === catalogName);
      return (currentPdfMeta && currentPdfMeta.pages) ? currentPdfMeta.pages : 0;
    } catch (error) {
      console.error('Error en countImagesInFolder (tablet):', error);
      const firstImagePath = AppConfig.getFullPath('processed_files/' + catalogName + '/page_1.webp');
      const exists = await testImageExists(firstImagePath);
      return exists ? 1 : 0;
    }
  }
  
  function loadPrerenderedImages(imagesBaseUrl, pageCount) {
    let imagesLoaded = 0;
    pageWidth = 0; pageHeight = 0;
    $(flipbookContainer).empty(); // Limpiar por si acaso
    console.log(`Cargando ${pageCount} imágenes desde ${imagesBaseUrl} (tablet)`);

    // Primero, obtener las URLs de S3 para las páginas del catálogo
    const catalogName = window.selectedPDF;
    const paginasApiUrl = AppConfig.getFullPath(`catalogos/nombre/${encodeURIComponent(catalogName)}/paginas`);
    
    console.log(`[Tablet] Obteniendo URLs de S3 para catálogo: ${catalogName} desde ${paginasApiUrl}`);
    
    fetch(paginasApiUrl)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: No se pudieron obtener las páginas del catálogo`);
        }
        return response.json();
      })
      .then(data => {
        if (!data.success || !data.paginas || data.paginas.length === 0) {
          throw new Error('No se encontraron páginas para el catálogo');
        }
        
        console.log(`[Tablet] Obtenidas ${data.paginas.length} URLs de S3 para el catálogo`);
        
        // Cargar cada imagen desde su URL de S3
        data.paginas.forEach((pagina, index) => {
          const img = new Image();
          
          img.onload = function() {
            imagesLoaded++;
            console.log(`[Tablet] Imagen ${pagina.numero_pagina}/${data.paginas.length} cargada desde S3`);
            
            if (index === 0) {
              pageWidth = this.naturalWidth;
              pageHeight = this.naturalHeight;
            }
            
            if (imagesLoaded === data.paginas.length) {
              // Añadir todas las imágenes al flipbook container
              data.paginas.forEach(p => {
                const pageImg = new Image();
                pageImg.src = p.url;
                $(flipbookContainer).append(pageImg);
              });
              initializeFlipbookTablet();
              hideLoader();
            }
          };
          
          img.onerror = function() {
            console.error(`[Tablet] Error al cargar imagen para página ${pagina.numero_pagina} desde S3: ${pagina.url}`);
            imagesLoaded++;
            
            if (imagesLoaded === data.paginas.length) {
              // Añadir las imágenes que sí cargaron
              data.paginas.forEach(p => {
                const pageImg = new Image();
                pageImg.src = p.url;
                $(flipbookContainer).append(pageImg);
              });
              initializeFlipbookTablet();
              hideLoader();
            }
          };
          
          // Usar la URL directa de S3
          img.src = pagina.url;
        });
      })
      .catch(error => {
        console.error('[Tablet] Error al obtener URLs de S3:', error);
        // Fallback: intentar con el método anterior
        console.log('[Tablet] Intentando fallback con URLs locales...');
        loadPrerenderedImagesLegacy(imagesBaseUrl, pageCount);
      });
  }
  
  // Función legacy como fallback
  function loadPrerenderedImagesLegacy(imagesBaseUrl, pageCount) {
    let imagesLoaded = 0;
    pageWidth = 0; pageHeight = 0;
    $(flipbookContainer).empty();
    console.log(`[LEGACY Tablet] Cargando ${pageCount} imágenes desde ${imagesBaseUrl}`);

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const img = new Image();
      img.onload = function() {
        imagesLoaded++;
        console.log(`Imagen ${pageNum}/${pageCount} cargada (tablet)`);
        if (pageNum === 1) {
          pageWidth = this.naturalWidth;
          pageHeight = this.naturalHeight;
        }
        // No añadir al DOM aquí directamente, Turn.js lo hará
        if (imagesLoaded === pageCount) {
          // Añadir todas las imágenes al flipbook container para que Turn.js las use
          for(let i=1; i <= pageCount; i++){
            const pageImg = new Image();
            pageImg.src = `${imagesBaseUrl}/page_${i}.webp`;
            $(flipbookContainer).append(pageImg);
          }
          initializeFlipbookTablet();
          hideLoader();
        }
      };
      img.onerror = function() {
        console.error(`Error al cargar imagen ${pageNum}: ${img.src} (tablet)`);
        imagesLoaded++;
        // No añadir div de error directamente aquí si Turn.js maneja elementos faltantes
        if (imagesLoaded === pageCount) {
           // Si fallaron algunas, Turn.js podría mostrar huecos. Se podría añadir lógica de placeholder aquí.
          initializeFlipbookTablet(); 
          hideLoader();
        }
      };
      // Iniciar carga de la imagen actual para contabilizar y obtener dimensiones
      img.src = `${imagesBaseUrl}/page_${pageNum}.webp`;
    }
  }
  
  function renderPDFDirectly(pdfDirectUrl) {
    console.log("Renderizando PDF directamente desde: ", pdfDirectUrl, " (tablet)");
    if (typeof pdfjsLib === 'undefined') {
        console.error("PDF.js no cargado en tablet.js");
        $('#flipbook').html('<p style="color:red; text-align:center;">Error: Librería PDF no cargada.</p>');
        hideLoader();
        return;
    }
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = AppConfig.getStaticPath('js/pdf.worker.min.js');
    }
    let pdfDoc = null;
    $(flipbookContainer).empty();

    pdfjsLib.getDocument(pdfDirectUrl).promise.then(function(pdf) {
      pdfDoc = pdf;
      const numPages = pdf.numPages;
      if (numPages === 0) throw new Error("PDF sin páginas.");
      console.log("Número de páginas PDF (tablet):", numPages);
      return pdf.getPage(1);
    }).then(function(page) {
      const scale = 1.0; // Escala para tablet
      const viewport = page.getViewport({ scale: scale });
      pageWidth = viewport.width;
      pageHeight = viewport.height;
      renderAllPagesTablet(pdfDoc);
    }).catch(function(error) {
      console.error('Error al cargar PDF (tablet):', error);
      $('#flipbook').html(`<p style='color:red; text-align:center;'>Error al cargar PDF: ${error.message}</p>`);
      hideLoader();
    });
  }

  function renderAllPagesTablet(pdfDoc) {
    const numPages = pdfDoc.numPages;
    let pagesRendered = 0;
    $(flipbookContainer).empty();

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      pdfDoc.getPage(pageNum).then(function(page) {
        const scale = 1.0;
        const viewport = page.getViewport({ scale: scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        page.render({ canvasContext: context, viewport: viewport }).promise.then(function() {
          $(flipbookContainer).append(canvas);
          pagesRendered++;
          if (pagesRendered === numPages) {
            initializeFlipbookTablet();
            hideLoader();
          }
        }).catch(renderError => {
            console.error(`Error renderizando página ${pageNum} PDF (tablet):`, renderError);
            $(flipbookContainer).append('<div>Error P.'+pageNum+'</div>');
            pagesRendered++;
            if (pagesRendered === numPages) initializeFlipbookTablet(); hideLoader();
        });
      });
    }
  }
  
  function initializeFlipbookTablet() {
    if (!pageWidth || !pageHeight) { 
        pageWidth = 842; pageHeight = 595; 
        console.warn("Dimensiones no definidas, usando A4 para tablet flipbook.");
    }
    const dimensions = calculateResponsiveDimensionsTablet();
    $('#flipbook').turn({
      width: dimensions.width, height: dimensions.height,
      autoCenter: true,
      display: $(window).width() > $(window).height() ? 'double' : 'single',
      acceleration: true, gradients: true, elevation: 50
    });
    centerWrapperTablet(dimensions.width, dimensions.height);
    $('#flipbook').turn('page', 1);
    console.log("Flipbook tablet inicializado.");
  }
  
  function calculateResponsiveDimensionsTablet() {
    const viewportWidth = $(window).width();
    const viewportHeight = $(window).height();
    const pageAspectRatio = (pageHeight && pageWidth) ? (pageWidth / pageHeight) : (842/595);
    const maxWidth = viewportWidth * 0.9;
    const maxHeight = viewportHeight * 0.8;
    const isLandscape = viewportWidth > viewportHeight;
    const flipbookAspectRatio = isLandscape ? 2 * pageAspectRatio : pageAspectRatio;
    let width, height;
    if ((maxWidth / flipbookAspectRatio) <= maxHeight) {
      width = maxWidth;
      height = width / flipbookAspectRatio;
    } else {
      height = maxHeight;
      width = height * flipbookAspectRatio;
    }
    return { width: Math.max(100, width), height: Math.max(100, height) };
  }
  
  function centerWrapperTablet(width, height) {
    const left = ($(window).width() - width) / 2;
    const top = ($(window).height() - height) / 2;
    $("#flipbook-wrapper").css({
      width: width + "px", height: height + "px",
      left: left + "px", top: top + "px",
      transform: "scale(1)", "transform-origin": "50% 50%", overflow: "hidden"
    });
  }
  
  $('#flipbook').on('click', function(event) {
    const wrapper = $("#flipbook-wrapper");
    if (currentZoom === 1) {
      currentZoom = 1.5;
      const offset = wrapper.offset();
      const clickX = event.pageX - offset.left;
      const clickY = event.pageY - offset.top;
      lastTransformOrigin = `${(clickX / wrapper.width()) * 100}% ${(clickY / wrapper.height()) * 100}%`;
      wrapper.css({ "transform-origin": lastTransformOrigin, transform: `scale(${currentZoom})` });
    } else {
      currentZoom = 1;
      wrapper.css({ transform: "scale(1)" });
    }
  });
  
  $('#prev-page').on('click', function() { $('#flipbook').turn('previous'); $(this).addClass('active'); setTimeout(() => $(this).removeClass('active'), 200); });
  $('#next-page').on('click', function() { $('#flipbook').turn('next'); $(this).addClass('active'); setTimeout(() => $(this).removeClass('active'), 200); });
  $('#first-page').on('click', function() { $('#flipbook').turn('page', 1); $(this).addClass('active'); setTimeout(() => $(this).removeClass('active'), 200); });
  
  $(window).on('orientationchange resize', function() {
    setTimeout(function() {
      if ($('#flipbook').data('turn')) {
        const isLandscape = $(window).width() > $(window).height();
        $('#flipbook').turn('display', isLandscape ? 'double' : 'single');
        const dimensions = calculateResponsiveDimensionsTablet();
        $('#flipbook').turn('size', dimensions.width, dimensions.height);
        centerWrapperTablet(dimensions.width, dimensions.height);
      }
    }, 300);
  }).trigger('resize');
});