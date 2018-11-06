/*
  Xarxa de trams de riu
    Mail Anna:
    A la BD es desen les connexions en aquest format:
    [
      {"id":"WWTP65-WWTP66", "id0":"WWTP65", "id1":"WWTP66"},
      {"id":"WWTP64-WWTP66", "id0":"WWTP64", "id1":"WWTP66"},
      {"id":"WWTP66-WWTP63", "id0":"WWTP66", "id1":"WWTP63"},
    ]
*/

class Xarxa {
  constructor(){
    this.trams=[]; //array objectes <Tram>
  }

  //soluciona la xarxa
  soluciona(){
    //mira si hi ha trams
    if(this.trams.length==0){throw 'la xarxa no té trams de riu'}

    //afegeix la propietat "calculat=false" a cada tram
    this.trams.forEach(t=>t.calculat=false);

    /*ARRELS*/
    //busca els trams inicials (no tenen pares: "arrels")
    let arrels=this.trams.filter(tram=>tram.pares.length==0);
    if(arrels.length==0){throw 'la xarxa no té arrels'}
    //calcula contaminants arrels al final del tram
    arrels.forEach(t=>{
      Object.keys(t.state_variables.components).forEach(key=>{
        let valor_inici = t.state_variables.components[key];
        //sintaxi:     Tram.Mf(Mi,         R_20,k,T)
        let valor_final = t.Mf(valor_inici,   0,0,0);
        t.state_variables.set(key, valor_final);
      });
      t.calculat=true;
    });

    /*RESTA DE TRAMS*/
    //calcula contaminants a la resta de trams
    while(true){
      //si la la xarxa ja està calculada, acaba
      if(this.trams.filter(t=>t.calculat).length==this.trams.length){
        console.log("Xarxa calculada");
        //console.log(this.trams.map(t=>t.state_variables.components));
        break;
      }
      //troba el següent tram a calcular          condicions:
      var tram_actual=this.trams
        .filter(t=>!t.calculat)                   //que sigui no calculat
        .filter(t=>t.pares.length)                //que tingui pares
        .find(t=>(t.pares.every(p=>p.calculat))); //que tingui tots els pares calculats
      //calcula contaminants
      Object.keys(tram_actual.state_variables.components).forEach(key=>{
        let valor_inici = tram_actual.pares.map(p=>p.state_variables.components[key]).reduce((p,c)=>p+c);
        //sintaxi:               Tram.Mf(Mi,         R_20,k,T)
        let valor_final = tram_actual.Mf(valor_inici,   0,0,0);
        tram_actual.state_variables.set(key, valor_final);
      });
      tram_actual.calculat=true;
    }
  }
}

//node imports and exports
if(typeof document == "undefined"){
  Tram=require("./tram.js"); 
  module.exports=Xarxa;
}

/*test*/
(function test(){
  //return;
  /*
    exemple xarxa de trams

    t1--+
        |--> t5--+
    t2--+        |
                 |--> t7
    t3--+        |
        |--> t6--+
    t4--+

  */
  let xarxa = new Xarxa();
  //test amb 4 arrels
  let t1 = new Tram();
  let t2 = new Tram();
  let t3 = new Tram();
  let t4 = new Tram();
  let t5 = new Tram(); t5.pares=[t1, t2];
  let t6 = new Tram(); t6.pares=[t3, t4];
  let t7 = new Tram(); t7.pares=[t5, t6];
  xarxa.trams=[t1,t2,t3,t4,t5,t6,t7];
  xarxa.soluciona();
})();
