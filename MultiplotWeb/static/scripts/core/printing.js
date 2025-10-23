import { setTheme } from "./ui-1.js";

let originalMode=theme;
let currentMode=theme;
function setupPDFDialog() {
    console.log('Setting up PDF dialog');
    //set up the PDF generation dialog buttons
    $(document).on('click','#mp-pdfOptionsDialog .btn-cancel',function(){
        closePDFDialog();
    });

    $(document).on('click','#mp-pdfOptionsDialog .btn-generate', async function(){
        $('#mp-pdfOptionsDialog .btn-generate').addClass('loading');
        try {
            await _generatePDF();
        } catch (error) {
            alert('Error generating PDF: ' + error);
            $('#mp-pdfOptionsDialog .btn-generate').removeClass('loading');
            return;
        } 

        closePDFDialog();
    });

    $(document).on('click','#mp-pdfOptionsDialog .mode-option',modeButtonClickHandler);
}

function closePDFDialog(){
    $('#mp-pdfOptionsDialog .btn-generate').removeClass('loading');
    $('#mp-pdfOptionsDialog').hide();
    setTheme(originalMode, false ); //restore previous mode
}

function modeButtonClickHandler(){
    const button = $(this);
    const parent = this.parentElement;
    $(parent).find('.mode-option').removeClass('active');
    $(this).addClass('active');

    if(button.data('mode')){ //dark/light mode option
        const darkMode = button.data('mode')==='dark';
        const pdfDialog = $('#mp-pdfOptionsDialog');
        pdfDialog.toggleClass('dark', darkMode);
        setTheme(button.data('mode'), false);
        currentMode=button.data('mode');
    }
}

export function generatePDF(){
    originalMode=theme; //store current theme so we can restore it on close

    // Set the appearance (dark/light) button to match current theme each time dialog opens
    const pdfDialog = $('#mp-pdfOptionsDialog');
    pdfDialog.find('.appearance-option').removeClass('active');
    const match = pdfDialog.find(`.appearance-option[data-mode="${originalMode}"]`);
    if(match.length){
        match.addClass('active');
    }
    pdfDialog.toggleClass('dark', originalMode === 'dark');

    pdfDialog.show();
}

async function _generatePDF(){
    const titleHeight=24;
    const plots=[];
    const plotElements = document.querySelectorAll('.js-plotly-plot');
    if(!plotElements.length){
        alert('No plots to print!');
        return;
    }

    let plotWidth;
    // target the width-option specifically so appearance-option.active isn't confused for width
    const widthOption=$('#mp-pdfOptionsDialog .width-option.active').data('width');
    if(widthOption==='letter'){
        plotWidth=816 - 96; //letter width minus 0.5 inch margins (plotly uses 96dpi)
    } else {
        //use display width
        const firstPlot=$(plotElements[0]);
        plotWidth=firstPlot.width()-firstPlot[0].layout.margin.l-firstPlot[0].layout.margin.r;
    }
    
    for (const el of plotElements) {
        const data=el.data;
        const layout=structuredClone(el.layout); // deep copy the layout;
        const title=$(el).closest('div.multiplot-plot').find('div.multiplot-typeString').html();
        layout['title']={
            'text':title,
            'x': 0.5,
            'xanchor': 'center',
            'font':{
                'size':12
            }
        };

        if(currentMode==='dark'){
            layout['title']['font']['color']='rgb(204,204,220)';
        }

        layout['margin']['t']+=titleHeight; //add space for title
        layout['margin']['pad']=0;
        layout['height']=el.offsetHeight+titleHeight; //add space for title
        layout['width']=plotWidth;
        plots.push({data:data,layout:layout});
    }

    const args={
        plots:plots,
        mode:currentMode,
        widthMode:widthOption
    };
    
    const payload=JSON.stringify(args);
    let data;
    
    const response = await fetch('generatePDF',{
        method:'POST',
        headers:{
            'Content-Type':'application/json'
        },
        body:payload
    });
    if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
    }
    data = await response.blob();

    const url=window.URL.createObjectURL(data);
    const a=document.createElement('a');
    a.href=url;
    a.download='multiplot.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
}

setupPDFDialog();