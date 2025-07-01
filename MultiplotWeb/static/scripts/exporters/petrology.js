export function plot_diffusion(plotDiv){
    const error=plotDiv.data('errorData');
    const cpx=plotDiv.data('cpx');
    const plag=plotDiv.data('plag');
    const data={
        'cpx':cpx,
        'plag':plag,
    }

    const headers=['type','date','date neg','date pos']
    const types=[],dates=[],negs=[],pos=[]
    for(const type in data){
        for(let i=0;i<data[type][0].length;i++){
            let date=data[type][0][i];
            let index=data[type][1][i];
            let dateNeg,datePos;
            [dateNeg,datePos]=error[index];
            types.push(type);
            dates.push(date);
            negs.push(dateNeg);
            pos.push(datePos);
        }
    }

    return [headers, [types,dates,negs,pos]]
}
