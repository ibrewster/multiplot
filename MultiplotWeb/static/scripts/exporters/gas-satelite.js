export function so2_em_rate_combined(plotDiv){
    const xData=plotDiv.data('xValues')
    const yData=plotDiv.data('yValues')

    const headers=['type','date','lower','rate','upper']
    let types=[],dates=[],lower=[],rate=[],upper=[];
    for(const [type,data] of Object.entries(yData)){
        const dateData=xData[type]
        const numEntries=dateData.length
        const typeArray=new Array(numEntries).fill(type)
        types=types.concat(typeArray)
        dates=dates.concat(dateData)

        if(type=='AVO'){
            const num=data.length
            const lowerVals=new Array(num).fill('')
            const upperVals=new Array(num).fill('')
            rate=rate.concat(data)
            upper=upper.concat(upperVals)
            lower=lower.concat(lowerVals)
        }
        else if(type=='fioletov'){
            const [lowerVals,rateVals,upperVals]=data;
            lower=lower.concat(lowerVals);
            rate=rate.concat(rateVals);
            upper=upper.concat(upperVals);
        }
        else{
            return [null,null];
        }

    }

    return [headers,[types,dates,lower,rate,upper]];
}

export function so2_mass_combined(plotDiv){
    const xData=plotDiv.data('xValues')
    const yData=plotDiv.data('yValues')

    const headers=['Type','Date From','Date To','Mass']
    let types=[],dateFrom=[],dateTo=[],mass=[];
    for(const [type,data] of Object.entries(yData)){
        const [dateFromData,dateToData]=xData[type]
        const numEntries=dateFromData.length
        const typeArray=new Array(numEntries).fill(type)
        types=types.concat(typeArray)
        dateFrom=dateFrom.concat(dateFromData);
        dateTo=dateTo.concat(dateToData);
        mass=mass.concat(data)
    }

    return [headers,[types,dateFrom,dateTo,mass]];
}
