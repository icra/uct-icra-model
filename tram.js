/*
  Equacions d'un tram de riu: veure "docs/riu/equacions\ riu.docx"
  Estructura Taula resum de trams de riu
    [tram influent 1, codi tram influent 2, codi edar influent]+
    [wb, wt, Dt, angle, n, S, Li, UTM_X, UTM_Y]
*/

class Tram {
  constructor(wb,wt,xxx,S,n,Li,Di){
    //inputs i default values
    this.wb  = wb  || 3;      //amplada a llera mitjana (m)
    this.wt  = wt  || 6;      //amplada a bankful mitjana (m)
    this.xxx = xxx || 2;      //distància entre llera i bankfull mitjana (m)
    this.S   = S   || 0.005;  //pendent de la llera: obtingut amb resolució mínima de 30m de pixel, i estimant la pendent per un tram d'1 km
    this.n   = n   || 0.0358; //el coeficient de manning (n) s'obté de regressió entre Qi i HRi també es pot usar el mètode de Verzano et al per determinar n, o usar el valor 0.0358, que és la mitjana europea.
    this.Li  = Li  || 1000;   //longitud tram (m)
    this.Di  = Di  || 1.2;    //fondària concreta (m)

    //id per la base de dades
    this.id="1";

    //trams connectats upstream (pares). Definits per l'usuari.
    this.pares=[]; /*array <Tram>*/

    //coordenades per dibuixar els trams
    this.coordenades={inici:[0,0], final:[0,0]};

    //variables d'estat (S_VFA, S_FBSO, etc)
    this.state_variables = new State_Variables('tram');

    //EDAR que aboca al tram 
    this.wwtp = null;
  }

  /*Resultats*/
    //calcula angle "alfa" entre la llera i el màxim del canal (bankfull) (radiants)
    get angle(){return Math.asin((this.wt-this.wb)/(2*this.xxx));}
    //calcula fondària màxima (m)
    get Dt(){return this.xxx*Math.cos(this.angle);}
    //en funció de la fondària (Di), tenim wi, Ai, wpi, HRi i Qi
    get wi() {return this.wb + 2*this.Di*Math.tan(this.angle); }      //m  | amplada de la llera inundada
    get Ai() {return this.Di*(this.wb+this.Di*Math.tan(this.angle));} //m2 | area transversal inundada
    get wpi(){return this.wb + 2*this.Di/Math.cos(this.angle); }      //m  | perímetre humit inundat
    get HRi(){return this.Ai/this.wpi;                         }      //m  | radi hidràulic
    //Amb n determinat podem estimar wi, Ai, wpi, HRi i Qi en funció de Di. 
    get Qi()  {return (1/this.n)*Math.pow(this.HRi,2/3)*Math.sqrt(this.S);} //m3/s | cabal
    get HRTi(){return this.Li*this.Ai/this.Qi/60;                         } //min  | el temps mig de residència de l'aigua HRTi
    get Si()  {return this.Li*this.wpi;                                   } //m2   | la superfície inundada en el tram d'interès
    /*Per a fer un seguiment, s’hauria de mirar estat químic i ecològic al 
      final del tram fluvial, així com al final de tram de barreja lateral, punt a 
      partir del qual la química de l’aigua és resultat de la barreja de la 
      química dels trams fluvials i EDAR influents. La longitud del tram de barreja 
      lateral (Ll) es determina a partir de paràmetres hidràulics, amplada (wi), 
      coeficient de dispersió lateral (ky) i velocitat mitjana (u). El coeficient de 
      dispersió lateral es calcula a partir de la fondària (Di), la força de la 
      gravetat (g), i la pendent de la llera fluvial (S): */
    get ky(){return 0.6*this.Di*Math.sqrt(9.81*this.S*this.Di)};      //coeficient de dispersió lateral (ky)
    get Ll(){return Math.pow(this.wi,2)*this.Qi/this.Ai/(2*this.ky);} //longitud del tram de barreja lateral (Ll)

  //empaqueta els resultats
  get resultats(){return {
    angle:{value:this.angle, unit:"rad",  descr:"Angle &alpha; entre la llera i el màxim del canal (bankful)"},
    Dt   :{value:this.Dt,    unit:"m",    descr:"Fondària màxima"},
    wi   :{value:this.wi,    unit:"m",    descr:"Amplada de la llera inundada"},
    Ai   :{value:this.Ai,    unit:"m2",   descr:"Àrea transversal inundada"},
    wpi  :{value:this.wpi,   unit:"m",    descr:"Perímetre humit inundat"},
    HRi  :{value:this.HRi,   unit:"m",    descr:"Radi hidràulic"},
    Qi   :{value:this.Qi,    unit:"m3/s", descr:"Cabal"},
    HRTi :{value:this.HRTi,  unit:"min",  descr:"Temps mig de residència de l'aigua"},
    Si   :{value:this.Si,    unit:"m2",   descr:"Superfície inundada"},
    ky   :{value:this.ky,    unit:"?",    descr:"Coeficient de dispersió lateral"},
    Ll   :{value:this.Ll,    unit:"m",    descr:"Longitud del tram de barreja lateral"},
  }}

  //massa o càrrega al final del tram fluvial
  //exemple: Tram.Mf();
  //TBD (unitat de Mi i Mf?)
  Mf(Mi,R_20,k,T){
    //Mi   : massa a l'inici del tram fluvial: suma dels diferents trams que alimenten el tram 
    //R_20 : velocitat de reacció a 20ºC (g/m2·min)
    //k    : (input, es com una ks) (g/m3)
    //T    : temperatura (ºC)
    if(Mi==0) return 0;
    let Mf = Mi - R_20*this.HRTi*this.Si*Math.pow(1.041,T-20)*(Mi/this.Qi)/(k+Mi/this.Qi);
    //console.log(Mf);
    return Math.max(Mf,0);
  }
}

//node imports and exports
if(typeof document == "undefined"){
  State_Variables=require("./state-variables.js");
  module.exports=Tram;
}

//tests amb valors Vicenç Acuña (vacuna@icra.cat)
(function test(){
  //return;

  //sintaxi Tram(wb, wt, xxx,     S,      n,   Li,  Di)
  let t=new Tram( 3,  6,   2, 0.005, 0.0358, 1000, 1.2);
  //console.log(t.resultats);

  Object.entries(t.state_variables.components).forEach(entry=>{
    let R_20=0, k=0, T=0;

    let key=entry[0];
    let Mi =entry[1];
    Mi *= t.Qi; //g/s
    let Mf = t.Mf(Mi, R_20, k, T);  //g/s

    console.log("Mf["+key+"] (Mi="+Mi+"): "+Mf+" (g/s)");
  });


})();

/*
*/
