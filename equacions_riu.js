/*
  equacions_riu.docx

  Estructura Taula resum de trams de riu
    [tram influent 1, codi tram influent 2, codi edar influent]+
    [wb, wt, Dt, angle, n, S, Li, UTM_X, UTM_Y]
*/

class Tram {
  constructor(wb,wt,Dt,S,n,Li){
    this.wb = wb //amplada a llera mitjana
    this.wt = wt //amplada màxima del canal
    this.Dt = Dt //fondària màxima del canal
    this.S  = S  //pendent de la llera : obtingut amb resolució mínima de 30m de pixel, i estimant la pendent per un tram d'1 km
    this.n  = n  //el coeficient de manning (n) s'obté de regressió entre Qi i HRi també es pot usar el mètode de Verzano et al per determinar n, o usar el valor 0.0358, que és la mitjana europea.
    this.Li = Li //longitud tram

    //extra info per quan connectem trams després de validar n=1
    /*
    this.coordenades = {start:[1,1], end:[2,2]};
    this.id     = "identificador";
    this.id_in1 = "indentificador influent 1";
    this.id_in2 = "indentificador influent 2";
    this.id_wtp = null; //indentificador EDAR que aboca al tram 
    */
  }

  //calcula angle "alfa" entre la llera i el màxim del canal
  get angle(){return Math.acos(this.Dt/Math.sqrt(Math.pow((this.wt-this.wb)/2,2)+Math.pow(this.Dt,2)));}

  //en funció de la fondària (Di), tenim wi, Ai, wpi, HRi i Qi
  wi (Di){ return this.wb + 2*Di*Math.tan(this.angle); } //amplada de la llera inundada
  Ai (Di){ return Di*(this.wb+Di*Math.tan(this.angle));} //area transversal inundada
  wpi(Di){ return this.wb + 2*Di/Math.cos(this.angle); } //perímetre humit inundat
  HRi(Di){ return this.Ai(Di)/this.wpi(Di);            } //radi hidràulic

  //Amb n determinat podem estimar wi, Ai, wpi, HRi i Qi en funció de Di. 
  HRTi(Di){ return this.Li*this.Ai(Di)/this.Qi(Di); } //el temps mig de residència de l'aigua HRTi
  Si  (Di){ return this.Li*this.wpi(Di);            } //la superfície inundada en el tram d'interès
  Qi  (Di){ return (1/this.n) * Math.pow(this.HRi(Di), 2/3) * Math.sqrt(this.S); }

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
    //R_20 : velocitat de reacció a 20ºC
    //k    : (input, es com una ks)
    //T    : temperatura (ºC)
    return Mi - R_20*this.HRTi(Di)*this.Si(Di)*Math.pow(1.041,T-20)*(Mi/this.Qi(Di))/(k+Mi/this.Qi(Di));
  }
}

//tests amb valors inventats
//constructor   (wb, wt, Dt, S,   n,      Li){
let t = new Tram(10, 50, 10, 0.5, 0.0358, 100);
console.log(t);
console.log("angle alfa : "+t.angle);

//definim una fondària concreta Di
let Di = 5;
console.log("wi   (Di="+Di+"): "+t.wi(Di));
console.log("Ai   (Di="+Di+"): "+t.Ai(Di));
console.log("wpi  (Di="+Di+"): "+t.wpi(Di));
console.log("HRi  (Di="+Di+"): "+t.HRi(Di));
console.log("HRTi (Di="+Di+"): "+t.HRTi(Di));
console.log("Si   (Di="+Di+"): "+t.Si(Di));
console.log("Qi   (Di="+Di+"): "+t.Qi(Di));
console.log("ky   (Di="+Di+"): "+t.ky(Di));
console.log("Ll   (Di="+Di+"): "+t.Ll(Di));

let Mi=1e5, R_20=0.05, k=0.1, T=15;
console.log("Mf   (Di="+Di+",Mi="+Mi+",R_20="+R_20+",k="+k+",T="+T+"): "+t.Mf(Di,Mi,R_20,k,T));
