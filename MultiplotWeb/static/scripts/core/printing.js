// -----printing three stage ---//
// Stage 1: size for print page (8" wide")
export function sizeAndPrint(){
    createNewWindowForPrint();
}

function createNewWindowForPrint(){
    const myWindow=window.open('','PRINT','width=736px,height=1056px')

    myWindow.document.write('<html><head>');
    myWindow.document.write('<script src="https://apps.avo.alaska.edu/multiplot/static/scripts/jquery-3.6.3.min.js"></script>\n');
    myWindow.document.write(myScriptTag.outerHTML);

    let bodyClass='';
    if (navigator.appVersion.indexOf("Chrome/") != -1) {
        bodyClass='class="multiplot-print-chrome"'
    }

    myWindow.document.write(`</head><body ${bodyClass}>`);
    myWindow.document.write('<div id="multiplot-print-div" class="multiplot-print" style="width:8in"></div>');

    const dateFrom=$('#multiplot-dateFrom').val();
    const dateTo=$('#multiplot-dateTo').val();
    const volc=$('#multiplot-volcano').val();
    const plots=JSON.stringify(plot.getPlotParams().toArray())

    const initScript=`<script type="text/javascript">
        $(document).ready(function(){
            prefix='${prefix}';
            plot=new MultiPlot(document.getElementById('multiplot-print-div'))
            plot.initialized.then(()=>{
                setTheme('light',false);
                plot.removePlot(0);
                plot.setVolcano('${volc}');
                plot.setDateRange('${dateFrom}','${dateTo}');
                const plots=${plots}
                const plotFutures=plots.map(function(element){
                    const type=element['plotType']
                    const addArgs=element['addArgs']
                    return plot.addPlot(type,addArgs)
                })

                Promise.all(plotFutures).then(()=>{
                    setTheme('light',false); //not really needed, but it "kicks" the display nicely.
                    calcPageBreaks();
                    window.print();
                });
            });
        })
    </script>
    `
    myWindow.document.write(initScript)

    myWindow.document.write('</body></html>');

    myWindow.document.close();
    myWindow.focus();
}

// Stage 2: Print the page
function printPage(){
    calcPageBreaks();
    window.print();
}

// Stage 3: Restore to original size
function restoreAfterPrint(){
    //setTheme(multiplotPrePrintStyle);
}

// ------- Printing Complete ---------//
const PAGE_HEIGHT=984;

function calcPageBreaks(){
    let lastPage=0;
    const plotsTop=$('#multiplot-plots').offset().top
    $('div.multiplot-plot').each(function(){
        const plotContainer=$(this);
        const plotHeight=$(this).height();
        // Find the "print" height of the top of this div.
        const plotTop=plotContainer.offset().top-plotsTop;
        const plotBottom=plotTop+plotHeight;
        if(plotBottom>lastPage+PAGE_HEIGHT){
            plotContainer.addClass('multiplot-pagebreak');
            lastPage+=PAGE_HEIGHT;
        }
        else{
            plotContainer.removeClass('multiplot-pagebreak');
        }

    });
}
