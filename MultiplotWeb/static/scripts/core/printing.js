// -----printing three stage ---//
// Stage 1: size for print page (8" wide")
export function sizeAndPrint(){
    createNewWindowForPrint();
}

export function generatePDF(){
    const plots=[];
    const firstPlot=$('.js-plotly-plot').first();
    if(!firstPlot.length){
        alert('No plots to print!');
        return;
    }
    const fudge=20; //fudge factor to get things to match up better
    const plotWidth=firstPlot.width()-firstPlot[0].layout.margin.l-firstPlot[0].layout.margin.r+fudge;
    $('.js-plotly-plot').each(function(){
        const data=this.data;
        const layout=structuredClone(this.layout); // deep copy the layout;
        const title=$(this).closest('div.multiplot-plot').find('div.multiplot-typeString').html();
        layout['title']={
            'text':title,
            'x': 0.5,
            'xanchor': 'center',
            'font':{
                'color':'rgb(204,204,220)',
                'size':12
            }
        };
        layout['margin']['t']+=24; //add space for title
        layout['margin']['pad']=0;
        layout['height']=this.offsetHeight+24; //add space for title
        layout['width']=plotWidth;
        plots.push({data:data,layout:layout});
    });

    const payload=JSON.stringify(plots);

    fetch('generatePDF',{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:payload
    })
    .then(response=>response.blob())
    .then(blob=>{
        const url=window.URL.createObjectURL(blob);
        const a=document.createElement('a');
        a.href=url;
        a.download='multiplot.pdf';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    })
    .catch(error=>{
        console.error('Error generating PDF:',error);
    });
}

function createNewWindowForPrint(){
    const myWindow=window.open('','PRINT','width=736px,height=1056px')

    myWindow.document.write('<html><head>');
    myWindow.document.write('<script src="https://apps.avo.alaska.edu/multiplot/static/scripts/jquery-3.6.3.min.js"></script>\n');
    myWindow.document.write('<script src="api"></script>');

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
            const prefix='${prefix}';
            const plot=new MultiPlot(document.getElementById('multiplot-print-div'))
            plot.initialized.then(()=>{
                setTheme('light',false);
                plot.removePlot(0);
                plot.setVolcano('${volc}');
                plot.setDateRange('${dateFrom}','${dateTo}');
                const plots=${plots}
                const plotFutures=plots.map(function(element){
                    debugger
                    const type=element['plotType']
                    const addArgs=element['addArgs']
                    console.log("Adding plot of type: "+type)
                    return plot.addPlot(type,addArgs)
                })

                Promise.all(plotFutures).then(()=>{
                    debugger
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
export function restoreAfterPrint(){
    //setTheme(multiplotPrePrintStyle);
}

// ------- Printing Complete ---------//
const PAGE_HEIGHT=984;

export function calcPageBreaks(){
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
