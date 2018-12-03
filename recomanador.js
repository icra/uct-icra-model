/*RECOMANADOR*/

//import files
try{
  State_Variables = require('./state-variables.js');    //class State_Variables
  Tram            = require('./tram.js');               //class Tram
                    require('./primary-settler.js');    //tecnologia primary_settler  (dins de State Variables)
                    require('./activated-sludge.js');   //tecnologia activated_sludge (dins de State Variables)
                    require('./nitrification.js');      //tecnologia nitrification    (dins de State Variables)
                    require('./denitrification.js');    //tecnologia denitrification  (dins de State Variables)
                    require('./chemical-P-removal.js'); //tecnologia chemical P rem   (dins de State Variables)
}catch(e){}

//run model 1 vegada
function run_model(influent, tram, conf, i, deg){
  //call primary settler
  let pst;
  if(conf.pst) pst = influent.primary_settler(i.fw, i.removal_BPO, i.removal_UPO, i.removal_iSS);
  else         pst = { effluent:influent, wastage:null };

  //chemical P removal
  if(conf.cpr==false){ i.mass_FeCl3=0; }

  //call AS+(NIT)+(DN)
  let as;
  if(conf.dn)       as = pst.effluent.denitrification (i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.mass_FeCl3,i.SF,i.fxt,i.DO,i.pH,i.IR,i.DO_RAS,i.influent_alk);
  else if(conf.nit) as = pst.effluent.nitrification   (i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.mass_FeCl3,i.SF,i.fxt,i.DO,i.pH);
  else              as = pst.effluent.activated_sludge(i.T,i.Vp,i.Rs,i.RAS,i.waste_from,i.mass_FeCl3,);

  //combina efluent depuradora i tram upstream
  let river_mixed = tram.state_variables.combine(as.effluent);

  //calcula concentració final del tram de riu
  let river_end = new State_Variables(
    river_mixed.Q,
    0, //VFA
    0, //FBSO
    0, //BPO
    0, //UPO
    0, //USO
    0, //iSS
    tram.Mf(river_mixed.components.S_FSA, deg.R_20.NH4, deg.k.NH4), //FSA (NH4)
    tram.Mf(river_mixed.components.S_OP,  deg.R_20.PO4, deg.k.PO4), //OP  (PO4)
    0, //NOx
  );

  //pack process variables
  let as_process_variables  = conf.dn ? as.as_process_variables  : (conf.nit ? as.as_process_variables : as.process_variables);
  let nit_process_variables = conf.dn ? as.nit_process_variables : (conf.nit ? as.process_variables    : null);
  let dn_process_variables  = conf.dn ? as.process_variables     : null;

  //get TSS, FOt, NH4, PO4
  let FOt = conf.dn ? dn_process_variables.FOt.value : (conf.nit ? nit_process_variables.FOt_fxt.value : as_process_variables.FOt.value); //kgO/d | oxygen demand
  let TSS = as.wastage.fluxes.totals.TSS.total;             //kgTSS/d | sludge produced in secondary
  if(conf.pst) TSS += pst.wastage.fluxes.totals.TSS.total;  //kgTSS/d | sludge produced in pst
  let NH4 = river_end.components.S_FSA;                     //mgN/L NH4 at river end
  let PO4 = river_end.components.S_OP;                      //mgP/L PO4 al river end

  //results
  return {
    FOt,               //kgO/d
    TSS,               //kgTSS/d
    NH4,               //mgN/L
    PO4,               //mgP/L
    errors: as.errors, //errors  (Rs<Rsm  and/or  fxt>fxm)
  };
}

//run model n vegades
function run_simulacions(influent, tram, conf, i, deg, variacions){
  console.log({influent:influent.components,tram,conf,i,deg});
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
        Rs         :i.Rs,
        RAS        :i.RAS,
        DO         :i.DO,
        mass_FeCl3 :i.mass_FeCl3,
        FOt: run.FOt,
        TSS: run.TSS,
        NH4: run.NH4,
        PO4: run.PO4,
        errors: run.errors,
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
let combinacions; //global so is accessible to DOM
let variacions;   //global so is accessible to DOM
(function(){
  return

  //crea un influent--------------(Q   VFA FBSO BPO  UPO  USO iSS FSA   OP    NOx)
  let influent=new State_Variables(25, 50, 115, 440, 100, 45, 60, 39.1, 7.28, 0  );

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

  //tram upstream--(wb      wt      Db        S          n       Li    Di   Ti)
  let tram=new Tram(25.880, 62.274, 18.45841, 0.0010055, 0.0358, 2000, 0.6, 15);

  //degradació riu paràmetres
  let deg={
    R_20 :{ NH4:0.0000005, PO4:0.0000005 },
    k    :{ NH4:1,         PO4:1         },
  };

  //recursive wwtp parameter variations for each simulation run
  variacions={
    Rs:        [6,    8,    10,   12,   15,   20,  25, 30, 40 ], //d
    RAS:       [0.75, 0.85, 0.95, 1.05, 1.15, 1.25            ], //ø
    DO:        [1.00, 1.50, 2.00, 2.50                        ], //mgO/L
    mass_FeCl3:[500,  600,  700,  800, 900, 1000              ], //kg/d
  };

  //executa el model n vegades
  combinacions = run_simulacions(influent, tram, conf, i, deg, variacions);
})();
