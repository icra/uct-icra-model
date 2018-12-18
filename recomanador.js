/*RECOMANADOR*/
/*Executa el model n vegades*/

//import files
try{
  State_Variables = require('./state-variables.js');    //class State_Variables
                    require('./primary-settler.js');    //tecnologia primary_settler  (dins de State Variables)
                    require('./activated-sludge.js');   //tecnologia activated_sludge (dins de State Variables)
                    require('./nitrification.js');      //tecnologia nitrification    (dins de State Variables)
                    require('./denitrification.js');    //tecnologia denitrification  (dins de State Variables)
                    require('./chemical-P-removal.js'); //tecnologia chemical P rem   (dins de State Variables)
  Tram            = require('./tram.js');               //class Tram
  run_model       = require('./run_model.js');          //run model
}catch(e){}

//run model n vegades
function run_simulacions(influent, tram, conf, i, deg, variacions){
  let combinacions = []; //return value | totes les combinacions fetes

  //recursive variations
  function itera_variacions(variacions, j){
    j = j || 0; //int

    let keys = Object.keys(variacions);
    if(j>=keys.length){
      //executa simulació "n"
      let run = run_model(influent, tram, conf, i, deg);
      //combinació actual
      let combinacio = {
        Rs:         i.Rs,
        RAS:        i.RAS,
        DO:         i.DO,
        mass_FeCl3: i.mass_FeCl3,
        FOt:        run.FOt,
        TSS:        run.TSS,
        NH4_plant:  run.NH4_plant,
        PO4_plant:  run.PO4_plant,
        NH4_river:  run.NH4_river,
        PO4_river:  run.PO4_river,
        errors:     run.errors,
      };
      combinacions.push(combinacio);
      return;
    }

    let key = keys[j];
    variacions[key].forEach(n=>{
      i[key]=n;
      itera_variacions(variacions, j+1);
    });
  };
  itera_variacions(variacions);

  //end simulations
  console.log(`simulacions_fetes: ${combinacions.length}`);
  return combinacions;
};

/*test*/
let variacions;   //global, accessible to DOM (user input)
let combinacions; //global, accessible to DOM (output)
(function(){
  //return

  //nou influent------------------(Q   VFA FBSO BPO  UPO  USO iSS FSA   OP    NOx OHO)
  let influent=new State_Variables(25, 50, 115, 440, 100, 45, 60, 39.1, 7.28, 0,  0  );

  //configuració edar
  let conf={pst:false, nit:true, dn:true, cpr:true, river:true};

  //paràmetres edar (i=inputs)
  let i={
    fw           : 0.005,     //ø     | PST | fraction of Q that goes to wastage
    removal_BPO  : 42.3352,   //%     | PST | removal of the component X_BPO
    removal_UPO  : 90.05,     //%     | PST | removal of the component X_UPO
    removal_iSS  : 75.125,    //%     | PST | removal of the component X_iSS
    T            : 16,        //ºC    | AS  | temperature
    Vp           : 8473.3,    //m3    | AS  | reactor volume
    Rs           : 15,        //d     | AS  | solids retention time or sludge age
    RAS          : 1.0,       //ø     | AS  | SST underflow recycle ratio
    waste_from   : "reactor", //option| AS  | waste_from | options {'reactor','sst'}
    mass_FeCl3   : 3000,      //kg/d  | CPR | mass of FeCl3 added for chemical P removal
    SF           : 1.25,      //ø     | NIT | safety factor. design choice. Moves the sludge age
    fxt          : 0.39,      //ø     | NIT | current unaerated sludge mass fraction
    DO           : 2.0,       //mgO/L | NIT | DO in the aerobic reactor
    pH           : 7.2,       //ø     | NIT | pH
    IR           : 5.4,       //ø     | DN  | internal recirculation ratio
    DO_RAS       : 1.0,       //mgO/L | DN  | DO in the underflow recycle
    influent_alk : 250,       //mg/L  | DN  | influent alkalinity (mg/L CaCO3)
  };

  //riu upstream.--(wb      wt      Db        S          n       Li    Di   Ti)
  let tram=new Tram(25.880, 62.274, 18.45841, 0.0010055, 0.0358, 2000, 0.6, 15);

  //degradació riu paràmetres
  let deg={
    R_20 :{ NH4:0.0000005, PO4:0.0000005 },
    k    :{ NH4:1,         PO4:1         },
  };

  //recursive variations for each simulation run
  variacions={
    Rs:        [6,    8,    10,   12,   15,   20,  25, 30, 40 ], //d
    RAS:       [0.75, 0.85, 0.95, 1.05, 1.15, 1.25            ], //ø
    DO:        [1.00, 1.50, 2.00, 2.50                        ], //mgO/L
    mass_FeCl3:[500,  600,  700,  800, 900, 1000              ], //kg/d
  };

  //executa el model n vegades
  combinacions = run_simulacions(influent, tram, conf, i, deg, variacions);
})();
