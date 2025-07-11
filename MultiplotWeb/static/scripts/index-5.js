let theme='dark'
let plotDescriptions={}
let prefix=''
let parent=''
const myScriptTag=document.currentScript

class MultiPlot {
    constructor(dest){
        //constructor Function
        parent=$(dest);

        // We could skip all this if we just wanted to assume we are loading remote.
        const host=window.location.hostname
        const port=window.location.port
        const protocol=window.location.protocol

        const myURL=new URL(myScriptTag.src)
        const myServer=myURL.hostname
        const myPort=myURL.port
        const serverPrefix=myURL.pathname.replace(/static\/scripts\/.+.js/,'')

        // we don't technically need the direct host stuff, but it allows us to do different things
        // when not embedding in another webpage.
        const direct_host= (myServer==host && myPort==port)

        if (direct_host){
            //this allows us to tweak the display using CSS if we are not loading from a remote server
            $(dest).addClass('multiplot-direct')
        } else {
            prefix=`${protocol}//${myServer}`
            if (port!=443 && port!=80){
                prefix+=':'+myPort;
            }

            prefix+=serverPrefix
        }

        // get the headers and scripts
        this.initialized = this._initialize();
    }
    
    async _initialize() {
        const response = await fetch(prefix+'headers');
        
        if(!response.ok){
            console.log('Unable to fetch MultiPlot headers');
        }
        
        const headers = await response.text();
        
        //append the stylesheets to the header
        const parsedHtml=$.parseHTML(headers,null,true);
        const stdScripts=[]

        parsedHtml.forEach( (element) => {
            if(element instanceof HTMLScriptElement){
                stdScripts.push(loadClassicScript(element));
            } else {
                document.head.appendChild(element);
            }
        });

        //now that we have the "standard" headers, load the modules
        const scriptsPromise = Promise.all(stdScripts);
        const modulesPromise = loadCoreModules();
        const bodyResponsePromise = fetch(`${prefix}body`);
        
        // Wait for all of them to finish before proceeding
        const [_, __, bodyResponse] = await Promise.all([
            scriptsPromise,
            modulesPromise,
            bodyResponsePromise
        ]);
        
        if(!bodyResponse.ok){
            console.error("Unable to load MultiPlot body HTML");
            return;
        }
        const bodyHTML=await bodyResponse.text();
        parent.html(bodyHTML);
        parent.addClass('multiplot-top-div');
        await initMultiPlot();
    }

    setVolcano(volc){
        const volcSelect=$('#multiplot-volcano')
        const prevVal=volcSelect.val()

        //try to change the value
        volcSelect.val(volc)

        //see if it changed. If we get a different result than provided, then the provided
        //value is invalid
        console.log(volcSelect.val())
        console.log(volcSelect)
        if(volcSelect.val() != volc){
            volcSelect.val(prevVal);
            console.error(`Unable to set volcano to ${volc}: Invalid option`);
            return;
        }

        return refreshPlots();
    }

    async addPlot(...args){
        await this.initialized;
        createPlotDiv(...args);
    }
    
    removePlot(idx){
        removePlotDiv.call($('.multiplot-plotContent').eq(idx))
    }

    getPlotsDiv(){
        return $('.multiplot-top-div')[0];
    }

    getPlots(){
        return $('.multiplot-plotContent').toArray();
    }

    getPlotParams(idx){
        if(typeof(idx)=='undefined'){
            return $('div.multiplot-plotSelect').map((idx,element)=>{
                return getPlotArgs.call(element);
            })
        } else {
            return getPlotArgs.call($('div.multiplot-plotSelect').eq(idx)[0])
        }
    }

    setStartDate(date){
        const dateTo=$('#multiplot-dateTo').val();
        return this.setDateRange(date,dateTo);
    }

    setEndDate(date){
        const dateFrom=$('#multiplot-dateFrom').val();
        return this.setDateRange(dateFrom,date);
    }

    setDateRange(dateFrom, dateTo){
        if(typeof(dateFrom)=='string'){
            dateFrom=new Date(dateFrom);
        }

        if(typeof(dateTo)=='string'){
            dateTo=new Date(dateTo);
        }

        if(isNaN(dateFrom)){
            console.log('Invalid Date From');
            return;
        }

        if(isNaN(dateTo)){
            console.log('Invalid Date To');
            return;
        }

        //ok, we have two valid date objects. Convert them to nicely formatted strings.
        const from=formatUTCDateString(dateFrom);
        const to=formatUTCDateString(dateTo);

        $('#multiplot-dateFrom').val(from);
        $('#multiplot-dateTo').val(to);

        return refreshPlots();
    }
}

async function loadCoreModules(){
    try{
        const fileList = await fetch(`${prefix}list-scripts`).then(res => res.json());
        for (const file of fileList) {
            try {
                const module = await import(`./static/scripts/core/${file}`);
                for (const [exportName, exportValue] of Object.entries(module)) {
                    window[exportName]=exportValue;
                }
            } catch (error) {
                console.error(`Failed to load ${file} from core`,error)
            }
        }
    } catch (error) {
        console.error("Unable to fetch core javascript files",error)
    }
}

function loadClassicScript(element){
    return new Promise((res, rej) => {
        const script = document.createElement('script');
        if(element.text){
            script.text=element.text;
        }
        script.async = false; // Important for order if dependencies exist
        
        if(element.src){
            script.src = element.src;
            
            script.onload = () => {
                console.log(`Classic script loaded: ${element.src}`);
                res();
            };
            script.onerror = (e) => {
                console.error(`Error loading classic script: ${element.src}`, e);
                res(); // Resolve even on error to not block Promise.all for other scripts
            };
                
        } else {
            setTimeout(res, 0); // Let script execute before resolving
        }
        
        document.head.appendChild(script);
    });
};


(function($){
    $.fn.MultiPlot = function(options) {
        // Support chaining, but return the MultiPlot instance
        if (this.length === 0) return null;

        const instance = new MultiPlot(this[0], options);

        // Optional: attach instance to element for later access
        this.data('MultiPlot', instance);

        return instance;
    };
})(jQuery);