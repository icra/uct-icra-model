/*
  equacions_riu.docx
  Estructura Taula resum de trams de riu
    [tram influent 1, codi tram influent 2, codi edar influent]+
    [wb, wt, Dt, angle, n, S, Li, UTM_X, UTM_Y]
*/

class Tram {
  constructor(wb,wt,xxx,S,n,Li){
    //inputs i default values
    this.wb  = wb  || 3;      //amplada a llera mitjana (m)
    this.wt  = wt  || 6;      //amplada a bankful mitjana (m)
    this.xxx = xxx || 2;      //distància entre llera i bankfull mitjana (m)
    this.S   = S   || 0.005;  //pendent de la llera: obtingut amb resolució mínima de 30m de pixel, i estimant la pendent per un tram d'1 km
    this.n   = n   || 0.0358; //el coeficient de manning (n) s'obté de regressió entre Qi i HRi també es pot usar el mètode de Verzano et al per determinar n, o usar el valor 0.0358, que és la mitjana europea.
    this.Li  = Li  || 1000;   //longitud tram (m)

    //variables d'estat (S_VFA, S_FBSO, etc)
    this.state_variables = new State_Variables('river');

    //trams connectats upstream
    this.pares = { 
      in1:null; //<Tram>
      in2:null; //<Tram>
    };

    /* 
      inputs addicionals per quan connectem trams després de validar n=1
      this.coordenades = {start:[1,1], end:[2,2]};
      this.id_wtp = null; //indentificador EDAR que aboca al tram 
    */
  }

  //calcula angle "alfa" entre la llera i el màxim del canal (bankfull) (radiants)
  get angle(){return Math.asin((this.wt-this.wb)/(2*this.xxx));}

  //calcula fondària màxima (m)
  get Dt(){return this.xxx*Math.cos(this.angle);}

  //en funció de la fondària (Di), tenim wi, Ai, wpi, HRi i Qi
  wi (Di){return this.wb + 2*Di*Math.tan(this.angle); } //m  | amplada de la llera inundada
  Ai (Di){return Di*(this.wb+Di*Math.tan(this.angle));} //m2 | area transversal inundada
  wpi(Di){return this.wb + 2*Di/Math.cos(this.angle); } //m  | perímetre humit inundat
  HRi(Di){return this.Ai(Di)/this.wpi(Di);            } //m  | radi hidràulic

  //Amb n determinat podem estimar wi, Ai, wpi, HRi i Qi en funció de Di. 
  Qi  (Di){ return (1/this.n)*Math.pow(this.HRi(Di),2/3)*Math.sqrt(this.S);} //m3/s | cabal
  HRTi(Di){ return this.Li*this.Ai(Di)/this.Qi(Di)/60; }                     //min  | el temps mig de residència de l'aigua HRTi
  Si  (Di){ return this.Li*this.wpi(Di);            }                        //m2   | la superfície inundada en el tram d'interès

  /*Per a fer un seguiment, s’hauria de mirar estat químic i ecològic al 
    final del tram fluvial, així com al final de tram de barreja lateral, punt a 
    partir del qual la química de l’aigua és resultat de la barreja de la 
    química dels trams fluvials i EDAR influents. La longitud del tram de barreja 
    lateral (Ll) es determina a partir de paràmetres hidràulics, amplada (wi), 
    coeficient de dispersió lateral (ky) i velocitat mitjana (u). El coeficient de 
    dispersió lateral es calcula a partir de la fondària (Di), la força de la 
    gravetat (g), i la pendent de la llera fluvial (S): */
  ky(Di){ return 0.6*Di*Math.sqrt(9.81*this.S*Di)};                                //coeficient de dispersió lateral (ky)
  Ll(Di){ return Math.pow(this.wi(Di),2)*this.Qi(Di)/this.Ai(Di)/(2*this.ky(Di));} //longitud del tram de barreja lateral (Ll)

  //massa o càrrega al final del tram fluvial
  Mf(Di,Mi,R_20,k,T){
    //Mi   : massa a l'inici del tram fluvial: suma dels diferents trams que alimenten el tram
    //R_20 : velocitat de reacció a 20ºC (g/m2·min)
    //k    : (input, es com una ks) (g/m3)
    //T    : temperatura (ºC)
    let ret_val = Mi - R_20*this.HRTi(Di)*this.Si(Di)*Math.pow(1.041,T-20)*(Mi/this.Qi(Di))/(k+Mi/this.Qi(Di));
    return Math.max(ret_val,0);
  }
}

//tests amb valors inventats
(function test(){
  return;//debug

  // constructor(wb, wt, xxx,     S,      n,   Li)
  let t=new Tram( 3,  6,   2, 0.005, 0.0358, 1000);
  console.log(t);
  console.log("angle alfa   : "+t.angle);
  console.log("Dt           : "+t.Dt);

  //definim una fondària concreta Di
  let Di = 1.2;
  console.log("wi   (Di="+Di+"): "+t.wi(Di));
  console.log("Ai   (Di="+Di+"): "+t.Ai(Di));
  console.log("wpi  (Di="+Di+"): "+t.wpi(Di));
  console.log("HRi  (Di="+Di+"): "+t.HRi(Di));
  console.log("Qi   (Di="+Di+"): "+t.Qi(Di));
  console.log("HRTi (Di="+Di+"): "+t.HRTi(Di));
  console.log("Si   (Di="+Di+"): "+t.Si(Di));
  //console.log("ky   (Di="+Di+"): "+t.ky(Di));
  //console.log("Ll   (Di="+Di+"): "+t.Ll(Di));
  //let Mi=1e5, R_20=0.05, k=0.1, T=15;
  //console.log("Mf   (Di="+Di+",Mi="+Mi+",R_20="+R_20+",k="+k+",T="+T+"): "+t.Mf(Di,Mi,R_20,k,T));
})();
