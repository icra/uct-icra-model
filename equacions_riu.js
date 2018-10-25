//equacions riu.docx

//1. Caracteritzar geometria
  let wb; //amplada a llera mitjana
  let wt; //amplada màxima del canal
  let Di; //fondària màxima al nivell del canal (bankfull)
  let Dt; //fondària màxima del canal

  //angle entre la llera i el màxim del canal
  let angle = Math.acos(Dt/Math.sqrt(Math.pow((wt-wb)/2,2)+Math.pow(Dt,2)));
  let wi    = wb + 2*Di*Math.tan(angle);  //amplada de la llera inundada
  let Ai    = Di*(wb+Di*Math.tan(angle)); //area transversal inundada
  let wpi   = wb + 2*Di/Math.cos(angle);  //perímetre humit inundat
  let HRi   = Ai/wpi;                     //radi hidràulic

//2. Determinar pendent de la llera (S): usant un model digital d'elevació del terreny de resolució
//mínima de 30m de pixel, i estimant la pendent per un tram d'1 km.
  let S;

//3. Determinar coeficient de Manning (n).
  //Equació de Manning: estimar n a partir de regressió entre Qi (y) i HRi (x):
  //també es pot usar el mètode de Verzano et al per determinar n, o usar el valor 0.0358, que és la mitjana europea.
  let n = Math.sqrt(S)/pendent;

//4. Amb n determinat podem estimar wi, Ai, wpi, HRi i Qi en funció de Di. 
  let Li; //longitud

//taula resum
  //tram influent 1, codi tram influent 2, codi edar influent \
  //wb, wt, Dt, angle, n, S, Li, UTM X, UTM Y
  function calcula_coses(wb,wt,Di,Dt,Li){
    ///
    let Qi   = (1/n)*Math.pow(HRi,2/3)*Math.sqrt(S);
    let HRTi = Li*Ai/Qi; //el temps mig de residència de l'aigua HRTi
    let Si   = Li*wpi;   //la superfície inundada en el tram d'interès
    return {  
      Qi, HRTi, Si
    }
  }
  //
  //Les equacions determinaran Qi, HRTi, Si

//Capacitat de retenció
  //massa a l'inici del tram fluvial: suma dels diferents trams que alimenten el tram
  let Mi;
  //massa o càrrega al final del tram fluvial
  let Mf = Mi - R_20*HRTi*Si*Math.pow(1.041,T-20)*(Mi/Qi)/(k+Mi/Qi);

//Objectiu gestió EDAR:
  //NH4 < 0.5 mg/L
  //PO4 < 0.5 mg/L

//gravetat
const g = 9.81;
//coeficient de dispersió lateral (ky)
let ky = 0.6*Di*Math.sqrt(g*S*Di);
//longitud del tram de barreja lateral (Ll)
let Ll = Math.pow(wi,2)*Qi/Ai/(2*ky);
