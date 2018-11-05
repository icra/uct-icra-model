/*
 * Xarxa de trams de riu
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
    let arrels=this.trams.filter(tram=>(tram.pares.in1===null && tram.pares.in2===null));
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
      //troba el següent tram a calcular                          condicions:
      var tram_actual=this.trams
        .filter(t=>!t.calculat)                                   //que sigui no calculat
        .filter(t=>(t.pares.in1 && t.pares.in2))                  //que tingui pares
        .find(t=>(t.pares.in1.calculat && t.pares.in2.calculat)); //que tingui pares calculats
      //calcula contaminants
      Object.keys(tram_actual.state_variables.components).forEach(key=>{
        let mare = tram_actual.pares.in1;
        let pare = tram_actual.pares.in2;
        let valor_inici = pare.state_variables.components[key]+mare.state_variables.components[key];
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
  return;
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
  let t5 = new Tram(); t5.pares={in1:t1, in2:t2};
  let t6 = new Tram(); t6.pares={in1:t3, in2:t4};
  let t7 = new Tram(); t7.pares={in1:t5, in2:t6};
  xarxa.trams=[t1,t2,t3,t4,t5,t6,t7];
  xarxa.soluciona();
})();
