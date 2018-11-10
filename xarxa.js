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
  soluciona(verbose){
    //inputs i default values
    verbose=verbose||false; //mostrar resultats a la pantalla

    //mira si hi ha trams a la xarxa
    if(this.trams.length==0){throw 'la xarxa no té trams de riu'}

    //afegeix propietat "calculat=false" a tots els trams
    this.trams.forEach(t=>t.calculat=false);

    //verbose: mostra cabals i S_VFA inicial
    if(verbose){
      console.log("Cabals inici (ML/d): "+this.trams.map((t,i)=>`${t.state_variables.Q}`));
      console.log("S_VFA  inici (kg/d): "+this.trams.map((t,i)=>`${t.state_variables.fluxes.components.S_VFA}`));
    }

    /*ARRELS*/
    //busca trams inicials (no tenen pares)
    let arrels=this.trams.filter(t=>t.pares.length==0);
    if(arrels.length==0){throw 'la xarxa no té arrels'}

    //calcula contaminants arrels (Mf)
    arrels.forEach(a=>{
      Object.entries(a.state_variables.fluxes.components).forEach(([key,Mi])=>{
        let Mf = a.Mf(Mi, 0, 0, 0); //g/s | massa final (aplica degradació)
        if(a.state_variables.Q==0) throw "El cabal de l'arrel és zero";
        let conc_final = Mf/a.state_variables.Q; //g/m3
        a.state_variables.set(key, conc_final);
      });
      a.calculat=true;
    });

    /*RESTA DE TRAMS*/
    //calcula contaminants a la resta de trams
    let iteracions={fetes:0, max:5e3};

    //loop infinit
    while(true){
      //si la la xarxa ja està calculada, acaba
      if(this.trams.filter(t=>t.calculat).length==this.trams.length){
        if(verbose){
          console.log("Cabals final (ML/d): "+this.trams.map((t,i)=>`${t.state_variables.Q}`));
          console.log("S_VFA  final (kg/d): "+this.trams.map((t,i)=>`${t.state_variables.fluxes.components.S_VFA}`));
          console.log("[!] Xarxa calculada ("+iteracions.fetes+" iteracions)");
        }
        //esborra propietat "calculat" a tots els trams
        this.trams.forEach(t=>{delete t.calculat});
        break;
      }

      //troba el següent tram a calcular        condicions:
      var tram_actual=this.trams
        .filter(t=>!t.calculat)                 //que sigui no calculat
        .filter(t=>t.pares.length)              //que tingui pares
        .find(t=>t.pares.every(p=>p.calculat)); //que tingui tots els pares calculats

      //calcula contaminants
      Object.keys(tram_actual.state_variables.components).forEach(key=>{

        //massa inicial = suma els fluxes dels dels pares
        let Mi = tram_actual.pares.map(p=>p.state_variables.fluxes.components[key]).reduce((p,c)=>p+c); //g/s

        //suma els cabals dels pares
        tram_actual.state_variables.Q = 
        tram_actual.state_variables.Q = tram_actual.pares.map(p=>p.state_variables.Q).reduce((p,c)=>p+c); //g/s

        //si hi ha una wwtp:
        if(tram_actual.wwtp){
          Mi += tram_actual.wwtp.fluxes.components[key];
        }

        //Massa final.  Tram.Mf(Mi, R_20,k,T)
        let Mf = tram_actual.Mf(Mi, 0,   0,0);
        if(tram_actual.state_variables.Q==0) throw "El cabal del tram de riu és zero";
        tram_actual.state_variables.set(key, Mf/tram_actual.state_variables.Q);
      });
      tram_actual.calculat=true;

      //suma 1 al nombre d'iteracions
      iteracions.fetes++;
      if(iteracions.fetes>=iteracions.max){throw "Max iteracions ("+iteracions.max+")";break;}
    }
  }
}

//node imports and exports
if(typeof document == "undefined"){
  Tram=require("./tram.js"); 
  module.exports=Xarxa;
}

/*test: exemples xarxes de trams*/
(function test(){
  return;
  //2 exemples de xarxes
  {/* Exemple 1:
    t1--+
        |--> t5--+
    t2--+        |
                 +--> t7
    t3--+        |
        |--> t6--+
    t4--+
    */
    let xarxa = new Xarxa();
    let t1 = new Tram(); t1.state_variables.Q = 10; t1.state_variables.set('S_VFA',1);
    let t2 = new Tram(); t2.state_variables.Q = 10;
    let t3 = new Tram(); t3.state_variables.Q = 10;
    let t4 = new Tram(); t4.state_variables.Q = 10;
    let t5 = new Tram(); t5.pares=[t1,t2];
    let t6 = new Tram(); t6.pares=[t3,t4];
    let t7 = new Tram(); t7.pares=[t5,t6];
    xarxa.trams=[t1,t2,t3,t4,t5,t6,t7];
    xarxa.soluciona(verbose=true);
  }
  return;
})();
